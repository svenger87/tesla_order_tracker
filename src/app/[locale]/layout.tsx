import type { Metadata } from "next";
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import Script from "next/script";
// Self-hosted, from the `geist` package, rather than next/font/google.
//
// The build used to fetch every face from Google, and when that request failed
// the whole image failed with a module-not-found for a font stylesheet — three
// deploys lost to it. Shipping the files removes the network from the build
// entirely.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompositorCodesProvider } from "@/lib/CompositorCodesContext";
import { SiteShell } from "@/components/SiteShell";
import { routing } from '@/i18n/routing';
import { OG_LOCALE_MAP, type Locale } from '@/i18n/locales';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const baseUrl = 'https://tff-order-stats.de'

  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: [
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon.png", sizes: "256x256", type: "image/png" },
      ],
      apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    },
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: baseUrl,
      siteName: 'TFF Order Stats',
      type: 'website',
      locale: OG_LOCALE_MAP[locale as Locale] ?? 'de_DE',
    },
    alternates: {
      canonical: `${baseUrl}${locale === 'de' ? '' : `/${locale}`}`,
      languages: Object.fromEntries(
        routing.locales.map(l => [l, `${baseUrl}${l === 'de' ? '' : `/${l}`}`])
      ),
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
    },
    other: {
      'application-name': 'TFF Order Stats',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {process.env.UMAMI_WEBSITE_ID && (
          <Script
            src="/u/script.js"
            data-website-id={process.env.UMAMI_WEBSITE_ID}
            data-host-url="/u"
            strategy="afterInteractive"
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'TFF Order Stats',
              url: 'https://tff-order-stats.de',
              description: 'Community-driven Tesla order tracking and delivery statistics',
              applicationCategory: 'UtilityApplication',
              operatingSystem: 'Web',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
            }),
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <CompositorCodesProvider>
              <TooltipProvider>
                <SiteShell>{children}</SiteShell>
                <Toaster />
              </TooltipProvider>
            </CompositorCodesProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
