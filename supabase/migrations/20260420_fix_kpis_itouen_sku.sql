-- get_kpis: productCount を伊藤園商品のSKU数に修正
-- 修正前: COUNT(DISTINCT product_code) → 全商品のSKU数
-- 修正後: COUNT(DISTINCT product_name) FILTER (WHERE product_name LIKE '%伊藤園%') → 伊藤園のみ

CREATE OR REPLACE FUNCTION get_kpis(
  p_start_month text,
  p_end_month   text DEFAULT NULL
)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'totalSales',    COALESCE(SUM(sales_amount), 0),
    'totalQuantity', COALESCE(SUM(quantity), 0),
    'storeCount',    COUNT(DISTINCT store_code),
    'productCount',  COUNT(DISTINCT product_name) FILTER (WHERE product_name LIKE '%伊藤園%')
  )
  FROM sales_data
  WHERE year_month BETWEEN p_start_month AND COALESCE(p_end_month, p_start_month);
$$;
