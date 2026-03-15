'use client'

import { useTranslations } from 'next-intl'
import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SupportCardProps {
  donationUrl: string
}

export function SupportCard({ donationUrl }: SupportCardProps) {
  const t = useTranslations('support')

  return (
    <Card className="border-dashed">
      <CardContent className="p-5 flex items-start gap-4">
        <div className="rounded-full bg-pink-50 dark:bg-pink-900/20 p-2.5 shrink-0">
          <Heart className="h-5 w-5 text-pink-500" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">{t('communityMessage')}</p>
          <a href={donationUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              {'\u2615'} {t('supportButton')}
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
