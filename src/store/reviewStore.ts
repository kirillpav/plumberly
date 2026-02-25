import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/types/index';

interface ReviewState {
  reviews: Review[];
  isLoading: boolean;
  fetchReviews: (plumberId: string) => Promise<void>;
  submitReview: (jobId: string, customerId: string, plumberId: string, rating: number, comment?: string) => Promise<void>;
  checkReviewExists: (jobId: string) => Promise<boolean>;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],
  isLoading: false,

  fetchReviews: async (plumberId) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, customer:profiles!customer_id(full_name, avatar_url), job:jobs!job_id(enquiry_id, enquiry:enquiries!enquiry_id(title))')
        .eq('plumber_id', plumberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ reviews: (data ?? []) as unknown as Review[] });
    } finally {
      set({ isLoading: false });
    }
  },

  submitReview: async (jobId, customerId, plumberId, rating, comment) => {
    const { error } = await supabase.from('reviews').insert({
      job_id: jobId,
      customer_id: customerId,
      plumber_id: plumberId,
      rating,
      comment: comment || null,
    });
    if (error) throw error;
  },

  checkReviewExists: async (jobId) => {
    const { data, error } = await supabase.rpc('review_exists_for_job', { p_job_id: jobId });
    if (error) throw error;
    return data as boolean;
  },
}));
