import { create } from 'zustand';
import type { ChatMessage } from '@/types/index';
import { streamChatCompletion } from '@/lib/openai';
import { Config } from '@/constants/config';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  getTranscriptJSON: () => ChatMessage[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

  sendMessage: async (content: string) => {
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

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
    }));

    try {
      const apiMessages = [
        { role: 'system' as const, content: Config.chatbot.systemPrompt },
        ...get().messages
          .filter((m) => m.role !== 'system' && m.id !== assistantMessage.id)
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ];

      for await (const delta of streamChatCompletion(apiMessages)) {
        set((state) => {
          const msgs = [...state.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.id === assistantMessage.id) {
            msgs[msgs.length - 1] = { ...last, content: last.content + delta };
          }
          return { messages: msgs };
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      set((state) => {
        const msgs = [...state.messages];
        const last = msgs[msgs.length - 1];
        if (last && last.id === assistantMessage.id) {
          msgs[msgs.length - 1] = {
            ...last,
            content: last.content || 'Sorry, something went wrong. Please try again.',
          };
        }
        return { messages: msgs };
      });
    } finally {
      set({ isStreaming: false });
    }
  },

  clearChat: () => set({ messages: [], isStreaming: false }),

  getTranscriptJSON: () => {
    return get().messages.filter((m) => m.role !== 'system');
  },
}));
