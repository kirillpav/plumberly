import type { IntakeData, TriageMetadata, ChatMessage } from '@/types/index';
import { Config } from '@/constants/config';

interface ChatTriageResponse {
  message: string;
  metadata: TriageMetadata;
}

const FALLBACK_RESPONSE: ChatTriageResponse = {
  message: 'Sorry, something went wrong. Please try again.',
  metadata: { isEmergency: false, category: 3, confidence: 0, modelUsed: 'error' },
};

const TIMEOUT_MS = 30_000;

export async function callChatTriage(
  intakeData: IntakeData,
  messages: ChatMessage[],
  stateSummary: string | null
): Promise<ChatTriageResponse> {
  try {
    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const url = `${Config.supabase.url}/functions/v1/chat-triage`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.log('[callChatTriage] Calling edge function...');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeData, messages: apiMessages, stateSummary }),
        signal: controller.signal,
      });

      console.log('[callChatTriage] Response status:', response.status);
      const json = await response.json();

      if (!response.ok) {
        console.error('[callChatTriage] Error:', response.status, JSON.stringify(json));
        return FALLBACK_RESPONSE;
      }

      return {
        message: json?.message ?? FALLBACK_RESPONSE.message,
        metadata: json?.metadata ?? FALLBACK_RESPONSE.metadata,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[callChatTriage] Timed out after 30s');
    } else {
      console.error('[callChatTriage] Error:', err.message ?? err);
    }
    return FALLBACK_RESPONSE;
  }
}
