'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import KpiCard from '@/components/KpiCard'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import { useAppState } from '@/context/AppStateContext'
import { getKpis, getMonthlyTrend, getCategorySummary } from '@/lib/queries'

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c']

function fmt(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億円`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

export default function DashboardPage() {
  const { months, startMonth, endMonth } = useAppState()
  const [kpis, setKpis] = useState({ totalSales: 0, totalQuantity: 0, storeCount: 0, productCount: 0 })
  const [trend, setTrend] = useState<{ year_month: string; total_sales: number }[]>([])
  const [categories, setCategories] = useState<{ category_small_name: string; total_sales: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start) return
    setLoading(true)
    const [k, t, c] = await Promise.all([
      getKpis(start, end),
      getMonthlyTrend(),
      getCategorySummary(start, end),
    ])
    setKpis(k)
    setTrend(t)
    setCategories(c)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (startMonth) load(startMonth, endMonth)
  }, [startMonth, endMonth, load])

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-')
    return `${y}/${parseInt(m)}`
  }

  if (!loading && months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-5xl mb-4">📂</p>
        <p className="text-xl font-bold text-gray-700">データがありません</p>
        <p className="text-gray-500 mt-2">「データ管理」ページからCSVをアップロードしてください</p>
        <a href="/admin" className="mt-4 inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
          データ管理へ →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">ダッシュボード</h2>
        <MonthRangeSelector />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="総売上" value={fmt(kpis.totalSales)} icon="💴" />
            <KpiCard label="総販売点数" value={`${kpis.totalQuantity.toLocaleString()}点`} icon="📦" />
            <KpiCard label="対象店舗数" value={`${kpis.storeCount}店舗`} icon="🏪" />
            <KpiCard label="伊藤園商品SKU" value={`${kpis.productCount.toLocaleString()}品`} icon="🍵" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">月別売上推移（時系列）</h3>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year_month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}円`, '売上']} labelFormatter={(l) => formatMonth(String(l))} />
                    <Bar dataKey="total_sales" fill="#16a34a" radius={[4, 4, 0, 0]} name="売上" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-16 text-sm">月次データが蓄積されると推移グラフが表示されます</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">カテゴリ別売上構成</h3>
              {categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="total_sales"
                      nameKey="category_small_name"
                      cx="50%"
                      cy="40%"
                      outerRadius={75}
                    >
                      {categories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} iconSize={8} />
                    <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}円`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-400 py-16 text-sm">データなし</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
