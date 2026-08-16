import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { mergeMessages } from './merge-messages';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  if (locale === routing.defaultLocale) {
    return { locale, messages };
  }

  // Translations come through Crowdin, so a string added to the source file is
  // live before it reaches the other 21 languages — and next-intl renders the
  // key path for anything missing. The French 404 page greeted visitors with a
  // headline reading "errors.pageNotFoundTitle". Laying each translation over
  // the source means an untranslated string shows German until Crowdin catches
  // up, which is a language rather than a variable name.
  const source = (await import(`../../messages/${routing.defaultLocale}.json`)).default;

  return {
    locale,
    messages: mergeMessages(source, messages),
  };
});
