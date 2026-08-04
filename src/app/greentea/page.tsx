'use client'

import BrandTrendView from '@/components/BrandTrendView'
import { getGreenTeaBrandTrend } from '@/lib/queries'

const BRANDS = ['お～いお茶', '伊右衛門', '綾鷹', '生茶']
const COLORS = ['#16a34a', '#0891b2', '#dc2626', '#d97706']

export default function GreenTeaPage() {
  return (
    <BrandTrendView
      title="緑茶ブランド比較"
      subtitle="お～いお茶（伊藤園）／伊右衛門（サントリー）／綾鷹（コカ・コーラ）／生茶（キリン）の4ブランドを比較します。"
      brands={BRANDS}
      colors={COLORS}
      fetchTrend={getGreenTeaBrandTrend}
    />
  )
}
