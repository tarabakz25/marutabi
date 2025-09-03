了解です 👍
GUI で AWS 上に **Marutabi バックエンド**を構築するための \*\*ToDo リスト（チェックリスト形式）\*\*を整理しました。
順番に進めれば迷わず環境が整います。

---

# Marutabi バックエンド構築 ToDo（GUIベース）

## 1. 共通準備

* [x] リージョン選定（Aurora, Bedrock, Location が使える所を確認 → 例: 東京 / バージニア）
* [x] VPC を作成（Private サブネット2つ以上）
* [x] セキュリティグループを2つ用意

  * DB 用（Aurora + Proxy）
  * Lambda 用（アウトバウンド 5432 を DB SG に向けて許可）

---

## 2. 認証（Cognito）

* [ ] Cognito ユーザープール作成
* [ ] サインイン方法（Email / Google / GitHub）を有効化
* [ ] アプリクライアント作成（シークレットなし）
* [ ] ドメイン設定（`xxx.auth.<region>.amazoncognito.com`）
* [ ] JWKS URL を控える（後で Lambda 検証用）

---

## 3. データベース（Aurora + RDS Proxy）

* [ ] Aurora PostgreSQL Serverless v2 を作成（Private サブネットに配置）
* [ ] マスターユーザー/パスワードを控える
* [ ] RDS Proxy を作成（Aurora に接続）
* [ ] Secrets Manager に DB 認証情報を保存
* [ ] Proxy に Secrets を紐付け
* [ ] Lambda SG からの接続を DB SG に許可

---

## 4. スキーマ & RLS

* [ ] RDS コンソール → Query Editor v2 で接続
* [ ] Marutabi 用テーブル群（profiles / tickets / trips / trip\_members / legs / reviews）を作成
* [ ] RLS 有効化 & ポリシー設定
* [ ] `SET LOCAL app.user_id` で RLS 判定できるよう確認

---

## 5. API（Lambda + API Gateway）

* [ ] Lambda 関数作成（Node.js 20, VPC 内）
* [ ] 環境変数設定（DB\_HOST, DB\_NAME, DB\_USER, DB\_PASSWORD, COGNITO\_JWKS\_URL）
* [ ] Lambda に `pg` ライブラリを Layer として追加
* [ ] コード貼り付け（/trips GET/POST からスタート）
* [ ] Lambda 実行ロールに以下を付与

  * RDS Proxy への接続
  * CloudWatch Logs 書き込み
  * Secrets Manager（必要なら）
* [ ] API Gateway (HTTP API) 作成 → Lambda を統合
* [ ] ルート `/trips` (GET, POST) を設定
* [ ] CORS 設定（フロント Origin を許可）
* [ ] デプロイ & Invoke URL を控える

---

## 6. ストレージ（S3 + CloudFront）

* [ ] S3 バケット作成（例: marutabi-trip-assets）
* [ ] バケットはパブリックアクセスをブロックしたまま
* [ ] CloudFront ディストリビューションを作成
* [ ] OAC（Origin Access Control）を設定 → S3 バケットポリシー更新
* [ ] （オプション）Lambda で署名付き URL 発行関数を作成

---

## 7. LLM（Amazon Bedrock）

* [ ] Bedrock コンソールで必要なモデル（Claude など）の「アクセスを有効化」
* [ ] Lambda 実行ロールに `bedrock:InvokeModel` 権限を付与
* [ ] 簡易 Lambda を作成してテスト呼び出し（旅スコア/要約）

---

## 8. 地図（AWS Location Service）

* [ ] Location Service → 「マップ」を作成（MapLibre 用）
* [ ] 「API キー」を発行（Maps + Routes を有効化）
* [ ] フロントの MapLibre にマップスタイルURL + APIキーを設定

---

## 9. 監視・運用

* [ ] CloudWatch Logs（Lambda のログを確認）
* [ ] API Gateway のアクセスログ有効化
* [ ] CloudWatch アラームを作成（エラーレート閾値で通知）
* [ ] （将来）X-Ray を有効化してトレーシング

---

## 10. 動作確認（E2E）

* [ ] Cognito Hosted UI でユーザー作成＆サインイン → IDトークンを取得
* [ ] `POST /trips` → 200 OK & DB にレコード作成
* [ ] `GET /trips` → 自分の trip が返ってくる
* [ ] Bedrock API 呼び出しで結果が返る
* [ ] S3 にファイルをアップロード → CloudFront 経由で表示
* [ ] MapLibre で Location マップが表示される

---

👉 これを終えれば **Marutabi バックエンドの最小 MVP** が GUI だけで完成します。
進めるときは、例えば「Aurora 周りからやりたい」みたいに指示をくれれば、そのブロックだけ詳しい GUI 操作手順を分解できます。

---

Kzさん、次はこの ToDo の中で \*\*どのブロック（認証 / DB / API / S3 / Bedrock / Location）\*\*から手を付けますか？
