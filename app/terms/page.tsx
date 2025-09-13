import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "利用規約 - Marutabi",
  description: "Marutabi の利用規約ページ",
};

export default function TermsPage() {
  return (
    <main className="w-full h-full">
      <Header />
      <div className="mx-auto max-w-screen-md px-6 py-12 space-y-8">
        <header>
          <h1 className="text-3xl font-bold">利用規約</h1>
          <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2025-09-13</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. 適用</h2>
          <p className="text-sm leading-7">
            本規約は、Marutabi（以下「本サービス」）の提供条件及び本サービスの利用に関する当社と利用者との間の権利義務関係を定めるものです。利用者は、本規約に同意のうえ本サービスを利用するものとします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. アカウント</h2>
          <p className="text-sm leading-7">
            利用者は、正確かつ最新の情報をもってアカウントを作成・維持する責任を負います。第三者による不正利用が疑われる場合、直ちに当社に通知してください。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. 禁止事項</h2>
          <ul className="list-disc pl-6 text-sm leading-7 space-y-1">
            <li>法令又は公序良俗に違反する行為</li>
            <li>当社、他の利用者、又は第三者の権利を侵害する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>リバースエンジニアリング等により本サービスのソースを解析する行為</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. 免責事項</h2>
          <p className="text-sm leading-7">
            当社は、合理的な範囲で正確性・可用性の確保に努めますが、コンテンツの完全性、エラーの不存在、特定目的への適合性等について保証しません。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. サービスの変更・中断・終了</h2>
          <p className="text-sm leading-7">
            当社は、事前の予告なく本サービスの内容変更、提供の中断又は終了を行うことがあります。これにより利用者に生じた損害について、一切の責任を負いません。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. 規約の変更</h2>
          <p className="text-sm leading-7">
            当社は、必要に応じて本規約を変更できます。重要な変更がある場合は、適切な方法で周知します。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. 準拠法・裁判管轄</h2>
          <p className="text-sm leading-7">
            本規約は日本法に準拠します。本サービスに関して当社と利用者との間で紛争が生じた場合、当社所在地を管轄する裁判所を第一審の専属的合意管轄とします。
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            8. オープンデータ・第三者データの利用について
          </h2>
          <p className="text-sm leading-7">
              本サービスでは、国土交通省「国土数値情報 鉄道データ」（2020年度（令和2年度）以降、CC BY 4.0）を利用しています。
              当該データの利用にあたり、国土数値情報ダウンロードサイトの利用条件に従い、出典の明記を行っています。
              利用者は、本サービスを利用することで、これら第三者データの利用条件にも同意したものとみなします。
          </p>
        </section>
      </div>
    </main>
  );
}


