'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import type { Locale } from 'date-fns'
import { de, enUS } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatDeliveryWindow, parseDeliveryWindowRange } from '@/lib/delivery-window'

/**
 * date-fns locales for the calendar, loaded on demand so the order form does
 * not ship all of them. German and English are bundled, matching the order-date
 * picker; the others fall back to English until their chunk arrives.
 */
const LOCALE_LOADERS: Record<string, () => Promise<Locale>> = {
  fr: () => import('date-fns/locale/fr').then(m => m.fr),
  nl: () => import('date-fns/locale/nl').then(m => m.nl),
  es: () => import('date-fns/locale/es').then(m => m.es),
  pt: () => import('date-fns/locale/pt').then(m => m.pt),
  it: () => import('date-fns/locale/it').then(m => m.it),
  no: () => import('date-fns/locale/nb').then(m => m.nb),
  sv: () => import('date-fns/locale/sv').then(m => m.sv),
  da: () => import('date-fns/locale/da').then(m => m.da),
  fi: () => import('date-fns/locale/fi').then(m => m.fi),
  pl: () => import('date-fns/locale/pl').then(m => m.pl),
  cs: () => import('date-fns/locale/cs').then(m => m.cs),
  hu: () => import('date-fns/locale/hu').then(m => m.hu),
  ro: () => import('date-fns/locale/ro').then(m => m.ro),
  hr: () => import('date-fns/locale/hr').then(m => m.hr),
  bg: () => import('date-fns/locale/bg').then(m => m.bg),
  sk: () => import('date-fns/locale/sk').then(m => m.sk),
  el: () => import('date-fns/locale/el').then(m => m.el),
  tr: () => import('date-fns/locale/tr').then(m => m.tr),
  zh: () => import('date-fns/locale/zh-CN').then(m => m.zhCN),
  ja: () => import('date-fns/locale/ja').then(m => m.ja),
  ko: () => import('date-fns/locale/ko').then(m => m.ko),
}

function useDateFnsLocale(): Locale {
  const locale = useLocale()
  const [loaded, setLoaded] = useState<{ code: string; value: Locale } | null>(null)

  useEffect(() => {
    const load = LOCALE_LOADERS[locale]
    if (!load) return
    let active = true
    load().then(value => {
      if (active) setLoaded({ code: locale, value })
    }).catch(() => {})
    return () => { active = false }
  }, [locale])

  if (locale === 'de') return de
  if (loaded?.code === locale) return loaded.value
  return enUS
}

interface DeliveryWindowFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  /** Anchors year-less stored windows ("03.12.-31.12.") when preselecting. */
  orderDate: string
  placeholder: string
  labels: {
    /** Accessible name of the calendar button. */
    openCalendar: string
    pickStart: string
    pickEnd: string
  }
}

/**
 * The delivery window: a text input with a range calendar beside it.
 *
 * Picking a range writes the canonical "DD.MM.-DD.MM.YYYY" (or
 * "DD.MM.YYYY-DD.MM.YYYY" across years). The input stays editable, because
 * Tesla sometimes gives only a month ("November 2026"), and a stored value the
 * parser cannot read to the day is left exactly as typed.
 *
 * Selection is two clicks — first day, then last day — even when a range is
 * already preselected, so changing a window never means fighting the
 * picker's "extend the existing range" behaviour.
 */
export function DeliveryWindowField({
  id,
  value,
  onChange,
  orderDate,
  placeholder,
  labels,
}: DeliveryWindowFieldProps) {
  const isMobile = useIsMobile()
  const calendarLocale = useDateFnsLocale()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const [pickingEnd, setPickingEnd] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const parsed = parseDeliveryWindowRange(value, orderDate)
      setDraft(parsed ? { from: parsed.start, to: parsed.end } : undefined)
      setPickingEnd(false)
    }
    setOpen(next)
  }

  const handleDayPick = (day: Date) => {
    if (!pickingEnd || !draft?.from) {
      setDraft({ from: day, to: undefined })
      setPickingEnd(true)
      return
    }
    const from = day < draft.from ? day : draft.from
    const to = day < draft.from ? draft.from : day
    setDraft({ from, to })
    setPickingEnd(false)
    onChange(formatDeliveryWindow(from, to))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div className="flex gap-2">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={labels.openCalendar}
              title={labels.openCalendar}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-2rem)] p-0"
        align="start"
        collisionPadding={16}
        aria-label={labels.openCalendar}
      >
        <Calendar
          mode="range"
          selected={draft}
          onSelect={(_, day) => handleDayPick(day)}
          numberOfMonths={isMobile ? 1 : 2}
          defaultMonth={draft?.from}
          locale={calendarLocale}
          autoFocus
          footer={pickingEnd ? labels.pickEnd : labels.pickStart}
          classNames={{
            footer: 'pt-3 text-center text-xs text-muted-foreground',
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
