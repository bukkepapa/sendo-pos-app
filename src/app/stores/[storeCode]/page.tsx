'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import MonthRangeSelector from '@/components/MonthRangeSelector'
import OpportunityTag from '@/components/OpportunityTag'
import IndexBar from '@/components/IndexBar'
import { useAppState } from '@/context/AppStateContext'
import {
  getStoreSummary, getCategorySummary, getMakerShare,
  getItoenCategoryAnalysis, getPeriodComparison,
} from '@/lib/queries'

/* ─── 型 ─────────────────────────────────────────────────────── */
type CatRow = { category_small_name: string; total_sales: number; total_quantity: number }
type MakerRow = { maker_name: string; total_sales: number; share: number; yoy_sales: number | null }
type ItoenRow = {
  store_code: number; store_name: string
  category_small_name: string; category_index: number
  product_name: string; product_sales: number
  product_index: number; gap: number
}
type CatGroup = { category_small_name: string; category_index: number; products: ItoenRow[] }
type PeriodComp = {
  currSales: number; currQty: number; prevSales: number; prevQty: number
  prevStart: string; prevEnd: string; salesChange: number | null; qtyChange: number | null
}

/* ─── ユーティリティ ─────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`
  return `${n.toLocaleString()}円`
}

function fmtYM(ym: string) {
  const [y, m] = ym.split('-')
  return `${y}年${parseInt(m)}月`
}

function groupByCategory(rows: ItoenRow[]): CatGroup[] {
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

function catBadgeColor(v: number) {
  if (v >= 1.3) return 'bg-red-100 text-red-700 border-red-200'
  if (v >= 1.1) return 'bg-orange-100 text-orange-700 border-orange-200'
  if (v >= 0.9) return 'bg-green-100 text-green-700 border-green-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function shortName(name: string) {
  return name.replace('伊藤園　', '').replace('伊藤園 ', '').slice(0, 22)
}

/* ─── インサイト生成ロジック（ルールベース） ─────────────────── */
function generateInsights(
  storeName: string,
  storeRank: number | null,
  storeCats: CatRow[],
  chainCats: CatRow[],
  chainStoreCount: number,
  makerShare: MakerRow[],
  itoenCat: ItoenRow[],
  period: PeriodComp | null
): string[] {
  const insights: string[] = []

  if (storeRank !== null) {
    if (storeRank <= 3) insights.push(`${storeName}はチェーン全体で第${storeRank}位の売上店舗です。`)
    else insights.push(`${storeName}はチェーン全体で第${storeRank}位の売上店舗です。`)
  }

  if (period && period.prevSales > 0 && period.salesChange !== null) {
    const dir = period.salesChange >= 0 ? '増加' : '減少'
    insights.push(`前年同期比で売上は${Math.abs(period.salesChange).toFixed(1)}%${dir}しています（${fmtYM(period.prevStart)}〜${fmtYM(period.prevEnd)}比）。`)
  }

  const storeTotal = storeCats.reduce((s, c) => s + c.total_sales, 0)
  const chainTotal = chainCats.reduce((s, c) => s + c.total_sales, 0)
  if (storeTotal > 0 && chainTotal > 0 && chainStoreCount > 0) {
    const catDiffs = storeCats.map(c => {
      const cc = chainCats.find(x => x.category_small_name === c.category_small_name)
      const storeShare = (c.total_sales / storeTotal) * 100
      const chainShare = cc ? (cc.total_sales / chainTotal) * 100 : 0
      return { name: c.category_small_name, diff: storeShare - chainShare }
    }).sort((a, b) => b.diff - a.diff)

    if (catDiffs.length > 0 && catDiffs[0].diff > 3)
      insights.push(`「${catDiffs[0].name}」の売上構成比がチェーン平均より${catDiffs[0].diff.toFixed(1)}ポイント高く、この店舗の強みです。`)
    if (catDiffs.length > 0 && catDiffs[catDiffs.length - 1].diff < -3)
      insights.push(`「${catDiffs[catDiffs.length - 1].name}」の構成比がチェーン平均より${Math.abs(catDiffs[catDiffs.length - 1].diff).toFixed(1)}ポイント低く、伸びしろがあります。`)
  }

  const bigChance = itoenCat.filter(r => r.category_index >= 1.1 && r.product_index < 0.8)
  if (bigChance.length > 0) {
    const names = bigChance.slice(0, 2).map(r => shortName(r.product_name)).join('・')
    insights.push(`伊藤園「${names}」はカテゴリが好調なのに販売力が低い「大チャンス」の状況です。`)
  }

  const itoenMaker = makerShare.find(m => m.maker_name.includes('伊藤園'))
  if (itoenMaker) {
    const rank = makerShare.indexOf(itoenMaker) + 1
    insights.push(`伊藤園はこの店舗でメーカーシェア第${rank}位（${itoenMaker.share.toFixed(1)}%）です。`)
  }

  return insights.slice(0, 5)
}

/* ─── PIEカラー ──────────────────────────────────────────────── */
const PIE_COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c']

/* ══════════════════════════════════════════════════════════════ */
export default function StoreDetailPage() {
  const { storeCode } = useParams<{ storeCode: string }>()
  const storeCodeNum = Number(storeCode)
  const { startMonth, endMonth } = useAppState()

  const [storeName, setStoreName] = useState('')
  const [storeRank, setStoreRank] = useState<number | null>(null)
  const [storeTotal, setStoreTotal] = useState(0)
  const [storeQty, setStoreQty] = useState(0)
  const [storeYoYSales, setStoreYoYSales] = useState<number | null>(null)
  const [chainStoreCount, setChainStoreCount] = useState(1)
  const [storeCats, setStoreCats] = useState<CatRow[]>([])
  const [chainCats, setChainCats] = useState<CatRow[]>([])
  const [makerShare, setMakerShare] = useState<MakerRow[]>([])
  const [itoenCat, setItoenCat] = useState<ItoenRow[]>([])
  const [periodComp, setPeriodComp] = useState<PeriodComp | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (start: string, end: string) => {
    if (!start || !storeCodeNum) return
    setLoading(true)
    const [allStores, sc, cc, ms, ic, pc] = await Promise.all([
      getStoreSummary(start, end),
      getCategorySummary(start, end, storeCodeNum),
      getCategorySummary(start, end),
      getMakerShare(start, end, storeCodeNum),
      getItoenCategoryAnalysis(start, end, storeCodeNum),
      getPeriodComparison(start, end, storeCodeNum),
    ])
    const me = allStores.find(s => s.store_code === storeCodeNum)
    setStoreName(me?.store_name ?? `店舗${storeCode}`)
    setStoreRank(me ? allStores.indexOf(me) + 1 : null)
    setStoreTotal(me?.total_sales ?? 0)
    setStoreQty(me?.total_quantity ?? 0)
    setStoreYoYSales(me?.yoy_sales ?? null)
    setChainStoreCount(allStores.length || 1)
    setStoreCats(sc)
    setChainCats(cc)
    setMakerShare(ms)
    setItoenCat(ic)
    setPeriodComp(pc)
    setLoading(false)
  }, [storeCodeNum, storeCode])

  useEffect(() => {
    if (startMonth) load(startMonth, endMonth)
  }, [startMonth, endMonth, load])

  /* ─── カテゴリ比較グラフ用データ ─── */
  const storeTotal2 = storeCats.reduce((s, c) => s + c.total_sales, 0)
  const chainTotal = chainCats.reduce((s, c) => s + c.total_sales, 0)
  const catCompData = storeCats.map(c => {
    const cc = chainCats.find(x => x.category_small_name === c.category_small_name)
    return {
      name: c.category_small_name,
      この店舗: storeTotal2 > 0 ? parseFloat(((c.total_sales / storeTotal2) * 100).toFixed(1)) : 0,
      チェーン平均: chainTotal > 0 && cc ? parseFloat(((cc.total_sales / chainTotal) * 100).toFixed(1)) : 0,
    }
  }).sort((a, b) => b['この店舗'] - a['この店舗'])

  /* ─── 伊藤園カテゴリ ─── */
  const itoenGroups = groupByCategory(itoenCat)

  /* ─── インサイト ─── */
  const insights = generateInsights(
    storeName, storeRank, storeCats, chainCats, chainStoreCount,
    makerShare, itoenCat, periodComp
  )

  /* ─── YoY カラー ─── */
  const yoyColor = (v: number | null) =>
    v === null ? 'text-gray-500' : v >= 5 ? 'text-green-600' : v <= -5 ? 'text-red-600' : 'text-orange-500'

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/stores" className="text-sm text-green-600 hover:underline">← 店舗一覧</Link>
          <h2 className="text-2xl font-bold text-gray-950 mt-1">
            {loading ? '読み込み中...' : storeName}
            <span className="ml-3 text-base font-normal text-gray-400">店舗詳細</span>
          </h2>
        </div>
        <MonthRangeSelector />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : (
        <>
          {/* KPIカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium">売上金額</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmt(storeTotal)}</p>
              {storeYoYSales !== null && (
                <p className={`text-sm font-bold mt-1 ${yoyColor(storeYoYSales)}`}>
                  前年比 {storeYoYSales >= 0 ? '+' : ''}{storeYoYSales.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium">販売点数</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{storeQty.toLocaleString()}点</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs text-gray-500 font-medium">チェーン内順位</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {storeRank !== null ? `第${storeRank}位` : '—'}
                <span className="text-sm font-normal text-gray-400 ml-1">/ {chainStoreCount}店舗</span>
              </p>
            </div>
            {periodComp && periodComp.prevSales > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-gray-500 font-medium">前年同期比（売上）</p>
                <p className={`text-2xl font-bold mt-1 ${yoyColor(periodComp.salesChange)}`}>
                  {periodComp.salesChange !== null
                    ? `${periodComp.salesChange >= 0 ? '+' : ''}${periodComp.salesChange}%`
                    : 'データなし'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {fmtYM(periodComp.prevStart)}〜{fmtYM(periodComp.prevEnd)}比
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs text-gray-500 font-medium">前年同期比（売上）</p>
                <p className="text-2xl font-bold text-gray-300 mt-1">—</p>
                <p className="text-xs text-gray-400 mt-1">前年データなし</p>
              </div>
            )}
          </div>

          {/* インサイトテキスト */}
          {insights.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-green-800 mb-3">✨ この店舗のインサイト</h3>
              <ul className="space-y-2">
                {insights.map((text, i) => (
                  <li key={i} className="flex gap-2 text-sm text-green-900">
                    <span className="mt-0.5 text-green-500 flex-shrink-0">•</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* カテゴリ別構成比 vs チェーン平均 */}
          {catCompData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">カテゴリ別構成比 vs チェーン平均</h3>
              <p className="text-xs text-gray-400 mb-4">この店舗の売上構成比（%）と全店舗平均の比較</p>
              <ResponsiveContainer width="100%" height={Math.max(300, catCompData.length * 32)}>
                <BarChart data={catCompData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, name) => [`${Number(v).toFixed(1)}%`, String(name)]} />
                  <Legend iconSize={10} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  <Bar dataKey="この店舗" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="チェーン平均" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* メーカーシェア */}
          {makerShare.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">メーカーシェア（この店舗）</h3>
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={makerShare.slice(0, 9)}
                      dataKey="total_sales"
                      nameKey="maker_name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                    >
                      {makerShare.slice(0, 9).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} iconSize={8} />
                    <Tooltip
                      formatter={(value, name) => {
                        const total = makerShare.reduce((s, m) => s + m.total_sales, 0)
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0.0'
                        return [`${pct}%`, String(name)]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full lg:w-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="text-xs text-gray-500">
                        <th className="text-left pr-4 py-1 font-medium">メーカー</th>
                        <th className="text-right pr-4 py-1 font-medium">売上</th>
                        <th className="text-right py-1 font-medium">シェア</th>
                      </tr>
                    </thead>
                    <tbody>
                      {makerShare.slice(0, 8).map((m, i) => (
                        <tr key={m.maker_name} className={m.maker_name.includes('伊藤園') ? 'bg-green-50' : ''}>
                          <td className="pr-4 py-1.5 text-gray-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {m.maker_name}
                          </td>
                          <td className="pr-4 py-1.5 text-right font-mono text-gray-600">{fmt(m.total_sales)}</td>
                          <td className="py-1.5 text-right font-mono text-gray-600">{m.share.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 伊藤園カテゴリ指数 */}
          {itoenGroups.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">伊藤園 カテゴリ別販売力指数</h3>
              <p className="text-xs text-gray-400 mb-4">
                指数1.0＝期待通り ／ 縦線=カテゴリ指数基準
              </p>
              <div className="space-y-5">
                {itoenGroups.map((group) => (
                  <div key={group.category_small_name}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${catBadgeColor(group.category_index)}`}>
                        {group.category_small_name}
                      </span>
                      <span className="text-xs text-gray-500">カテゴリ指数: {group.category_index.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2">
                      {group.products.map((p) => (
                        <div key={p.product_name} className="flex items-center gap-3">
                          <div className="w-36 text-xs text-gray-700 truncate flex-shrink-0" title={p.product_name}>
                            {shortName(p.product_name)}
                          </div>
                          <div className="flex-1">
                            <IndexBar catIdx={group.category_index} prodIdx={p.product_index} />
                          </div>
                          <div className="w-10 text-xs font-mono text-gray-600 text-right flex-shrink-0">
                            {p.product_index.toFixed(2)}
                          </div>
                          <div className="w-20 flex-shrink-0">
                            <OpportunityTag catIdx={group.category_index} prodIdx={p.product_index} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
