import openai from './llm';
import type { LLMRouteEvaluation, LLMRouteEvalInput } from './scoring';

function buildPrompt(input: LLMRouteEvalInput): string {
  const locale = input.locale ?? 'ja';
  const style = input.style ?? 'concise';
  const notes = input.userNotes ? `ユーザーの希望: ${input.userNotes}` : '';
  const textJa = `あなたは旅程の評価アシスタントです。次の旅のメトリクスを基に、0-100 のスコアと理由、そして全体コメント(1-2文)を日本語で出力してください。必ず JSON のみを返してください。
メトリクス:
- 合計時間(分): ${input.totalTimeMinutes}
- 合計運賃(円): ${input.totalFare}
- 合計距離(m): ${input.totalDistance}
- 乗換回数: ${input.transferCount}
${notes}
出力(JSON): {"score": number, "reasons": string[], "risks": string[], "comment": string }
制約: 文字数は${style === 'concise' ? '短く' : 'やや詳しく'}、推測は避ける、フォーマットは厳密に JSON のみ。`;

  const textEn = `You are a travel route evaluator. Given the following metrics, return a 0-100 score, concise reasons, and a short overall comment (1-2 sentences). JSON only.
Metrics: time(min)=${input.totalTimeMinutes}, fare(JPY)=${input.totalFare}, distance(m)=${input.totalDistance}, transfers=${input.transferCount}. ${notes}
Output(JSON): {"score": number, "reasons": string[], "risks": string[], "comment": string }
Constraints: Keep it ${style === 'concise' ? 'concise' : 'slightly detailed'}, avoid speculation, strictly JSON.`;

  return locale === 'ja' ? textJa : textEn;
}

export async function evaluateRouteWithLLM(input: LLMRouteEvalInput): Promise<LLMRouteEvaluation> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const prompt = buildPrompt(input);
  const res = await openai.responses.create({
    model: 'gpt-5-mini',
    input: [
      { role: 'system', content: 'Return only valid JSON. No extra text.' },
      { role: 'user', content: prompt },
    ] as any,
    temperature: 0.2,
    response_format: { type: 'json_object' } as any,
  });
  const content = (res as any).output_text ?? '{}';
  try {
    const parsed = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
    const reasons: string[] = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5) : [];
    const risks: string[] | undefined = Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : undefined;
    const comment: string | undefined = typeof parsed.comment === 'string' ? parsed.comment : undefined;
    return { score, reasons, risks, comment };
  } catch (e) {
    return { score: 0, reasons: ['LLM応答の解析に失敗しました'], risks: [], comment: '解析に失敗しました。' };
  }
}


