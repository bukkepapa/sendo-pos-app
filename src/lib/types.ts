export interface SalesRow {
  id?: number
  year_month: string
  store_code: number
  store_name: string
  category_small_name: string
  product_code: string
  maker_name: string
  product_name: string
  sales_amount: number
  quantity: number
}

export interface StoreSummary {
  store_code: number
  store_name: string
  total_sales: number
  total_quantity: number
  share: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

export interface ProductSummary {
  product_code: string
  product_name: string
  maker_name: string
  category_small_name: string
  total_sales: number
  total_quantity: number
  rank: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

export interface CategorySummary {
  category_small_name: string
  total_sales: number
  total_quantity: number
}

export interface MakerSummary {
  maker_name: string
  total_sales: number
  total_quantity: number
  share: number
  yoy_sales: number | null
  yoy_quantity: number | null
}

export interface MakerTrend {
  year_month: string
  maker_name: string
  total_sales: number
  share: number
}

export interface MonthlyTrend {
  year_month: string
  total_sales: number
  total_quantity: number
}
