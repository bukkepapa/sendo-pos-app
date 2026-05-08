export default function IndexBar({ catIdx, prodIdx }: { catIdx: number; prodIdx: number }) {
  const MAX = 2.0
  const catPct = Math.min((catIdx / MAX) * 100, 100)
  const prodPct = Math.min((prodIdx / MAX) * 100, 100)
  const gap = prodIdx - catIdx

  let barColor = 'bg-green-400'
  if (gap < -0.5) barColor = 'bg-red-400'
  else if (gap < -0.2) barColor = 'bg-orange-300'
  else if (gap < 0) barColor = 'bg-yellow-300'
  else if (gap > 0.3) barColor = 'bg-blue-400'

  return (
    <div className="relative w-full h-4 bg-gray-100 rounded overflow-visible">
      <div
        className={`absolute inset-y-0 left-0 rounded ${barColor}`}
        style={{ width: `${prodPct}%` }}
      />
      <div
        className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-gray-600 z-10 rounded-sm"
        style={{ left: `${catPct}%` }}
        title={`カテゴリ指数: ${catIdx.toFixed(2)}`}
      />
    </div>
  )
}
