'use client'

import { useEffect, useState, useCallback } from 'react'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import { useAppState } from '@/context/AppStateContext'
import { getMatrixData } from '@/lib/queries'

type MatrixData = {
  stores: { code: number; name: string }[]
  categories: string[]
  matrix: Record<string, Record<number, number>>
}

function heatColor(value: number, max: number) {
  if (value === 0) return 'bg-gray-50 text-gray-300'
  const ratio = value / max
  if (ratio >= 0.8) return 'bg-green-700 text-white'
  if (ratio >= 0.6) return 'bg-green-500 text-white'
  if (ratio >= 0.4) return 'bg-green-300 text-green-900'
  if (ratio >= 0.2) return 'bg-green-100 text-green-800'
  return 'bg-green-50 text-green-700'
}

function fmtCell(n: number) {
  if (n === 0) return '-'
  if (n >= 1000000) return `${(n / 10000).toFixed(0)}万`
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}

export default function MatrixPage() {
  const { startMonth, endMonth } = useAppState()
  const [data, setData] = useState<MatrixData>({ stores: [], categories: [], matrix: {} })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start) return
    setLoading(true)
    const d = await getMatrixData(start, end)
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { if (startMonth) load(startMonth, endMonth) }, [startMonth, endMonth, load])

  const maxVal = data.categories.length > 0 && data.stores.length > 0
    ? Math.max(...data.categories.flatMap((c) =>
        data.stores.map((s) => data.matrix[c]?.[s.code] || 0)
      ))
    : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">売上マトリクス（店別×カテゴリ別）</h2>
        <MonthRangeSelector />
      </div>

      <p className="text-sm text-gray-500">
        セルの色が濃いほど売上が高い。数値の単位は万円（小さい場合は円）。
      </p>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : data.stores.length === 0 ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 border border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 min-w-[110px] z-10">
                  カテゴリ
                </th>
                {data.stores.map((s) => (
                  <th key={s.code} className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap min-w-[72px]">
                    {s.name.replace('店', '')}
                  </th>
                ))}
                <th className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 min-w-[72px]">合計</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat) => {
                const rowTotal = data.stores.reduce((s, st) => s + (data.matrix[cat]?.[st.code] || 0), 0)
                return (
                  <tr key={cat} className="hover:bg-gray-50/50">
                    <td className="sticky left-0 bg-white border border-gray-200 px-3 py-1.5 font-medium text-gray-700 z-10">
                      {cat}
                    </td>
                    {data.stores.map((s) => {
                      const val = data.matrix[cat]?.[s.code] || 0
                      return (
                        <td
                          key={s.code}
                          className={`border border-gray-200 px-2 py-1.5 text-center font-mono transition-colors ${heatColor(val, maxVal)}`}
                          title={`${cat} × ${s.name}: ${val.toLocaleString()}円`}
                        >
                          {fmtCell(val)}
                        </td>
                      )
                    })}
                    <td className="border border-gray-200 px-2 py-1.5 text-center font-mono font-semibold text-gray-800 bg-gray-50">
                      {fmtCell(rowTotal)}
                    </td>
                  </tr>
                )
              })}
              {/* 合計行 */}
              <tr className="bg-gray-50 font-semibold">
                <td className="sticky left-0 bg-gray-50 border border-gray-200 px-3 py-1.5 text-gray-700 z-10">合計</td>
                {data.stores.map((s) => {
                  const colTotal = data.categories.reduce((sum, c) => sum + (data.matrix[c]?.[s.code] || 0), 0)
                  return (
                    <td key={s.code} className="border border-gray-200 px-2 py-1.5 text-center font-mono text-gray-800">
                      {fmtCell(colTotal)}
                    </td>
                  )
                })}
                <td className="border border-gray-200 px-2 py-1.5 text-center font-mono text-gray-900 bg-green-50">
                  {fmtCell(data.categories.reduce((s, c) =>
                    s + data.stores.reduce((ss, st) => ss + (data.matrix[c]?.[st.code] || 0), 0), 0
                  ))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
