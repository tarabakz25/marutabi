import { NextResponse } from 'next/server';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getCache, setCache } from '@/lib/cache';

// 静的生成を使用してパフォーマンスを向上
export const dynamic = 'error';
export const revalidate = 3600; // 1時間ごとに再検証

// メモリ内キャッシュ
let stationsCache: string | null = null;

export async function GET() {
  try {
    // メモリキャッシュをチェック
    if (stationsCache) {
      const gz = gzipSync(Buffer.from(stationsCache, 'utf-8'));
      return new NextResponse(gz, {
        headers: {
          'content-type': 'application/geo+json; charset=utf-8',
          'content-encoding': 'gzip',
          'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }
    
    // Redisキャッシュをチェック
    const cachedData = await getCache<string>('stations_geojson');
    if (cachedData) {
      stationsCache = cachedData;
      const gz = gzipSync(Buffer.from(cachedData, 'utf-8'));
      return new NextResponse(gz, {
        headers: {
          'content-type': 'application/geo+json; charset=utf-8',
          'content-encoding': 'gzip',
          'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }
    
    // ファイルから読み込み
    const filePath = path.join(process.cwd(), 'data', 'map', 'N02-24_Station.geojson');
    const content = await fs.readFile(filePath, 'utf-8');
    
    // キャッシュに保存
    stationsCache = content;
    await setCache('stations_geojson', content);
    
    const gz = gzipSync(Buffer.from(content, 'utf-8'));
    return new NextResponse(gz, {
      headers: {
        'content-type': 'application/geo+json; charset=utf-8',
        'content-encoding': 'gzip',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Failed to read station geojson:', error);
    return NextResponse.json({ error: 'Failed to load stations' }, { status: 500 });
  }
}


