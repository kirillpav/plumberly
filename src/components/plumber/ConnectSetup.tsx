import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const REDIRECT_BASE = 'fluxservice://plumber';

type ConnectState = 'needs_setup' | 'loading' | 'submitted' | 'enabled';

export function ConnectSetup() {
  const { plumberDetails, session, fetchProfile } = useAuthStore();
  const [state, setState] = useState<ConnectState>(
    plumberDetails?.payouts_enabled ? 'enabled' : 'needs_setup',
  );
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep state in sync with store
  useEffect(() => {
    if (plumberDetails?.payouts_enabled) {
      setState('enabled');
    }
  }, [plumberDetails?.payouts_enabled]);

  // Calls stripe-connect-status to fetch live status from Stripe,
  // updates DB, and refreshes the local profile.
  const refreshConnectStatus = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke(
        'stripe-connect-status',
        { method: 'POST', body: {} },
      );
      if (data?.payouts_enabled) {
        setState('enabled');
      }
      // Also refresh the auth store so plumberDetails.payouts_enabled updates
      if (session?.user?.id) {
        await fetchProfile(session.user.id);
      }
    } catch {
      // Silently fail — user can retry
    }
  }, [session?.user?.id, fetchProfile]);

  const startOnboarding = useCallback(async () => {
    setState('loading');
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'stripe-connect-onboard',
        { method: 'POST', body: {} },
      );

      if (fnError) {
        const body = typeof fnError.context === 'object' ? fnError.context : null;
        const msg = body?.error ?? fnError.message ?? 'Failed to start onboarding';
        throw new Error(msg);
      }
      if (!data?.url) throw new Error('No onboarding URL returned');

      // Opens in-app browser (SFSafariViewController / Chrome Custom Tab).
      // Automatically closes when it detects a redirect to our custom scheme.
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        REDIRECT_BASE,
      );

      if (!mountedRef.current) return;

      if (result.type === 'success' && result.url) {
        if (result.url.includes('connect=refresh')) {
          // Stripe says onboarding incomplete — restart
          startOnboarding();
          return;
        }
        // connect=return — onboarding submitted
        setState('submitted');
        // Actively check with Stripe and update DB
        await refreshConnectStatus();
      } else {
        // User dismissed the browser (cancel / swipe)
        setState('needs_setup');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setState('needs_setup');
    }
  }, [session?.user?.id, fetchProfile, refreshConnectStatus]);

  if (state === 'enabled') {
    return (
      <View style={[styles.card, styles.enabledCard]}>
        <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
        <Text style={styles.enabledText}>Payouts enabled</Text>
      </View>
    );
  }

  if (state === 'submitted') {
    return (
      <View style={styles.card}>
        <Ionicons name="time-outline" size={28} color={Colors.warning} />
        <Text style={styles.title}>Setup submitted</Text>
        <Text style={styles.subtitle}>
          Stripe is reviewing your details. This usually takes a few minutes.
        </Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={refreshConnectStatus}
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
          <Text style={styles.refreshText}>Refresh status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Ionicons name="card-outline" size={28} color={Colors.primary} />
      <Text style={styles.title}>Set Up Payouts</Text>
      <Text style={styles.subtitle}>
        Complete Stripe onboarding to receive payments for your jobs.
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={startOnboarding}
        disabled={state === 'loading'}
      >
        {state === 'loading' ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.ctaText}>Set Up Payouts</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  enabledCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.base,
  },
  enabledText: {
    ...Typography.body,
    color: Colors.success,
    fontWeight: FontWeight.semiBold,
  },
  title: {
    ...Typography.h3,
    color: Colors.black,
    fontWeight: FontWeight.semiBold,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    textAlign: 'center',
  },
  error: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: 'center',
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    minWidth: 160,
    alignItems: 'center',
  },
  ctaText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: FontWeight.semiBold,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  refreshText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
  },
});
