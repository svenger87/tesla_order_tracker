'use client'

import { OptionsManager } from '@/components/admin/OptionsManager'
import { ConstraintManager } from '@/components/admin/ConstraintManager'

export function OptionsTab() {
  return (
    <div className="space-y-6">
      <OptionsManager />
      <ConstraintManager />
    </div>
  )
}
