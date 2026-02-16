'use client'

import { Settings } from '@/lib/types'
import { Coffee } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DonationBannerProps {
  settings: Settings | null
}

export function DonationBanner({ settings }: DonationBannerProps) {
  const tc = useTranslations('common')

  if (!settings?.showDonation) {
    return null
  }

  return (
    <a
      href={settings.donationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Coffee className="h-3.5 w-3.5" />
      <span>{settings.donationText || tc('projectSupport')}</span>
    </a>
  )
}
