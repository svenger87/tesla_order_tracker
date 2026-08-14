/**
 * Stable error codes returned by the API, and the translation key each one
 * resolves to on the client.
 *
 * The API used to answer with German prose — "Passwort muss mindestens eine
 * Zahl enthalten" — which the clients rendered verbatim. So an interface that
 * ships in 23 languages fell back to German at exactly the moment something
 * went wrong. Responses now carry `code` alongside the text; the text stays as
 * a fallback for older clients and for anything not yet mapped here.
 *
 * Codes reuse existing translation keys wherever one already says the right
 * thing — there is no value in a second "password too short" string in 23
 * languages.
 */
export const API_ERROR_KEYS: Record<string, string> = {
  // Reused from the form validation namespace
  NAME_TOO_SHORT: 'form.validation.nameMinLength',
  PASSWORD_TOO_SHORT: 'form.validation.passwordMinLength',
  PASSWORD_NEEDS_DIGIT: 'form.validation.passwordNeedsNumber',
  INVALID_EDIT_CODE: 'form.validation.invalidPassword',
  SERVER_ERROR: 'form.validation.saveError',

  // Own namespace
  RATE_LIMITED: 'errors.rateLimited',
  ORDER_NOT_FOUND: 'errors.orderNotFound',
  CONFLICT: 'errors.conflict',
  RESET_CODE_INVALID: 'errors.resetCodeInvalid',
  RESET_CODE_REQUIRED: 'errors.resetCodeRequired',
  TOST_FIELDS_RESTRICTED: 'errors.tostFieldsRestricted',
  ADMIN_REQUIRED: 'errors.adminRequired',
  ORDER_DATE_IN_FUTURE: 'errors.orderDateInFuture',
  LEGACY_PASSWORD_REQUIRED: 'errors.legacyPasswordRequired',

  // The six ordering failures share one message: naming the offending pair
  // would need six more strings in every language, and the user's next step is
  // the same either way — look at the four dates.
  PRODUCTION_BEFORE_ORDER: 'errors.datesOutOfOrder',
  PAPERS_BEFORE_ORDER: 'errors.datesOutOfOrder',
  PAPERS_BEFORE_PRODUCTION: 'errors.datesOutOfOrder',
  DELIVERY_BEFORE_ORDER: 'errors.datesOutOfOrder',
  DELIVERY_BEFORE_PRODUCTION: 'errors.datesOutOfOrder',
  DELIVERY_BEFORE_PAPERS: 'errors.datesOutOfOrder',
}

export function messageKeyForCode(code: string | undefined | null): string | null {
  if (!code) return null
  return API_ERROR_KEYS[code] ?? null
}
