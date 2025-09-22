"use client"
import { signIn, getProviders } from "next-auth/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

type Providers = Record<string, { id: string; name: string }>;

export default function Login() {
  const [providers, setProviders] = useState<Providers | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProviders();
        if (p) { setProviders(p as Providers); return; }
      } catch {}
      try {
        const res = await fetch('/api/public/providers', { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          const fallback: Providers = {} as any;
          if (j.google) fallback['google'] = { id: 'google', name: 'Google' } as any;
          if (j.cognito) fallback['cognito'] = { id: 'cognito', name: 'Cognito' } as any;
          setProviders(fallback);
          return;
        }
      } catch {}
      setProviders({});
    })();
  }, []);
  return (
    <div className="min-h-svh flex flex-col md:flex-row">
      <div className="w-2/3">
        <Image className="w-full h-full object-cover" src="/stacked-peaks-haikei.svg" alt="Marutabi" width={1000} height={1000} />
      </div>

      <div className="w-full md:w-1/3 bg-white flex items-center justify-center p-6 md:p-8 min-h-[40svh] md:min-h-svh">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Login</h2>
          </div>
          
          <div className="space-y-4">
            {providers && Object.values(providers).length === 0 && (
              <div className="text-sm text-red-600">ログインプロバイダーが未設定です。</div>
            )}
            {providers && providers["google"] && (
              <Button 
                onClick={() => signIn("google", { callbackUrl: '/' })}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M533.5 278.4c0-18.6-1.7-36.4-4.9-53.6H272v101.5h146.9c-6.3 34.1-25 62.9-53.4 82.1v68.1h86.3c50.5-46.5 81.7-115.1 81.7-198.1z"/>
                  <path fill="#34A853" d="M272 544.3c73.8 0 135.7-24.4 180.9-66.1l-86.3-68.1c-24 16.1-54.7 25.7-94.6 25.7-72.7 0-134.3-49-156.3-114.6H27.7v71.9C72.6 487.5 166.1 544.3 272 544.3z"/>
                  <path fill="#FBBC05" d="M115.7 321.2c-10.2-30.5-10.2-63.4 0-93.9V155.4H27.7c-36.9 73.8-36.9 160.6 0 234.4l88-68.6z"/>
                  <path fill="#EA4335" d="M272 107.7c39.9 0 75.8 13.8 104 40.9l78-78C407.7 24.5 345.8 0 272 0 166.1 0 72.6 56.8 27.7 155.4l88 71.9C137.7 156.7 199.3 107.7 272 107.7z"/>
                </svg>
                Google でログイン
              </Button>
            )}
            {providers && providers["cognito"] && (
              <Button 
                onClick={() => signIn("cognito", { callbackUrl: '/' })}
                className="w-full h-12 text-base font-medium"
                variant="outline"
              >
                Cognito でログイン
              </Button>
            )}
          </div>
          
          <div className="text-center text-sm text-gray-500">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </div>
        </div>
      </div>
    </div>
  )
}