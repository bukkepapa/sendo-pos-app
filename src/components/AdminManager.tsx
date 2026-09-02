'use client'

import { useCallback, useEffect, useState } from 'react'
import { isAllowedEmail, useAuth } from '@/context/AuthContext'
import { addAdmin, listAdmins, removeAdmin, type AdminUser } from '@/lib/queries'

/**
 * 管理者名簿（app_admins）の編集UI。
 * ここに載っているアドレスだけがデータの取込・削除をできる。
 * 名簿はDBが唯一の情報源なので、担当者が替わってもコード修正・再デプロイは不要。
 */
export default function AdminManager() {
  const { user, refreshAdmin } = useAuth()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null)

  const reload = useCallback(async () => {
    try {
      setAdmins(await listAdmins())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  async function handleAdd() {
    const normalized = email.trim().toLowerCase()
    setError('')
    setMessage('')

    if (!isAllowedEmail(normalized)) {
      setError('このシステムにログインできるアドレス（@itoen.co.jp）を指定してください')
      return
    }
    if (admins.some((a) => a.email === normalized)) {
      setError('すでに管理者として登録されています')
      return
    }

    setBusy(true)
    try {
      await addAdmin(normalized, user?.email ?? '', note.trim())
      setEmail('')
      setNote('')
      setMessage(`✅ ${normalized} を管理者に追加しました`)
      await reload()
      await refreshAdmin()
    } catch (err) {
      setError(`追加に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await removeAdmin(removeTarget.email)
      setMessage(`✅ ${removeTarget.email} を管理者から外しました`)
      await reload()
      await refreshAdmin()
    } catch (err) {
      setError(`削除に失敗しました: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
      setRemoveTarget(null)
    }
  }

  const isSelf = (a: AdminUser) => a.email === user?.email?.toLowerCase()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">管理者の管理</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          ここに登録されたアドレスだけがデータの取込・削除をできます。閲覧とエクスポートはログインした全員が可能です。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">読込中...</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {admins.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">
                  {a.email}
                  {isSelf(a) && (
                    <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                      自分
                    </span>
                  )}
                </p>
                {a.note && <p className="text-xs text-gray-400 truncate">{a.note}</p>}
              </div>
              <button
                onClick={() => setRemoveTarget(a)}
                disabled={busy || admins.length <= 1}
                title={admins.length <= 1 ? '管理者は最低1人必要です' : '管理者から外す'}
                className="shrink-0 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400
                  px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 追加フォーム */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && email.trim() && handleAdd()}
          placeholder="name@itoen.co.jp"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="メモ（任意・部署名など）"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <button
          onClick={handleAdd}
          disabled={busy || !email.trim()}
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-lg
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          追加
        </button>
      </div>

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</p>
      )}
      {message && (
        <p className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">{message}</p>
      )}

      {/* 削除確認ダイアログ */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-2">🔑</p>
              <h3 className="text-lg font-bold text-gray-800">管理者から外しますか？</h3>
              <p className="text-sm text-gray-500 mt-1 break-all">
                <strong className="text-red-600">{removeTarget.email}</strong>
                <br />
                データの取込・削除ができなくなります（閲覧は引き続き可能です）。
              </p>
              {isSelf(removeTarget) && (
                <p className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2 text-xs">
                  ⚠️ 自分自身を外そうとしています。実行するとこの画面を開けなくなります。
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                disabled={busy}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50
                  transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleRemove}
                disabled={busy}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg
                  transition-colors font-medium disabled:opacity-60"
              >
                {busy ? '処理中...' : '外す'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
