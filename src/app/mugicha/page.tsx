'use client'

import BrandTrendView from '@/components/BrandTrendView'
import { getMugichaBrandTrend } from '@/lib/queries'

const BRANDS = ['健康ミネラルむぎ茶', 'やさしい麦茶', 'やかんの麦茶']
const COLORS = ['#16a34a', '#2563eb', '#dc2626']

export default function MugichaPage() {
  return (
    <BrandTrendView
      title="麦茶ブランド比較"
      subtitle="健康ミネラルむぎ茶（伊藤園）／やさしい麦茶（サントリー）／やかんの麦茶（コカ・コーラ）の3ブランドを比較します。"
      brands={BRANDS}
      colors={COLORS}
      fetchTrend={getMugichaBrandTrend}
    />
  )
}
