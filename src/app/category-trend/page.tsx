'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import YoYBadge from '@/components/YoYBadge'
import { useAppState } from '@/context/AppStateContext'
import { getCategoryTrendDetail, getStoreSummary } from '@/lib/queries'

type TrendRow = {
  year_month: string
  category_small_name: string
  total_sales: number
  total_qty: number
  yoy_ratio: number | null
}

const COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#0d9488',
]

function fmtYen(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億円`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${y.slice(2)}/${parseInt(m)}`
}

// 年月(YYYY-MM)をdelta年ぶんシフトする（対前年同期間の算出用）
function shiftYear(ym: string, delta: number) {
  const [y, m] = ym.split('-')
  return `${Number(y) + delta}-${m}`
}

function pivot<T extends number | null>(
  rows: TrendRow[],
  categories: string[],
  valueOf: (r: TrendRow) => T
) {
  const byMonth = new Map<string, Map<string, T>>()
  for (const r of rows) {
    if (!byMonth.has(r.year_month)) byMonth.set(r.year_month, new Map())
    byMonth.get(r.year_month)!.set(r.category_small_name, valueOf(r))
  }
  const months = [...byMonth.keys()].sort()
  return months.map((ym) => {
    const point: { year_month: string; [key: string]: number | string | null } = { year_month: ym }
    for (const c of categories) {
      point[c] = byMonth.get(ym)!.has(c) ? byMonth.get(ym)!.get(c)! : null
    }
    return point
  })
}

export default function CategoryTrendPage() {
  const { startMonth, endMonth } = useAppState()
  const [stores, setStores] = useState<{ store_code: number; store_name: string }[]>([])
  const [selectedStore, setSelectedStore] = useState<number | undefined>()
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [prevTrend, setPrevTrend] = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!startMonth) return
    getStoreSummary(startMonth, endMonth).then((s) =>
      setStores(s.map((x) => ({ store_code: x.store_code, store_name: x.store_name })))
    )
  }, [startMonth, endMonth])

  const load = useCallback(async (start: string, end: string, store?: number) => {
    if (!start) return
    setLoading(true)
    const [t, pt] = await Promise.all([
      getCategoryTrendDetail(start, end, store),
      getCategoryTrendDetail(shiftYear(start, -1), shiftYear(end, -1), store),
    ])
    setTrend(t)
    setPrevTrend(pt)
    setLoading(false)
  }, [])

  useEffect(() => { if (startMonth) load(startMonth, endMonth, selectedStore) }, [startMonth, endMonth, selectedStore, load])

  const categories = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of trend) totals.set(r.category_small_name, (totals.get(r.category_small_name) ?? 0) + r.total_sales)
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [trend])

  const amountPivot = useMemo(() => pivot(trend, categories, (r) => r.total_sales), [trend, categories])
  const yoyPivot = useMemo(() => pivot(trend, categories, (r) => r.yoy_ratio), [trend, categories])

  const periodTotals = useMemo(() => {
    return categories
      .map((c) => {
        const cur = trend.filter((r) => r.category_small_name === c)
        const prev = prevTrend.filter((r) => r.category_small_name === c)
        const total_sales = cur.reduce((s, r) => s + r.total_sales, 0)
        const prev_total_sales = prev.reduce((s, r) => s + r.total_sales, 0)
        const total_qty = cur.reduce((s, r) => s + r.total_qty, 0)
        const prev_total_qty = prev.reduce((s, r) => s + r.total_qty, 0)
        const yoy = prev_total_sales > 0 ? ((total_sales - prev_total_sales) / prev_total_sales) * 100 : null
        const qtyYoy = prev_total_qty > 0 ? ((total_qty - prev_total_qty) / prev_total_qty) * 100 : null
        return { category_small_name: c, total_sales, yoy, total_qty, qtyYoy }
      })
      .sort((a, b) => b.total_sales - a.total_sales)
  }, [trend, prevTrend, categories])

  const toggleCategory = (name: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const hasData = trend.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">カテゴリー伸長分析</h2>
        <MonthRangeSelector />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p>ドリンクカテゴリーごとの売上金額推移と、前年同月に対する伸び率（対前年同月比）を時系列で確認できます。</p>
        <p>凡例（カテゴリー名）をクリックすると、そのカテゴリーの表示/非表示を切り替えられます。</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">対象店舗：</label>
        <select
          value={selectedStore ?? ''}
          onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : undefined)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">全店舗</option>
          {stores.map((s) => (
            <option key={s.store_code} value={s.store_code}>{s.store_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : !hasData ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* ① 金額推移 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">カテゴリー別 売上金額推移</h3>
            <p className="text-xs text-gray-400 mb-4">横軸：年月／縦軸：売上金額</p>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={amountPivot} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year_month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip
                  formatter={(v, name) => [v === null ? '-' : `${Number(v).toLocaleString()}円`, name]}
                  labelFormatter={(l) => fmtMonth(String(l))}
                />
                <Legend onClick={(e) => toggleCategory(String(e.dataKey))} formatter={(v) => <span style={{ fontSize: 11, cursor: 'pointer' }}>{v}</span>} iconSize={10} />
                {categories.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    hide={hidden.has(name)}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ② 対前年同月比推移 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">カテゴリー別 対前年同月比推移</h3>
            <p className="text-xs text-gray-400 mb-4">横軸：年月／縦軸：対前年同月比（100% = 前年同月と同水準）。データ開始から最初の12ヶ月は前年データがないため表示されません。</p>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={yoyPivot} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year_month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={50} />
                <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: '前年同月', position: 'insideTopRight', fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  formatter={(v, name) => [v === null ? '-' : `${Number(v).toFixed(1)}%`, name]}
                  labelFormatter={(l) => fmtMonth(String(l))}
                />
                <Legend onClick={(e) => toggleCategory(String(e.dataKey))} formatter={(v) => <span style={{ fontSize: 11, cursor: 'pointer' }}>{v}</span>} iconSize={10} />
                {categories.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    hide={hidden.has(name)}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ③ 対象期間 合算表 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">カテゴリー別 対象期間 合算</h3>
              <p className="text-xs text-gray-400 mt-0.5">選択中の対象月の売上金額・販売点数の合計と、同じ月数分の前年同期間との比較</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">カテゴリー</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600">売上金額</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600 hidden sm:table-cell">販売点数</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {periodTotals.map((r) => {
                  const i = categories.indexOf(r.category_small_name)
                  return (
                    <tr key={r.category_small_name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {r.category_small_name}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-gray-700">{fmtYen(r.total_sales)}</span>
                        {/* モバイルのみ：売上前年比をセル内に表示 */}
                        <span className="md:hidden block mt-0.5"><YoYBadge value={r.yoy} /></span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell"><YoYBadge value={r.yoy} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600 hidden sm:table-cell">{r.total_qty.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell"><YoYBadge value={r.qtyYoy} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
