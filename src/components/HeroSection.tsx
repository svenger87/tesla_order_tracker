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
    <section className="text-center space-y-4 py-2">
      <h2 className="text-3xl font-bold tracking-tight">
        {t('title')}
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        {t('subtitle')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onSearchOpen}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          {t('findMyOrder')}
        </Button>
        <Button
          size="lg"
          onClick={onNewOrder}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {th('newOrder')}
        </Button>
      </div>
    </section>
  )
}
