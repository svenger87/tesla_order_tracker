/**
 * An invisible username field for password managers.
 *
 * An order's password has no username beside it, so browsers and password
 * managers saved it under whatever text field happened to precede it — the
 * delivery window, a TOST field, the one-time code — or under nothing, and then
 * could not offer it back in the edit dialog. Putting the order name here, right
 * before the password fields, gives every save and every fill the same key.
 *
 * Visually hidden rather than display:none: several managers skip fields that
 * are not rendered at all.
 */
export function PasswordManagerUsername({ value }: { value: string }) {
  return (
    <input
      type="text"
      name="username"
      autoComplete="username"
      value={value}
      readOnly
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
    />
  )
}
