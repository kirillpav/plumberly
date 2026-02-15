import { create } from 'zustand';
import type { ChatMessage } from '@/types/index';
import { chatCompletion, ChatCompletionMessage } from '@/lib/openai';
import { Config } from '@/constants/config';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string, imageUris?: string[]) => Promise<void>;
  clearChat: () => void;
  getTranscriptJSON: () => ChatMessage[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

  sendMessage: async (content: string, imageUris?: string[]) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      images: imageUris,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
    }));

    try {
      const apiMessages: ChatCompletionMessage[] = [
        { role: 'system', content: Config.chatbot.systemPrompt },
        ...get().messages.map((m) => {
          if (m.images && m.images.length > 0) {
            return {
              role: m.role as 'user' | 'assistant',
              content: [
                { type: 'text' as const, text: m.content },
                ...m.images.map((uri) => ({
                  type: 'image_url' as const,
                  image_url: { url: uri },
                })),
              ],
            };
          }
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content,
          };
        }),
      ];

      const reply = await chatCompletion(apiMessages);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
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

  clearChat: () => set({ messages: [], isStreaming: false }),

  getTranscriptJSON: () => {
    return get().messages.filter((m) => m.role !== 'system');
  },
}));
