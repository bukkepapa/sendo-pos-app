'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/* ─── 定数 ─────────────────────────────────────────────── */
export const ADMIN_EMAIL = 'bukkepapa@gmail.com'
const ALLOWED_DOMAIN = 'itoen.co.jp'

export function isAllowedEmail(email: string): boolean {
  return email === ADMIN_EMAIL || email.endsWith(`@${ALLOWED_DOMAIN}`)
}

/* ─── Context 型 ────────────────────────────────────────── */
type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
})

/* ─── Provider ──────────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 現在のセッションを確認（ページリロード後など）
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u && !isAllowedEmail(u.email ?? '')) {
        // 許可されていないメールアドレスは即サインアウト
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && !isAllowedEmail(u.email ?? '')) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin: user?.email === ADMIN_EMAIL,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
