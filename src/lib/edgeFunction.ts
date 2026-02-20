import type { IntakeData, TriageMetadata, ChatMessage } from '@/types/index';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';

interface ChatTriageResponse {
  message: string;
  metadata: TriageMetadata;
}

const FALLBACK_RESPONSE: ChatTriageResponse = {
  message: 'Sorry, something went wrong. Please try again.',
  metadata: { isEmergency: false, category: 3, confidence: 0, modelUsed: 'error' },
};

const TIMEOUT_MS = 30_000;

function getAccessToken(): string {
  // Read token directly from Zustand store to avoid the getSession() deadlock
  const token = useAuthStore.getState().session?.access_token;
  return token ?? Config.supabase.anonKey;
}

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

    const token = await getAccessToken();
    const url = `${Config.supabase.url}/functions/v1/chat-triage`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: Config.supabase.anonKey,
        },
        body: JSON.stringify({ intakeData, messages: apiMessages, stateSummary }),
        signal: controller.signal,
      });

      const json = await response.json();

      if (json.error) {
        console.error('[callChatTriage] Edge function error:', json.error);
      }

      return {
        message: json.message,
        metadata: json.metadata,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[callChatTriage] Timed out after 30s');
      return {
        message: 'The request timed out. Please try again.',
        metadata: { isEmergency: false, category: 3, confidence: 0, modelUsed: 'error' },
      };
    }
    console.error('[callChatTriage] Error:', err.message ?? err);
    return FALLBACK_RESPONSE;
  }
}
