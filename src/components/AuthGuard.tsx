'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    // 未ログイン → ログイン画面へ
    if (!user) {
      router.replace('/login')
      return
    }

    // /admin は管理者のみ（それ以外はダッシュボードへ）
    if (pathname.startsWith('/admin') && !isAdmin) {
      router.replace('/')
    }
  }, [user, loading, isAdmin, pathname, router])

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

  // /admin に非管理者がアクセスしようとした（redirect中）
  if (pathname.startsWith('/admin') && !isAdmin) return null

  return <>{children}</>
}
