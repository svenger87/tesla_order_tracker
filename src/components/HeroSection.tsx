'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

interface HeroSectionProps {
  onSearchOpen: () => void
}

export function HeroSection({ onSearchOpen }: HeroSectionProps) {
  const t = useTranslations('hero')

  return (
    <section className="text-center space-y-4 py-2">
      <h2 className="text-3xl font-bold tracking-tight">
        {t('title')}
      </h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        {t('subtitle')}
      </p>
      <Button
        variant="outline"
        size="lg"
        onClick={onSearchOpen}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        {t('findMyOrder')}
      </Button>
    </section>
  )
}
