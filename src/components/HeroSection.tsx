'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'

interface HeroSectionProps {
  onSearchOpen: () => void
  onNewOrder: () => void
}

export function HeroSection({ onSearchOpen, onNewOrder }: HeroSectionProps) {
  const t = useTranslations('hero')
  const th = useTranslations('home')

  return (
    <section className="relative overflow-hidden py-3 sm:py-7">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.18em] text-primary sm:block">
            TFF Order Stats
          </p>
          <h2 className="text-[34px] font-semibold leading-tight tracking-tight sm:text-5xl">
            <span className="sm:hidden">TFF Order Stats</span>
            <span className="hidden sm:inline">{t('title')}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3 sm:text-base">
            <span className="sm:hidden">Tesla Bestellungen</span>
            <span className="hidden sm:inline">{t('subtitle')}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row lg:pb-1">
          <Button
            size="lg"
            onClick={onSearchOpen}
            className="h-11 gap-2 text-base sm:h-11 sm:text-sm"
          >
            <Search className="h-4 w-4" />
            {t('findMyOrder')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onNewOrder}
            className="h-11 gap-2 bg-card text-base shadow-sm sm:h-11 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            {th('newOrder')}
          </Button>
        </div>
      </div>
    </section>
  )
}
