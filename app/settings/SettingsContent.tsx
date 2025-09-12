"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type FormState = {
  displayName: string;
  fullName: string;
  email: string;
  phone: string;
};

export default function SettingsContent() {
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
  const [form, setForm] = useState<FormState>({
    displayName: "James",
    fullName: "James McDowel",
    email: "james_mcdowel@puposellyllc.com",
    phone: "+31 6 12 34 56 78",
  });
  const initialFormRef = useRef<FormState>(form);
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

  return (
    <div className="max-w-6xl mx-auto px-0 md:px-0">
      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <nav className="space-y-1" aria-label="設定セクション">
            {NAV_ITEMS.map((label) => (
              <button
                type="button"
                key={label}
                onClick={() => setActive(label)}
                aria-current={active === label ? "page" : undefined}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition ${
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
          <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
            <h2 id="account-heading" className="text-2xl font-semibold mb-6">
              アカウント
            </h2>

            <form
              onSubmit={onSave}
              className="space-y-8"
              aria-labelledby="account-heading"
            >
              <section className="flex items-center gap-4">
                <Image
                  src={avatarPreview ?? DEFAULT_AVATAR}
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

              <section className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="displayName" className="text-sm font-medium">
                    表示名
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="nickname"
                    className="w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <input
                    id="fullName"
                    type="text"
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <input
                    id="email"
                    type="email"
                    disabled
                    readOnly
                    aria-disabled
                    autoComplete="email"
                    className="w-full h-10 rounded-lg border px-3 text-sm bg-gray-50 text-gray-500"
                    value={form.email}
                    onChange={() => {}}
                  />
                  <p className="text-xs text-gray-500">通知とログインに使用します</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-sm font-medium">
                    電話番号
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    pattern="^\\+?[0-9 ()-]{7,}$"
                    autoComplete="tel"
                    className="w-full h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <section className="rounded-xl border p-4">
                <h3 className="font-semibold mb-2">連携アカウント</h3>
                <p className="text-sm text-gray-600 mb-4">
                  サインインやプロフィール情報の取得に利用します
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 48 48" className="w-6 h-6">
                      <path d="M43.6 20.5H24v7.1h11.3C33.9 32.9 29.5 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5-5C33.4 6.1 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10.3 0 19.2-7.5 19.2-20 0-1.2-.1-2.1-.4-3.5z" />
                    </svg>
                    <span className="text-sm font-medium">Google でサインイン</span>
                  </div>
                  <Button type="button" variant="outline">
                    連携する
                  </Button>
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

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="h-11 px-6"
                  disabled={!isDirty}
                  aria-disabled={!isDirty}
                >
                  変更を保存
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

