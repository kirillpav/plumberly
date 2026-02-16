import { supabase } from '@/lib/supabase';

/**
 * Send a push notification via the Expo Push API.
 * This is a fire-and-forget helper — errors are logged but not thrown
 * so callers (e.g. acceptJob) never fail due to notification issues.
 */
export async function sendPushNotification(params: {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', params.recipientUserId)
      .single();

    const token = profile?.push_token;
    if (!token) return;

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
      }),
    });

    if (!response.ok) {
      console.warn('Push notification failed:', await response.text());
    }
  } catch (err) {
    console.warn('Push notification error:', err);
  }
}
