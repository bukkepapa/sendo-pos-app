-- カテゴリー伸長分析の表に販売点数を出すため、get_category_trend_detail に total_qty を追加
-- 戻り値の列が増えるので CREATE OR REPLACE では差し替えられず、一度 DROP する
DROP FUNCTION IF EXISTS get_category_trend_detail(text, text, integer);

CREATE FUNCTION get_category_trend_detail(
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL,
  p_store_code  integer DEFAULT NULL
)
RETURNS TABLE(
  year_month text,
  category_small_name text,
  total_sales numeric,
  total_qty numeric,
  yoy_ratio numeric
)
LANGUAGE sql STABLE
SET statement_timeout TO '15s'
AS $$
  WITH cur AS (
    SELECT year_month, category_small_name,
           SUM(sales_amount)::numeric AS ts,
           SUM(quantity)::numeric     AS tq
    FROM sales_data
    WHERE (p_start_month IS NULL OR year_month >= p_start_month)
      AND (p_end_month IS NULL OR year_month <= p_end_month)
      AND (p_store_code IS NULL OR store_code = p_store_code)
    GROUP BY year_month, category_small_name
  ),
  prev AS (
    SELECT year_month, category_small_name, SUM(sales_amount)::numeric AS ps
    FROM sales_data
    WHERE (p_store_code IS NULL OR store_code = p_store_code)
    GROUP BY year_month, category_small_name
  )
  SELECT
    c.year_month,
    c.category_small_name,
    c.ts AS total_sales,
    c.tq AS total_qty,
    CASE WHEN p.ps > 0 THEN ROUND(c.ts / p.ps * 100, 1) END AS yoy_ratio
  FROM cur c
  LEFT JOIN prev p
    ON p.category_small_name = c.category_small_name
   AND p.year_month = prev_ym(c.year_month)
  ORDER BY c.year_month, c.category_small_name;
$$;

NOTIFY pgrst, 'reload schema';
