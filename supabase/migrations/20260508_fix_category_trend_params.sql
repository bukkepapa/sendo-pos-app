-- get_category_trend に期間フィルタ追加（後方互換: DEFAULT NULL で全期間表示は維持）
CREATE OR REPLACE FUNCTION get_category_trend(
  p_start_month text DEFAULT NULL,
  p_end_month   text DEFAULT NULL
)
RETURNS TABLE(year_month text, category_small_name text, share numeric)
LANGUAGE sql STABLE AS $$
WITH
  eff_start AS (SELECT COALESCE(p_start_month, MIN(sd.year_month)) FROM sales_data sd),
  eff_end   AS (SELECT COALESCE(p_end_month,   MAX(sd.year_month)) FROM sales_data sd),
  monthly_total AS (
    SELECT sd.year_month, SUM(sd.sales_amount) AS month_total
    FROM sales_data sd
    WHERE sd.year_month BETWEEN (SELECT * FROM eff_start) AND (SELECT * FROM eff_end)
    GROUP BY sd.year_month
  ),
  monthly_cat AS (
    SELECT sd.year_month, sd.category_small_name, SUM(sd.sales_amount) AS cat_total
    FROM sales_data sd
    WHERE sd.year_month BETWEEN (SELECT * FROM eff_start) AND (SELECT * FROM eff_end)
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
