<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🚀 デプロイ手順

本番URLは **https://sendo-pos-app.vercel.app**（Vercelプロジェクト `sendo-pos-app`）。

VercelプロジェクトはGitHubリポジトリに接続済みなので、**`master` に push すれば自動でデプロイされる**。

## 完了確認（必須）

push しただけで「デプロイ完了」と報告しない。Vercelのプロジェクト画面 Overview で
**Production Deployment の Source が push したコミットになっていること**を確認する。

自動デプロイが走らないときは、Vercel CLI で直接叩く：

```bash
vercel deploy --prod --yes
```

`npm run deploy` は `git push` と上記を続けて実行するショートカット。

## 認証について

全ページが `AuthGuard`（`src/app/layout.tsx` → `AuthProvider` → `LayoutContent`）配下にあり、
ログイン必須。**`layout.tsx` から `AuthProvider` / `LayoutContent` を外さないこと。**
外すとSupabaseへの問い合わせが未ログイン（anonロール）で飛び、RLSにより
データが1件も返らなくなる。

## 権限モデル

管理者は `app_admins` テーブルが唯一の名簿。コードにメールアドレスをベタ書きしない。

- 閲覧・エクスポート: ログイン済みなら全員
- 取込・更新・削除: `app_admins` に登録されたユーザーのみ

判定はDB関数 `is_app_admin()` で行い、RLSポリシーとフロントの両方から使う。

## SQL関数を追加・変更したとき

PostgRESTのスキーマキャッシュに反映されず「関数が見つからない」となるため、必ず実行する：

```sql
NOTIFY pgrst, 'reload schema';
```
