-- 選択期間 vs 前年同期の売上・点数比較
-- p_store_code を省略すると全店舗集計、指定すると当該店舗のみ
CREATE OR REPLACE FUNCTION get_period_comparison(
  p_start_month text,
  p_end_month   text DEFAULT NULL,
  p_store_code  int  DEFAULT NULL
)
RETURNS json LANGUAGE sql STABLE AS $$
WITH
  eff_end    AS (SELECT COALESCE(p_end_month, p_start_month) AS v),
  prev_start AS (SELECT to_char((p_start_month || '-01')::date - interval '1 year', 'YYYY-MM') AS v),
  prev_end   AS (SELECT to_char(((SELECT v FROM eff_end) || '-01')::date - interval '1 year', 'YYYY-MM') AS v),
  curr AS (
    SELECT
      COALESCE(SUM(sales_amount), 0) AS sales,
      COALESCE(SUM(quantity), 0)     AS qty
    FROM sales_data
    WHERE year_month BETWEEN p_start_month AND (SELECT v FROM eff_end)
      AND (p_store_code IS NULL OR store_code = p_store_code)
  ),
  prev AS (
    SELECT
      COALESCE(SUM(sales_amount), 0) AS sales,
      COALESCE(SUM(quantity), 0)     AS qty
    FROM sales_data
    WHERE year_month BETWEEN (SELECT v FROM prev_start) AND (SELECT v FROM prev_end)
      AND (p_store_code IS NULL OR store_code = p_store_code)
  )
SELECT json_build_object(
  'currSales',   c.sales,
  'currQty',     c.qty,
  'prevSales',   p.sales,
  'prevQty',     p.qty,
  'prevStart',   (SELECT v FROM prev_start),
  'prevEnd',     (SELECT v FROM prev_end),
  'salesChange', CASE WHEN p.sales > 0 THEN ROUND((c.sales::numeric / p.sales - 1) * 100, 1) END,
  'qtyChange',   CASE WHEN p.qty   > 0 THEN ROUND((c.qty::numeric   / p.qty   - 1) * 100, 1) END
)
FROM curr c, prev p;
$$;
