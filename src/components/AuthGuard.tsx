'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 未ログイン → ログイン画面へ
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // 認証確認中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未ログイン（redirect中）
  if (!user) return null

  // ページ内の操作単位の権限（取込・削除は管理者のみ）は各ページとRLSで制御する
  return <>{children}</>
}
