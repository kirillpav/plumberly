import { create } from 'zustand';
import type { ChatMessage, IntakeData, TriageMetadata } from '@/types/index';
import { callChatTriage } from '@/lib/edgeFunction';
import { generateIntakeSummary } from '@/utils/intakeHelpers';
import { Config } from '@/constants/config';

type ChatPhase = 'intake' | 'chat';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentPhase: ChatPhase;
  intakeData: IntakeData | null;
  triageMetadata: TriageMetadata | null;
  stateSummary: string | null;

  setIntakeData: (data: IntakeData) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  getTranscriptJSON: () => ChatMessage[];
  getTranscriptWithIntake: () => { intakeData: IntakeData | null; transcript: ChatMessage[] };
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentPhase: 'intake',
  intakeData: null,
  triageMetadata: null,
  stateSummary: null,

  setIntakeData: async (data: IntakeData) => {
    set({ intakeData: data, currentPhase: 'chat', isStreaming: true });

    try {
      const summary = generateIntakeSummary(data);
      const initialMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: summary,
        timestamp: new Date().toISOString(),
      };

      set({ messages: [initialMessage] });

      const response = await callChatTriage(data, [initialMessage], null);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: response.metadata,
      };

      set({
        messages: [initialMessage, assistantMessage],
        triageMetadata: response.metadata,
        stateSummary: `Issue: ${summary}. AI responded with category ${response.metadata.category} assessment.`,
      });
    } catch (err) {
      console.error('Initial chat error:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
      }));
    } finally {
      set({ isStreaming: false });
    }
  },

  sendMessage: async (content: string) => {
    const { intakeData, messages, stateSummary } = get();
    if (!intakeData) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
    }));

    try {
      const allMessages = [...messages, userMessage];
      // Only send the last N messages to keep context compressed
      const recentMessages = allMessages.slice(-Config.chatbot.maxConversationHistory);

      const response = await callChatTriage(intakeData, recentMessages, stateSummary);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: response.metadata,
      };

      // Update state summary with latest exchange
      const newSummary = [
        stateSummary,
        `User: ${content.slice(0, 100)}`,
        `AI (cat ${response.metadata.category}): ${response.message.slice(0, 100)}`,
      ]
        .filter(Boolean)
        .join(' | ');

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        triageMetadata: response.metadata,
        stateSummary: newSummary,
      }));
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
      }));
    } finally {
      set({ isStreaming: false });
    }
  },

  clearChat: () =>
    set({
      messages: [],
      isStreaming: false,
      currentPhase: 'intake',
      intakeData: null,
      triageMetadata: null,
      stateSummary: null,
    }),

  getTranscriptJSON: () => {
    return get()
      .messages.filter((m) => m.role !== 'system')
      .map(({ images, metadata, ...rest }) => rest);
  },

  getTranscriptWithIntake: () => ({
    intakeData: get().intakeData,
    transcript: get().getTranscriptJSON(),
  }),
}));
