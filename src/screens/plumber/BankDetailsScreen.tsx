import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const REDIRECT_BASE = 'fluxservice://plumber';

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>
        <Ionicons
          name={ok ? 'checkmark-circle' : 'close-circle'}
          size={18}
          color={ok ? Colors.success : Colors.error}
        />
        <Text style={[styles.rowValueText, { color: ok ? Colors.success : Colors.grey500 }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function BankDetailsScreen() {
  const nav = useNavigation();
  const { plumberDetails, session, fetchProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);

  const payoutsEnabled = plumberDetails?.payouts_enabled ?? false;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke('stripe-connect-status', { method: 'POST', body: {} });
      if (session?.user?.id) await fetchProfile(session.user.id);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id, fetchProfile]);

  const handleManageOrSetup = useCallback(async () => {
    setOnboardLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        method: 'POST',
        body: {},
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_BASE);
      if (result.type === 'success') {
        await handleRefresh();
      }
    } catch {
      // ignore
    } finally {
      setOnboardLoading(false);
    }
  }, [handleRefresh]);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Payment Settings</Text>
        <Text style={styles.subtitle}>
          Payments are handled securely through Stripe Connect.
        </Text>

        {/* Status card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={payoutsEnabled ? 'shield-checkmark' : 'shield-outline'}
              size={24}
              color={payoutsEnabled ? Colors.success : Colors.warning}
            />
            <Text style={styles.cardTitle}>
              {payoutsEnabled ? 'Stripe Connected' : 'Stripe Not Connected'}
            </Text>
          </View>

          <StatusRow
            label="Payouts"
            value={payoutsEnabled ? 'Enabled' : 'Disabled'}
            ok={payoutsEnabled}
          />

          <View style={styles.divider} />

          <StatusRow
            label="Account Status"
            value={payoutsEnabled ? 'Active' : 'Setup Required'}
            ok={payoutsEnabled}
          />
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.actionBtn, payoutsEnabled && styles.actionBtnOutline]}
          onPress={handleManageOrSetup}
          disabled={onboardLoading}
        >
          {onboardLoading ? (
            <ActivityIndicator color={payoutsEnabled ? Colors.primary : Colors.white} size="small" />
          ) : (
            <>
              <Ionicons
                name={payoutsEnabled ? 'open-outline' : 'card-outline'}
                size={18}
                color={payoutsEnabled ? Colors.primary : Colors.white}
              />
              <Text style={[styles.actionText, payoutsEnabled && styles.actionTextOutline]}>
                {payoutsEnabled ? 'Manage Stripe Account' : 'Set Up Payouts'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
              <Text style={styles.refreshText}>Refresh Status</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: Spacing.base },
  back: { marginBottom: Spacing.base },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.grey500, marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.h3,
    color: Colors.black,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: {
    ...Typography.body,
    color: Colors.grey700,
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rowValueText: {
    ...Typography.body,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey100,
    marginVertical: Spacing.xs,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionBtnOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '600',
  },
  actionTextOutline: {
    color: Colors.primary,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  refreshText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
});
