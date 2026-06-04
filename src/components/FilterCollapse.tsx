interface FilterCollapseProps {
  children: React.ReactNode
  activeCount: number
}

export function FilterCollapse({ children }: FilterCollapseProps) {
  return (
    <div className="contents">
      {children}
    </div>
  )
}
