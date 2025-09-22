import { NextResponse } from 'next/server';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getCache, setCache } from '@/lib/cache';

// 静的生成を使用してパフォーマンスを向上
export const dynamic = 'error';
export const revalidate = 3600; // 1時間ごとに再検証
export const runtime = 'nodejs';

// メモリ内キャッシュ
let railroadsCache: string | null = null;

export async function GET() {
  try {
    // メモリキャッシュをチェック
    if (railroadsCache) {
      const gz = gzipSync(Buffer.from(railroadsCache, 'utf-8'));
      const body = new Uint8Array(gz);
      return new NextResponse(body, {
        headers: {
          'content-type': 'application/geo+json; charset=utf-8',
          'content-encoding': 'gzip',
          'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }
    
    // Redisキャッシュをチェック
    const cachedData = await getCache<string>('railroads_geojson');
    if (cachedData) {
      railroadsCache = cachedData;
      const gz = gzipSync(Buffer.from(cachedData, 'utf-8'));
      const body = new Uint8Array(gz);
      return new NextResponse(body, {
        headers: {
          'content-type': 'application/geo+json; charset=utf-8',
          'content-encoding': 'gzip',
          'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }
    
    // ファイルから読み込み
    const filePath = path.join(process.cwd(), 'data', 'map', 'N02-24_RailroadSection.geojson');
    const content = await fs.readFile(filePath, 'utf-8');
    
    // キャッシュに保存
    railroadsCache = content;
    await setCache('railroads_geojson', content);
    
    const gz = gzipSync(Buffer.from(content, 'utf-8'));
    const body = new Uint8Array(gz);
    return new NextResponse(body, {
      headers: {
        'content-type': 'application/geo+json; charset=utf-8',
        'content-encoding': 'gzip',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Failed to read railroad geojson:', error);
    return NextResponse.json({ error: 'Failed to load railroads' }, { status: 500 });
  }
}


