'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import YoYBadge from '@/components/YoYBadge'
import { useAppState } from '@/context/AppStateContext'
import { getProductRanking, getCategories, getStoreSummary } from '@/lib/queries'

type Product = {
  rank: number
  product_code: string
  product_name: string
  maker_name: string
  category_small_name: string
  total_sales: number
  total_quantity: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

export default function ProductsPage() {
  const { startMonth, endMonth } = useAppState()
  const [stores, setStores] = useState<{ store_code: number; store_name: string }[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<number | undefined>()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!startMonth) return
    Promise.all([getStoreSummary(startMonth, endMonth), getCategories(startMonth, endMonth)]).then(([s, c]) => {
      setStores(s.map((x) => ({ store_code: x.store_code, store_name: x.store_name })))
      setCategories(c)
    })
  }, [startMonth, endMonth])

  const load = useCallback(async (start: string, end: string, store?: number, cat?: string) => {
    if (!start) return
    setLoading(true)
    const data = await getProductRanking(start, end, store, cat, 100)
    setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (startMonth) load(startMonth, endMonth, selectedStore, selectedCategory)
  }, [startMonth, endMonth, selectedStore, selectedCategory, load])

  const top20 = products.slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">商品ランキング（上位100品）</h2>
        <MonthRangeSelector />
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
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">データがありません</div>
      ) : (
        <>
          {/* 上位20グラフ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">上位20商品 売上グラフ</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top20} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="product_name"
                  tick={{ fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}円`, '売上']} />
                <Bar dataKey="total_sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ランキング表 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 w-10">順位</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600">商品名</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">メーカー</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600">売上金額</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 hidden sm:table-cell">販売点数</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-600 hidden md:table-cell">前年比</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.product_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                        ${p.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          p.rank === 2 ? 'bg-gray-100 text-gray-600' :
                          p.rank === 3 ? 'bg-orange-100 text-orange-700' :
                          'text-gray-400'}`}>
                        {p.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-800 max-w-[160px]">
                      <div className="truncate">{p.product_name}</div>
                      <div className="hidden md:block lg:hidden">
                        <span className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5 rounded">{p.maker_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{p.maker_name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <span className="font-mono text-gray-700">{fmt(p.total_sales)}</span>
                      {p.yoy_sales !== null && (
                        <span className="md:hidden block mt-0.5">
                          <YoYBadge value={p.yoy_sales} />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell">
                      <YoYBadge value={p.yoy_sales} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-600 hidden sm:table-cell">{p.total_quantity.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right hidden md:table-cell">
                      <YoYBadge value={p.yoy_quantity} />
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
