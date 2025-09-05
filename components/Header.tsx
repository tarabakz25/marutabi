"use client";

import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export const Header = ({ className }: HeaderProps) => {
  return (
    <header className={cn(
      "w-full bg-white border-b border-gray-200 shadow-sm",
      "sticky top-0 z-50",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              Marutabi
            </h1>
          </div>
          
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a
                href="#"
                className="text-gray-900 hover:text-gray-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ホーム
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                マップ
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                設定
              </a>
            </div>
          </nav>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-900 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 p-2"
              aria-label="メニューを開く"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
