# Marutabi 全体まとめ（現行アーキテクチャ）

## 技術スタック（確定）

* Frontend：Bun × Next.js(App Router) × Tailwind（Vercel想定）
* Auth：**Amazon Cognito**（NextAuth経由で利用）
* DB：**Supabase（PostgreSQL + RLS）**

  * クライアント直叩きはしない。Next.js サーバから **`SET LOCAL app.user_id = '<cognito-sub>'`** を毎リクエスト実行してRLS発火
* LLM：**Amazon Bedrock**（サーバ側で呼び出し、要約/スコア）
* Storage：Cloudflare **R2**（署名URLで直PUT）※将来S3にも置換可
* Map：MapLibre + MapTiler/OSM

---

## 全体構成フローチャート

```mermaid
flowchart TD
  subgraph Client["Client (Browser)"]
    UI[Next.js (App Router) + Tailwind] -->|OIDC| HostedUI[Cognito Hosted UI]
  end

  Client -->|fetch /api/*| BFF[Next.js Server (Route Handlers)]
  BFF -->|NextAuth| Cognito[(Amazon Cognito)]
  BFF -->|pg ssl\nSET LOCAL app.user_id| Supabase[(Supabase\nPostgreSQL + RLS)]
  BFF -->|InvokeModel| Bedrock[(Amazon Bedrock)]
  Client -->|Map tiles| MapTiler[(MapTiler/OSM)]
  Client -->|PUT (signed URL)| R2[(Cloudflare R2)]
  BFF -->|Sign URL| R2

  subgraph Data["Core Tables (Supabase)"]
    Trips[(trips)]
    Legs[(legs)]
    Members[(trip_members)]
    Profiles[(profiles)]
    Reviews[(reviews)]
  end
  Supabase <-->|SQL (RLS)| Data
```

---

## キーシーケンス（2本）

### 1) ログイン＆Trip作成（認証必須）

```mermaid
sequenceDiagram
  participant U as User (Browser)
  participant N as Next.js Server
  participant C as Cognito
  participant DB as Supabase (Postgres)

  U->>C: Hosted UI でサインイン
  C-->>U: ID Token (JWT)
  U->>N: POST /api/trips (Authorization: Bearer <JWT>)
  N->>C: JWKS検証/NextAuthセッション
  N->>DB: begin; SET LOCAL app.user_id = sub
  N->>DB: INSERT INTO trips(owner_id=sub, ...)
  DB-->>N: trip id
  N-->>U: 200 { id }
```

### 2) 公開Tripの閲覧（未ログイン可）

```mermaid
sequenceDiagram
  participant U as Visitor
  participant N as Next.js Server
  participant DB as Supabase

  U->>N: GET /api/trips/:id
  N->>DB: begin; (未ログイン→ app.user_id なし)
  N->>DB: SELECT ... FROM trips WHERE id = $1
  Note right of DB: RLS: is_public = true のみ可視
  DB-->>N: trip data (publicのみ)
  N-->>U: 200 JSON
```

---

## RLS の要点（PostgreSQL標準で運用）

* サーバ側で毎クエリ前に：`SET LOCAL app.user_id = '<Cognito sub UUID>'`
* 代表ポリシー

  * `trips`: `is_public = true` か、`owner_id = app.user_id`、または `trip_members.profile_id = app.user_id` のとき `SELECT` 可
  * `UPDATE/DELETE` は owner（＋editor）に限定
  * `legs/reviews/members` は親 `trip` の可視性に追従

---

## 主要API（MVP）

* `GET /api/trips`：閲覧可能なTrip一覧
* `POST /api/trips`：Trip作成（認証必須）
* `GET /api/trips/[id]`：単体取得（公開は未ログイン可）
* `POST /api/trips/[id]/legs`：Leg追加（owner/editor）
* `GET /api/trips/[id]/legs`：Leg一覧
* `POST /api/assets/sign`：R2署名URL発行（認証必須）
* `POST /api/llm/score`：Bedrockで要約/スコア（認証必須）

---

## .env（最小）

```
# Supabase (DB直接続)
SUPABASE_DB_URL=postgresql://<user>:<pass>@db.<proj>.supabase.co:5432/postgres

# NextAuth × Cognito
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...
COGNITO_CLIENT_ID=...
COGNITO_CLIENT_SECRET=...   # 無し構成なら不要
COGNITO_ISSUER=https://<domain>.auth.<region>.amazoncognito.com

# Bedrock (Server-side)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Storage / Map
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=marutabi-assets
NEXT_PUBLIC_MAPTILER_KEY=...
```

---

## 最短ToDo（この順でやれば通ります）

1. **Supabase**：SQL Editorでスキーマ\&RLS適用 → 接続URI取得
2. **Cognito**：ユーザープール＋Hosted UI → Client ID/Issuer取得（NextAuth接続）
3. **Next.js**：`/api/auth` をNextAuth(Cognito)で実装 → `/api/trips` GET/POST実装
4. **疎通**：ログイン→Trip作成→一覧取得
5. **R2**：署名URL発行API→フロントから直PUT
6. **Bedrock**：モデルアクセス有効化→要約/スコアAPI疎通

---

必要なら、**ER図/オブジェクト図**や**OpenAPI雛形**もすぐ追加します。次はどれを仕上げる？（例：R2署名URLAPIの実コード、Trips/Legsの完全CRUD、UIワイヤーフロー など）
