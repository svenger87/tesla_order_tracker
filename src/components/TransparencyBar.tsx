'use client'

import { useTranslations } from 'next-intl'

interface TransparencyBarProps {
  /** Server costs for the year, in euro. */
  goal: number
  /** How much of them donations have covered. */
  raised: number
  year: number
}

/**
 * What the servers cost this year, and how far donations have got.
 *
 * Sat unused in the repository for months: the component existed, the two
 * columns existed, and nothing read or wrote either of them. It also carried
 * "Serverkosten" hardcoded in German and a raw green, neither of which survives
 * contact with 23 languages and two themes.
 *
 * Rendered only when an amount is actually configured — see the footer.
 */
export function TransparencyBar({ goal, raised, year }: TransparencyBarProps) {
  const t = useTranslations('footer')
  const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0

  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t('serverCostsTitle', { year })}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('serverCostsProgress', { raised, goal })}
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        {t('serverCostsProgress', { raised, goal })}
      </p>
    </div>
  )
}
