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
  delay?: number
}

export function StatCard({ label, value, icon: Icon, description, hint, variant = 'default', delay = 0 }: StatCardProps) {
  const isHero = variant === 'hero'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative overflow-hidden rounded-xl border bg-card p-2.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow ${
        isHero ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
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
          <p className={`font-bold tracking-tight truncate ${
            isHero ? 'text-base sm:text-3xl' : 'text-base sm:text-2xl'
          }`}>{value}</p>
          {description && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
        <div className={`rounded-lg bg-primary/10 p-1 sm:p-2 shrink-0`}>
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-r from-primary/50 to-primary/10 ${
        isHero ? 'h-1 sm:h-1.5' : 'h-0.5 sm:h-1'
      }`} />
    </motion.div>
  )
}
