import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

let channelCounter = 0;

/**
 * Returns a map of jobId → unread message count for the current user.
 * Subscribes to realtime changes on job_messages to stay up-to-date.
 */
export function useUnreadCounts() {
  const userId = useAuthStore((s) => s.profile?.id);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const channelIdRef = useRef<number>(0);

  const fetchCounts = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('job_messages')
      .select('job_id')
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error || !data) return;

    const map: Record<string, number> = {};
    for (const row of data) {
      map[row.job_id] = (map[row.job_id] || 0) + 1;
    }
    setCounts(map);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Each hook instance gets a unique channel name to avoid
    // collisions when multiple screens mount this hook concurrently
    channelIdRef.current = ++channelCounter;
    const channelName = `unread-counts-${userId}-${channelIdRef.current}`;

    fetchCounts();

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'job_messages',
      }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCounts]);

  return counts;
}
