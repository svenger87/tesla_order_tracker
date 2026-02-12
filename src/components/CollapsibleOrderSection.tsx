'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Order } from '@/lib/types'
import { OrderGroup, getQuarterStats } from '@/lib/groupOrders'
import { OrderTable } from './OrderTable'
import { OrderGroupHeader } from './OrderGroupHeader'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface CollapsibleOrderSectionProps {
  groups: OrderGroup[]
  isAdmin: boolean
  onEdit: (order: Order) => void
  onDelete: (orderId: string) => void
}

export function CollapsibleOrderSection({
  groups,
  isAdmin,
  onEdit,
  onDelete,
}: CollapsibleOrderSectionProps) {
  // Default to opening the first group
  const defaultValue = groups.length > 0 ? [groups[0].label] : []

  if (groups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 text-muted-foreground"
      >
        Keine Bestellungen vorhanden
      </motion.div>
    )
  }

  return (
    <Accordion type="multiple" defaultValue={defaultValue} className="space-y-3">
      <AnimatePresence mode="popLayout">
        {groups.map((group, index) => {
          const stats = getQuarterStats(group)

          return (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <AccordionItem
                value={group.label}
                className="border rounded-lg bg-card overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                  <OrderGroupHeader
                    label={group.label}
                    total={stats.total}
                    delivered={stats.delivered}
                    pending={stats.pending}
                  />
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0 overflow-x-auto">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <OrderTable
                      orders={group.orders}
                      isAdmin={isAdmin}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </motion.div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </Accordion>
  )
}
