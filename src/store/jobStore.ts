import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Job, JobStatus } from '@/types/index';

interface JobState {
  jobs: Job[];
  isLoading: boolean;
  fetchJobs: (plumberId?: string) => Promise<void>;
  acceptJob: (enquiryId: string, plumberId: string, customerId: string) => Promise<void>;
  submitQuote: (jobId: string, amount: number) => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
  completeJob: (jobId: string) => Promise<void>;
  getByStatus: (status: JobStatus) => Job[];
  subscribeToChanges: (plumberId?: string) => () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  isLoading: false,

  fetchJobs: async (plumberId) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('jobs')
        .select('*, enquiry:enquiries(*)')
        .order('created_at', { ascending: false });

      if (plumberId) {
        query = query.eq('plumber_id', plumberId);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ jobs: (data ?? []) as unknown as Job[] });
    } finally {
      set({ isLoading: false });
    }
  },

  acceptJob: async (enquiryId, plumberId, customerId) => {
    const { error } = await supabase.from('jobs').insert({
      enquiry_id: enquiryId,
      plumber_id: plumberId,
      customer_id: customerId,
      status: 'pending',
    });
    if (error) throw error;

    await supabase.from('enquiries').update({ status: 'accepted' }).eq('id', enquiryId);
    await get().fetchJobs(plumberId);
  },

  submitQuote: async (jobId, amount) => {
    const { error } = await supabase
      .from('jobs')
      .update({ quote_amount: amount, status: 'quoted' })
      .eq('id', jobId);
    if (error) throw error;
    await get().fetchJobs();
  },

  updateJobStatus: async (jobId, status) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId);
    if (error) throw error;
    await get().fetchJobs();
  },

  completeJob: async (jobId) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);
    if (error) throw error;

    const job = get().jobs.find((j) => j.id === jobId);
    if (job) {
      await supabase.from('enquiries').update({ status: 'completed' }).eq('id', job.enquiry_id);
    }
    await get().fetchJobs();
  },

  getByStatus: (status) => {
    return get().jobs.filter((j) => j.status === status);
  },

  subscribeToChanges: (plumberId) => {
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        ...(plumberId ? { filter: `plumber_id=eq.${plumberId}` } : {}),
      }, () => {
        get().fetchJobs(plumberId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
