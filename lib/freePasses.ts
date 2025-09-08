import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 型定義
 */
export interface PassRuleSegment {
  operator?: string;
  operator_type?: string;
  area?: string;
  line?: string;
  segment?: string;
  service?: string[] | 'all';
  train_names?: string[];
  condition?: string; // 条件付きの場合の説明
}

export interface PassRules {
  include?: PassRuleSegment[];
  conditional_include?: PassRuleSegment[];
  exclude?: PassRuleSegment[];
  notes?: string;
}

export interface PassValidity {
  type: string;
  days?: number;
  days_options?: number[];
  hours?: number;
  seasonal?: boolean;
  season?: string;
  holiday_only?: boolean;
  holiday_bias?: boolean;
  shareable?: boolean;
  area?: string; // area-limited pass など
}

export interface FreePass {
  id: string;
  name: string;
  issuer: string;
  eligibility: string;
  validity: PassValidity;
  price_note?: string;
  rules: PassRules;
  sources: string[];
  schema_version: string;
}

export interface FreePassCollection {
  created_at: string;
  description: string;
  features: FreePass[];
}

let cache: FreePassCollection | null = null;

/**
 * free_passes.geojson を読み込み、メモリにキャッシュして返す
 */
export async function loadFreePasses(): Promise<FreePassCollection> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), 'data', 'pass', 'free_passes.geojson');
  const json = JSON.parse(await fs.readFile(filePath, 'utf-8'));
  // 軽いバリデーションと型変換
  const { created_at, description, features } = json as any;
  const typedFeatures: FreePass[] = (features as any[]).map((f) => f.properties as FreePass);
  cache = { created_at, description, features: typedFeatures };
  return cache;
}

/**
 * パス ID から取得
 */
export async function getPassById(id: string): Promise<FreePass | undefined> {
  const { features } = await loadFreePasses();
  return features.find((p) => p.id === id);
}

/**
 * 与えられた参数 (operator, service, line など) がパスのルールで許可されるかを判定。
 * 現状は operator と service の単純一致のみ実装し、詳細判定は今後拡張。
 */
export function isEdgeAllowedByPass(options: {
  pass: FreePass;
  operator?: string;
  service?: string;
}): boolean {
  const { pass, operator, service } = options;
  const { include = [], exclude = [] } = pass.rules;

  // exclude 優先
  for (const ex of exclude) {
    if (operator && ex.operator && ex.operator === operator) return false;
    if (service && ex.service && Array.isArray(ex.service) && ex.service.includes(service))
      return false;
  }

  // include チェック (指定がなければ true)
  if (include.length === 0) return true;
  for (const inc of include) {
    let ok = true;
    if (operator && inc.operator && inc.operator !== operator) ok = false;
    if (service && inc.service && Array.isArray(inc.service) && !inc.service.includes(service))
      ok = false;
    if (ok) return true;
  }
  return false;
}
