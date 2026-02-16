'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LOCALES = [
  { code: 'de' as const, flag: '🇩🇪', label: 'Deutsch' },
  { code: 'en' as const, flag: '🇬🇧', label: 'English' },
] as const

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const current = LOCALES.find(l => l.code === locale) || LOCALES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={current.label}>
          <TwemojiEmoji emoji={current.flag} size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map(({ code, flag, label }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => router.replace(pathname, { locale: code })}
            className={locale === code ? 'font-semibold' : ''}
          >
            <TwemojiEmoji emoji={flag} size={18} />
            <span className="ml-2">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
