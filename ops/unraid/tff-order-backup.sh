# Deployed on the NAS at /boot/config/custom/tff-order-backup.sh, scheduled by
# the User Scripts plugin (tff_order_backup, 45 3 * * *). That flash copy is the
# one that runs; this is the reviewable original. Change here, then copy over —
# a shell script living only on a FAT32 stick has no history and no review.
#!/bin/bash
# Off-site copy of the tff-order-stats order data.
#
# The site takes its own snapshots into the same Docker volume as its database,
# which covers a bad edit or a bad delete but not the loss of that machine.
# This runs here instead, on hardware that is not the one holding the data.
#
# What it saves is the public order list: every field the site publishes, for
# every order. It is not a full database backup and must not be treated as one —
# it has none of the owners' edit codes, and none of the settings, options,
# compositor codes or the change history. Rebuilding a site from this alone
# would lock every user out of their own entry. What it does hold is the part
# nobody could reconstruct: three thousand orders contributed over years.
#
# The download is written to a temporary name and only becomes a backup after it
# has been proved to be a non-empty JSON array. Without that check the first
# proxy error page or maintenance response quietly becomes "the backup", and
# nobody finds out until the day it is needed.

set -uo pipefail

URL=https://tff-order-stats.de/api/orders
DEST=/mnt/user/data/Backups/tff-order-stats
KEEP=30
MIN_ORDERS=2000         # ~3130 today; anything near zero means a broken response
LOG=/var/log/tff-order-backup.log

# Set NOTIFY=0 to rehearse a failure without alerting anyone. Verifying that a
# broken response is refused means deliberately causing one, and the first time
# that was done here it sent two real alerts to Discord. A script that cannot be
# exercised without paging somebody is a script nobody exercises.
NOTIFY=${NOTIFY:-1}

TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
OUT="$DEST/orders-$TS.json.gz"
TMP="$DEST/.in-progress-$TS.json"

log() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

# Unraid's notifier — a silent failure is the whole problem being solved.
notify() {
  local severity="$1" subject="$2" body="$3"
  local n=/usr/local/emhttp/webGui/scripts/notify
  [ "$NOTIFY" = "1" ] || { log "(notification suppressed: $subject — $body)"; return 0; }
  [ -x "$n" ] && "$n" -e "TFF order backup" -s "$subject" -d "$body" -i "$severity" >/dev/null 2>&1
}

fail() {
  log "FAILED: $*"
  notify alert "TFF order backup failed" "$*"
  rm -f "$TMP"
  exit 1
}

mkdir -p "$DEST" || fail "cannot create $DEST"

log "Fetching $URL"
code=$(curl -sS --max-time 300 --retry 2 --retry-delay 10 \
  -H 'accept: application/json' -o "$TMP" -w '%{http_code}' "$URL") \
  || fail "curl failed talking to $URL"

[ "$code" = "200" ] || fail "$URL answered HTTP $code"

# Verified before it is kept, never after. python3 both parses the response and
# counts it, so a valid-but-empty array is caught alongside an HTML error page.
count=$(python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print(-1); raise SystemExit
print(len(d) if isinstance(d, list) else -1)
' "$TMP" 2>/dev/null) || fail "could not read the response as JSON"

[ "$count" -ge "$MIN_ORDERS" ] 2>/dev/null \
  || fail "response held $count orders, expected at least $MIN_ORDERS"

gzip -c "$TMP" > "$OUT" || fail "could not compress into $OUT"
rm -f "$TMP"

# Read the compressed file back. gzip writing successfully is not the same as
# the file being readable afterwards, and this one is only ever opened by
# somebody who has already lost the original.
gunzip -t "$OUT" || fail "$OUT does not decompress"

size=$(du -h "$OUT" | cut -f1)
log "Kept orders-$TS.json.gz — $count orders, $size"

# Pruned only after the new one exists and verified: a failed run must not also
# cost the oldest good copy.
mapfile -t old < <(ls -1 "$DEST"/orders-*.json.gz 2>/dev/null | sort -r | tail -n +$((KEEP + 1)))
for f in "${old[@]:-}"; do
  [ -n "$f" ] || continue
  rm -f "$f" && log "Removed $(basename "$f")"
done

remaining=$(ls -1 "$DEST"/orders-*.json.gz 2>/dev/null | wc -l)
log "$remaining copies kept in $DEST"
