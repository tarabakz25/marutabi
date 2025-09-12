import fs from 'node:fs/promises';
import path from 'node:path';

export type PassRuleItem = {
  operator?: string;
  area?: string;
  line?: string;
  segment?: string;
  service?: string[];
};

export type PassRules = {
  include: PassRuleItem[];
  exclude: PassRuleItem[];
};

export type PassCatalogItem = {
  id: string;
  name: string;
  issuer?: string;
  rules: PassRules;
};

let cachedCatalog: PassCatalogItem[] | null = null;

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function normalizeRuleItem(raw: any): PassRuleItem {
  const serviceArr = toArray<string>(raw?.service).filter(Boolean);
  return {
    operator: raw?.operator ? String(raw.operator) : undefined,
    area: raw?.area ? String(raw.area) : undefined,
    line: raw?.line ? String(raw.line) : undefined,
    segment: raw?.segment ? String(raw.segment) : undefined,
    service: serviceArr.length > 0 ? serviceArr : undefined,
  };
}

function normalizeRules(raw: any): PassRules {
  const include = toArray<any>(raw?.include).map(normalizeRuleItem);
  const exclude = toArray<any>(raw?.exclude).map(normalizeRuleItem);
  return { include, exclude };
}

export async function loadPassCatalog(): Promise<PassCatalogItem[]> {
  if (cachedCatalog) return cachedCatalog as PassCatalogItem[];
  try {
    const passPath = path.join(process.cwd(), 'data', 'pass', 'free_passes.geojson');
    const json = JSON.parse(await fs.readFile(passPath, 'utf-8')) as any;
    const items: PassCatalogItem[] = (json?.features ?? [])
      .map((f: any) => {
        const id = String(f?.properties?.id ?? '').trim();
        if (!id) return null;
        const name = String(f?.properties?.name ?? id);
        const issuer = f?.properties?.issuer ? String(f.properties.issuer) : undefined;
        const rules = normalizeRules(f?.properties?.rules ?? {});
        return { id, name, issuer, rules } as PassCatalogItem;
      })
      .filter(Boolean);
    cachedCatalog = items;
    return items;
  } catch {
    cachedCatalog = [];
    return [];
  }
}

export async function listPasses(): Promise<{ id: string; name: string; issuer?: string }[]> {
  const catalog = await loadPassCatalog();
  return catalog.map(({ id, name, issuer }) => ({ id, name, issuer }));
}

export async function getPassNames(passIds: string[]): Promise<string[]> {
  const catalog = await loadPassCatalog();
  const map = new Map(catalog.map((p) => [p.id, p.name] as const));
  return passIds.map((id) => map.get(id) ?? id);
}

function isJRLikeOperator(opJa: string): boolean {
  return opJa.includes('ＪＲ') || opJa.includes('JR');
}

function isShinkansenLine(lineName?: string): boolean {
  const s = lineName ?? '';
  return s.includes('新幹線');
}

const OPERATOR_MAP: Record<string, (opJa: string) => boolean> = {
  'JR': (s) => isJRLikeOperator(s),
  'JR Hokkaido': (s) => s.includes('ＪＲ北海道') || s.includes('JR北海道'),
  'JR East': (s) => s.includes('ＪＲ東日本') || s.includes('JR東日本'),
  'JR Central': (s) => s.includes('ＪＲ東海') || s.includes('JR東海'),
  'JR West': (s) => s.includes('ＪＲ西日本') || s.includes('JR西日本'),
  'JR Shikoku': (s) => s.includes('ＪＲ四国') || s.includes('JR四国'),
  'JR Kyushu': (s) => s.includes('ＪＲ九州') || s.includes('JR九州'),
  'Aoimori Railway': (s) => s.includes('青い森鉄道'),
  'IGR Iwate Galaxy Railway': (s) => s.includes('IGR') || s.includes('いわて銀河鉄道') || s.includes('ＩＧＲ'),
  'Hokuetsu Express': (s) => s.includes('北越急行'),
  'Tokyo Monorail': (s) => s.includes('東京モノレール'),
  'TWR Rinkai Line': (s) => s.includes('東京臨海高速鉄道') || s.includes('りんかい線'),
  'Meitetsu': (s) => s.includes('名古屋鉄道'),
  'Kintetsu': (s) => s.includes('近畿日本鉄道'),
  'Nankai': (s) => s.includes('南海電気鉄道') || s.includes('南海'),
  'Shizutetsu': (s) => s.includes('静岡鉄道'),
  'Enshu Railway': (s) => s.includes('遠州鉄道'),
  'Aichi Loop Railway': (s) => s.includes('愛知環状鉄道'),
  'Yoro Railway': (s) => s.includes('養老鉄道'),
  'Izu Kyuko': (s) => s.includes('伊豆急行'),
  'Izuhakone Railway': (s) => s.includes('伊豆箱根鉄道'),
  'Sangi Railway': (s) => s.includes('三岐鉄道'),
  'Nagaragawa Railway': (s) => s.includes('長良川鉄道'),
  'Akechi Railway': (s) => s.includes('明知鉄道'),
  'Tenryu Hamanako Railroad': (s) => s.includes('天竜浜名湖鉄道'),
  'Ise Railway': (s) => s.includes('伊勢鉄道'),
  'Yokkaichi Asunarou Railway': (s) => s.includes('四日市あすなろう鉄道'),
  'Toyohashi Railroad': (s) => s.includes('豊橋鉄道'),
  'Minatomirai Line': (s) => s.includes('横浜高速鉄道') || s.includes('みなとみらい'),
};

function matchOperatorByRule(opJa: string, ruleOperator?: string): boolean {
  if (!ruleOperator) return true;
  const fn = OPERATOR_MAP[ruleOperator];
  if (fn) return fn(opJa);
  return opJa.toLowerCase().includes(ruleOperator.toLowerCase());
}

export async function suggestPassesForOperators(operators: string[]): Promise<string[]> {
  try {
    const catalog = await loadPassCatalog();
    const result: string[] = [];
    for (const p of catalog) {
      const includeOps = p.rules.include.map((i) => i.operator).filter(Boolean) as string[];
      const coversAll = operators.every((op) => includeOps.includes(op) || (includeOps.includes('JR') && isJRLikeOperator(op)));
      if (coversAll) result.push(p.name);
    }
    return result.slice(0, 10);
  } catch {
    return [];
  }
}

// Edge-like predicate builder: works with any object having operator and line
export async function buildAllowEdgePredicate<T extends { operator: string; line?: string }>(passIds: string[]): Promise<(e: T) => boolean> {
  const base = (e: T) => e.operator === 'Transfer' ? true : !isShinkansenLine(e.line);
  if (!passIds || passIds.length === 0) return base;

  const catalog = await loadPassCatalog();
  const selected = catalog.filter((p) => passIds.includes(p.id));
  if (selected.length === 0) return base;

  type SinglePredicate = (e: T) => boolean;
  const makeSingle = (rules: PassRules): SinglePredicate => {
    const includeArr = rules.include ?? [];
    const excludeArr = rules.exclude ?? [];
    const includeOps = includeArr.map((x) => x?.operator).filter(Boolean) as string[];
    const includesShinkansen = includeArr.some((x) => toArray(x?.service).includes('Shinkansen'));
    const excludeShinkansen = excludeArr.some((x) => toArray(x?.service).includes('Shinkansen'));
    return (e: T) => {
      if (e.operator === 'Transfer') return true;
      const line = e.line ?? '';
      if (isShinkansenLine(line)) {
        if (excludeShinkansen) return false;
        if (!includesShinkansen) return false;
      }
      if (includeOps.length === 0) return base(e);
      if (includeOps.includes('JR') && isJRLikeOperator(e.operator)) return true;
      for (const op of includeOps) {
        if (matchOperatorByRule(e.operator, op)) return true;
      }
      return false;
    };
  };

  const predicates = selected.map((p) => makeSingle(p.rules));
  return (e: T) => predicates.some((fn) => fn(e));
}


