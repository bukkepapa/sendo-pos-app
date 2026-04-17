'use client'

import { useAppState } from '@/context/AppStateContext'

export default function MonthRangeSelector() {
  const { months, startMonth, endMonth, setStartMonth, setEndMonth } = useAppState()

  if (months.length === 0) return null

  const fmt = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  // endMonthの選択肢はstartMonth以降のみ
  const endOptions = months.filter((m) => m >= startMonth)
  // startMonthの選択肢はendMonth以前のみ
  const startOptions = months.filter((m) => m <= endMonth)

  const rangeCount = months.filter((m) => m >= startMonth && m <= endMonth).length
  const isRange = startMonth !== endMonth

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-900 font-semibold">対象月:</span>
      <select
        value={startMonth}
        onChange={(e) => setStartMonth(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {startOptions.map((m) => (
          <option key={m} value={m}>{fmt(m)}</option>
        ))}
      </select>
      <span className="text-gray-500 text-sm font-medium">〜</span>
      <select
        value={endMonth}
        onChange={(e) => setEndMonth(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {endOptions.map((m) => (
          <option key={m} value={m}>{fmt(m)}</option>
        ))}
      </select>
      {isRange && (
        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
          {rangeCount}ヶ月合算
        </span>
      )}
    </div>
  )
}
