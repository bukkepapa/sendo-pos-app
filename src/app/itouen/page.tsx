'use client'

import { useEffect, useState, useCallback } from 'react'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import { useAppState } from '@/context/AppStateContext'
import { getItoenData, getItoenCategoryAnalysis, getStoreSummary } from '@/lib/queries'

/* ─── 型 ─────────────────────────────────────────────── */
type ItoenData = {
  stores: { code: number; name: string }[]
  products: { code: string; name: string }[]
  salesMap: Record<string, Record<number, number>>
  indexMap: Record<string, Record<number, number>>
}

type CatRow = {
  store_code: number; store_name: string
  category_small_name: string; category_index: number
  product_name: string; product_sales: number
  product_index: number; gap: number
}

type CatGroup = {
  category_small_name: string
  category_index: number
  products: CatRow[]
}

/* ─── ヒートマップ用カラー ─────────────────────────────── */
function indexColor(v: number) {
  if (v === 0) return 'bg-gray-50 text-gray-300'
  if (v >= 1.5) return 'bg-red-600 text-white font-bold'
  if (v >= 1.2) return 'bg-red-400 text-white'
  if (v >= 1.0) return 'bg-orange-300 text-orange-900'
  if (v >= 0.7) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-500'
}

/* ─── カテゴリヘッダー背景 ─────────────────────────────── */
function catBadgeColor(v: number) {
  if (v >= 1.3) return 'bg-red-100 text-red-700 border-red-200'
  if (v >= 1.1) return 'bg-orange-100 text-orange-700 border-orange-200'
  if (v >= 0.9) return 'bg-green-100 text-green-700 border-green-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

/* ─── ギャップバッジ ───────────────────────────────────── */
function GapBadge({ gap }: { gap: number }) {
  if (Math.abs(gap) < 0.05) return <span className="text-xs text-gray-400">±0</span>
  const pos = gap > 0
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
      pos ? 'text-blue-700 bg-blue-50' : 'text-red-700 bg-red-50'
    }`}>
      {pos ? '+' : ''}{gap.toFixed(2)}
    </span>
  )
}

/* ─── チャンスラベル ───────────────────────────────────── */
function OpportunityTag({ catIdx, prodIdx }: { catIdx: number; prodIdx: number }) {
  const gap = prodIdx - catIdx
  if (catIdx >= 1.1 && prodIdx < 0.8)
    return <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">🔴 大チャンス</span>
  if (catIdx >= 1.0 && gap < -0.3)
    return <span className="text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">🟡 チャンス</span>
  if (prodIdx >= 1.5 && prodIdx > catIdx * 1.3)
    return <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">🟢 好調</span>
  return null
}

/* ─── 指数バー（カテゴリ基準線付き）─────────────────────── */
function IndexBar({ catIdx, prodIdx }: { catIdx: number; prodIdx: number }) {
  const MAX = 2.0
  const catPct = Math.min((catIdx / MAX) * 100, 100)
  const prodPct = Math.min((prodIdx / MAX) * 100, 100)
  const gap = prodIdx - catIdx

  let barColor = 'bg-green-400'
  if (gap < -0.5) barColor = 'bg-red-400'
  else if (gap < -0.2) barColor = 'bg-orange-300'
  else if (gap < 0) barColor = 'bg-yellow-300'
  else if (gap > 0.3) barColor = 'bg-blue-400'

  return (
    <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-visible">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
        style={{ width: `${prodPct}%` }}
      />
      {/* カテゴリ指数 基準線（縦線） */}
      <div
        className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-gray-600 z-10"
        style={{ left: `${catPct}%` }}
        title={`カテゴリ指数: ${catIdx.toFixed(2)}`}
      />
    </div>
  )
}

/* ─── 商品名短縮 ────────────────────────────────────────── */
function shortName(name: string) {
  return name.replace('伊藤園　', '').replace('伊藤園 ', '').slice(0, 22)
}

/* ─── カテゴリグルーピング ──────────────────────────────── */
function groupByCategory(rows: CatRow[]): CatGroup[] {
  const map = new Map<string, CatGroup>()
  for (const r of rows) {
    if (!map.has(r.category_small_name)) {
      map.set(r.category_small_name, {
        category_small_name: r.category_small_name,
        category_index: r.category_index,
        products: [],
      })
    }
    map.get(r.category_small_name)!.products.push(r)
  }
  return [...map.values()].sort((a, b) => b.category_index - a.category_index)
}

/* ══════════════════════════════════════════════════════════ */
export default function ItouenPage() {
  const { startMonth, endMonth } = useAppState()

  // ヒートマップ用
  const [data, setData] = useState<ItoenData>({ stores: [], products: [], salesMap: {}, indexMap: {} })
  const [heatMode, setHeatMode] = useState<'index' | 'sales'>('index')
  const [heatLoading, setHeatLoading] = useState(true)

  // カテゴリ分析用
  const [view, setView] = useState<'heatmap' | 'category'>('heatmap')
  const [storeList, setStoreList] = useState<{ store_code: number; store_name: string }[]>([])
  const [selectedStore, setSelectedStore] = useState<number | undefined>()
  const [catData, setCatData] = useState<CatRow[]>([])
  const [catLoading, setCatLoading] = useState(false)

  const loadHeatmap = useCallback(async (start: string, end: string) => {
    if (!start) return
    setHeatLoading(true)
    const d = await getItoenData(start, end)
    setData(d)
    setHeatLoading(false)
  }, [])

  useEffect(() => { if (startMonth) loadHeatmap(startMonth, endMonth) }, [startMonth, endMonth, loadHeatmap])

  useEffect(() => {
    if (!startMonth) return
    getStoreSummary(startMonth, endMonth).then((s) =>
      setStoreList(s.map((x) => ({ store_code: x.store_code, store_name: x.store_name })))
    )
  }, [startMonth, endMonth])

  const loadCat = useCallback(async (start: string, end: string, store?: number) => {
    if (!start || !store) { setCatData([]); return }
    setCatLoading(true)
    const d = await getItoenCategoryAnalysis(start, end, store)
    setCatData(d)
    setCatLoading(false)
  }, [])

  useEffect(() => {
    if (view === 'category') loadCat(startMonth, endMonth, selectedStore)
  }, [view, startMonth, endMonth, selectedStore, loadCat])

  const catGroups = groupByCategory(catData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-950">伊藤園 店舗別販売力分析</h2>
        <MonthRangeSelector />
      </div>

      {/* ビュー切替タブ */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setView('heatmap')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${view === 'heatmap' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          ヒートマップ（全店舗）
        </button>
        <button
          onClick={() => setView('category')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${view === 'category' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          カテゴリ別分析（1店舗）
        </button>
      </div>

      {/* ══ ヒートマップ ══ */}
      {view === 'heatmap' && (
        <>
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
              期待以上。
              <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5 rounded ml-1 mr-1">0.7+</span>
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded mr-1">0.7未満</span>
              期待以下。
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setHeatMode('index')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${heatMode === 'index' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              販売力指数
            </button>
            <button onClick={() => setHeatMode('sales')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${heatMode === 'sales' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              売上金額
            </button>
          </div>

          {heatLoading ? (
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
                        if (heatMode === 'index') {
                          const idx = data.indexMap[p.code]?.[s.code] || 0
                          return (
                            <td key={s.code}
                              className={`border border-gray-200 px-2 py-1.5 text-center transition-colors ${indexColor(idx)}`}
                              title={`${p.name} × ${s.name}: 指数${idx.toFixed(2)}`}>
                              {idx > 0 ? idx.toFixed(2) : '-'}
                            </td>
                          )
                        } else {
                          const val = data.salesMap[p.code]?.[s.code] || 0
                          return (
                            <td key={s.code}
                              className="border border-gray-200 px-2 py-1.5 text-center font-mono text-gray-700"
                              title={`${p.name} × ${s.name}: ${val.toLocaleString()}円`}>
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
        </>
      )}

      {/* ══ カテゴリ別分析 ══ */}
      {view === 'category' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
            <p className="font-semibold">カテゴリ指数 vs 伊藤園商品指数の差分分析</p>
            <p>
              <strong>カテゴリ指数</strong> = その店舗でカテゴリ全体（全メーカー）が全店平均と比べてどれだけ売れているか
            </p>
            <p>
              <strong>商品指数</strong> = その伊藤園商品が全店平均と比べてどれだけ売れているか
            </p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs">
              <span className="font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">🔴 大チャンス</span>
              <span className="text-amber-700">カテゴリ強（1.1+）× 商品弱（0.8未満）→ 伊藤園が取りこぼしている</span>
            </div>
            <p className="text-xs text-amber-700">
              バーの<strong>縦線 ｜</strong>がカテゴリ指数の位置。バーが縦線より短い = 商品がカテゴリ平均に届いていない
            </p>
          </div>

          {/* 店舗セレクター */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">分析する店舗：</label>
            <select
              value={selectedStore ?? ''}
              onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : undefined)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- 店舗を選んでください --</option>
              {storeList.map((s) => (
                <option key={s.store_code} value={s.store_code}>{s.store_name}</option>
              ))}
            </select>
            {selectedStore && !catLoading && catData.length > 0 && (
              <span className="text-xs text-gray-500">
                {catGroups.length}カテゴリ ／ {catData.length}商品
              </span>
            )}
          </div>

          {!selectedStore ? (
            <div className="text-center py-20 text-gray-400">店舗を選択してください</div>
          ) : catLoading ? (
            <div className="text-center py-20 text-gray-400">読み込み中...</div>
          ) : catGroups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">データがありません</div>
          ) : (
            <div className="space-y-4">
              {catGroups.map((cat) => {
                const oppCount = cat.products.filter(
                  (p) => cat.category_index >= 1.0 && p.gap < -0.3
                ).length
                return (
                  <div key={cat.category_small_name} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* カテゴリヘッダー */}
                    <div className={`px-4 py-3 flex items-center gap-3 flex-wrap border-b border-gray-200 ${
                      cat.category_index >= 1.3 ? 'bg-red-50' :
                      cat.category_index >= 1.1 ? 'bg-orange-50' :
                      cat.category_index >= 0.9 ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <span className="font-bold text-gray-800 text-sm">{cat.category_small_name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${catBadgeColor(cat.category_index)}`}>
                        カテゴリ指数 {cat.category_index.toFixed(2)}
                      </span>
                      {/* カテゴリ指数バー */}
                      <div className="flex-1 min-w-[100px] max-w-[180px]">
                        <div className="relative h-2 bg-gray-200 rounded-full">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${
                              cat.category_index >= 1.3 ? 'bg-red-400' :
                              cat.category_index >= 1.1 ? 'bg-orange-400' :
                              cat.category_index >= 0.9 ? 'bg-green-400' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min((cat.category_index / 2.0) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      {oppCount > 0 && (
                        <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          チャンス {oppCount}件
                        </span>
                      )}
                    </div>

                    {/* 商品テーブル */}
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 min-w-[150px]">商品名</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 w-16">商品指数</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 w-20">カテゴリ比</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">
                            指数バー
                            <span className="ml-1 text-gray-400 font-normal text-[10px]">縦線 = カテゴリ指数</span>
                          </th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 w-24 hidden sm:table-cell">判定</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cat.products.map((p) => (
                          <tr
                            key={p.product_name}
                            className={`transition-colors ${
                              cat.category_index >= 1.1 && p.product_index < 0.8
                                ? 'bg-red-50/50 hover:bg-red-50'
                                : 'hover:bg-gray-50/70'
                            }`}
                          >
                            <td className="px-3 py-2.5 font-medium text-gray-700">
                              {shortName(p.product_name)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${indexColor(p.product_index)}`}>
                                {p.product_index.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <GapBadge gap={p.gap} />
                            </td>
                            <td className="px-3 py-2.5 pr-6">
                              <IndexBar catIdx={cat.category_index} prodIdx={p.product_index} />
                            </td>
                            <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                              <OpportunityTag catIdx={cat.category_index} prodIdx={p.product_index} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
