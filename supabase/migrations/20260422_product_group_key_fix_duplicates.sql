-- ================================================================
-- product_group_key: normalize_name + おーいお茶ブランド名を除去
-- これにより "おーいお茶 PURE GREEN 600ml" と "PURE GREEN 600ml" を
-- 同一商品として統合できる（リニューアル品の名前変更に対応）
-- ================================================================
CREATE OR REPLACE FUNCTION product_group_key(n text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(normalize_name(n), 'おーいお茶', '')
$$;

-- ================================================================
-- get_product_ranking: product_group_key でグループ化
-- 同一商品の複数コード（リニューアル品）を1行に統合する
-- 前年比も同じgkeyで照合するため、コード変更・改名の両方を吸収
-- ================================================================
CREATE OR REPLACE FUNCTION get_product_ranking(
  p_start_month         text,
  p_end_month           text    DEFAULT NULL,
  p_store_code          int     DEFAULT NULL,
  p_category_small_name text    DEFAULT NULL,
  p_limit               int     DEFAULT 100
)
RETURNS TABLE(
  product_code        text,
  product_name        text,
  maker_name          text,
  category_small_name text,
  total_sales         bigint,
  total_quantity      bigint,
  yoy_sales           numeric,
  yoy_quantity        numeric
)
LANGUAGE sql STABLE AS $$

WITH
-- 当期：product_group_key でリニューアル品を統合
curr AS (
  SELECT
    product_group_key(product_name)                      AS gkey,
    mode() WITHIN GROUP (ORDER BY product_name)          AS pn,
    mode() WITHIN GROUP (ORDER BY product_code)          AS pc,
    mode() WITHIN GROUP (ORDER BY maker_name)            AS mkr,
    mode() WITHIN GROUP (ORDER BY category_small_name)   AS cat,
    SUM(sales_amount)                                    AS total_sales,
    SUM(quantity)                                        AS total_quantity
  FROM sales_data
  WHERE year_month BETWEEN p_start_month AND COALESCE(p_end_month, p_start_month)
    AND (p_store_code          IS NULL OR store_code          = p_store_code)
    AND (p_category_small_name IS NULL OR category_small_name = p_category_small_name)
  GROUP BY product_group_key(product_name)
),
-- 前年同期：同じgkeyで集計（コード変更・改名の両方を吸収）
prev AS (
  SELECT
    product_group_key(product_name)  AS gkey,
    SUM(sales_amount)                AS total_sales,
    SUM(quantity)                    AS total_quantity
  FROM sales_data
  WHERE year_month BETWEEN prev_ym(p_start_month)
                       AND prev_ym(COALESCE(p_end_month, p_start_month))
    AND (p_store_code          IS NULL OR store_code          = p_store_code)
    AND (p_category_small_name IS NULL OR category_small_name = p_category_small_name)
  GROUP BY product_group_key(product_name)
)
SELECT
  c.pc  AS product_code,
  c.pn  AS product_name,
  c.mkr AS maker_name,
  c.cat AS category_small_name,
  c.total_sales,
  c.total_quantity,
  CASE WHEN p.total_sales    > 0
       THEN ROUND((c.total_sales::numeric    / p.total_sales    - 1) * 100, 1) END AS yoy_sales,
  CASE WHEN p.total_quantity > 0
       THEN ROUND((c.total_quantity::numeric / p.total_quantity - 1) * 100, 1) END AS yoy_quantity
FROM curr c
LEFT JOIN prev p ON c.gkey = p.gkey
ORDER BY c.total_sales DESC
LIMIT p_limit;
$$;

-- ================================================================
-- get_product_trend: product_group_key でグループ化
-- ================================================================
CREATE OR REPLACE FUNCTION get_product_trend(
  p_category_small_name text DEFAULT NULL,
  p_store_code          int  DEFAULT NULL,
  p_top_n               int  DEFAULT 15
)
RETURNS TABLE(year_month text, product_name text, total_sales bigint)
LANGUAGE sql STABLE AS $$

WITH
-- 全期間で上位N商品のgkeyを選択
top_products AS (
  SELECT product_group_key(product_name) AS gkey
  FROM sales_data
  WHERE (p_category_small_name IS NULL OR category_small_name = p_category_small_name)
    AND (p_store_code          IS NULL OR store_code          = p_store_code)
  GROUP BY product_group_key(product_name)
  ORDER BY SUM(sales_amount) DESC
  LIMIT p_top_n
),
-- 月別×商品別の売上（表示名はmode()で代表値を使用）
monthly AS (
  SELECT
    sd.year_month,
    product_group_key(sd.product_name)              AS gkey,
    mode() WITHIN GROUP (ORDER BY sd.product_name)  AS pn,
    SUM(sd.sales_amount)                            AS total_sales
  FROM sales_data sd
  JOIN top_products tp ON product_group_key(sd.product_name) = tp.gkey
  WHERE (p_category_small_name IS NULL OR sd.category_small_name = p_category_small_name)
    AND (p_store_code          IS NULL OR sd.store_code          = p_store_code)
  GROUP BY sd.year_month, product_group_key(sd.product_name)
)
SELECT
  year_month,
  pn AS product_name,
  total_sales
FROM monthly
ORDER BY year_month, total_sales DESC;
$$;
