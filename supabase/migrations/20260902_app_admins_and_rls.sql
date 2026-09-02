-- 管理者を「テーブル」で管理する方式へ移行し、あわせてRLSを整理する。
--
-- 【背景】
-- 管理者は AuthContext.tsx の ADMIN_EMAIL と、sales_data のRLSポリシーの
-- 両方に個人のメールアドレスがベタ書きされていた。担当者が替わるたびに
-- コード修正と再デプロイが必要で、実質1人しかデータを取り込めなかった。
--
-- さらに sales_data には anon ロール（＝未ログイン）に対して
-- SELECT/INSERT/UPDATE/DELETE をすべて許可するポリシーが残っていた。
-- anonキーはクライアントJSに埋め込まれ公開されているため、
-- 誰でもログインせずに全データを削除できる状態だった。
--
-- 【移行後】
-- ・app_admins テーブルが唯一の管理者名簿。追加・削除はアプリ画面から行える。
-- ・閲覧とエクスポートはログイン済みなら全員可。取込・更新・削除は管理者のみ。
-- ・data_import_log に「誰がいつ何を操作したか」を追記のみで記録する。
--
-- ※ leaf_sales_data 側のポリシーと Leaf用RPCは sendo-leaf-app リポジトリの
--   同日付のマイグレーションで定義している（同一Supabaseプロジェクト）。

-- ─── Phase 0: 未ログインへの全権限を剥奪 ───────────────────────
drop policy if exists "allow_all_anon" on public.sales_data;

-- ─── 管理者名簿 ────────────────────────────────────────────
create table if not exists public.app_admins (
  email      text primary key,
  note       text,
  created_by text,
  created_at timestamptz not null default now()
);

comment on table public.app_admins is '管理者名簿。ここに載っているメールアドレスのみデータの取込・削除ができる。';

-- メールアドレスは常に小文字・トリムして保存する（大文字混在での判定漏れを防ぐ）
create or replace function public.app_admins_normalize_email()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists app_admins_normalize_email_trg on public.app_admins;
create trigger app_admins_normalize_email_trg
  before insert or update on public.app_admins
  for each row execute function public.app_admins_normalize_email();

-- 最後の1人は削除できない（全員消して誰も管理できなくなる事故を防ぐ）
create or replace function public.app_admins_prevent_last_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.app_admins) <= 1 then
    raise exception '管理者は最低1人必要です。最後の管理者は削除できません。';
  end if;
  return old;
end;
$$;

drop trigger if exists app_admins_prevent_last_delete_trg on public.app_admins;
create trigger app_admins_prevent_last_delete_trg
  before delete on public.app_admins
  for each row execute function public.app_admins_prevent_last_delete();

-- ログイン中のユーザーが管理者かどうか。
-- SECURITY DEFINER にすることで app_admins 自身のRLSを再帰的に評価せずに済む。
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_admins
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

comment on function public.is_app_admin() is 'ログイン中のユーザーが app_admins に登録されているかを返す。RLSポリシーとフロントの権限判定の両方から使う。';

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

alter table public.app_admins enable row level security;

drop policy if exists app_admins_select on public.app_admins;
create policy app_admins_select on public.app_admins
  for select to authenticated using (public.is_app_admin());

drop policy if exists app_admins_insert on public.app_admins;
create policy app_admins_insert on public.app_admins
  for insert to authenticated with check (public.is_app_admin());

drop policy if exists app_admins_update on public.app_admins;
create policy app_admins_update on public.app_admins
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists app_admins_delete on public.app_admins;
create policy app_admins_delete on public.app_admins
  for delete to authenticated using (public.is_app_admin());

-- 初期管理者。
-- bukkepapa@gmail.com は移行中のロックアウト防止用。新しい管理者でのログインを
-- 確認できたら、データ管理画面から外してよい。
insert into public.app_admins (email, note, created_by) values
  ('ing05097@itoen.co.jp', '初期管理者',                           'migration'),
  ('ing15547@itoen.co.jp', '初期管理者',                           'migration'),
  ('bukkepapa@gmail.com',  '開発保守用（移行確認後に削除して可）', 'migration')
on conflict (email) do nothing;

-- ─── sales_data のRLSを app_admins ベースへ ───────────────────
drop policy if exists "allow_admin_all"            on public.sales_data;
drop policy if exists "allow_authenticated_select" on public.sales_data;

create policy sales_data_select on public.sales_data
  for select to authenticated using (true);

create policy sales_data_insert on public.sales_data
  for insert to authenticated with check (public.is_app_admin());

create policy sales_data_update on public.sales_data
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy sales_data_delete on public.sales_data
  for delete to authenticated using (public.is_app_admin());

-- ─── 操作履歴 ──────────────────────────────────────────────
-- 管理者を複数人に開くと「このデータは誰が入れたのか」が必ず問題になるため、
-- 権限を開くのとセットで台帳を用意する。
create table if not exists public.data_import_log (
  id             bigserial primary key,
  app            text        not null check (app in ('pos', 'leaf')),
  action         text        not null check (action in ('import', 'delete')),
  target         text        not null,
  row_count      integer     not null default 0,
  operator_email text        not null default lower(auth.jwt() ->> 'email'),
  created_at     timestamptz not null default now()
);

comment on table public.data_import_log is 'データの取込・削除の操作履歴。誰がいつ何月分を何行操作したかを記録する。追記のみで更新・削除はできない。';

create index if not exists data_import_log_app_created_at_idx
  on public.data_import_log (app, created_at desc);

alter table public.data_import_log enable row level security;

-- 履歴はログイン済みなら全員が閲覧できる（透明性のための台帳なので隠さない）
drop policy if exists data_import_log_select on public.data_import_log;
create policy data_import_log_select on public.data_import_log
  for select to authenticated using (true);

-- 記録できるのは管理者のみ。かつ operator_email は自分のアドレス以外書けない。
drop policy if exists data_import_log_insert on public.data_import_log;
create policy data_import_log_insert on public.data_import_log
  for insert to authenticated
  with check (
    public.is_app_admin()
    and operator_email = lower(auth.jwt() ->> 'email')
  );

-- UPDATE / DELETE のポリシーは意図的に作らない（履歴は改竄・削除できない）
