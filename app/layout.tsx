import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Footer from "@/components/Footer";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Marutabi",
  description: "Marutabi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSans.className} ${notoSansJP.className} antialiased min-h-dvh flex flex-col`}
      >
        <Providers>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
