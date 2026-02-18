'use client'

import { ReactNode, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, User, Car, Palette, MapPin, ClipboardList, KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface WizardStep {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  content: ReactNode
  requiredFields?: string[]
  /** Whether this step should be shown */
  visible?: boolean
}

interface FormWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onSubmit: () => void
  loading: boolean
  isEdit: boolean
  error: string
  /** Validate current step's required fields. Returns error message or empty string */
  validateStep: (stepIndex: number) => string
}

export const WIZARD_ICONS = { User, Car, Palette, MapPin, ClipboardList, KeyRound }

export function FormWizard({
  steps,
  currentStep,
  onStepChange,
  onSubmit,
  loading,
  isEdit,
  error,
  validateStep,
}: FormWizardProps) {
  const tc = useTranslations('common')
  const t = useTranslations('form')
  const [direction, setDirection] = useState(0)

  const visibleSteps = steps.filter(s => s.visible !== false)
  const currentVisibleIndex = currentStep
  const totalSteps = visibleSteps.length
  const isLastStep = currentVisibleIndex === totalSteps - 1
  const isFirstStep = currentVisibleIndex === 0

  const goNext = useCallback(() => {
    const validationError = validateStep(currentVisibleIndex)
    if (validationError) return

    if (!isLastStep) {
      setDirection(1)
      onStepChange(currentVisibleIndex + 1)
    }
  }, [currentVisibleIndex, isLastStep, onStepChange, validateStep])

  const goBack = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1)
      onStepChange(currentVisibleIndex - 1)
    }
  }, [currentVisibleIndex, isFirstStep, onStepChange])

  const handleSubmit = useCallback(() => {
    onSubmit()
  }, [onSubmit])

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Step Indicator */}
      <div className="flex-shrink-0 px-2 pt-1 pb-3">
        <div className="flex items-center justify-center gap-0">
          {visibleSteps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = index < currentVisibleIndex
            const isCurrent = index === currentVisibleIndex
            const isFuture = index > currentVisibleIndex

            return (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (index < currentVisibleIndex) {
                      setDirection(-1)
                      onStepChange(index)
                    }
                  }}
                  disabled={isFuture}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0",
                    isCompleted && "bg-primary text-primary-foreground cursor-pointer",
                    isCurrent && "border-2 border-primary text-primary bg-primary/10",
                    isFuture && "border-2 border-muted-foreground/30 text-muted-foreground/50 cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </button>
                {/* Connecting line */}
                {index < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-4 sm:w-6 transition-colors duration-200",
                      index < currentVisibleIndex ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Current step label */}
        <p className="text-center text-xs text-muted-foreground mt-1.5">
          {t('stepOf', { current: String(currentVisibleIndex + 1), total: String(totalSteps) })} — {visibleSteps[currentVisibleIndex]?.label}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-1 mb-2 bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Step Content — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1 pb-2">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={visibleSteps[currentVisibleIndex]?.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {visibleSteps[currentVisibleIndex]?.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Bar */}
      <div className="flex-shrink-0 flex gap-2 pt-3 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={isFirstStep}
          className="flex-1"
        >
          {tc('back')}
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1"
          >
            {loading ? tc('saving') : isEdit ? tc('update') : tc('add')}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={goNext}
            className="flex-1"
          >
            {tc('next')}
          </Button>
        )}
      </div>
    </div>
  )
}
