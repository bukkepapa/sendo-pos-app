'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import { useAppState } from '@/context/AppStateContext'

type TrendRow = {
  year_month: string
  brand_name: string
  total_sales: number
  total_quantity: number
}

type Props = {
  title: string
  subtitle: string
  brands: string[]
  colors: string[]
  fetchTrend: (startMonth: string, endMonth?: string) => Promise<TrendRow[]>
}

function fmt(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億円`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-')
  return `${y.slice(2)}/${parseInt(m)}`
}

// 月ごとに対象ブランド合計を分母100としたシェア(%)へピボット
function pivotShare(rows: TrendRow[], brands: string[]) {
  const byMonth = new Map<string, Map<string, number>>()
  for (const r of rows) {
    if (!byMonth.has(r.year_month)) byMonth.set(r.year_month, new Map())
    byMonth.get(r.year_month)!.set(r.brand_name, r.total_sales)
  }
  const months = [...byMonth.keys()].sort()
  return months.map((ym) => {
    const salesByBrand = byMonth.get(ym)!
    const monthTotal = brands.reduce((s, b) => s + (salesByBrand.get(b) || 0), 0)
    const point: { year_month: string; [key: string]: number | string } = { year_month: ym }
    for (const b of brands) {
      const v = salesByBrand.get(b) || 0
      point[b] = monthTotal > 0 ? (v / monthTotal) * 100 : 0
    }
    return point
  })
}

export default function BrandTrendView({ title, subtitle, brands, colors, fetchTrend }: Props) {
  const { startMonth, endMonth } = useAppState()
  const [trend, setTrend] = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start) return
    setLoading(true)
    const t = await fetchTrend(start, end)
    setTrend(t)
    setLoading(false)
  }, [fetchTrend])

  useEffect(() => { if (startMonth) load(startMonth, endMonth) }, [startMonth, endMonth, load])

  const sharePivot = pivotShare(trend, brands)

  const periodTotals = brands.map((b) => ({
    brand_name: b,
    total_sales: trend.filter((r) => r.brand_name === b).reduce((s, r) => s + r.total_sales, 0),
    total_quantity: trend.filter((r) => r.brand_name === b).reduce((s, r) => s + r.total_quantity, 0),
  }))
  const grandTotal = periodTotals.reduce((s, r) => s + r.total_sales, 0)
  const pieData = periodTotals.map((r) => ({
    ...r,
    share: grandTotal > 0 ? (r.total_sales / grandTotal) * 100 : 0,
  }))

  const hasData = trend.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">{title}</h2>
        <MonthRangeSelector />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p>{subtitle}</p>
        <p className="mt-1">対象{brands.length}ブランドの合計売上を<strong>分母100%</strong>として、各ブランドの構成比を算出しています（他ブランドの数値は含みません）。</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : !hasData ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* 時系列折れ線グラフ（シェア推移） */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">ブランド別シェア推移（時系列）</h3>
            <p className="text-xs text-gray-400 mb-4">対象ブランド合計＝100% とした月次構成比</p>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={sharePivot} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year_month" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
                <Tooltip
                  itemSorter={(item) => -(item.value as number)}
                  formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name]}
                  labelFormatter={(l) => fmtMonth(String(l))}
                />
                <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} iconSize={10} />
                {brands.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colors[i % colors.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 期間合計の構成比（円グラフ）＋一覧表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">期間合計 構成比</h3>
              <p className="text-xs text-gray-400 mb-4">選択期間の売上合計に基づくシェア</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total_sales"
                    nameKey="brand_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} iconSize={10} />
                  <Tooltip formatter={(v, name) => [`${Number(v).toLocaleString()}円`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">ブランド別 期間合計</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">ブランド</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-600">売上金額</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-600">シェア</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pieData
                    .slice()
                    .sort((a, b) => b.total_sales - a.total_sales)
                    .map((r) => {
                      const i = brands.indexOf(r.brand_name)
                      return (
                        <tr key={r.brand_name} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">
                            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: colors[i % colors.length] }} />
                            {r.brand_name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-700">{fmt(r.total_sales)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-700">{r.share.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
