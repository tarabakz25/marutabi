import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';

type OpenAICompat = {
  chat: {
    completions: {
      create: (args: any, opts?: any) => Promise<{ choices: { message: { content: string } }[] }>;
    };
  };
};

function isBedrock(): boolean {
  return process.env.LLM_PROVIDER === 'bedrock';
}

function createBedrockCompat(): OpenAICompat {
  const client = new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION,
  });
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error('BEDROCK_MODEL_ID is not set');
  }
  return {
    chat: {
      completions: {
        async create(args: any) {
          const all = Array.isArray(args?.messages) ? args.messages : [];
          const sys = all
            .filter((m: any) => m?.role === 'system')
            .map((m: any) => ({ text: String(m?.content ?? '') }));
          const msgs = all
            .filter((m: any) => m?.role !== 'system')
            .map((m: any) => ({
              role: m?.role === 'assistant' ? 'assistant' : 'user',
              content: [{ text: String(m?.content ?? '') }],
            }));
          const cmd = new ConverseCommand({
            modelId,
            system: sys.length ? sys : undefined,
            messages: msgs,
            inferenceConfig: {
              temperature: 0.2,
              maxTokens: 1200,
            },
          } as any);
          const out = await client.send(cmd);
          const text = (out?.output?.message?.content ?? [])
            .map((c: any) => (typeof c?.text === 'string' ? c.text : ''))
            .join('');
          return { choices: [{ message: { content: text } }] };
        },
      },
    },
  };
}

export const openai: any = isBedrock()
  ? createBedrockCompat()
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

export default openai;


