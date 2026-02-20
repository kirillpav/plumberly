import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';
import type { Job, JobStatus } from '@/types/index';

interface JobState {
  jobs: Job[];
  isLoading: boolean;
  fetchJobs: (plumberId?: string) => Promise<void>;
  acceptJob: (enquiryId: string, plumberId: string, customerId: string) => Promise<void>;
  submitQuote: (jobId: string, amount: number, scheduledTime?: string) => Promise<void>;
  acceptQuote: (jobId: string) => Promise<void>;
  confirmJobDone: (jobId: string, role: 'customer' | 'plumber') => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => Promise<void>;
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
        .select('*, enquiry:enquiries(*), customer:profiles!customer_id(full_name, avatar_url)')
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
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('enquiry_id', enquiryId)
      .eq('plumber_id', plumberId)
      .maybeSingle();

    if (existing) {
      throw new Error('You have already accepted this enquiry.');
    }

    const { error } = await supabase.from('jobs').insert({
      enquiry_id: enquiryId,
      plumber_id: plumberId,
      customer_id: customerId,
      status: 'pending',
    });
    if (error) throw error;

    await supabase.from('enquiries').update({ status: 'accepted' }).eq('id', enquiryId);
    await get().fetchJobs(plumberId);

    // Fetch plumber name for a friendlier notification
    const { data: plumber } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', plumberId)
      .single();

    const plumberName = plumber?.full_name || 'A plumber';

    sendPushNotification({
      recipientUserId: customerId,
      title: 'Enquiry Accepted',
      body: `${plumberName} has accepted your enquiry and will be in touch soon.`,
      data: { enquiryId, type: 'job_accepted' },
    });
  },

  submitQuote: async (jobId, amount, scheduledTime) => {
    // Set scheduled_date from enquiry's preferred_date, or default to today
    const job = get().jobs.find((j) => j.id === jobId);
    const scheduledDate = job?.enquiry?.preferred_date
      ?? new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('jobs')
      .update({
        quote_amount: amount,
        status: 'quoted',
        scheduled_date: scheduledDate,
        ...(scheduledTime ? { scheduled_time: scheduledTime } : {}),
      })
      .eq('id', jobId);
    if (error) throw error;
    if (job) {
      const { data: plumber } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', job.plumber_id)
        .single();

      const plumberName = plumber?.full_name || 'Your plumber';

      sendPushNotification({
        recipientUserId: job.customer_id,
        title: 'Quote Received',
        body: `${plumberName} has sent you a quote of £${amount.toFixed(2)}. Open the app to review and accept.`,
        data: { enquiryId: job.enquiry_id, jobId, type: 'quote_submitted' },
      });
    }

    await get().fetchJobs();
  },

  acceptQuote: async (jobId) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId);
    if (error) throw error;

    const job = get().jobs.find((j) => j.id === jobId);
    if (job) {
      await supabase
        .from('enquiries')
        .update({ status: 'in_progress' })
        .eq('id', job.enquiry_id);

      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', job.customer_id)
        .single();

      const customerName = customer?.full_name || 'The customer';

      sendPushNotification({
        recipientUserId: job.plumber_id,
        title: 'Quote Accepted — Job Started',
        body: `${customerName} has accepted your quote. The job is now in progress.`,
        data: { jobId, type: 'quote_accepted' },
      });
    }

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

  confirmJobDone: async (jobId, role) => {
    const confirmField = role === 'customer' ? 'customer_confirmed' : 'plumber_confirmed';
    const otherField = role === 'customer' ? 'plumber_confirmed' : 'customer_confirmed';

    const { error } = await supabase
      .from('jobs')
      .update({ [confirmField]: true })
      .eq('id', jobId);
    if (error) throw error;

    const { data: freshJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (freshJob && freshJob[confirmField] && freshJob[otherField]) {
      await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);
      await supabase
        .from('enquiries')
        .update({ status: 'completed' })
        .eq('id', freshJob.enquiry_id);
    }

    if (freshJob && !freshJob[otherField]) {
      const recipientId = role === 'customer' ? freshJob.plumber_id : freshJob.customer_id;

      const { data: confirmer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', role === 'customer' ? freshJob.customer_id : freshJob.plumber_id)
        .single();

      const confirmerName = confirmer?.full_name || (role === 'customer' ? 'The customer' : 'The plumber');

      sendPushNotification({
        recipientUserId: recipientId,
        title: 'Job Completion Confirmation',
        body: `${confirmerName} has confirmed the job is done. Please confirm on your end to complete it.`,
        data: { jobId, type: 'completion_confirmation' },
      });
    }

    await get().fetchJobs();
  },

  getByStatus: (status) => {
    return get().jobs.filter((j) => j.status === status);
  },

  subscribeToChanges: (plumberId) => {
    const channelName = plumberId
      ? `jobs-changes-${plumberId}`
      : `jobs-changes-all-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
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
