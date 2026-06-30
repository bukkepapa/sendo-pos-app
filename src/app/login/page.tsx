'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAllowedEmail, useAuth } from '@/context/AuthContext'

type Step = 'email' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [email, setEmail] = useState('')
  const [otp, setOtp]     = useState('')
  const [step, setStep]   = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // 既にログイン済みならダッシュボードへ
  useEffect(() => {
    if (user) router.replace('/')
  }, [user, router])

  /* メールアドレスを送信して OTP を要求 */
  const sendOtp = async () => {
    setError('')
    const trimmed = email.trim().toLowerCase()

    if (!isAllowedEmail(trimmed)) {
      setError('ログインできるのは伊藤園メールアドレス（@itoen.co.jp）のみです')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    })
    setLoading(false)

    if (err) {
      setError(`送信に失敗しました: ${err.message}`)
      return
    }
    setStep('otp')
  }

  /* OTP を検証してログイン */
  const verifyOtp = async () => {
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'email',
    })
    setLoading(false)

    if (err) {
      // 実際のエラー内容を表示（デバッグ用）
      setError(`認証失敗: ${err.message}`)
      return
    }

    // 成功 → ダッシュボードへ
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white text-3xl">🍵</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">せんどうPOS分析</h1>
          <p className="text-sm text-gray-500 mt-1">伊藤園様 専用システム</p>
        </div>

        {step === 'email' ? (
          /* ─── STEP 1: メールアドレス入力 ─── */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && email && sendOtp()}
                placeholder="name@itoen.co.jp"
                autoComplete="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={sendOtp}
              disabled={loading || !email.trim()}
              className="w-full bg-green-700 text-white rounded-xl py-3 text-sm font-semibold
                hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? '送信中...' : '認証コードを送信'}
            </button>

            <p className="text-xs text-gray-400 text-center pt-1">
              @itoen.co.jp のメールアドレスのみ利用できます
            </p>
          </div>
        ) : (
          /* ─── STEP 2: OTP コード入力 ─── */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 text-center">
              <p className="font-medium">{email}</p>
              <p className="text-xs text-green-600 mt-0.5">に認証コードを送信しました</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                認証コード
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={(e) => e.key === 'Enter' && otp.length >= 6 && !loading && verifyOtp()}
                placeholder="コードを入力"
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl
                  tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-green-500
                  focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                コードの有効期限は10分です
              </p>
            </div>

            {/* 伊藤園ユーザー向けの代替手段案内 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">📩 @itoen.co.jp の方へ</p>
              <p className="leading-relaxed">
                コード入力で「Token has expired」エラーが出る場合は、
                メール本文内の<span className="font-bold">青いログインリンク</span>を直接クリックしてください。
                （社内メールセキュリティがコードを無効化することがあります）
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 break-all">
                {error}
              </div>
            )}

            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full bg-green-700 text-white rounded-xl py-3 text-sm font-semibold
                hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? '確認中...' : 'ログイン'}
            </button>

            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 transition-colors"
            >
              ← メールアドレスを変更
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
