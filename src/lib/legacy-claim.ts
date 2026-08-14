/**
 * Whether a claim on an unclaimed, imported order should be accepted.
 *
 * Orders taken over from the original spreadsheet carry no password until
 * somebody claims one. The intended gate is the order's own name, checked in
 * `/api/orders/verify` — but the update route never repeated the check and
 * trusted an `isLegacy` flag in the request body instead, so the verify step
 * could simply be skipped. This is that gate, in one place, callable from both.
 *
 * It is a weak gate by construction: order names are public, so this stops
 * casual and automated takeover (together with the rate limit) but cannot
 * establish ownership. Nothing in a fully public dataset can. See SECURITY.md.
 */
export function canClaimLegacyOrder(
  claim: string | null | undefined,
  orderName: string | null | undefined,
): boolean {
  const provided = claim?.trim().toLowerCase()
  const expected = orderName?.trim().toLowerCase()
  if (!provided || !expected) return false
  return provided === expected
}
