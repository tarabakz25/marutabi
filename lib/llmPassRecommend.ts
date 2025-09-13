import openai from './llm';
import { loadPassCatalog, type PassCatalogItem } from './passes';

export type LLMPassRecommendInput = {
  operators: string[];
  distanceTotal: number;
  timeTotal: number;
  transferCount: number;
  candidateIds?: string[]; // 事前に候補IDがある場合は優先
};

export type LLMPassRecommendation = {
  passIds: string[]; // catalog の id 群（複数構成も許容）
  title: string; // 例: "首都圏1日なら 都区内パス"
  summary: string; // 1-2文の短い説明
  reasons?: string[]; // 箇条書き理由（任意）
};

export type LLMPassRecommendResult = {
  recommendations: LLMPassRecommendation[];
  notes?: string;
};

function buildPrompt(
  input: LLMPassRecommendInput,
  candidates: PassCatalogItem[],
): string {
  const ops = input.operators.join(', ');
  const candCompact = candidates.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, include: c.rules.include.map((r) => r.operator).filter(Boolean), excludeShinkansen: c.rules.exclude.some((r) => (r.service ?? []).includes('Shinkansen')) }));
  const candStr = JSON.stringify(candCompact);
  return `あなたは日本の鉄道フリーきっぷに詳しいアシスタントです。以下の経路メトリクスと候補一覧から、最適なおすすめフリーきっぷ構成を1〜3件、JSONのみで返してください。
メトリクス: {"operators": [${ops ? '"' + input.operators.join('\", \"') + '"' : ''}], "distanceTotal": ${Math.round(input.distanceTotal)}, "timeTotal": ${Math.round(input.timeTotal)}, "transferCount": ${input.transferCount}}
候補一覧(JSON): ${candStr}
選定方針:
- 候補一覧に含まれる id からのみ選ぶこと（未掲載の券種は選ばない）
- 事業者のカバー範囲・新幹線可否・一般的な利用シーンを簡潔に考慮
- 単一券種で足りない場合は、複数券種の組合せ(passIdsに複数id)も可。ただし過剰な多重構成は避ける（最大2-3件まで）。
出力(JSON): {"recommendations": {"passIds": string[], "title": string, "summary": string, "reasons"?: string[]}[], "notes"?: string}
制約: 日本語、事実に自信がない運賃・回数等の数値は書かない。`; 
}

export async function recommendPassesWithLLM(input: LLMPassRecommendInput): Promise<LLMPassRecommendResult> {
  if (!process.env.OPENAI_API_KEY) {
    // LLMが使えない場合は空で返す
    return { recommendations: [] };
  }
  const catalog = await loadPassCatalog();
  // 事前候補がある場合はそれを優先、なければ operator マッチで粗く抽出
  const candidates: PassCatalogItem[] = (() => {
    if (input.candidateIds && input.candidateIds.length > 0) {
      const set = new Set(input.candidateIds);
      return catalog.filter((c) => set.has(c.id)).slice(0, 20);
    }
    // operator が多いほど候補数が膨らむので簡易ヒューリスティック
    const ops = new Set(input.operators);
    const score = (c: PassCatalogItem) => c.rules.include.some((r) => !!r.operator && Array.from(ops).some((op) => (r.operator ?? '').toLowerCase().includes(op.toLowerCase()) || op.toLowerCase().includes((r.operator ?? '').toLowerCase()))) ? 1 : 0;
    return catalog
      .map((c) => ({ c, s: score(c) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 20)
      .map((x) => x.c);
  })();

  const prompt = buildPrompt(input, candidates);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await openai.chat.completions.create(
      {
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'Return only valid JSON. No extra text.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' } as any,
      } as any,
      { signal: controller.signal as any }
    );
    clearTimeout(timeout);
    const content = res.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const recsRaw = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
    const recs: LLMPassRecommendation[] = recsRaw.map((r: any) => ({
      passIds: Array.isArray(r?.passIds) ? r.passIds.filter((x: any) => typeof x === 'string') : [],
      title: typeof r?.title === 'string' ? r.title : '',
      summary: typeof r?.summary === 'string' ? r.summary : '',
      reasons: Array.isArray(r?.reasons) ? r.reasons.filter((x: any) => typeof x === 'string').slice(0, 6) : undefined,
    })).filter((r: LLMPassRecommendation) => r.passIds.length > 0 && r.title);
    const notes = typeof parsed?.notes === 'string' ? parsed.notes : undefined;
    return { recommendations: recs.slice(0, 3), notes };
  } catch {
    clearTimeout(timeout);
    return { recommendations: [] };
  }
}


