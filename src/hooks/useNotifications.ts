import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useNotifications() {
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    registerForPushNotifications();
  }, [profile?.id]);

  async function registerForPushNotifications() {
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'plumberly',
      });
      const token = tokenData.data;

      if (profile?.id) {
        await supabase
          .from('profiles')
          .update({ push_token: token } as Record<string, unknown>)
          .eq('id', profile.id);
      }
    } catch (err) {
      console.warn('Push token registration failed:', err);
    }
  }
}
