import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { AppStateProvider } from '@/context/AppStateContext'

const noto = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'せんどう POS分析',
  description: '店舗別・商品別販売分析ダッシュボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${noto.className} bg-gray-50`}>
        <AppStateProvider>
          <Sidebar />
          <main className="md:ml-56 min-h-screen">
            <div className="p-6 pt-16 md:pt-6">{children}</div>
          </main>
        </AppStateProvider>
      </body>
    </html>
  )
}
