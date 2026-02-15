import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Enquiry, EnquiryStatus, ChatMessage } from '@/types/index';

interface EnquiryState {
  enquiries: Enquiry[];
  isLoading: boolean;
  fetchEnquiries: (customerId?: string) => Promise<void>;
  createEnquiry: (params: {
    customerId: string;
    title: string;
    description: string;
    preferredDate?: string;
    preferredTime?: string;
    images?: string[];
    chatbotTranscript?: ChatMessage[];
  }) => Promise<void>;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => Promise<void>;
  getByStatus: (status: EnquiryStatus) => Enquiry[];
  subscribeToChanges: (customerId?: string) => () => void;
}

export const useEnquiryStore = create<EnquiryState>((set, get) => ({
  enquiries: [],
  isLoading: false,

  fetchEnquiries: async (customerId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('enquiries')
        .select('*, customer:profiles!customer_id(*)')
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ enquiries: (data ?? []) as unknown as Enquiry[] });
    } finally {
      set({ isLoading: false });
    }
  },

  createEnquiry: async ({ customerId, title, description, preferredDate, preferredTime, images, chatbotTranscript }) => {
    const { error } = await supabase.from('enquiries').insert({
      customer_id: customerId,
      title,
      description,
      preferred_date: preferredDate ?? null,
      preferred_time: preferredTime ?? null,
      images: images ?? [],
      chatbot_transcript: chatbotTranscript ? JSON.parse(JSON.stringify(chatbotTranscript)) : null,
    });
    if (error) throw error;
    await get().fetchEnquiries(customerId);
  },

  updateEnquiry: async (id, updates) => {
    const { error } = await supabase
      .from('enquiries')
      .update(updates as Record<string, unknown>)
      .eq('id', id);
    if (error) throw error;
  },

  getByStatus: (status) => {
    return get().enquiries.filter((e) => e.status === status);
  },

  subscribeToChanges: (customerId) => {
    const channel = supabase
      .channel('enquiries-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'enquiries',
        ...(customerId ? { filter: `customer_id=eq.${customerId}` } : {}),
      }, () => {
        get().fetchEnquiries(customerId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
