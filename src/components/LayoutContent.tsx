'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import AuthGuard from './AuthGuard'

/**
 * /login ページはサイドバー・AuthGuard なしでレンダリング。
 * その他のページは AuthGuard + Sidebar でラップ。
 */
export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // ログインページはそのまま表示
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <AuthGuard>
      <Sidebar />
      <main className="md:ml-56 min-h-screen">
        <div className="p-6 pt-16 md:pt-6">{children}</div>
      </main>
    </AuthGuard>
  )
}
