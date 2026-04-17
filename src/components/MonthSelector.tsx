'use client'

interface Props {
  months: string[]
  selected: string
  onChange: (month: string) => void
}

export default function MonthSelector({ months, selected, onChange }: Props) {
  if (months.length === 0) return null

  const formatLabel = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-900 font-semibold">対象月:</span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatLabel(m)}
          </option>
        ))}
      </select>
    </div>
  )
}
