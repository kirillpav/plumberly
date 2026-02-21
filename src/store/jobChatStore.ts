import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';
import type { JobMessage } from '@/types/index';

interface JobChatState {
  messages: JobMessage[];
  isLoading: boolean;
  isSending: boolean;
  fetchMessages: (jobId: string) => Promise<void>;
  sendMessage: (params: {
    jobId: string;
    content: string;
    senderId: string;
    recipientId: string;
    senderName: string;
  }) => Promise<void>;
  markAllRead: (jobId: string, currentUserId: string) => Promise<void>;
  subscribeToMessages: (jobId: string, currentUserId: string) => () => void;
  clearMessages: () => void;
}

export const useJobChatStore = create<JobChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isSending: false,

  fetchMessages: async (jobId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('job_messages')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: (data ?? []) as JobMessage[] });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async ({ jobId, content, senderId, recipientId, senderName }) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: JobMessage = {
      id: tempId,
      job_id: jobId,
      sender_id: senderId,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
      isSending: true,
    }));

    try {
      const { data, error } = await supabase
        .from('job_messages')
        .insert({ job_id: jobId, sender_id: senderId, content })
        .select()
        .single();

      if (error) throw error;

      const serverMsg = data as JobMessage;
      set((state) => {
        // Replace temp with server row, and deduplicate in case
        // realtime INSERT arrived before this response
        const updated = state.messages.map((m) =>
          m.id === tempId ? serverMsg : m
        );
        const seen = new Set<string>();
        return {
          messages: updated.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          }),
          isSending: false,
        };
      });

      sendPushNotification({
        recipientUserId: recipientId,
        title: `New message from ${senderName}`,
        body: content.length > 100 ? content.slice(0, 97) + '...' : content,
        data: { jobId, type: 'chat_message' },
      });
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== tempId),
        isSending: false,
      }));
      throw error;
    }
  },

  markAllRead: async (jobId, currentUserId) => {
    await supabase
      .from('job_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .neq('sender_id', currentUserId)
      .is('read_at', null);
  },

  subscribeToMessages: (jobId, currentUserId) => {
    const channel = supabase
      .channel(`job-chat-${jobId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        const newMsg = payload.new as JobMessage;
        set((state) => {
          const exists = state.messages.some((m) => m.id === newMsg.id);
          if (exists) return state;
          return { messages: [...state.messages, newMsg] };
        });

        // Auto-mark as read if the message is from the other party
        if (newMsg.sender_id !== currentUserId) {
          supabase
            .from('job_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMsg.id)
            .then();
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'job_messages',
        filter: `job_id=eq.${jobId}`,
      }, (payload) => {
        const deletedId = (payload.old as { id: string }).id;
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== deletedId),
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  clearMessages: () => {
    set({ messages: [], isLoading: false, isSending: false });
  },
}));
