import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Only expose explicitly whitelisted environment variables to the client.
  // EKS_API_KEY is intentionally omitted so it remains server-side only.
  env: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
  // Turbopackの設定（無効な設定を削除）
  turbopack: {
    // ネットワーク関連の設定
    resolveAlias: {},
  },
  experimental: {
    // 大きなファイルのハンドリングを改善
    largePageDataBytes: 128 * 1024, // 128KB
  },
  // HTTPタイムアウトの設定
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
