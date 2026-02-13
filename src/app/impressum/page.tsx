import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Impressum — TFF Order Stats',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Impressum</h1>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Angaben gemäß § 5 TMG
            </h2>
            <p>Sven Rosema</p>
            <p>Rhede (Ems)</p>
          </section>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Kontakt
            </h2>
            <p>
              E-Mail:{' '}
              <a
                href="mailto:rosema.sven@gmail.com"
                className="underline underline-offset-4 hover:text-foreground transition-colors"
              >
                rosema.sven@gmail.com
              </a>
            </p>
          </section>

          <section className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Haftungshinweis
            </h2>
            <p className="text-sm text-muted-foreground">
              Dies ist ein privates Community-Projekt ohne kommerzielle Absicht.
            </p>
          </section>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  )
}
