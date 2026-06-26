import { getAgingInfo } from '../utils/aging'

interface AgingBarProps {
  lastSentAt: string | null
  compact?: boolean
}

export function AgingBar({ lastSentAt, compact }: AgingBarProps) {
  const aging = getAgingInfo(lastSentAt)

  return (
    <div className={compact ? 'w-24' : 'w-full min-w-[100px]'}>
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${aging.color}`}>{aging.label}</span>
        </div>
      )}
      <div className={`${compact ? 'h-2' : 'h-1.5'} w-full rounded-full bg-slate-100 overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${aging.barColor}`}
          style={{ width: `${aging.percent}%` }}
          title={aging.label}
        />
      </div>
    </div>
  )
}
