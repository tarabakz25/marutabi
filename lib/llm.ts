import OpenAI from 'openai';

// Server-side OpenAI client. Requires OPENAI_API_KEY in environment.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;


