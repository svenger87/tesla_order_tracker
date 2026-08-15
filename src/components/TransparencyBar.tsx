'use client'

interface TransparencyBarProps {
  goal: number
  raised: number
  year: number
}

export function TransparencyBar({ goal, raised, year }: TransparencyBarProps) {
  const percent = Math.min(Math.round((raised / goal) * 100), 100)

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          Serverkosten {year}: &euro;{raised} / &euro;{goal}
        </span>
        <span className="text-xs text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
