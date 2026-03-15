'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Github, Code2, ExternalLink } from 'lucide-react'
import { TransparencyBar } from '@/components/TransparencyBar'

interface FooterProps {
  settings: { showDonation?: boolean; donationUrl?: string } | null
  orderCount?: number
  deliveredCount?: number
}

export function Footer({ settings, orderCount, deliveredCount }: FooterProps) {
  const t = useTranslations('footer')

  return (
    <footer className="border-t mt-12 bg-muted/20">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="w-full max-w-[98vw] mx-auto px-4 py-10 sm:py-16">
        <div className="flex flex-col items-center gap-5">
          {/* Links row */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
            <a
              href="https://github.com/svenger87/tesla_order_tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              <Code2 className="h-4 w-4" />
              <span>API Docs</span>
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/impressum"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Impressum
            </Link>
          </div>

          {/* Operated by + donation */}
          <p className="text-sm text-muted-foreground text-center">
            {t('operatedBy')}
            {settings?.showDonation && settings?.donationUrl && (
              <>
                {' · '}
                <a
                  href={settings.donationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors hover:underline underline-offset-4"
                >
                  {t('supportDevelopment')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>

          {/* Stats line */}
          {orderCount !== undefined && deliveredCount !== undefined && orderCount > 0 && (
            <p className="text-xs text-muted-foreground/60">
              {t('stats', { orders: orderCount, delivered: deliveredCount })}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
