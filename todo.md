# Marutabi ToDo リスト（MVP → リリース）

## 0. プロジェクト初期化（M0: Skeleton）

* [ ] Bun × Next.js(App Router) 初期化（TS/ESLint/Tailwind）
* [ ] shadcn/ui 初期セット（button, card, input, dialog, dropdown-menu）
* [ ] Supabase プロジェクト作成（Auth/DB/Storage 有効化）
* [ ] `@supabase/ssr` 導入（サーバ／クライアントクライアント分離）
* [ ] MapLibre 初期描画（OSM タイルで地図表示）
* [ ] `.env.local` 設定（Supabase/MapTiles 等）
* [ ] CI（GitHub Actions）で型チェック・lint・build

## 1. DB & RLS（M1 前半）

* [ ] `profiles` / `tickets` / `trips` / `trip_members` / `legs` / `reviews` テーブル作成
* [ ] 代表的なきっぷ初期データ投入（青春18きっぷなど）
* [ ] RLS 有効化

  * [ ] `trips`: owner/editor 書込、viewer/公開は読取のみ
  * [ ] `trip_members`: owner のみ追加/権限変更可
  * [ ] `legs`/`reviews`: 該当 trip の権限に従う
* [ ] Supabase Storage: `trip-assets` バケット（公開規則はサインドURL前提）

## 2. 認証・プロフィール（M1 前半）

* [ ] ログイン（GitHub/Google/Email のいずれか）
* [ ] 初回ログイン時 `profiles` 自動作成
* [ ] ユーザーメニュー（ログイン／ログアウト／プロフィール表示）

## 3. 旅・区間 CRUD（M1 後半）

* [ ] 旅一覧：自分の `trips` をカード表示（並び替え：更新順）
* [ ] 旅作成フロー（タイトル／期間／きっぷ選択）
* [ ] 旅詳細（読み取りビュー）
* [ ] 旅編集（タイトル・期間・きっぷ更新）
* [ ] 区間（legs）CRUD

  * [ ] Map 上で出発/到着ピン設置
  * [ ] day\_index/seq 自動採番
  * [ ] 移動手段／所要時間／費用の入力UI
  * [ ] 並び替え（ドラッグ & ドロップ）

## 4. 共有フロー（M2）

* [ ] 公開設定：`private / unlisted(link) / public`
* [ ] 非公開リンク用 `share_token` 発行・失効 API
* [ ] 公開ページ `/r/[slug]`（読み取り専用）
* [ ] 非公開リンク `/s/[token]`（トークン検証）
* [ ] OGP 画像（旅タイトル・期間・カバー画像）

## 5. きっぷ適用 & コスト見積（M3 前半）

* [ ] rule engine v1（青春18＝在来線のみ適用 などの単純版）
* [ ] 区間ごとの `ticket_applied` 判定
* [ ] 旅合計費用：きっぷ価格 vs 個別支払いを比較し最小提示
* [ ] 旅サマリーで「節約額」表示

## 6. スコアリング & 比較（M3 後半）

* [ ] 合成スコア算出（時間/乗換/費用 + 任意係数）
* [ ] スコア再計算 API（Route Handler）
* [ ] 一覧で並び替え（スコア高い順/安い順/早い順）
* [ ] レビュー（1〜5★、pros/cons）投稿 & 集計

## 7. 共同編集（軽量版）（M4）

* [ ] `trip_members` 追加UI（メール or ユーザー名）
* [ ] 権限：owner/editor/viewer の切替UI
* [ ] 共同編集時のロック（楽観ロック：更新衝突時の警告）

## 8. マップ体験（MVP仕上げ）

* [ ] ウェイポイントの追加/削除/ドラッグ
* [ ] 日別タイムライン（縦リスト）と地図の連動ハイライト
* [ ] 経路線（擬似 polyline）描画
* [ ] 画面スクショ生成 → Storage へアップロード

## 9. 検索・発見

* [ ] 旅検索（タイトル・タグ・きっぷ）
* [ ] タグ入力（例：#18きっぷ #海沿い #温泉）
* [ ] 公開旅のギャラリー（人気順・新着順）

## 10. 外部 API（任意・スイッチ式）

* [ ] 徒歩距離見積（Valhalla/ORS をサーバプロキシ）
* [ ] 公共交通（Google Directions Transit）の Feature Flag
* [ ] `.env` で完全に有効/無効を切替

## 11. UI/UX 仕上げ

* [ ] デザイン基礎（余白・タイポ・配色・アイコン）
* [ ] エンプティステート（最初の旅作成導線）
* [ ] トースト/エラーハンドリング統一
* [ ] ダークモード

## 12. 品質・運用

* [ ] 型安全 Form（`react-hook-form` + `zod`）
* [ ] E2E（Playwright）：旅作成〜共有リンク閲覧まで
* [ ] 監視：Vercel Analytics + Supabase Logs
* [ ] エラートラッキング（Sentry など）

## 13. デプロイ

* [ ] Vercel 環境に接続（Preview/Production）
* [ ] Supabase 環境分離（dev/stg/prod）
* [ ] DB マイグレーション自動化（`supabase db` で SQL 管理）
* [ ] ドメイン設定・OGP/SEO 簡易対策

---

## 付録：技術タスク（コード／設定単位）

**コード雛形**

* [ ] `lib/supabase/{client,server}.ts` 作成
* [ ] `lib/scoring.ts` / `lib/ticket-rules.ts` 作成
* [ ] `components/map/MapCanvas.tsx`（MapLibre ラッパ）
* [ ] `components/trip/{LegEditor,TripSummary}.tsx`
* [ ] `app/trips/new/page.tsx`（作成ウィザード）
* [ ] `app/trips/[id]/{page,edit}/page.tsx`
* [ ] `app/(marketing)/page.tsx`（LP）

**API ルート**

* [ ] `POST /api/trips` / `PATCH /api/trips/[id]`
* [ ] `POST /api/trips/[id]/legs`
* [ ] `POST /api/trips/[id]/share`
* [ ] `POST /api/score/trip/[id]`
* [ ] `GET /api/search`

**RLS（代表）**

* [ ] `trips`:

  ```sql
  create policy "read public or member"
  on trips for select
  using (is_public or auth.uid() = owner_id or exists(
    select 1 from trip_members tm where tm.trip_id = id and tm.profile_id = auth.uid()
  ));
  create policy "owner can update"
  on trips for update using (auth.uid() = owner_id);
  ```
* [ ] `legs`/`reviews` も `trips` 参照ベースで同様に設定

---

## ストレッチ（次フェーズ）

* [ ] 類似ルート推薦（pgvector）
* [ ] 旅の自動日割り（距離/移動時間から分割提案）
* [ ] コメント/いいね
* [ ] オフライン編集（IndexedDB 同期）
