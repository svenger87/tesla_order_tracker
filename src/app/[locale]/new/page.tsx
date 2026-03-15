'use client'

import dynamic from 'next/dynamic'

const OrderForm = dynamic(
  () => import('@/components/OrderForm').then(mod => ({ default: mod.OrderForm })),
  { ssr: false }
)

export default function NewOrderPage() {
  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8">
      <OrderForm
        open={true}
        onOpenChange={() => {}}
        mode="page"
        onSuccess={() => {}}
      />
    </main>
  )
}
