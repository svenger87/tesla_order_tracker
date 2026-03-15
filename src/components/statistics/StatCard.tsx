'use client'

import { motion } from 'framer-motion'
import { LucideIcon, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'hero'
  semanticColor?: 'success' | 'data' | 'pending' | 'brand'
  minimal?: boolean
  delay?: number
  watermark?: boolean
}

const colorMap = {
  brand: { bg: 'bg-primary/10', text: 'text-primary', bar: 'from-primary/60 to-primary/20', hoverBg: 'group-hover:bg-primary/15' },
  success: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', bar: 'from-green-500/60 to-green-500/20', hoverBg: 'group-hover:bg-green-500/15' },
  data: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', bar: 'from-blue-500/60 to-blue-500/20', hoverBg: 'group-hover:bg-blue-500/15' },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', bar: 'from-amber-500/60 to-amber-500/20', hoverBg: 'group-hover:bg-amber-500/15' },
}

export function StatCard({ label, value, icon: Icon, description, hint, variant = 'default', semanticColor = 'brand', minimal = false, delay = 0, watermark = false }: StatCardProps) {
  const isHero = variant === 'hero'
  const colors = colorMap[semanticColor]
  const displayValue = (value === 0 || value === '0') ? '\u2014' : value
  const isZeroValue = value === 0 || value === '0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`group relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5 transition-all duration-200 hover:translate-y-[-2px] ${
        isHero
          ? 'border-primary/20 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-elevated)] ring-1 ring-primary/10'
          : 'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]'
      }`}
    >
      {/* Left accent bar */}
      {!minimal && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${colors.bar} ${
          isHero ? 'opacity-100' : 'opacity-60'
        }`} />
      )}

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:truncate">{label}</p>
            {hint && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="min-w-[28px] min-h-[28px] flex items-center justify-center">
                      <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-xs">
                    <p>{hint}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={`font-bold tracking-tight truncate tabular-nums ${
            isHero ? 'text-xl sm:text-3xl' : 'text-lg sm:text-2xl'
          } ${isZeroValue ? 'text-muted-foreground' : ''}`}>{displayValue}</p>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground/80 truncate">{description}</p>
          )}
        </div>
        <div className={`rounded-xl ${colors.bg} p-2.5 sm:p-3 shrink-0 transition-colors ${colors.hoverBg}`}>
          <Icon className={`${colors.text} ${isHero ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-5 w-5 sm:h-6 sm:w-6'}`} />
        </div>
      </div>

      {/* Watermark for screenshots */}
      {watermark && isHero && (
        <span className="absolute bottom-1.5 right-2.5 text-[9px] opacity-[0.15] text-foreground select-none pointer-events-none">
          tff-order-stats.de
        </span>
      )}
    </motion.div>
  )
}
