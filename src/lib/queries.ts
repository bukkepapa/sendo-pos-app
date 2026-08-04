import { supabase } from './supabase'

export async function getSalesCount(yearMonth?: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_sales_count', {
    p_year_month: yearMonth ?? null,
  })
  if (error) return 0
  return Number(data) ?? 0
}

export async function getAvailableMonths(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_available_months')
  if (error || !data) return []
  return (data as { year_month: string }[]).map((r) => r.year_month)
}

export async function getKpis(startMonth: string, endMonth?: string) {
  const { data, error } = await supabase.rpc('get_kpis', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
  })
  if (error || !data) return { totalSales: 0, totalQuantity: 0, storeCount: 0, productCount: 0 }
  return data as { totalSales: number; totalQuantity: number; storeCount: number; productCount: number }
}

export async function getMonthlyTrend() {
  const { data, error } = await supabase.rpc('get_monthly_trend')
  if (error || !data) return []
  return (data as { year_month: string; total_sales: number; total_quantity: number }[]).map((r) => ({
    year_month: r.year_month,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
  }))
}

export async function getStoreSummary(startMonth: string, endMonth?: string, makerName?: string) {
  const { data, error } = await supabase.rpc('get_store_summary', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_maker_name: makerName ?? null,
  })
  if (error || !data) return []
  return (data as {
    store_code: number; store_name: string
    total_sales: number; total_quantity: number; share: number
    yoy_sales: number | null; yoy_quantity: number | null
  }[]).map((r) => ({
    store_code: r.store_code,
    store_name: r.store_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
    share: Number(r.share),
    yoy_sales: r.yoy_sales !== null ? Number(r.yoy_sales) : null,
    yoy_quantity: r.yoy_quantity !== null ? Number(r.yoy_quantity) : null,
  }))
}

export async function getCategorySummary(startMonth: string, endMonth?: string, storeCode?: number) {
  const { data, error } = await supabase.rpc('get_category_summary', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_store_code: storeCode ?? null,
  })
  if (error || !data) return []
  return (data as { category_small_name: string; total_sales: number; total_quantity: number }[]).map((r) => ({
    category_small_name: r.category_small_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
  }))
}

export async function getProductRanking(
  startMonth: string,
  endMonth?: string,
  storeCode?: number,
  categorySmallName?: string,
  limit = 100
) {
  const { data, error } = await supabase.rpc('get_product_ranking', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_store_code: storeCode ?? null,
    p_category_small_name: categorySmallName ?? null,
    p_limit: limit,
  })
  if (error || !data) return []
  return (data as {
    product_code: string; product_name: string; maker_name: string; category_small_name: string
    total_sales: number; total_quantity: number
    yoy_sales: number | null; yoy_quantity: number | null
  }[]).map((r, i) => ({
    product_code: r.product_code,
    product_name: r.product_name,
    maker_name: r.maker_name ?? '',
    category_small_name: r.category_small_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
    yoy_sales: r.yoy_sales !== null ? Number(r.yoy_sales) : null,
    yoy_quantity: r.yoy_quantity !== null ? Number(r.yoy_quantity) : null,
    rank: i + 1,
  }))
}

export async function getCategories(startMonth: string, endMonth?: string) {
  const { data, error } = await supabase.rpc('get_categories', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
  })
  if (error || !data) return []
  return (data as { category_small_name: string }[]).map((r) => r.category_small_name)
}

export async function getMakerShare(
  startMonth: string,
  endMonth?: string,
  storeCode?: number,
  categorySmallName?: string
) {
  const { data, error } = await supabase.rpc('get_maker_share', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_store_code: storeCode ?? null,
    p_category_small_name: categorySmallName ?? null,
  })
  if (error || !data) return []
  return (data as {
    maker_name: string; total_sales: number; total_quantity: number; share: number
    yoy_sales: number | null; yoy_quantity: number | null
  }[]).map((r) => ({
    maker_name: r.maker_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
    share: Number(r.share),
    yoy_sales: r.yoy_sales !== null ? Number(r.yoy_sales) : null,
    yoy_quantity: r.yoy_quantity !== null ? Number(r.yoy_quantity) : null,
  }))
}

export async function getItoenCategoryAnalysis(startMonth: string, endMonth?: string, storeCode?: number) {
  const { data, error } = await supabase.rpc('get_itouen_category_analysis', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_store_code: storeCode ?? null,
  })
  if (error || !data) return []
  return (data as {
    store_code: number; store_name: string
    category_small_name: string; category_index: number
    product_name: string; product_sales: number
    product_index: number; gap: number
  }[]).map((r) => ({
    store_code: r.store_code,
    store_name: r.store_name,
    category_small_name: r.category_small_name,
    category_index: Number(r.category_index),
    product_name: r.product_name,
    product_sales: Number(r.product_sales),
    product_index: Number(r.product_index),
    gap: Number(r.gap),
  }))
}

export async function getProductTrend(
  startMonth: string,
  endMonth: string,
  categorySmallName?: string,
  storeCode?: number,
  topN = 15
) {
  const { data, error } = await supabase.rpc('get_product_trend', {
    p_start_month: startMonth,
    p_end_month: endMonth,
    p_category_small_name: categorySmallName ?? null,
    p_store_code: storeCode ?? null,
    p_top_n: topN,
  })
  if (error || !data) return []
  return (data as { year_month: string; product_name: string; total_sales: number }[]).map((r) => ({
    year_month: r.year_month,
    product_name: r.product_name,
    total_sales: Number(r.total_sales),
  }))
}

export async function getStoreTrend(
  startMonth: string,
  endMonth: string,
  makerName?: string,
  topN = 8
) {
  const { data, error } = await supabase.rpc('get_store_trend', {
    p_start_month: startMonth,
    p_end_month: endMonth,
    p_maker_name: makerName ?? null,
    p_top_n: topN,
  })
  if (error || !data) return []
  return (data as { year_month: string; store_code: number; store_name: string; total_sales: number }[]).map((r) => ({
    year_month: r.year_month,
    store_code: r.store_code,
    store_name: r.store_name,
    total_sales: Number(r.total_sales),
  }))
}

export async function getGreenTeaBrandTrend(startMonth: string, endMonth?: string, size?: string) {
  const { data, error } = await supabase.rpc('get_greentea_brand_trend', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_size: size ?? null,
  })
  if (error || !data) return []
  return (data as { year_month: string; brand_name: string; total_sales: number; total_quantity: number }[]).map((r) => ({
    year_month: r.year_month,
    brand_name: r.brand_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
  }))
}

export async function getMugichaBrandTrend(startMonth: string, endMonth?: string, size?: string) {
  const { data, error } = await supabase.rpc('get_mugicha_brand_trend', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_size: size ?? null,
  })
  if (error || !data) return []
  return (data as { year_month: string; brand_name: string; total_sales: number; total_quantity: number }[]).map((r) => ({
    year_month: r.year_month,
    brand_name: r.brand_name,
    total_sales: Number(r.total_sales),
    total_quantity: Number(r.total_quantity),
  }))
}

export async function getTopMakers(limit = 20) {
  const { data, error } = await supabase.rpc('get_top_makers', { p_limit: limit })
  if (error || !data) return []
  return (data as { maker_name: string }[]).map((r) => r.maker_name)
}

export async function getMakerTrend(
  startMonth: string,
  endMonth: string,
  storeCode?: number,
  categorySmallName?: string,
  topN = 8
) {
  const { data, error } = await supabase.rpc('get_maker_trend', {
    p_start_month: startMonth,
    p_end_month: endMonth,
    p_store_code: storeCode ?? null,
    p_category_small_name: categorySmallName ?? null,
    p_top_n: topN,
  })
  if (error || !data) return []
  return (data as { year_month: string; maker_name: string; total_sales: number; share: number }[]).map((r) => ({
    year_month: r.year_month,
    maker_name: r.maker_name,
    total_sales: Number(r.total_sales),
    share: Number(r.share),
  }))
}

export async function getCategoryTrend(startMonth?: string, endMonth?: string) {
  const { data, error } = await supabase.rpc('get_category_trend', {
    p_start_month: startMonth ?? null,
    p_end_month: endMonth ?? null,
  })
  if (error || !data) return []
  return (data as { year_month: string; category_small_name: string; share: number }[]).map((r) => ({
    year_month: r.year_month,
    category_small_name: r.category_small_name,
    share: Number(r.share),
  }))
}

export async function getPeriodComparison(startMonth: string, endMonth?: string, storeCode?: number) {
  const { data, error } = await supabase.rpc('get_period_comparison', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
    p_store_code: storeCode ?? null,
  })
  if (error || !data) return null
  return data as {
    currSales: number; currQty: number
    prevSales: number; prevQty: number
    prevStart: string; prevEnd: string
    salesChange: number | null; qtyChange: number | null
  }
}

export async function getMatrixData(startMonth: string, endMonth?: string) {
  const { data, error } = await supabase.rpc('get_matrix_data', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
  })
  if (error || !data) return { stores: [], categories: [], matrix: {} }

  const rows = data as { store_code: number; store_name: string; category_small_name: string; total_sales: number }[]

  const storeMap = new Map<number, string>()
  const categorySet = new Set<string>()
  const matrix: Record<string, Record<number, number>> = {}

  for (const row of rows) {
    storeMap.set(row.store_code, row.store_name)
    categorySet.add(row.category_small_name)
    if (!matrix[row.category_small_name]) matrix[row.category_small_name] = {}
    matrix[row.category_small_name][row.store_code] = Number(row.total_sales)
  }

  const stores = [...storeMap.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code - b.code)

  const categorySales = [...categorySet].map((cat) => ({
    name: cat,
    total: stores.reduce((s, st) => s + (matrix[cat]?.[st.code] || 0), 0),
  }))
  const categories = categorySales.sort((a, b) => b.total - a.total).map((c) => c.name)

  return { stores, categories, matrix }
}

export async function getItoenData(startMonth: string, endMonth?: string) {
  const { data, error } = await supabase.rpc('get_itouen_all', {
    p_start_month: startMonth,
    p_end_month: endMonth ?? null,
  })
  if (error || !data) return { stores: [], products: [], salesMap: {}, indexMap: {} }

  const raw = data as {
    storeTotals: { store_code: number; store_name: string; store_total: number }[]
    products: { product_code: string; product_name: string }[]
    sales: { store_code: number; product_code: string; total_sales: number }[]
  }

  const storeTotals = new Map<number, number>()
  for (const r of raw.storeTotals ?? []) {
    storeTotals.set(r.store_code, Number(r.store_total))
  }
  const grandTotal = [...storeTotals.values()].reduce((s, v) => s + v, 0)

  const salesMap: Record<string, Record<number, number>> = {}
  const storeSet = new Set<number>()
  for (const r of raw.sales ?? []) {
    storeSet.add(r.store_code)
    if (!salesMap[r.product_code]) salesMap[r.product_code] = {}
    salesMap[r.product_code][r.store_code] = Number(r.total_sales)
  }

  const stores = (raw.storeTotals ?? [])
    .filter((r) => storeSet.has(r.store_code))
    .map((r) => ({ code: r.store_code, name: r.store_name }))

  const products = (raw.products ?? []).map((p) => ({ code: p.product_code, name: p.product_name }))

  const storeCount = stores.length
  const indexMap: Record<string, Record<number, number>> = {}
  for (const product of products) {
    const productTotal = stores.reduce((s, st) => s + (salesMap[product.code]?.[st.code] || 0), 0)
    const avgPerStore = storeCount > 0 ? productTotal / storeCount : 0
    indexMap[product.code] = {}
    for (const store of stores) {
      const storeShare = grandTotal > 0 ? (storeTotals.get(store.code) || 0) / grandTotal : 0
      const expected = avgPerStore * storeShare * storeCount
      const actual = salesMap[product.code]?.[store.code] || 0
      indexMap[product.code][store.code] = expected > 0 ? actual / expected : 0
    }
  }

  return { stores, products, salesMap, indexMap }
}

// ---- ダウンロード用 ----

type DownloadRow = {
  year_month: string; store_code: number; store_name: string
  category_small_name: string; product_code: string; maker_name: string
  product_name: string; sales_amount: number; quantity: number
}

async function fetchSalesChunk(yearMonth: string, offset: number, limit = 5000): Promise<DownloadRow[]> {
  const { data, error } = await supabase.rpc('download_sales_chunk', {
    p_year_month: yearMonth,
    p_offset: offset,
    p_limit: limit,
  })
  if (error) throw new Error(error.message)
  return (data as DownloadRow[]) ?? []
}

export async function downloadMonthData(
  yearMonth: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<DownloadRow[]> {
  const CHUNK = 5000
  const total = await getSalesCount(yearMonth)
  const allRows: DownloadRow[] = []
  let offset = 0
  while (true) {
    const chunk = await fetchSalesChunk(yearMonth, offset, CHUNK)
    if (chunk.length === 0) break
    allRows.push(...chunk)
    offset += chunk.length
    onProgress?.(allRows.length, total)
    if (chunk.length < CHUNK) break
  }
  return allRows
}
