'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import YoYBadge from '@/components/YoYBadge'
import { useAppState } from '@/context/AppStateContext'
import { getStoreSummary } from '@/lib/queries'

type StoreSummary = {
  store_code: number
  store_name: string
  total_sales: number
  total_quantity: number
  share: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309', '#16a34a', '#16a34a']

export default function StoresPage() {
  const { startMonth, endMonth } = useAppState()
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start) return
    setLoading(true)
    const data = await getStoreSummary(start, end)
    setStores(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (startMonth) load(startMonth, endMonth)
  }, [startMonth, endMonth, load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">店舗別売上</h2>
        <MonthRangeSelector />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* 横棒グラフ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">店舗別売上ランキング（上位15店舗）</h3>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={stores.slice(0, 15)}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="store_name" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}円`, '売上']} />
                <Bar dataKey="total_sales" radius={[0, 4, 4, 0]}>
                  {stores.slice(0, 15).map((_, i) => (
                    <Cell key={i} fill={i < 3 ? RANK_COLORS[i] : '#16a34a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 表 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">順位</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">店舗名</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">売上金額</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">点数</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden lg:table-cell">構成比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stores.map((s, i) => (
                  <tr key={s.store_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'text-gray-500'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.store_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-gray-700">{fmt(s.total_sales)}</span>
                      {s.yoy_sales !== null && (
                        <span className="md:hidden block mt-0.5">
                          <YoYBadge value={s.yoy_sales} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <YoYBadge value={s.yoy_sales} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">{s.total_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <YoYBadge value={s.yoy_quantity} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-600 w-10 text-right">{s.share.toFixed(1)}%</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${Math.min(s.share * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
