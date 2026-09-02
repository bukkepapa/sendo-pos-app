import Papa from 'papaparse'

/**
 * CSVを生成してブラウザにダウンロードさせる。
 * Excelでそのまま開いても文字化けしないよう、先頭にUTF-8のBOMを付ける。
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null)[][]
) {
  const csv = Papa.unparse({ fields: headers, data: rows })
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
