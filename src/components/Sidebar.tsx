'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: '📊' },
  { href: '/stores', label: '店舗別売上', icon: '🏪' },
  { href: '/products', label: '商品ランキング', icon: '🏆' },
  { href: '/maker', label: 'メーカーシェア', icon: '🏭' },
  { href: '/matrix', label: '売上マトリクス', icon: '📋' },
  { href: '/itouen', label: '伊藤園分析', icon: '🍵' },
  { href: '/greentea', label: '緑茶ブランド比較', icon: '🍵' },
  { href: '/mugicha', label: '麦茶ブランド比較', icon: '🫖' },
  { href: '/category-trend', label: 'カテゴリー伸長分析', icon: '📈' },
  { href: '/admin', label: 'データ管理', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  // 表示するユーザー名（メールの @ 前だけ）
  const displayName = user?.email?.split('@')[0] ?? ''
  const displayDomain = user?.email?.split('@')[1] ?? ''

  return (
    <>
      {/* モバイル用ハンバーガーボタン */}
      <button
        className="print:hidden fixed top-4 left-4 z-50 md:hidden bg-green-700 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* オーバーレイ（モバイル） */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={`print:hidden fixed left-0 top-0 h-full w-56 bg-green-800 text-white z-40 flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-4 border-b border-green-700 flex-shrink-0">
          <p className="text-xs text-green-300 font-medium tracking-wide">せんどう</p>
          <h1 className="text-lg font-bold leading-tight">POS分析</h1>
        </div>

        <nav className="mt-4 px-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-green-600 text-white'
                    : 'text-green-100 hover:bg-green-700 hover:text-white'
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* ─── ユーザー情報 ＋ ログアウト ─── */}
        <div className="flex-shrink-0 border-t border-green-700 p-3">
          {user && (
            <div className="mb-2 px-1">
              <p className="text-xs text-green-200 font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-green-400 truncate">@{displayDomain}</p>
              {isAdmin && (
                <span className="inline-block mt-0.5 text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                  管理者
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
              text-green-200 hover:bg-green-700 hover:text-white transition-colors"
          >
            <span>🚪</span>
            ログアウト
          </button>
        </div>
      </aside>
    </>
  )
}
