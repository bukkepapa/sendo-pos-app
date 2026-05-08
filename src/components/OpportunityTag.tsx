export default function OpportunityTag({ catIdx, prodIdx }: { catIdx: number; prodIdx: number }) {
  const gap = prodIdx - catIdx
  if (catIdx >= 1.1 && prodIdx < 0.8)
    return <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">🔴 大チャンス</span>
  if (catIdx >= 1.0 && gap < -0.3)
    return <span className="text-xs font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">🟡 チャンス</span>
  if (prodIdx >= 1.5 && prodIdx > catIdx * 1.3)
    return <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">🟢 好調</span>
  return null
}
