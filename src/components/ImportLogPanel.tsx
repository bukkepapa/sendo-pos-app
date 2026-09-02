'use client'

import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react'
import { listImportLog, type ImportLogEntry } from '@/lib/queries'

export type ImportLogHandle = { reload: () => void }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 取込・削除の操作履歴。
 * 管理者を複数人にすると「このデータは誰が入れたのか」が必ず問題になるため、
 * 権限を開くのとセットで台帳を残す。閲覧はログインした全員が可能。
 */
const ImportLogPanel = forwardRef<ImportLogHandle>(function ImportLogPanel(_props, ref) {
  const [entries, setEntries] = useState<ImportLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    listImportLog()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])
  useImperativeHandle(ref, () => ({ reload }), [reload])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">操作履歴</h3>

      {loading ? (
        <p className="text-sm text-gray-400">読込中...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-400">まだ履歴がありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-1.5 pr-3 font-medium whitespace-nowrap">日時</th>
                <th className="py-1.5 pr-3 font-medium whitespace-nowrap">操作</th>
                <th className="py-1.5 pr-3 font-medium whitespace-nowrap">対象</th>
                <th className="py-1.5 pr-3 font-medium whitespace-nowrap text-right">行数</th>
                <th className="py-1.5 font-medium whitespace-nowrap">実行者</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      e.action === 'import'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {e.action === 'import' ? '取込' : '削除'}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">{e.target}</td>
                  <td className="py-1.5 pr-3 text-gray-700 text-right whitespace-nowrap">
                    {e.row_count.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-gray-500 truncate max-w-[200px]">{e.operator_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
})

export default ImportLogPanel
