'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import MonthSelector from '@/components/MonthSelector'
import { getAvailableMonths, getMakerShare, getCategories, getStoreSummary } from '@/lib/queries'

type MakerRow = {
  maker_name: string
  total_sales: number
  total_quantity: number
  share: number
}

const COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#0d9488',
  '#7c2d12', '#1d4ed8', '#a21caf', '#b45309', '#064e3b',
]

function fmt(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億円`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

// 上位N件 + その他をまとめるヘルパー
function groupOthers(data: MakerRow[], topN = 12): MakerRow[] {
  if (data.length <= topN) return data
  const top = data.slice(0, topN)
  const others = data.slice(topN)
  const othersSales = others.reduce((s, r) => s + r.total_sales, 0)
  const othersQty = others.reduce((s, r) => s + r.total_quantity, 0)
  const othersShare = others.reduce((s, r) => s + r.share, 0)
  return [...top, { maker_name: 'その他', total_sales: othersSales, total_quantity: othersQty, share: othersShare }]
}

export default function MakerPage() {
  const [months, setMonths] = useState<string[]>([])
  const [selected, setSelected] = useState('')
  const [stores, setStores] = useState<{ store_code: number; store_name: string }[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<number | undefined>()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [makers, setMakers] = useState<MakerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAvailableMonths().then((ms) => {
      setMonths(ms)
      if (ms.length > 0) setSelected(ms[0])
      else setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    Promise.all([getStoreSummary(selected), getCategories(selected)]).then(([s, c]) => {
      setStores(s.map((x) => ({ store_code: x.store_code, store_name: x.store_name })))
      setCategories(c)
    })
  }, [selected])

  const load = useCallback(async (month: string, store?: number, cat?: string) => {
    if (!month) return
    setLoading(true)
    const data = await getMakerShare(month, store, cat)
    setMakers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selected) load(selected, selectedStore, selectedCategory)
  }, [selected, selectedStore, selectedCategory, load])

  const pieData = groupOthers(makers, 12)
  const barData = makers.slice(0, 15)
  const totalSales = makers.reduce((s, r) => s + r.total_sales, 0)

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx?: number; cy?: number; midAngle?: number
    innerRadius?: number; outerRadius?: number; percent?: number
  }) => {
    if (!cx || !cy || !midAngle === undefined || !innerRadius || !outerRadius || !percent || percent < 0.03) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-(midAngle as number) * RADIAN)
    const y = cy + radius * Math.sin(-(midAngle as number) * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">メーカー別シェア</h2>
        <MonthSelector months={months} selected={selected} onChange={setSelected} />
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
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
        <select
          value={selectedCategory ?? ''}
          onChange={(e) => setSelectedCategory(e.target.value || undefined)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : makers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">総売上</p>
              <p className="text-2xl font-bold text-gray-800">{fmt(totalSales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">メーカー数</p>
              <p className="text-2xl font-bold text-gray-800">{makers.length}<span className="text-sm font-normal text-gray-500 ml-1">社</span></p>
            </div>
          </div>

          {/* 円グラフ + 棒グラフ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 円グラフ */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">メーカー別売上シェア（円グラフ）</h3>
              <p className="text-xs text-gray-400 mb-4">上位12社 ＋ その他</p>
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total_sales"
                    nameKey="maker_name"
                    cx="50%"
                    cy="45%"
                    outerRadius={120}
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
                    iconSize={10}
                    wrapperStyle={{ paddingTop: 8 }}
                  />
                  <Tooltip
                    formatter={(v, name) => [
                      `${Number(v).toLocaleString()}円`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 横棒グラフ */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">メーカー別売上ランキング（上位15社）</h3>
              <p className="text-xs text-gray-400 mb-4">売上金額順</p>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="maker_name"
                    width={90}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toLocaleString()}円`, '売上']}
                  />
                  <Bar dataKey="total_sales" fill="#16a34a" radius={[0, 4, 4, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 一覧表 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">メーカー別売上一覧</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 w-12">順位</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">メーカー名</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">売上金額</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">販売点数</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">シェア</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell w-36">構成比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {makers.map((m, i) => (
                  <tr key={m.maker_name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'text-gray-400'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{m.maker_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700">{fmt(m.total_sales)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">{m.total_quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-700 font-semibold">{m.share.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${Math.min(m.share * 2, 100)}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
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
