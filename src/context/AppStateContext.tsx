'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { getAvailableMonths } from '@/lib/queries'
import { useAuth } from './AuthContext'

type AppState = {
  months: string[]
  startMonth: string
  endMonth: string
  monthsReady: boolean   // 月一覧の取得が完了したか（データが空でもtrue）
  setStartMonth: (m: string) => void
  setEndMonth: (m: string) => void
  refreshMonths: () => Promise<void>  // 月一覧を取り直す（アップロード後など）
}

const AppStateContext = createContext<AppState>({
  months: [],
  startMonth: '',
  endMonth: '',
  monthsReady: false,
  setStartMonth: () => {},
  setEndMonth: () => {},
  refreshMonths: async () => {},
})

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const [months, setMonths] = useState<string[]>([])
  const [startMonth, setStartMonthRaw] = useState('')
  const [endMonth, setEndMonthRaw] = useState('')
  const [monthsReady, setMonthsReady] = useState(false)
  // 初期選択（最古〜最新）をセット済みかどうか。一度セットしたらユーザーの選択を尊重する
  const initializedRef = useRef(false)

  // 取得した月一覧を反映する。初回のみ start/end を初期化し、以降はユーザーの選択を維持する
  const applyMonths = useCallback((ms: string[]) => {
    setMonths(ms)
    if (ms.length > 0 && !initializedRef.current) {
      // ソート順に依存せず、常に最古月をstart・最新月をendに設定する
      const sorted = [...ms].sort()
      setStartMonthRaw(sorted[0])
      setEndMonthRaw(sorted[sorted.length - 1])
      initializedRef.current = true
    }
    setMonthsReady(true)  // データが空でも「取得完了」
  }, [])

  const refreshMonths = useCallback(async () => {
    applyMonths(await getAvailableMonths())
  }, [applyMonths])

  // 認証完了後（user が確定してから）月一覧を取得し、以降は画面遷移のたびに取り直す。
  // ログイン前に問い合わせると未ログイン（anonロール）で飛び、RLSにより1件も返らず、
  // 月一覧が空のまま固定されて全画面が「読み込み中」で止まる。
  // 遷移のたびに取り直すのは、アップロード後の新しい月を自動で反映するため。
  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false
    getAvailableMonths().then((ms) => { if (!cancelled) applyMonths(ms) })
    return () => { cancelled = true }
  }, [pathname, authLoading, user, applyMonths])

  // タブに戻ってきたとき（別タブで作業して戻った等）にも取り直す
  useEffect(() => {
    if (authLoading || !user) return
    const onFocus = () => { refreshMonths() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authLoading, user, refreshMonths])

  const setStartMonth = (m: string) => {
    setStartMonthRaw(m)
    // 開始月が終了月より新しくなったら終了月も合わせる
    if (endMonth && m > endMonth) setEndMonthRaw(m)
  }

  const setEndMonth = (m: string) => {
    setEndMonthRaw(m)
    // 終了月が開始月より古くなったら開始月も合わせる
    if (startMonth && m < startMonth) setStartMonthRaw(m)
  }

  return (
    <AppStateContext.Provider value={{
      months, startMonth, endMonth, monthsReady,
      setStartMonth, setEndMonth, refreshMonths,
    }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppStateContext)
}
