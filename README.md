# Marutabi サービス概要

## 1. コアコンセプト

* **旅のルートや計画を簡単に共有・比較できるサービス**
* フリーきっぷ（青春18きっぷなど）や多様な移動手段を組み合わせたルート作成に特化
* 自分や他人の旅ログを活用して効率的にプランニングできる

---

## 2. 主要機能

### ルート作成・検索

* 多様な切符・経路を使ったルート検索（青春18きっぷ、各種フリーきっぷ、高速バスなど）
* ホテルや観光地などの滞在時間を組み込んだ経路作成
* 経由地の多様化（複数経路の提案）

### 共有・シェア

* ワンクリックでルートや旅程を友達と共有
* 自分が作った旅ログを振り返り可能
* 他人の旅程を参考にして、類似ルートを比較提案

### 比較・評価

* フリーきっぷやルートの比較表を自動生成
* AI（LLM）がルートの良し悪しを判定し、過去ユーザーの選択と比較
* 自己評価とシェア機能でコミュニティベースの改善

---

## 3. ユースケース

* **仲間と旅行計画を立てるとき**
  面倒なルート共有を簡単にし、複数案を比較できる
* **フリーきっぷ旅**
  青春18きっぷや地域限定フリーきっぷを最大限活用したプランを自動生成
* **旅の振り返り**
  自分の過去の旅をログとして残し、次回計画に活用

---

## 4. 差別化ポイント

* 欲しい機能（切符比較、ルート作成、宿泊込みの検索）が全て揃った「旅行特化マップサービス」
* AIとユーザーコミュニティの両方を活用したルート改善提案
* 他社サービスには少ない「フリーきっぷ特化」「青春18きっぷ旅」に強い設計

---

## 5. 発展アイデア

* **AI旅程テスター**：作成したルートをAIが評価し「無理のない行程か」をアドバイス
* **コミュニティデータ活用**：他人の旅程データをベースにおすすめルートを自動生成
* **マップサービス連携**：Google Maps / OSM と接続して可視化

---

👉 一言でいうと、
\*\*「Marutabi」はフリーきっぷを中心に、旅のルート作成・比較・共有を簡単にするAI旅行プランナー兼ログ共有サービス」\*\*です。

---

# 技術方針（重要）

## 方針A：NextAuth主導（推奨：今回）

* **認証**：NextAuth（GitHub Provider）
* **DB接続**：SupabaseのPostgresに **Prisma** で直結
* **権限制御**：RLSは使わず、**アプリ側(サーバー)で厳密にチェック**

  * API Route／Server Actionで `session.user.id` を必ず検証
  * DBアクセスは**サーバー側専用ラッパ**越しに一本化
* メリット：Next.jsエコシステムに素直、実装が読みやすい
* デメリット：DBレイヤーだけでの強制は弱くなる（ただし、Server-Onlyで十分堅牢にできる）

## 方針B：Supabase Auth主導

* NextAuthを使わずSupabase AuthでJWTを発行し**RLSフル活用**。
* 今回の指定（NextAuth+GitHub）と違うので割愛。

> 以降は\*\*方針A（NextAuth主導）\*\*で進めます。

---

# システム構成

* **Frontend**：Next.js(App Router) + Tailwind
* **Auth**：NextAuth（GitHub Provider）
* **DB**：Supabase Postgres（接続はPrisma）
* **ORM**：Prisma
* **デプロイ**：Vercel or Fly.io（Server Actionsを使うならNodeランタイムでOK）
* **画像/ファイル**：Supabase Storage（旅ログのサムネ、アイコン等）
* **地図**：MapLibre or Google Maps / OSM（ライセンス/コストで選択）
* **ジョブ**：Vercel Cron / Cloudflare Cron（集計・レコメンドのバッチ）
* **監視**：Vercel Analytics + Sentry

---

# データモデル（最小核）

**主キーは全て `cuid()` or `uuid`、作成/更新時刻は共通 `createdAt/updatedAt`。**

* `User` … NextAuth（Prisma Adapter）が作成するユーザー

  * `id`・`name`・`image`・`email`
* `Trip`（旅のまとまり）

  * `id` `ownerId(FK->User)` `title` `description` `visibility('private'|'friends'|'public')`
  * `tags`(string\[]) `coverImageUrl`
  * `startDate` `endDate`
* `Route`（ある旅の“経路案” 1..n）

  * `id` `tripId(FK)` `title` `score`(AI評価/自己評価) `transportMix`(json)
* `Stop`（経由地=時系列）

  * `id` `routeId(FK)` `order` `placeId` `name` `lat` `lng`
  * `arriveAt` `leaveAt` `memo`
* `Ticket`（フリーきっぷ・高速バス等の利用情報）

  * `id` `routeId(FK)` `type`(`'18'|'jr-area'|'bus'|...`) `name` `validFrom/To` `price`
* `Hotel`

  * `id` `routeId(FK)` `name` `checkIn` `checkOut` `price` `lat` `lng` `bookingUrl`
* `Like` / `Bookmark`

  * `userId` `tripId`（一意複合）
* `ShareLink`

  * `id` `tripId` `token`(短縮) `expiresAt` `canEdit:boolean`
* `Eval`（AIやユーザの評価ログ）

  * `id` `routeId` `kind('ai'|'self'|'community')` `score` `explain:text`
* `RouteCandidateCache`（AI提案の中間/キャッシュ）

  * `id` `ownerId` `inputHash` `payload:jsonb` `expiresAt`

> Prisma例（抜粋）

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String?  @unique
  image     String?
  accounts  Account[]
  sessions  Session[]
  trips     Trip[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Trip {
  id         String   @id @default(cuid())
  ownerId    String
  owner      User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title      String
  description String? 
  visibility  String   @default("private") // enumでも可
  tags       String[]  @db.Text
  coverImageUrl String?
  startDate  DateTime?
  endDate    DateTime?
  routes     Route[]
  likes      Like[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  @@index([ownerId, visibility])
}

model Route {
  id        String  @id @default(cuid())
  tripId    String
  trip      Trip    @relation(fields: [tripId], references: [id], onDelete: Cascade)
  title     String
  score     Int?    // 総合スコア
  transportMix Json?
  stops     Stop[]
  tickets   Ticket[]
  hotels    Hotel[]
  evals     Eval[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Stop {
  id        String  @id @default(cuid())
  routeId   String
  route     Route   @relation(fields: [routeId], references: [id], onDelete: Cascade)
  order     Int
  placeId   String?
  name      String
  lat       Decimal? @db.Decimal(9,6)
  lng       Decimal? @db.Decimal(9,6)
  arriveAt  DateTime?
  leaveAt   DateTime?
  memo      String?
  @@index([routeId, order])
}

model Ticket {
  id        String  @id @default(cuid())
  routeId   String
  route     Route   @relation(fields: [routeId], references: [id], onDelete: Cascade)
  type      String
  name      String
  validFrom DateTime?
  validTo   DateTime?
  price     Int?
}

model Hotel {
  id        String  @id @default(cuid())
  routeId   String
  route     Route   @relation(fields: [routeId], references: [id], onDelete: Cascade)
  name      String
  checkIn   DateTime?
  checkOut  DateTime?
  price     Int?
  lat       Decimal? @db.Decimal(9,6)
  lng       Decimal? @db.Decimal(9,6)
  bookingUrl String?
}

model Like {
  userId String
  tripId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip   Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, tripId])
}
```

---

# API / Server Action 設計

> 原則：**クライアントからDB直叩き禁止**。
> すべて `server-only` な関数に閉じ込め、**毎回セッション検証**。

* `/app/(dashboard)/trips/[id]/page.tsx`

  * `getTrip(id)`（ownerなら編集可、publicなら閲覧可）
  * `updateTrip(input)`（`assertOwner(session.user.id, tripId)`）
* `/app/api/trips/route/generate/route.ts`

  * 入力：出発地、日数、優先条件（海沿い/温泉/18きっぷ 等）
  * 出力：`RouteCandidateCache` に保存 → UIへ返す
* `/app/api/trips/share/[id]/route.ts`

  * POST：共有リンク作成（`ShareLink`）
* `/app/api/trips/like/[id]/route.ts`

  * POST/DELETE：Like付与/解除（複合PKで冪等）

**Server Utility（例）**

```ts
// lib/auth.ts
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user;
}

// lib/perm.ts
export async function assertOwner(userId: string, tripId: string) {
  const trip = await db.trip.findUnique({ where: { id: tripId }});
  if (!trip || trip.ownerId !== userId) throw new Error("forbidden");
}
```

---

# NextAuth 設定（Prisma Adapter）

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db"; // PrismaClient

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "database" }, // もしくは 'jwt'
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id; // 型拡張
      return session;
    },
  },
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

> 補足

* **Adapter**はPrismaを利用（Supabase Postgresに接続）
* セッションは `database` でも `jwt` でもOK（**Server Action多用ならjwtが軽い**）
* `next-auth` のUserテーブルとアプリの外部キーを\*\*`userId`で統一\*\*

---

# 環境変数（例）

```
DATABASE_URL="postgresql://postgres:[password]@db.[supabase-id].supabase.co:5432/postgres"
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="openssl rand -hex 32"
GITHUB_ID="..."
GITHUB_SECRET="..."
SUPABASE_STORAGE_URL="https://[supabase-id].supabase.co/storage/v1"
SUPABASE_SERVICE_ROLE="..."  # サーバーでバッチ/Storage用に限定使用
```

---

# ディレクトリ構成（最小）

```
apps/web/
  app/
    (marketing)/
    (dashboard)/
      trips/[id]/page.tsx
    api/
      auth/[...nextauth]/route.ts
      trips/
        create/route.ts
        update/route.ts
        share/route.ts
        like/route.ts
        route/
          generate/route.ts
  components/
  lib/
    auth.ts
    perm.ts
    map.ts
  server/
    db.ts           // PrismaClient
    actions/        // Server Actions
  styles/
  prisma/
    schema.prisma
```

---

# セキュリティ要点

* **RLSを前提にしない**（NextAuthなので）。代わりに：

  * すべてのDB操作は**サーバー側のみ**に閉じる
  * **所有権チェック**と\*\*可視性（public/friends/private）\*\*を必ず実装
  * 共有リンクの編集権限は `canEdit` + `token` で**別経路**
* Supabase Storageは**署名付きURL**を発行して配布（期限付き）
* 監査用に**重要操作ログ**（削除/共有生成/公開切替）を記録

---

# 初期スプリント（2週間想定）

1. **Auth & DB基盤**

* NextAuth(GitHub) + Prisma + Supabase接続
* `User/Trip/Route/Stop` の最小マイグレーション

2. **旅のCRUD（Owner専用）**

* Trip作成/編集/削除
* Route/Stopの基本編集（ドラッグで順序入替）

3. **公開・共有**

* `visibility` 切替
* `ShareLink` 作成 & 公開ページ

4. **フリーきっぷ対応の検索UI（ダミー→本実装）**

* 条件フォーム（18きっぷ/海沿い/温泉）
* ダミーAI提案→`RouteCandidateCache`に保存→採用ボタンでRoute化

5. **評価/Like**

* 自己評価（1〜5）とLike

---

# Tailwind & UI 小要件

* 地図：**MapLibre** + OSM（無償で始めやすい）
* 時系列UI：Stopsを**縦タイムライン**で編集、`order`はドラッグ&ドロップで更新
* 共有ページ：`/r/[token]`（閲覧専用・OGP対応）

---