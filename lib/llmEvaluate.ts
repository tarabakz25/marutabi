import openai from './llm';
import type { LLMRouteEvaluation, LLMRouteEvalInput } from './scoring';

function buildPrompt(input: LLMRouteEvalInput): string {
  const locale = input.locale ?? 'ja';
  const style = input.style ?? 'concise';
  const notes = input.userNotes ? `ユーザーの希望: ${input.userNotes}` : '';
  const textJa = `あなたは旅程の評価アシスタントです。次の旅のメトリクスを基に、0-100 のスコアと理由、全体コメント(1-2文)、さらにおすすめのタイムスケジュールを日本語で出力してください。必ず JSON のみを返してください。
メトリクス:
- 合計時間(分): ${input.totalTimeMinutes}
- 合計運賃(円): ${input.totalFare}
- 合計距離(m): ${input.totalDistance}
- 乗換回数: ${input.transferCount}
${notes}
出力(JSON): {"score": number, "reasons": string[], "risks": string[], "comment": string, "schedule": {"time": string, "title": string, "description"?: string}[] }
スケジュール要件:
- 出発想定時刻を設定し(例: 08:00)、合計時間(${input.totalTimeMinutes}分)に収まるように 3-8 件の項目で構成
- time は24時間表記の HH:MM、日本時間、昇順
- title は 10-20 文字程度で簡潔に。description は任意で 1 文
- 不確かな具体地名は出さない（一般化表現: 駅到着/乗換/小休憩 など）
制約: 文字数は${style === 'concise' ? '短く' : 'やや詳しく'}、推測は避ける、フォーマットは厳密に JSON のみ。`;

  const textEn = `You are a travel route evaluator. Given the following metrics, return a 0-100 score, concise reasons, a short overall comment (1-2 sentences), and a recommended time schedule. JSON only.
Metrics: time(min)=${input.totalTimeMinutes}, fare(JPY)=${input.totalFare}, distance(m)=${input.totalDistance}, transfers=${input.transferCount}. ${notes}
Output(JSON): {"score": number, "reasons": string[], "risks": string[], "comment": string, "schedule": {"time": string, "title": string, "description"?: string}[] }
Schedule requirements:
- Assume a start time (e.g., 08:00) and fit items within total time (${input.totalTimeMinutes} min), 3-8 items
- time in 24h HH:MM, ascending order, JST
- Keep titles concise (10-20 chars), description optional, one sentence
- Avoid specific place names if uncertain (use generalized wording)
Constraints: Keep it ${style === 'concise' ? 'concise' : 'slightly detailed'}, avoid speculation, strictly JSON.`;

  return locale === 'ja' ? textJa : textEn;
}

export async function evaluateRouteWithLLM(input: LLMRouteEvalInput): Promise<LLMRouteEvaluation> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const prompt = buildPrompt(input);
  let content = '{}';
  const MAX_ATTEMPTS = 2;
  const TIMEOUT_MS = 45000;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      content = res.choices?.[0]?.message?.content ?? '{}';
      clearTimeout(timeout);
      break;
    } catch (e) {
      clearTimeout(timeout);
      const message = e instanceof Error ? e.message : String(e);
      const isAbort = /aborted|abort/i.test(message);
      if (attempt < MAX_ATTEMPTS && isAbort) {
        // retry once on timeout/abort
        continue;
      }
      return { score: 0, reasons: ['LLM呼び出しに失敗しました'], risks: [], comment: '解析に失敗しました。', errorMessage: message };
    }
  }
  try {
    const parsed = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
    const reasons: string[] = Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5) : [];
    const risks: string[] | undefined = Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : undefined;
    let comment: string | undefined = typeof parsed.comment === 'string' ? parsed.comment : undefined;
    const schedule = Array.isArray(parsed.schedule)
      ? parsed.schedule
          .map((it: any) => ({
            time: typeof it?.time === 'string' ? it.time : '',
            title: typeof it?.title === 'string' ? it.title : '',
            description: typeof it?.description === 'string' ? it.description : undefined,
          }))
          .filter((it: any) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(it.time) && it.title)
          .slice(0, 10)
      : undefined;
    if (!comment || comment.trim().length < 3) {
      // Fallback short comment from reasons
      const top = reasons.slice(0, 2).join('、');
      comment = top
        ? `総合スコアは${score}。主な評価ポイントは「${top}」。`
        : `総合スコアは${score}です。`;
    }
    return { score, reasons, risks, comment, schedule };
  } catch (e) {
    return { score: 0, reasons: ['LLM応答の解析に失敗しました'], risks: [], comment: '解析に失敗しました。' };
  }
}


