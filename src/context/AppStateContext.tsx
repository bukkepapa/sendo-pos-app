'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAvailableMonths } from '@/lib/queries'

type AppState = {
  months: string[]
  startMonth: string
  endMonth: string
  setStartMonth: (m: string) => void
  setEndMonth: (m: string) => void
}

const AppStateContext = createContext<AppState>({
  months: [],
  startMonth: '',
  endMonth: '',
  setStartMonth: () => {},
  setEndMonth: () => {},
})

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [months, setMonths] = useState<string[]>([])
  const [startMonth, setStartMonthRaw] = useState('')
  const [endMonth, setEndMonthRaw] = useState('')

  useEffect(() => {
    getAvailableMonths().then((ms) => {
      setMonths(ms)
      if (ms.length > 0) {
        // ソート順に依存せず、常に最古月をstart・最新月をendに設定する
        const sorted = [...ms].sort()
        setStartMonthRaw(sorted[0])
        setEndMonthRaw(sorted[sorted.length - 1])
      }
    })
  }, [])

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
    <AppStateContext.Provider value={{ months, startMonth, endMonth, setStartMonth, setEndMonth }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  return useContext(AppStateContext)
}
