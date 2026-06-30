-- カテゴリ別シェア月次推移（全期間・全店舗）
-- ダッシュボードの折れ線グラフ用
CREATE OR REPLACE FUNCTION get_category_trend()
RETURNS TABLE(year_month text, category_small_name text, share numeric)
LANGUAGE sql STABLE AS $$
WITH monthly_total AS (
  SELECT year_month, SUM(sales_amount) AS month_total
  FROM sales_data
  GROUP BY year_month
),
monthly_cat AS (
  SELECT sd.year_month, sd.category_small_name, SUM(sd.sales_amount) AS cat_total
  FROM sales_data sd
  GROUP BY sd.year_month, sd.category_small_name
)
SELECT
  mc.year_month,
  mc.category_small_name,
  ROUND(mc.cat_total::numeric / NULLIF(mt.month_total, 0) * 100, 1) AS share
FROM monthly_cat mc
JOIN monthly_total mt ON mc.year_month = mt.year_month
ORDER BY mc.year_month, mc.cat_total DESC;
$$;
