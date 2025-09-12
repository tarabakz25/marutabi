"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signIn, signOut, useSession } from "next-auth/react";

type FormState = {
  displayName: string;
  fullName: string;
  email: string;
  phone: string;
};

export default function SettingsContent() {
  const { data: session } = useSession();
  const NAV_ITEMS = [
    "アカウント",
    "通知",
    "パスワード",
    "連携",
    "データエクスポート",
    "その他",
  ] as const;
  type Tab = (typeof NAV_ITEMS)[number];
  const DEFAULT_AVATAR =
    "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg";

  const [active, setActive] = useState<Tab>("アカウント");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sessionName = (session?.user?.name ?? "").toString();
  const sessionEmail = (session?.user?.email ?? "").toString();
  const sessionImage = (session?.user?.image ?? undefined) as string | undefined;

  const initialForm = useMemo<FormState>(
    () => ({
      displayName: sessionName || "",
      fullName: sessionName || "",
      email: sessionEmail || "",
      phone: "",
    }),
    [sessionName, sessionEmail]
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const initialFormRef = useRef<FormState>(initialForm);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleChange = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleUploadClick = () => fileRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("save settings", form);
    alert("Saved!");
  };

  useEffect(() => {
    // セッションが変わったら初期値をリセットしてdirtyを解除
    setForm(initialForm);
    initialFormRef.current = initialForm;
  }, [initialForm]);

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-0">
      <div className="flex gap-8">
        <aside className="w-56 shrink-0 sticky top-24 h-fit">
          <nav className="space-y-1" aria-label="設定セクション">
            {NAV_ITEMS.map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => setActive(label)}
                aria-current={active === label ? "page" : undefined}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active === label
                    ? "bg-white shadow-sm"
                    : "text-gray-600 hover:bg-white/60"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle id="account-heading" className="text-2xl">
                アカウント
              </CardTitle>
              <CardDescription>
                プロフィールと連絡先を更新できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSave}
                className="space-y-8"
                aria-labelledby="account-heading"
              >
                <section className="flex items-center gap-4">
                  <Image
                    src={avatarPreview ?? sessionImage ?? DEFAULT_AVATAR}
                    alt="アバタープレビュー"
                    width={56}
                    height={56}
                    className="rounded-full object-cover"
                  />
                  <div className="flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFile}
                    />
                    <Button type="button" variant="outline" onClick={handleUploadClick}>
                      画像をアップロード
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAvatarPreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      画像を削除
                    </Button>
                  </div>
                </section>

                <Separator />

                <section className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="displayName" className="text-sm font-medium">
                      表示名
                    </label>
                    <Input
                      id="displayName"
                      type="text"
                      required
                      maxLength={60}
                      autoComplete="nickname"
                      value={form.displayName}
                      onChange={handleChange("displayName")}
                      placeholder="表示名"
                      aria-describedby="displayName-help"
                    />
                    <p id="displayName-help" className="text-xs text-gray-500">
                      他のユーザーに表示されます
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      氏名
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={form.fullName}
                      onChange={handleChange("fullName")}
                      placeholder="どのように呼ばれたいですか？"
                    />
                    <p className="text-xs text-transparent select-none">.</p>
                  </div>
                </section>

                <section className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium">
                      メールアドレス
                    </label>
                    <Input
                      id="email"
                      type="email"
                      disabled
                      readOnly
                      aria-disabled
                      autoComplete="email"
                      className="bg-gray-50 text-gray-500"
                      value={form.email}
                      onChange={() => {}}
                    />
                    <p className="text-xs text-gray-500">通知とログインに使用します</p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-sm font-medium">
                      電話番号
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      pattern="^\\+?[0-9 ()-]{7,}$"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange("phone")}
                      placeholder="+31 6 12 34 56 78"
                      aria-describedby="phone-help"
                    />
                    <p id="phone-help" className="text-xs text-gray-500">
                      通知の受信に使用します
                    </p>
                  </div>
                </section>

                <Separator />

                <section className="rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">連携アカウント</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    現在のサインイン方法と連携状態を管理します
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 0C5.372 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.797 24 17.31 24 12 24 5.373 18.627 0 12 0z" />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">GitHub でサインイン</span>
                        <span className="text-xs text-gray-500">{sessionEmail || "未ログイン"}</span>
                      </div>
                    </div>
                    {session ? (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => signIn("github")}>再認証</Button>
                        <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>ログアウト</Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
                        連携してサインイン
                      </Button>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border p-4">
                  <h3 className="font-semibold mb-2">アカウント削除</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    アカウントを削除すると全てのデータが失われます
                  </p>
                  <Button type="button" variant="outline">
                    アカウントを削除…
                  </Button>
                </section>
              </form>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                className="h-11 px-6"
                disabled={!isDirty}
                aria-disabled={!isDirty}
                onClick={(e) => {
                  // Delegate to form submit inside CardContent
                  const formEl = (e.currentTarget.closest("[data-slot=card]") as HTMLElement)?.querySelector("form") as HTMLFormElement | null;
                  formEl?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
                }}
              >
                変更を保存
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  );
}

