import { Link } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'
import { ObfuscatedEmail } from './ObfuscatedEmail'
import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'impressum' })
  return { title: `${t('title')} — TFF Order Stats` }
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'impressum' })
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('legalInfo')}
            </h2>
            <p>Sven Rosema</p>
            <p>Rhede (Ems)</p>
          </section>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('contact')}
            </h2>
            <p>
              {t('email')}: <ObfuscatedEmail user="rosema.sven" domain="gmail.com" />
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('disclaimer')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('disclaimerText')}
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
