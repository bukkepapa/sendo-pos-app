'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { getAvailableMonths, getSalesCount } from '@/lib/queries'
import type { SalesRow } from '@/lib/types'

type Status = 'idle' | 'parsing' | 'uploading' | 'done' | 'error'

interface DeleteConfirm {
  yearMonth: string | 'all'
  label: string
  count: number
}

interface Preview {
  headers: string[]
  rows: string[][]
  totalRows: number
  yearMonth: string
}

const CHUNK_SIZE = 500

// "2025/05" or "2025-05" → "2025-05"
function toYearMonth(val: string): string {
  const m = String(val).trim().match(/(\d{4})[\/\-](\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : ''
}

// ファイルの先頭バイトを見てエンコーディングを自動判定
async function detectEncoding(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer)
      // UTF-8 BOM (EF BB BF) チェック
      if (arr[0] === 0xEF && arr[1] === 0xBB && arr[2] === 0xBF) {
        resolve('UTF-8')
        return
      }
      // 先頭200バイトをUTF-8でデコードして日本語（ひらがな・カタカナ・漢字）があればUTF-8と判定
      const sample = new TextDecoder('utf-8').decode(arr.slice(0, 200))
      if (/[\u3000-\u9FFF\uFF00-\uFFEF]/.test(sample)) {
        resolve('UTF-8')
      } else {
        resolve('Shift_JIS')
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 200))
  })
}

export default function AdminPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [countLoading, setCountLoading] = useState(false)

  useEffect(() => {
    getAvailableMonths().then(setAvailableMonths)
  }, [])

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      if (deleteConfirm.yearMonth !== 'all') {
        const { error } = await supabase
          .from('sales_data')
          .delete()
          .eq('year_month', deleteConfirm.yearMonth)
        if (error) throw error
      } else {
        const months = await getAvailableMonths()
        for (const m of months) {
          const { error } = await supabase
            .from('sales_data')
            .delete()
            .eq('year_month', m)
          if (error) throw error
        }
      }
      setMessage(`✅ ${deleteConfirm.label}のデータ（${deleteConfirm.count.toLocaleString()}件）を削除しました`)
      setStatus('done')
      const updated = await getAvailableMonths()
      setAvailableMonths(updated)
    } catch (err) {
      setMessage(`❌ 削除エラー: ${err instanceof Error ? err.message : String(err)}`)
      setStatus('error')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  async function openDeleteConfirm(yearMonth: string | 'all', label: string) {
    setCountLoading(true)
    try {
      const count = yearMonth === 'all'
        ? await getSalesCount()
        : await getSalesCount(yearMonth)
      setDeleteConfirm({ yearMonth, label, count })
    } finally {
      setCountLoading(false)
    }
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setMessage('CSVファイル（.csv）を選択してください')
      return
    }
    setSelectedFile(file)
    setStatus('parsing')
    setMessage('')
    setPreview(null)

    const encoding = await detectEncoding(file)

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding,
      complete: (results) => {
        const rows = results.data as string[][]
        if (rows.length < 2) {
          setMessage('データ行がありません')
          setStatus('error')
          return
        }
        const headers = rows[0]
        const dataRows = rows.slice(1)

        // 新フォーマット: 1列目が「対象年月」(例: 2025/05)
        const yearMonth = toYearMonth(String(dataRows[0][0]))

        if (!yearMonth) {
          setMessage('1列目（対象年月）の年月が認識できません。例: 2025/05')
          setStatus('error')
          return
        }

        setPreview({
          headers,
          rows: dataRows.slice(0, 5),
          totalRows: dataRows.length,
          yearMonth,
        })
        setStatus('idle')
      },
      error: () => {
        setMessage('ファイルの読み込みに失敗しました')
        setStatus('error')
      },
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function handleUpload() {
    if (!preview || !selectedFile) return
    setStatus('uploading')
    setProgress(0)
    setMessage('')

    const encoding = await detectEncoding(selectedFile)

    Papa.parse(selectedFile, {
      header: false,
      skipEmptyLines: true,
      encoding,
      complete: async (results) => {
        const rows = results.data as string[][]
        const dataRows = rows.slice(1)
        const yearMonth = preview.yearMonth

        try {
          setProgressLabel('既存データを削除中...')
          const { error: delError } = await supabase
            .from('sales_data')
            .delete()
            .eq('year_month', yearMonth)

          if (delError) throw delError

          const total = dataRows.length
          let inserted = 0

          for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
            const chunk = dataRows.slice(i, i + CHUNK_SIZE)
            // 新フォーマット列順:
            // 0:対象年月 1:店舗コード 2:店舗名称 3:小分類名称
            // 4:商品コード 5:メーカー名 6:商品名称 7:売上 8:点数
            const records: Omit<SalesRow, 'id'>[] = chunk.map((row) => ({
              year_month: yearMonth,
              store_code: parseInt(String(row[1])) || 0,
              store_name: String(row[2] || ''),
              category_small_name: String(row[3] || ''),
              product_code: String(row[4] || ''),
              maker_name: String(row[5] || ''),
              product_name: String(row[6] || ''),
              sales_amount: parseInt(String(row[7])) || 0,
              quantity: parseInt(String(row[8])) || 0,
            }))

            const { error: insError } = await supabase.from('sales_data').insert(records)
            if (insError) throw insError

            inserted += chunk.length
            const pct = Math.round((inserted / total) * 100)
            setProgress(pct)
            setProgressLabel(`アップロード中... ${inserted.toLocaleString()} / ${total.toLocaleString()} 行`)
          }

          setStatus('done')
          setMessage(`✅ ${yearMonth} のデータ（${total.toLocaleString()}行）をアップロードしました`)
          setPreview(null)
          setSelectedFile(null)
          if (fileRef.current) fileRef.current.value = ''
          const updatedMonths = await getAvailableMonths()
          setAvailableMonths(updatedMonths)
        } catch (err) {
          console.error(err)
          setMessage(`❌ エラーが発生しました: ${err instanceof Error ? err.message : String(err)}`)
          setStatus('error')
        }
      },
    })
  }

  const resetFile = useCallback(() => {
    setPreview(null)
    setSelectedFile(null)
    setStatus('idle')
    setMessage('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  function formatMonth(ym: string) {
    const [y, m] = ym.split('-')
    return `${y}年${parseInt(m)}月`
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-950">データ管理</h2>

      {/* 操作手順 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <p className="font-semibold mb-1">毎月のデータ取り込み手順</p>
        <ol className="list-decimal list-inside space-y-1 text-green-700">
          <li>「店別_小分類別_商品別_売上数量サマリー_メーカー名付_年月付」CSVを用意</li>
          <li>下のエリアにドラッグ&ドロップ（またはクリックして選択）</li>
          <li>プレビューを確認して「アップロード開始」をクリック</li>
        </ol>
        <p className="mt-2 text-xs text-green-600">※列順: 対象年月・店舗コード・店舗名称・小分類名称・商品コード・メーカー名・商品名称・売上・点数</p>
        <p className="mt-1 text-xs text-green-600">※同じ月のデータは自動的に上書きされます</p>
      </div>

      {/* ドロップエリア */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'}
          ${status === 'uploading' ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
        <p className="text-4xl mb-3">📤</p>
        {status === 'parsing' ? (
          <p className="text-gray-600">解析中...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">CSVファイルをここにドロップ</p>
            <p className="text-gray-400 text-sm mt-1">またはクリックして選択</p>
          </>
        )}
      </div>

      {/* プレビュー */}
      {preview && status !== 'uploading' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">プレビュー</p>
              <p className="text-sm text-gray-500">
                対象月: <strong className="text-green-700">{formatMonth(preview.yearMonth)}</strong>
                　／　総行数: <strong>{preview.totalRows.toLocaleString()}行</strong>
              </p>
            </div>
            <button onClick={resetFile} className="text-xs text-gray-400 hover:text-gray-600">
              ✕ キャンセル
            </button>
          </div>

          <div className="overflow-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-gray-50">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-gray-200 px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-1">（先頭5行を表示）</p>
          </div>

          {availableMonths.includes(preview.yearMonth) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
              ⚠️ {formatMonth(preview.yearMonth)} のデータはすでに存在します。アップロードすると上書きされます。
            </div>
          )}

          <button
            onClick={handleUpload}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            アップロード開始
          </button>
        </div>
      )}

      {/* プログレスバー */}
      {status === 'uploading' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">{progressLabel}</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-right">{progress}%</p>
        </div>
      )}

      {/* メッセージ */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium
          ${status === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* 登録済み月一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">登録済みデータ</h3>
          {availableMonths.length > 0 && (
            <button
              onClick={() => openDeleteConfirm('all', '全データ')}
              disabled={countLoading}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
            >
              {countLoading ? '読込中...' : '🗑️ 全データ削除'}
            </button>
          )}
        </div>
        {availableMonths.length === 0 ? (
          <p className="text-sm text-gray-400">まだデータがありません</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableMonths.map((m) => (
              <div key={m} className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-1 rounded-full">
                <span>{formatMonth(m)}</span>
                <button
                  onClick={() => openDeleteConfirm(m, formatMonth(m))}
                  className="ml-1 text-green-400 hover:text-red-500 transition-colors font-bold leading-none"
                  title={`${formatMonth(m)}を削除`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-2">🗑️</p>
              <h3 className="text-lg font-bold text-gray-800">データを削除しますか？</h3>
              <p className="text-sm text-gray-500 mt-1">
                <strong className="text-red-600">{deleteConfirm.label}</strong> の
                <strong className="text-red-600">{deleteConfirm.count.toLocaleString()}件</strong>
                のデータを削除します。<br />
                この操作は元に戻せません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
