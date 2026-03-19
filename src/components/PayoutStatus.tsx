import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import type { PayoutTransfer } from '@/types/index';

interface PayoutStatusProps {
  jobId: string;
}

export function PayoutStatus({ jobId }: PayoutStatusProps) {
  const [transfer, setTransfer] = useState<PayoutTransfer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('payout_transfers')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setTransfer(data as PayoutTransfer | null);
      setLoading(false);
    };
    load();
  }, [jobId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (!transfer) return null;

  const amount = formatCurrency(transfer.amount_minor / 100);

  if (transfer.status === 'scheduled') {
    const dateStr = transfer.scheduled_transfer_at
      ? formatDate(transfer.scheduled_transfer_at)
      : 'soon';

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.text}>
            Payout of {amount} scheduled for {dateStr}
          </Text>
        </View>
        {transfer.delay_reason === 'probation_7d' && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.grey500} />
            <Text style={styles.infoText}>
              As a new plumber, payouts are held for 7 days. After 5 completed jobs, the hold reduces to 2 days.
            </Text>
          </View>
        )}
      </View>
    );
  }

  if (transfer.status === 'created') {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={[styles.text, { color: Colors.success }]}>
            Payout of {amount} transferred
          </Text>
        </View>
      </View>
    );
  }

  if (transfer.status === 'cancelled') {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Ionicons name="close-circle-outline" size={20} color={Colors.grey500} />
          <Text style={[styles.text, { color: Colors.grey500 }]}>
            Payout cancelled
          </Text>
        </View>
      </View>
    );
  }

  if (transfer.status === 'failed') {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.row}>
          <Ionicons name="warning-outline" size={20} color={Colors.error} />
          <Text style={[styles.text, { color: Colors.error }]}>
            Payout issue — contact support
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightBlue,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  successContainer: {
    backgroundColor: Colors.successBg,
  },
  errorContainer: {
    backgroundColor: Colors.errorBg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    ...Typography.bodySmall,
    color: Colors.primary,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.grey500,
    flex: 1,
  },
});
