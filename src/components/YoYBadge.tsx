'use client'

interface Props {
  value: number | null | undefined
  size?: 'sm' | 'xs'
}

export default function YoYBadge({ value, size = 'xs' }: Props) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 text-xs">-</span>
  }
  const isPos = value >= 0
  const cls = size === 'sm'
    ? `text-sm font-bold ${isPos ? 'text-blue-600' : 'text-red-600'}`
    : `text-xs font-semibold ${isPos ? 'text-blue-600' : 'text-red-600'}`
  return (
    <span className={cls}>
      {isPos ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}
