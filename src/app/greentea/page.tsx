'use client'

import BrandTrendView from '@/components/BrandTrendView'
import { getGreenTeaBrandTrend, getOoiochaSizeTrend } from '@/lib/queries'

const BRANDS = ['お～いお茶', '伊右衛門', '綾鷹', '生茶']
const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#d97706']

const SIZE_CATEGORIES = ['大型容器（1L〜2L）', '中型容器（600ml台）', 'それ以外']
const SIZE_COLORS = ['#dc2626', '#2563eb', '#6b7280']

export default function GreenTeaPage() {
  return (
    <div className="space-y-10">
      <BrandTrendView
        title="緑茶ブランド比較"
        subtitle="お～いお茶（伊藤園）／伊右衛門（サントリー）／綾鷹（コカ・コーラ）／生茶（キリン）の4ブランドを比較します。"
        brands={BRANDS}
        colors={COLORS}
        fetchTrend={getGreenTeaBrandTrend}
      />

      <div className="border-t border-gray-200 pt-8">
        <BrandTrendView
          title="お～いお茶（PURE GREENを含む）容器サイズ別構成"
          subtitle="商品名に「伊藤園 PURE GREEN」を含む商品を「お～いお茶」ブランドに合算した場合の、容器サイズ別の構成比推移です。"
          brands={SIZE_CATEGORIES}
          colors={SIZE_COLORS}
          fetchTrend={getOoiochaSizeTrend}
          groupLabel="サイズ区分"
          showSizeFilter={false}
          showMonthSelector={false}
        />
      </div>
    </div>
  )
}
