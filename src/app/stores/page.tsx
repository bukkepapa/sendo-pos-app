'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import YoYBadge from '@/components/YoYBadge'
import { useAppState } from '@/context/AppStateContext'
import { getStoreSummary, getStoreTrend, getTopMakers } from '@/lib/queries'

type StoreSummary = {
  store_code: number
  store_name: string
  total_sales: number
  total_quantity: number
  share: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

type TrendRow = {
  year_month: string
  store_code: number
  store_name: string
  total_sales: number
}

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return `${y.slice(2)}/${parseInt(m)}`
}

// トレンドデータを Recharts 用に変換（月ごとに各店舗の値を展開）
function pivotTrend(rows: TrendRow[]): { year_month: string; [key: string]: number | string }[] {
  const map = new Map<string, { year_month: string; [key: string]: number | string }>()
  for (const r of rows) {
    if (!map.has(r.year_month)) map.set(r.year_month, { year_month: r.year_month })
    map.get(r.year_month)![r.store_name] = r.total_sales
  }
  return [...map.values()].sort((a, b) => String(a.year_month).localeCompare(String(b.year_month)))
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309', '#16a34a', '#16a34a']
const LINE_COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d',
]

export default function StoresPage() {
  const { startMonth, endMonth } = useAppState()
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [makers, setMakers] = useState<string[]>([])
  const [selectedMaker, setSelectedMaker] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(true)

  // メーカー一覧を初回ロード
  useEffect(() => {
    getTopMakers(20).then(setMakers)
  }, [])

  // メーカー変更時にトレンドも再取得
  useEffect(() => {
    setTrendLoading(true)
    getStoreTrend(selectedMaker, 8).then((d) => {
      setTrend(d)
      setTrendLoading(false)
    })
  }, [selectedMaker])

  const load = useCallback(async (start: string, end: string, maker?: string) => {
    if (!start) return
    setLoading(true)
    const data = await getStoreSummary(start, end, maker)
    setStores(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (startMonth) load(startMonth, endMonth, selectedMaker)
  }, [startMonth, endMonth, selectedMaker, load])

  const trendPivot = pivotTrend(trend)
  const trendStores = [...new Set(trend.map((r) => r.store_name))]

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">店舗別売上</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ① メーカー選択 */}
          <select
            value={selectedMaker ?? ''}
            onChange={(e) => setSelectedMaker(e.target.value || undefined)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">全メーカー</option>
            {makers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <MonthRangeSelector />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* 横棒グラフ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              店舗別売上ランキング（上位15店舗）
              {selectedMaker && (
                <span className="ml-2 text-xs font-normal text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  {selectedMaker}
                </span>
              )}
            </h3>
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={stores.slice(0, 15)} layout="vertical" margin={{ left: 10, right: 30 }}>
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

          {/* ② 店舗別月次トレンド（時系列折れ線グラフ） */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              店舗別売上推移（時系列）
              {selectedMaker && (
                <span className="ml-2 text-xs font-normal text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  {selectedMaker}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400 mb-4">上位8店舗の売上推移 — 全格納月</p>
            {trendLoading ? (
              <div className="text-center py-10 text-gray-400 text-sm">読み込み中...</div>
            ) : trendPivot.length < 2 ? (
              <div className="text-center py-10 text-gray-400 text-sm">2ヶ月以上のデータが必要です</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendPivot} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="year_month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={45} />
                  <Tooltip
                    formatter={(v, name) => [`${Number(v).toLocaleString()}円`, name]}
                    labelFormatter={(l) => fmtMonth(String(l))}
                  />
                  <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} iconSize={10} />
                  {trendStores.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
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
