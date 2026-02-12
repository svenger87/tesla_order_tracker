'use client'

import { Settings } from '@/lib/types'
import { Coffee } from 'lucide-react'

interface DonationBannerProps {
  settings: Settings | null
}

export function DonationBanner({ settings }: DonationBannerProps) {
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
      <span>{settings.donationText || 'Projekt unterstützen'}</span>
    </a>
  )
}
