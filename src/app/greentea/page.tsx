'use client'

import BrandTrendView from '@/components/BrandTrendView'
import { getGreenTeaBrandTrend, getGreenTeaBrandTrendWithPureGreen } from '@/lib/queries'

const BRANDS = ['お～いお茶', '伊右衛門', '綾鷹', '生茶']
const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#d97706']

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
          title="緑茶ブランド比較（お～いお茶にPURE GREENを含めた場合）"
          subtitle="商品名に「伊藤園 PURE GREEN」を含む商品を「お～いお茶」ブランドの売上に合算した、もしもの比較です。他の3ブランド（伊右衛門／綾鷹／生茶）は上と同じ集計です。"
          brands={BRANDS}
          colors={COLORS}
          fetchTrend={getGreenTeaBrandTrendWithPureGreen}
        />
      </div>
    </div>
  )
}
