
# 0 サイトマップ / ルーティング（App Router）

```
/                         … LP（概要・スクショ・CTA）※未ログインOK
/auth/signin              … サインイン（GitHub）モーダルでも可
/dashboard                … 自分の旅一覧（要ログイン）
  /trips/new              … 新規Trip作成（タイトル/期間/公開設定）
  /trips/[tripId]         … Trip詳細（概要・Routeタブ・コメント）
    /edit                 … Trip基本情報編集
    /routes/[routeId]     … Route編集（タイムライン/地図/費用）
      /planner            … ルートプランナー（AI候補・最適化）
      /compare            … 候補比較（スコア/所要/費用）
  /likes                  … いいねした旅
  /settings               … プロフィール・公開デフォルト・退会
/u/[username]             … ユーザ公開プロフィール（公開Trip一覧）
/r/[token]                … 共有リンク閲覧（閲覧専用/OGP対応）
/explore                  … 公開Trip探索（タグ/きっぷ/テーマ）
/explore/[tripId]         … 公開Trip詳細（フォーク/いいね可・編集不可）
/legal/terms, /legal/privacy
```

---

# 1 ロール別ナビゲーション

## 未ログイン（ゲスト）

* LP → 「公開Tripの閲覧」と「Explore」は可
* 共有リンク `/r/[token]` は可（閲覧専用）
* 「作成/いいね/フォーク」は押下で `/auth/signin` に遷移

## ログイン済み

* `/dashboard` 直行（SSO後のリダイレクト）
* 自分のTripはCRUD可、他人Tripはフォーク/いいねのみ
* 共有リンク発行は**Owner**のみ

---

# 2 主要ユースケース別フロー

## A. 新規Trip作成 → ルート作成 → 公開/共有

1. `/dashboard` → 「新規作成」 → `/dashboard/trips/new`
2. 基本情報（タイトル/期間/タグ/公開設定）→ 作成 → `/dashboard/trips/[tripId]`
3. 「ルートを追加」 → `/dashboard/trips/[tripId]/routes/[routeId]/planner`

   * 出発地/日数/優先（海沿い/温泉/18きっぷ/高速バス）を入力
   * 「AI候補を生成」→ 候補リスト（所要/乗換/費用/スコア）
   * 候補を選択して**Route化**
4. `/routes/[routeId]` で

   * **タイムライン編集**（Stopの順序D\&D、到着/出発時刻、メモ）
   * **地図編集**（ピン追加・削除、経路線表示）
   * **費用/きっぷ**（Ticket追加、適用期間チェック）
5. 「保存」→ Trip詳細へ戻る
6. 「共有」→ 共有モーダル

   * `公開: public/friends/private`
   * 「リンク作成」→ `/r/[token]` を発行・コピー
   * （オプション）`canEdit` 付きコラボリンク発行

## B. 公開Tripからのフォーク（再利用）

1. `/explore` → Trip詳細 `/explore/[tripId]`
2. 「この旅をフォーク」→ 自分の`Trip`をコピー作成 → `/dashboard/trips/[newTripId]`
3. 以降は**Aと同様**に編集・共有

## C. ルート候補の比較（最短/海沿い/費用優先など）

1. `/routes/[routeId]/planner`
2. 条件を変えて**複数候補**を生成
3. 「比較へ」→ `/routes/[routeId]/compare`

   * 指標：所要時間・費用・乗換回数・海沿い率・疲労度（簡易）
   * ベンチマーク表示 → 「採用」→ Routeを更新

## D. いいね/保存/コメント（公開側）

* `/explore/[tripId]` / `/r/[token]`

  * いいね・ブックマーク（要ログイン）
  * コメント（Ownerはモデレート可）
  * OGPでカード共有

## E. 設定/アカウント

* `/dashboard/settings`

  * 表示名・アイコン、デフォルト公開範囲、削除
  * GitHub連携確認（NextAuth）

---

# 3 画面ごとのUI要素（MVPに必要な最低限）

### LP `/`

* ヒーロー（検索ミニフォーム：「出発地・日数・テーマ」）
* 特徴（18きっぷ特化 / 共有 / AIルート）
* CTA（GitHubで始める）

### Dashboard `/dashboard`

* 自分のTripカード（公開状態・更新日時・いいね数）
* 「新規作成」「インポート（将来）」「いいねタブ」

### Trip詳細 `/dashboard/trips/[tripId]`

* ヘッダ：タイトル・公開トグル・共有ボタン
* タブ：概要 / ルート / コメント / 変更履歴（将来）
* ルート一覧：スコア・日程・費用のサマリ

### ルート編集 `/dashboard/trips/[tripId]/routes/[routeId]`

* 左：Stopタイムライン（D\&D並び替え）
* 右：地図（MapLibre）・距離/所要/費用サマリ
* サブタブ：Planner / Compare / Tickets / Hotels

### Planner `/planner`

* 条件フォーム（都市/日数/優先度/きっぷ）
* 生成結果（カード：指標・簡易行程）
* 「採用」「比較に追加」

### Compare `/compare`

* 候補テーブル（所要/費用/乗換/スコア）
* 詳細差分（Stop列挙の違い、海沿い率など）

### 共有閲覧 `/r/[token]`

* OGPカバー、行程の読み取り専用ビュー
* ログインで「フォーク」「いいね」

### Explore `/explore`

* フィルタ（タグ・期間・きっぷ・テーマ）
* ソート（人気/新着/所要短）

### Settings `/dashboard/settings`

* プロフィール編集、公開デフォルト、退会（危険操作確認）

---

# 4 ガード・エラーフロー

* **未認可**：`/dashboard/**` へアクセス→ `/auth/signin` に誘導
* **権限なし**：Owner以外の編集系は403（トースト + 閲覧ページへ戻す）
* **リンク失効**：`/r/[token]` 期限切れ→ 410（再発行の案内）
* **削除済み**：Trip/Routeが見つからない→ 404 + Dashboardへ

---

# 5 画面遷移（ざっくり図）

```mermaid
flowchart LR
  LP[/Landing "/"/] -->|CTA| Signin[/auth/signin/]
  LP --> Explore[/explore/]
  Signin --> Dashboard[/dashboard/]
  Dashboard --> NewTrip[/dashboard/trips/new/]
  NewTrip --> Trip[Trip Detail /dashboard/trips/:id]
  Trip --> RouteNew[Create Route]
  RouteNew --> Planner[/routes/:routeId/planner]
  Planner -->|Adopt| RouteEdit[/routes/:routeId]
  Planner --> Compare[/routes/:routeId/compare]
  RouteEdit --> Share[/share modal]
  Share --> Public[/r/:token]
  Explore --> Public
  Public -->|Fork (login)| Trip
```

---

# 6 モーダル/ダイアログ（主要）

* 共有リンク作成（公開範囲・期限・編集可否）
* Stop追加（場所検索・時刻・メモ）
* きっぷ選択（18きっぷ/エリア券/高速バス）
* 削除確認（Trip/Route/Stop）

---

# 7 実装順（UI観点）

1. LP・Signin → Dashboard（空状態UI）
2. Trip作成 → Trip詳細（空のルート）
3. ルート編集（タイムライン + 地図）
4. Planner（候補ダミー → 後でアルゴリズム差し替え）
5. 共有閲覧ページ `/r/[token]` と Explore
6. Compare・Like・Fork

---
