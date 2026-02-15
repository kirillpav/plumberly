import { Config } from '@/constants/config';

type TextContent = { type: 'text'; text: string };
type ImageContent = { type: 'image_url'; image_url: { url: string } };
type ContentPart = TextContent | ImageContent;

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export async function chatCompletion(
  messages: ChatCompletionMessage[]
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: Config.openai.model,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? '';
}
