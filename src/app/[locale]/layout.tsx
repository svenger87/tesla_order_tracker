import type { Metadata } from "next";
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import Script from "next/script";
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompositorCodesProvider } from "@/lib/CompositorCodesContext";
import { routing } from '@/i18n/routing';
import { OG_LOCALE_MAP, type Locale } from '@/i18n/locales';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

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
      icon: "/favicon.png",
      apple: "/favicon.png",
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
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSansJP.variable} ${notoSansKR.variable} antialiased`}
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
                {children}
                <Toaster />
              </TooltipProvider>
            </CompositorCodesProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
