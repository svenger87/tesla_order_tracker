'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface EditCodeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCode: string
  isCustomPassword?: boolean
}

export function EditCodeModal({ open, onOpenChange }: EditCodeModalProps) {
  const t = useTranslations('editCodeModal')
  const tc = useTranslations('common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            {t('orderCreated')}
          </DialogTitle>
          <DialogDescription>
            {t('passwordSaved')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <KeyRound className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                {t('passwordSecured')}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('passwordSecuredDescription')}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('clickEditToChange')}
          </p>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            {tc('allGood')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
