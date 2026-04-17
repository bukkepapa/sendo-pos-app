'use client'

import { useEffect, useState, useCallback } from 'react'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import { useAppState } from '@/context/AppStateContext'
import { getItoenData } from '@/lib/queries'

type ItoenData = {
  stores: { code: number; name: string }[]
  products: { code: string; name: string }[]
  salesMap: Record<string, Record<number, number>>
  indexMap: Record<string, Record<number, number>>
}

function indexColor(v: number) {
  if (v === 0) return 'bg-gray-50 text-gray-300'
  if (v >= 1.5) return 'bg-red-600 text-white font-bold'
  if (v >= 1.2) return 'bg-red-400 text-white'
  if (v >= 1.0) return 'bg-orange-300 text-orange-900'
  if (v >= 0.7) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-500'
}

export default function ItouenPage() {
  const { startMonth, endMonth } = useAppState()
  const [data, setData] = useState<ItoenData>({ stores: [], products: [], salesMap: {}, indexMap: {} })
  const [mode, setMode] = useState<'index' | 'sales'>('index')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start) return
    setLoading(true)
    const d = await getItoenData(start, end)
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { if (startMonth) load(startMonth, endMonth) }, [startMonth, endMonth, load])

  function shortName(name: string) {
    return name.replace('伊藤園　', '').replace('伊藤園 ', '').slice(0, 18)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">伊藤園 店舗別販売力分析</h2>
        <MonthRangeSelector />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">販売力指数について</p>
        <p>
          <strong>販売力指数 = 実際売上 ÷ 期待売上</strong>
          （期待売上 = 商品全店平均売上 × 店舗シェア × 店舗数）
        </p>
        <p>
          <span className="inline-block bg-red-500 text-white text-xs px-1.5 py-0.5 rounded mr-1">1.5+</span>
          <span className="inline-block bg-red-300 text-white text-xs px-1.5 py-0.5 rounded mr-1">1.2+</span>
          <span className="inline-block bg-orange-300 text-orange-900 text-xs px-1.5 py-0.5 rounded mr-1">1.0+</span>
          期待以上の販売力。
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded ml-1 mr-1">0.7+</span>
          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1">0.7未満</span>
          期待以下。
        </p>
      </div>

      {/* 表示切替 */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('index')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${mode === 'index' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          販売力指数
        </button>
        <button
          onClick={() => setMode('sales')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${mode === 'sales' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          売上金額
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : data.products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          伊藤園商品のデータがありません（商品名に「伊藤園」が含まれる商品を対象としています）
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto max-h-[70vh]">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 top-0 bg-gray-50 border border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 min-w-[160px] z-30">
                  商品名
                </th>
                {data.stores.map((s) => (
                  <th key={s.code} className="sticky top-0 bg-gray-50 border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap min-w-[64px] z-20">
                    {s.name.replace('店', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.code} className="hover:bg-gray-50/50">
                  <td className="sticky left-0 bg-white border border-gray-200 px-3 py-1.5 font-medium text-gray-700 z-10">
                    {shortName(p.name)}
                  </td>
                  {data.stores.map((s) => {
                    if (mode === 'index') {
                      const idx = data.indexMap[p.code]?.[s.code] || 0
                      return (
                        <td
                          key={s.code}
                          className={`border border-gray-200 px-2 py-1.5 text-center transition-colors ${indexColor(idx)}`}
                          title={`${p.name} × ${s.name}: 指数${idx.toFixed(2)}`}
                        >
                          {idx > 0 ? idx.toFixed(2) : '-'}
                        </td>
                      )
                    } else {
                      const val = data.salesMap[p.code]?.[s.code] || 0
                      return (
                        <td
                          key={s.code}
                          className="border border-gray-200 px-2 py-1.5 text-center font-mono text-gray-700"
                          title={`${p.name} × ${s.name}: ${val.toLocaleString()}円`}
                        >
                          {val > 0 ? val >= 10000 ? `${(val / 10000).toFixed(1)}万` : val.toLocaleString() : '-'}
                        </td>
                      )
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
