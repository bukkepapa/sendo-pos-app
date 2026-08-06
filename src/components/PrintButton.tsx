'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      title="このページを印刷 / PDFで保存"
      className="print:hidden fixed bottom-6 right-6 z-30 flex items-center gap-2
        bg-green-700 hover:bg-green-800 text-white text-sm font-medium
        px-4 py-2.5 rounded-full shadow-lg transition-colors"
    >
      🖨️ 印刷 / PDF保存
    </button>
  )
}
