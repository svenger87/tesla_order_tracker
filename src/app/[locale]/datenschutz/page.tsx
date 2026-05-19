import { Link } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'
import { ObfuscatedEmail } from '../impressum/ObfuscatedEmail'
import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: `${t('title')} — TFF Order Stats` }
}

export default async function DatenschutzPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'privacy' })

  const sections: { heading: string; key: string }[] = [
    { heading: t('controller'), key: 'controllerBody' },
    { heading: t('scope'), key: 'scopeBody' },
    { heading: t('serverLogs'), key: 'serverLogsBody' },
    { heading: t('cookies'), key: 'cookiesBody' },
    { heading: t('localStorage'), key: 'localStorageBody' },
    { heading: t('analytics'), key: 'analyticsBody' },
    { heading: t('orderData'), key: 'orderDataBody' },
    { heading: t('externalResources'), key: 'externalResourcesBody' },
    { heading: t('donationLinks'), key: 'donationLinksBody' },
    { heading: t('rights'), key: 'rightsBody' },
    { heading: t('complaints'), key: 'complaintsBody' },
    { heading: t('changes'), key: 'changesBody' },
  ]

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 sm:p-10 space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

          <p className="text-sm text-muted-foreground">{t('lastUpdated', { date: t('lastUpdatedDate') })}</p>

          {sections.map(({ heading, key }) => (
            <section key={key} className="space-y-2">
              <h2 className="text-base font-semibold">{heading}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {t(key)}
              </p>
            </section>
          ))}

          <section className="space-y-2">
            <h2 className="text-base font-semibold">{t('contact')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('contactBody')}{' '}
              <ObfuscatedEmail user="rosema.sven" domain="gmail.com" />
            </p>
          </section>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
