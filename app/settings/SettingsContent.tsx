"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { signIn, signOut, useSession } from "next-auth/react";

type FormState = {
  displayName: string;
  fullName: string;
  email: string;
  phone: string;
};

type NotificationSettings = {
  tripReminders: boolean;
  newTrips: boolean;
  updates: boolean;
  marketing: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  frequency: "realtime" | "daily" | "weekly" | "monthly";
};

type OtherSettings = {
  language: "ja" | "en";
  timezone: string;
  theme: "light" | "dark" | "system";
  mapStyle: "default" | "satellite" | "terrain";
  units: "metric" | "imperial";
  privacy: "public" | "friends" | "private";
  dataExport: boolean;
  analytics: boolean;
  feedback: string;
};

export default function SettingsContent() {
  const { data: session } = useSession();
  const NAV_ITEMS = [
    "アカウント",
    "通知",
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

  const initialNotifications = useMemo<NotificationSettings>(
    () => ({
      tripReminders: true,
      newTrips: true,
      updates: true,
      marketing: false,
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      frequency: "daily",
    }),
    []
  );

  const initialOtherSettings = useMemo<OtherSettings>(
    () => ({
      language: "ja",
      timezone: "Asia/Tokyo",
      theme: "system",
      mapStyle: "default",
      units: "metric",
      privacy: "public",
      dataExport: false,
      analytics: true,
      feedback: "",
    }),
    []
  );

  const [form, setForm] = useState<FormState>(initialForm);
  const [notifications, setNotifications] = useState<NotificationSettings>(initialNotifications);
  const [otherSettings, setOtherSettings] = useState<OtherSettings>(initialOtherSettings);
  
  const initialFormRef = useRef<FormState>(initialForm);
  const initialNotificationsRef = useRef<NotificationSettings>(initialNotifications);
  const initialOtherSettingsRef = useRef<OtherSettings>(initialOtherSettings);

  const isAccountDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
  const isNotificationsDirty = JSON.stringify(notifications) !== JSON.stringify(initialNotificationsRef.current);
  const isOtherDirty = JSON.stringify(otherSettings) !== JSON.stringify(initialOtherSettingsRef.current);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleChange = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleNotificationChange = (k: keyof NotificationSettings) =>
    (checked: boolean) =>
      setNotifications((s) => ({ ...s, [k]: checked }));

  const handleNotificationSelectChange = (k: keyof NotificationSettings) =>
    (value: string) =>
      setNotifications((s) => ({ ...s, [k]: value }));

  const handleOtherSettingsChange = (k: keyof OtherSettings) =>
    (value: string | boolean) =>
      setOtherSettings((s) => ({ ...s, [k]: value }));

  const handleUploadClick = () => fileRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const onSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("save account settings", form);
    alert("アカウント設定を保存しました！");
  };

  const onSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("save notification settings", notifications);
    alert("通知設定を保存しました！");
  };

  const onSaveOtherSettings = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("save other settings", otherSettings);
    alert("その他の設定を保存しました！");
  };

  useEffect(() => {
    // セッションが変わったら初期値をリセットしてdirtyを解除
    setForm(initialForm);
    initialFormRef.current = initialForm;
  }, [initialForm]);

  const renderAccountTab = () => (
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
          onSubmit={onSaveAccount}
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
                placeholder="+81 90 1234 5678"
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
          disabled={!isAccountDirty}
          aria-disabled={!isAccountDirty}
          onClick={(e) => {
            const formEl = (e.currentTarget.closest("[data-slot=card]") as HTMLElement)?.querySelector("form") as HTMLFormElement | null;
            formEl?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }}
        >
          変更を保存
        </Button>
      </CardFooter>
    </Card>
  );

  const renderNotificationsTab = () => (
    <Card>
      <CardHeader>
        <CardTitle id="notifications-heading" className="text-2xl">
          通知設定
        </CardTitle>
        <CardDescription>
          通知の種類と受信方法を設定できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSaveNotifications}
          className="space-y-8"
          aria-labelledby="notifications-heading"
        >
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">通知の種類</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trip-reminders">旅行のリマインダー</Label>
                <p className="text-sm text-gray-500">予定されている旅行の前日に通知します</p>
              </div>
              <Switch
                id="trip-reminders"
                checked={notifications.tripReminders}
                onCheckedChange={handleNotificationChange("tripReminders")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-trips">新しい旅行の提案</Label>
                <p className="text-sm text-gray-500">あなたの好みに基づいた旅行提案を受け取ります</p>
              </div>
              <Switch
                id="new-trips"
                checked={notifications.newTrips}
                onCheckedChange={handleNotificationChange("newTrips")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="updates">アプリの更新</Label>
                <p className="text-sm text-gray-500">新機能やアップデートの情報を受け取ります</p>
              </div>
              <Switch
                id="updates"
                checked={notifications.updates}
                onCheckedChange={handleNotificationChange("updates")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">マーケティング</Label>
                <p className="text-sm text-gray-500">特別なオファーやキャンペーン情報を受け取ります</p>
              </div>
              <Switch
                id="marketing"
                checked={notifications.marketing}
                onCheckedChange={handleNotificationChange("marketing")}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">通知方法</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">メール通知</Label>
                <p className="text-sm text-gray-500">メールで通知を受け取ります</p>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.emailNotifications}
                onCheckedChange={handleNotificationChange("emailNotifications")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">プッシュ通知</Label>
                <p className="text-sm text-gray-500">ブラウザやアプリでプッシュ通知を受け取ります</p>
              </div>
              <Switch
                id="push-notifications"
                checked={notifications.pushNotifications}
                onCheckedChange={handleNotificationChange("pushNotifications")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notifications">SMS通知</Label>
                <p className="text-sm text-gray-500">重要な通知をSMSで受け取ります</p>
              </div>
              <Switch
                id="sms-notifications"
                checked={notifications.smsNotifications}
                onCheckedChange={handleNotificationChange("smsNotifications")}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">通知頻度</h3>
            <div className="space-y-2">
              <Label htmlFor="frequency">通知をまとめて受け取る頻度</Label>
              <Select value={notifications.frequency} onValueChange={handleNotificationSelectChange("frequency")}>
                <SelectTrigger>
                  <SelectValue placeholder="頻度を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">リアルタイム</SelectItem>
                  <SelectItem value="daily">1日1回</SelectItem>
                  <SelectItem value="weekly">週1回</SelectItem>
                  <SelectItem value="monthly">月1回</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                リアルタイム以外を選択すると、通知をまとめて指定した頻度で受け取ります
              </p>
            </div>
          </section>
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="submit"
          className="h-11 px-6"
          disabled={!isNotificationsDirty}
          aria-disabled={!isNotificationsDirty}
          onClick={(e) => {
            const formEl = (e.currentTarget.closest("[data-slot=card]") as HTMLElement)?.querySelector("form") as HTMLFormElement | null;
            formEl?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }}
        >
          変更を保存
        </Button>
      </CardFooter>
    </Card>
  );

  const renderOtherTab = () => (
    <Card>
      <CardHeader>
        <CardTitle id="other-heading" className="text-2xl">
          その他の設定
        </CardTitle>
        <CardDescription>
          アプリの表示設定や一般的な設定を変更できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSaveOtherSettings}
          className="space-y-8"
          aria-labelledby="other-heading"
        >
          <section className="space-y-4">
            <h3 className="text-lg font-semibold">表示設定</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">言語</Label>
                <Select value={otherSettings.language} onValueChange={handleOtherSettingsChange("language")}>
                  <SelectTrigger>
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">タイムゾーン</Label>
                <Select value={otherSettings.timezone} onValueChange={handleOtherSettingsChange("timezone")}>
                  <SelectTrigger>
                    <SelectValue placeholder="タイムゾーンを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Tokyo">日本標準時 (JST)</SelectItem>
                    <SelectItem value="America/New_York">東部標準時 (EST)</SelectItem>
                    <SelectItem value="Europe/London">グリニッジ標準時 (GMT)</SelectItem>
                    <SelectItem value="UTC">協定世界時 (UTC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme">テーマ</Label>
                <Select value={otherSettings.theme} onValueChange={handleOtherSettingsChange("theme")}>
                  <SelectTrigger>
                    <SelectValue placeholder="テーマを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">ライト</SelectItem>
                    <SelectItem value="dark">ダーク</SelectItem>
                    <SelectItem value="system">システム設定に従う</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units">単位</Label>
                <Select value={otherSettings.units} onValueChange={handleOtherSettingsChange("units")}>
                  <SelectTrigger>
                    <SelectValue placeholder="単位を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">メートル法 (km, °C)</SelectItem>
                    <SelectItem value="imperial">ヤード・ポンド法 (mi, °F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">地図設定</h3>
            
            <div className="space-y-2">
              <Label htmlFor="map-style">地図スタイル</Label>
              <Select value={otherSettings.mapStyle} onValueChange={handleOtherSettingsChange("mapStyle")}>
                <SelectTrigger>
                  <SelectValue placeholder="地図スタイルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">標準</SelectItem>
                  <SelectItem value="satellite">衛星画像</SelectItem>
                  <SelectItem value="terrain">地形図</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                地図の表示スタイルを変更します
              </p>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">プライバシー設定</h3>
            
            <div className="space-y-2">
              <Label htmlFor="privacy">旅行の公開設定</Label>
              <Select value={otherSettings.privacy} onValueChange={handleOtherSettingsChange("privacy")}>
                <SelectTrigger>
                  <SelectValue placeholder="公開設定を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">公開</SelectItem>
                  <SelectItem value="friends">友達のみ</SelectItem>
                  <SelectItem value="private">非公開</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                作成した旅行プランの公開範囲を設定します
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">使用状況の分析</Label>
                <p className="text-sm text-gray-500">アプリの改善のために使用状況データの収集を許可します</p>
              </div>
              <Switch
                id="analytics"
                checked={otherSettings.analytics}
                onCheckedChange={(checked) => handleOtherSettingsChange("analytics")(checked)}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">データ管理</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="data-export">データエクスポート</Label>
                <p className="text-sm text-gray-500">アカウントデータをエクスポートする準備をします</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log("データエクスポートを開始");
                  alert("データエクスポートの準備を開始しました。完了次第メールでお知らせします。");
                }}
              >
                エクスポート開始
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <h3 className="text-lg font-semibold">フィードバック</h3>
            
            <div className="space-y-2">
              <Label htmlFor="feedback">ご意見・ご要望</Label>
              <Textarea
                id="feedback"
                placeholder="アプリの改善に向けたご意見やご要望をお聞かせください..."
                value={otherSettings.feedback}
                onChange={(e) => handleOtherSettingsChange("feedback")(e.target.value)}
                rows={4}
              />
              <p className="text-sm text-gray-500">
                いただいたフィードバックは今後の開発に活用させていただきます
              </p>
            </div>
          </section>
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="submit"
          className="h-11 px-6"
          disabled={!isOtherDirty}
          aria-disabled={!isOtherDirty}
          onClick={(e) => {
            const formEl = (e.currentTarget.closest("[data-slot=card]") as HTMLElement)?.querySelector("form") as HTMLFormElement | null;
            formEl?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          }}
        >
          変更を保存
        </Button>
      </CardFooter>
    </Card>
  );

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
          {active === "アカウント" && renderAccountTab()}
          {active === "通知" && renderNotificationsTab()}
          {active === "その他" && renderOtherTab()}
        </main>
      </div>
    </div>
  );
}
