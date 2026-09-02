'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/* ─── ログインを許可するアドレス ─────────────────────────────
   「ログインできる人」の定義であって、「管理者」の定義ではない。
   管理者かどうかは app_admins テーブル（DB）が唯一の名簿で、
   このファイルには特定個人のアドレスを持たせない。              */
const ALLOWED_DOMAIN = 'itoen.co.jp'
/** 開発保守用。伊藤園ドメイン以外でログインが必要なアカウントだけをここに置く。 */
const EXTRA_ALLOWED_EMAILS = ['bukkepapa@gmail.com']

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return EXTRA_ALLOWED_EMAILS.includes(normalized) || normalized.endsWith(`@${ALLOWED_DOMAIN}`)
}

/* ─── Context 型 ────────────────────────────────────────── */
type AuthContextType = {
  user: User | null
  loading: boolean
  isAdmin: boolean
  /** 管理者名簿を編集した直後など、自分の権限を取り直したいときに呼ぶ */
  refreshAdmin: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  refreshAdmin: async () => {},
  signOut: async () => {},
})

/* ─── Provider ──────────────────────────────────────────── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  /** 自分が app_admins に載っているかをDBに問い合わせる */
  const fetchIsAdmin = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc('is_app_admin')
    if (error) {
      console.error('管理者判定に失敗しました', error)
      return false
    }
    return data === true
  }, [])

  const refreshAdmin = useCallback(async () => {
    setIsAdmin(await fetchIsAdmin())
  }, [fetchIsAdmin])

  useEffect(() => {
    let active = true

    /* セッションと管理者判定をひとまとめに解決する。
       isAdmin が確定する前に loading を false にすると、AuthGuard が
       管理者を /admin から追い出してしまうため、必ず両方揃えてから落とす。 */
    const resolve = async (u: User | null) => {
      if (u && !isAllowedEmail(u.email ?? '')) {
        // 許可されていないメールアドレスは即サインアウト
        await supabase.auth.signOut()
        if (!active) return
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const admin = u ? await fetchIsAdmin() : false
      if (!active) return
      setUser(u)
      setIsAdmin(admin)
      setLoading(false)
    }

    // 現在のセッションを確認（ページリロード後など）
    supabase.auth.getSession().then(({ data: { session } }) => resolve(session?.user ?? null))

    // 認証状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // トークン自動更新のたびにローディング画面を挟まないよう、更新イベントは無視する
      if (event === 'TOKEN_REFRESHED') return
      // このコールバックは supabase-js が認証ロックを保持したまま呼ぶため、
      // 中から supabase の別APIを直接叩くとロックの取り合いでハングすることがある。
      // 一度イベントループに逃がしてから実行する。
      setTimeout(() => resolve(session?.user ?? null), 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchIsAdmin])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refreshAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
