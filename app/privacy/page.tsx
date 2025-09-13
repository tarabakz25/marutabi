import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "プライバシーポリシー - Marutabi",
  description: "Marutabi のプライバシーポリシーページ",
};

export default function PrivacyPage() {
  return (
    <main className="w-full h-full">
      <Header />
      <div className="mx-auto max-w-screen-md px-6 py-12 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2025-09-13</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. 収集する情報</h2>
        <ul className="list-disc pl-6 text-sm leading-7 space-y-1">
          <li>アカウント情報（氏名、メールアドレス、アイコン画像など）</li>
          <li>サービス利用に伴うログ情報（アクセス日時、IP アドレス等）</li>
          <li>経路検索やお気に入り等のアプリ内データ</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. 利用目的</h2>
        <ul className="list-disc pl-6 text-sm leading-7 space-y-1">
          <li>本サービスの提供、維持、改善</li>
          <li>不正利用の監視、セキュリティ確保</li>
          <li>お問い合わせ対応</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. 第三者提供</h2>
        <p className="text-sm leading-7">
          法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. クッキー等の利用</h2>
        <p className="text-sm leading-7">
          本サービスは、利用状況の把握や利便性向上のためにクッキー等を利用する場合があります。ブラウザ設定により無効化できますが、機能の一部が利用できない可能性があります。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. 安全管理措置</h2>
        <p className="text-sm leading-7">
          当社は、個人情報の漏洩、滅失又は毀損の防止その他安全管理のために必要かつ適切な措置を講じます。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. 開示・訂正・削除</h2>
        <p className="text-sm leading-7">
          本人からの個人情報の開示、訂正、利用停止、削除のご請求には、法令に従い適切に対応します。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. 改定</h2>
        <p className="text-sm leading-7">
          本ポリシーは、必要に応じて改定されることがあります。重要な変更がある場合は適切な方法で告知します。
        </p>
        </section>
      </div>
    </main>
  );
}


