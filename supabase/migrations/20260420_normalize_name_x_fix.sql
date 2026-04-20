-- normalize_name: 乗算記号「×」(U+00D7) を大文字 X に統一
-- 「ＰＥＴ健康ミネラルむぎ茶２ＬＸ６」と「ＰＥＴ健康ミネラルむぎ茶２Ｌ×６」を同一商品として前年比マッチング可能にする

CREATE OR REPLACE FUNCTION normalize_name(n text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    replace(
      translate(
        COALESCE(n, ''),
        '　ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９',
        ' abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      ),
      '×', 'X'  -- 乗算記号(U+00D7) → 大文字X（全角Ｘの変換結果と統一）
    ),
    '\s+', '', 'g'
  )
$$;
