#!/usr/bin/env bash
#
# ship.sh — push to staging, then promote staging to production.
#
# Deployment itself is GitHub Actions' job (.github/workflows/deploy.yml): a
# push to `staging` or `master` builds an image, publishes it to GHCR and rolls
# it out over SSH. This script only moves the branches, but it refuses to do so
# unless the move is safe, and it waits for the resulting run so you find out
# here whether the deploy went green.
#
#   scripts/ship.sh                 # current branch -> staging
#   scripts/ship.sh promote         # staging -> master (production)
#   scripts/ship.sh status          # what is where
#
# See --help for options.

set -Eeuo pipefail

STAGING_URL="https://staging.tff-order-stats.de"
PROD_URL="https://tff-order-stats.de"

COMMAND="staging"
SKIP_CHECKS=0
NO_WAIT=0
ASSUME_YES=0

die() { printf '\n\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
info() { printf '\033[36m==>\033[0m %s\n' "$*"; }
ok() { printf '\033[32m  ok\033[0m %s\n' "$*"; }
warn() { printf '\033[33m  !!\033[0m %s\n' "$*"; }

usage() {
  # Reprint the header comment block, stopping at the first line of real code.
  awk 'NR>2 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
  cat <<'EOF'

Commands:
  staging     (default) Push the current branch, then fast-forward `staging`
              to it. Deploys to staging.
  promote     Fast-forward `master` to whatever `staging` currently points at.
              Deploys to production. Prompts unless --yes.
  status      Show local and remote branch positions. Read-only.

Options:
  --skip-checks   Don't run lint/build before pushing. Use when CI already
                  covered it; the workflow does not lint for you.
  --no-wait       Return as soon as the push lands, without following the run.
  --yes, -y       Don't prompt for confirmation on promote.
  --help, -h      This text.

Credentials:
  Uses whatever credential helper git is already configured with. If there is
  none, looks for a token file in this order and hands it to git for the push
  only (never printed, never written anywhere):

    $TFF_GH_TOKEN_FILE
    <repo>/.gh-token
    ~/.gh-token
    /mnt/user/coding/kinboard/.gh-token
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    staging|promote|status) COMMAND="$1" ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --no-wait) NO_WAIT=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --help|-h) usage; exit 0 ;;
    *) die "unknown argument: $1 (try --help)" ;;
  esac
  shift
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || die "not inside a git repository"
cd "$REPO_ROOT"

REMOTE_URL=$(git remote get-url origin 2>/dev/null) || die "no 'origin' remote"
SLUG=$(printf '%s' "$REMOTE_URL" | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
[ -n "$SLUG" ] || die "could not parse owner/repo out of: $REMOTE_URL"
OWNER=${SLUG%%/*}

# --- credentials ------------------------------------------------------------
# Resolve a token file only if git has no helper of its own. The path is passed
# to git, which reads it at push time; the value never reaches this script's
# environment or argv, so it cannot leak through `ps` or a shell history.
TOKEN_FILE=""
find_token_file() {
  local candidate
  for candidate in \
    "${TFF_GH_TOKEN_FILE:-}" \
    "$REPO_ROOT/.gh-token" \
    "$HOME/.gh-token" \
    "/mnt/user/coding/kinboard/.gh-token"
  do
    [ -n "$candidate" ] && [ -s "$candidate" ] && { printf '%s' "$candidate"; return 0; }
  done
  return 1
}

if [ -z "$(git config --get credential.helper || true)" ]; then
  if TOKEN_FILE=$(find_token_file); then
    perms=$(stat -c %a "$TOKEN_FILE" 2>/dev/null || echo '?')
    case "$perms" in
      600|400) ;;
      *) warn "token file $TOKEN_FILE is mode $perms — consider chmod 600" ;;
    esac
  else
    TOKEN_FILE=""
  fi
fi

# git push, with the token helper attached when we found one.
git_push() {
  if [ -n "$TOKEN_FILE" ]; then
    git -c credential.helper="!f(){ echo username=$OWNER; echo \"password=\$(cat '$TOKEN_FILE')\"; }; f" push "$@"
  else
    git push "$@"
  fi
}

# curl against the GitHub API, reading the auth header from stdin so the token
# never appears in argv.
gh_api() {
  local path="$1"
  if [ -z "$TOKEN_FILE" ]; then
    curl -fsSL "https://api.github.com/repos/$SLUG/$path" 2>/dev/null || true
  else
    printf 'header = "Authorization: Bearer %s"\n' "$(cat "$TOKEN_FILE")" \
      | curl -fsSL -K - "https://api.github.com/repos/$SLUG/$path" 2>/dev/null || true
  fi
}

json_field() { # crude but dependency-free; good enough for the few fields we read
  python3 -c "import sys,json;d=json.load(sys.stdin);print(${1})" 2>/dev/null || true
}

# --- shared pre-flight ------------------------------------------------------
require_clean_tree() {
  [ -z "$(git status --porcelain)" ] || die "working tree is dirty — commit or stash first"
}

run_checks() {
  [ "$SKIP_CHECKS" -eq 1 ] && { warn "skipping lint/build (--skip-checks)"; return; }
  command -v npm >/dev/null || { warn "npm not found, skipping lint/build"; return; }
  [ -d node_modules ] || { warn "node_modules missing, skipping lint/build (run npm install)"; return; }
  info "running lint"
  npm run --silent lint || die "lint failed — fix it or pass --skip-checks"
  ok "lint clean"
  info "running build (this takes a minute)"
  npm run --silent build >/dev/null || die "build failed — fix it or pass --skip-checks"
  ok "build succeeded"
}

health() { # health <url>; prints ok/unreachable
  curl -fsS --max-time 10 "$1/api/health" 2>/dev/null | grep -q '"ok"' && echo ok || echo unreachable
}

wait_for_run() { # wait_for_run <branch> <sha> <url>
  local branch="$1" sha="$2" url="$3"
  [ "$NO_WAIT" -eq 1 ] && { info "not waiting for the run (--no-wait)"; return 0; }
  command -v python3 >/dev/null || { warn "python3 not found — cannot follow the run"; return 0; }

  info "waiting for the '$branch' workflow run on ${sha:0:7}"
  local waited=0 status conclusion payload
  while [ "$waited" -lt 900 ]; do
    payload=$(gh_api "actions/runs?branch=$branch&head_sha=$sha&per_page=1")
    if [ -n "$payload" ]; then
      status=$(printf '%s' "$payload" | json_field "d['workflow_runs'][0]['status'] if d.get('workflow_runs') else ''")
      conclusion=$(printf '%s' "$payload" | json_field "d['workflow_runs'][0]['conclusion'] or '' if d.get('workflow_runs') else ''")
      case "$status" in
        completed)
          if [ "$conclusion" = "success" ]; then
            ok "workflow succeeded"
            printf '  %s is %s\n' "$url" "$(health "$url")"
            return 0
          fi
          die "workflow finished with: ${conclusion:-unknown} — see https://github.com/$SLUG/actions"
          ;;
        in_progress|queued|waiting|requested|pending) printf '  %s… (%ss)\r' "$status" "$waited" ;;
      esac
    fi
    sleep 10
    waited=$((waited + 10))
  done
  warn "gave up waiting after 15 min — check https://github.com/$SLUG/actions"
}

# --- commands ---------------------------------------------------------------
cmd_status() {
  info "fetching"
  git fetch --quiet origin
  printf '\n  %-28s %s\n' "local HEAD" "$(git log --oneline -1 HEAD)"
  for b in staging master; do
    printf '  %-28s %s\n' "origin/$b" "$(git log --oneline -1 "origin/$b" 2>/dev/null || echo '(none)')"
  done
  printf '\n  %-28s %s\n' "$STAGING_URL" "$(health "$STAGING_URL")"
  printf '  %-28s %s\n\n' "$PROD_URL" "$(health "$PROD_URL")"

  if ! git merge-base --is-ancestor origin/staging origin/master 2>/dev/null; then
    local ahead behind
    ahead=$(git rev-list --count origin/master..origin/staging 2>/dev/null || echo '?')
    behind=$(git rev-list --count origin/staging..origin/master 2>/dev/null || echo '?')
    if [ "$behind" = "0" ]; then
      printf '  staging is %s commit(s) ahead of master — `ship.sh promote` to release\n\n' "$ahead"
    else
      # Reporting only "ahead" here would hide that master has commits of its
      # own, which is exactly the case promote refuses to touch.
      printf '  staging and master have DIVERGED (staging +%s, master +%s) — reconcile by hand\n\n' \
        "$ahead" "$behind"
    fi
  fi
}

cmd_staging() {
  local branch sha
  branch=$(git rev-parse --abbrev-ref HEAD)
  [ "$branch" = "HEAD" ] && die "detached HEAD — check out a branch first"
  [ "$branch" = "master" ] && die "refuse to ship master to staging; branch first, or use 'promote'"

  require_clean_tree
  info "fetching"
  git fetch --quiet origin

  # A non-fast-forward here would silently discard whatever is on staging.
  if git rev-parse --verify --quiet origin/staging >/dev/null; then
    git merge-base --is-ancestor origin/staging HEAD \
      || die "origin/staging is not an ancestor of $branch — rebase onto it first:
    git rebase origin/staging"
  fi

  sha=$(git rev-parse HEAD)
  printf '\n  branch   %s\n  commit   %s\n  target   %s\n\n' \
    "$branch" "$(git log --oneline -1 HEAD)" "$STAGING_URL"

  run_checks

  info "pushing $branch"
  git_push origin "$branch"
  ok "branch pushed"

  info "fast-forwarding staging"
  git_push origin "HEAD:staging"
  ok "staging updated"

  wait_for_run staging "$sha" "$STAGING_URL"
}

cmd_promote() {
  require_clean_tree
  info "fetching"
  git fetch --quiet origin

  git rev-parse --verify --quiet origin/staging >/dev/null || die "origin/staging does not exist"
  local sha
  sha=$(git rev-parse origin/staging)

  if git merge-base --is-ancestor origin/staging origin/master 2>/dev/null; then
    ok "master already contains staging — nothing to promote"
    return 0
  fi
  git merge-base --is-ancestor origin/master origin/staging \
    || die "staging is not a fast-forward of master — they have diverged, reconcile by hand"

  # Don't promote something that is not actually up and serving.
  local staging_health
  staging_health=$(health "$STAGING_URL")
  [ "$staging_health" = "ok" ] || die "$STAGING_URL is $staging_health — not promoting an unverified build"

  printf '\n  promoting to PRODUCTION (%s)\n\n' "$PROD_URL"
  git --no-pager log --oneline origin/master..origin/staging | sed 's/^/    /'
  printf '\n  %s is ok\n\n' "$STAGING_URL"

  if [ "$ASSUME_YES" -ne 1 ]; then
    printf '  Type the word "production" to continue: '
    read -r reply
    [ "$reply" = "production" ] || die "aborted"
  fi

  info "fast-forwarding master"
  git_push origin "refs/remotes/origin/staging:refs/heads/master"
  ok "master updated"

  wait_for_run master "$sha" "$PROD_URL"
}

case "$COMMAND" in
  status) cmd_status ;;
  staging) cmd_staging ;;
  promote) cmd_promote ;;
esac
