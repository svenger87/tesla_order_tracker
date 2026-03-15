'use client'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown } from 'lucide-react'

interface FilterCollapseProps {
  children: React.ReactNode
  activeCount: number
}

export function FilterCollapse({ children, activeCount }: FilterCollapseProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Mobile: collapsible */}
      <div className="sm:hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-xs">{activeCount}</Badge>}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-wrap gap-2">
            {children}
          </CollapsibleContent>
        </Collapsible>
      </div>
      {/* Desktop: always visible */}
      <div className="hidden sm:contents">
        {children}
      </div>
    </>
  )
}
