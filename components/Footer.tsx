import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full sticky bottom-0 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-screen-xl px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Marutabi
        </div>
        <nav aria-label="フッターナビゲーション" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <a href="https://github.com/tarabakz25/marutabi/" target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}


