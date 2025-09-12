"use client"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-2/3">
        <Image className="w-full h-full object-cover" src="https://images.pexels.com/photos/2265876/pexels-photo-2265876.jpeg" alt="Marutabi" width={1000} height={1000} />
      </div>

      <div className="w-1/3 bg-white flex items-center justify-center p-8 h-screen">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Login</h2>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={() => {
                console.log('GitHub login button clicked');
                signIn("github", { callbackUrl: '/dashboard' });
              }} 
              className="w-full h-12 text-base font-medium"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </div>
        </div>
      </div>
    </div>
  )
}