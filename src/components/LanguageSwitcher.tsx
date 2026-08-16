'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { TwemojiEmoji } from '@/components/TwemojiText'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALE_CONFIG, REGION_LABELS, type Locale } from '@/i18n/locales'

const REGIONS = ['europe-west', 'nordic', 'europe-east', 'europe-other', 'asian'] as const

function getLocalesByRegion() {
  return REGIONS.map(region => ({
    region,
    label: REGION_LABELS[region],
    locales: (Object.entries(LOCALE_CONFIG) as [Locale, typeof LOCALE_CONFIG[Locale]][])
      .filter(([, config]) => config.region === region),
  }))
}

function saveLocalePreference(locale: string) {
  // Cookie for server-side middleware (next-intl reads NEXT_LOCALE)
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`
  // localStorage as backup
  try { localStorage.setItem('preferred-locale', locale) } catch {}
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const tn = useTranslations('nav')
  const router = useRouter()
  const pathname = usePathname()
  const current = LOCALE_CONFIG[locale as Locale] ?? LOCALE_CONFIG.de

  const groups = getLocalesByRegion()

  const handleSwitch = (code: Locale) => {
    saveLocalePreference(code)
    router.replace(pathname, { locale: code })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The label names the action, not the current value — a screen reader
            announcing "German, button" says nothing about what the button does. */}
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`${tn('changeLanguage')} (${current.label})`}>
          <TwemojiEmoji emoji={current.flag} size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {groups.map(({ region, label, locales }, gi) => (
          <div key={region}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{label}</DropdownMenuLabel>
            {locales.map(([code, config]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleSwitch(code)}
                className={locale === code ? 'font-semibold' : ''}
              >
                <TwemojiEmoji emoji={config.flag} size={18} />
                <span className="ml-2">{config.label}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
