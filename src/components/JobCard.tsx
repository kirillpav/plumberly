import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';
import { Avatar } from './shared/Avatar';
import type { Job } from '@/types/index';

interface Props {
  job: Job;
  onPress: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function JobCard({ job, onPress, actionLabel, onAction }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Avatar
          uri={job.customer?.avatar_url}
          name={job.customer?.full_name}
          size="sm"
        />
        <View style={styles.info}>
          <Text style={styles.name}>{job.customer?.full_name ?? 'Customer'}</Text>
          <Text style={styles.issue} numberOfLines={1}>
            {job.enquiry?.title ?? 'Plumbing Job'}
          </Text>
        </View>
        {job.quote_amount != null && (
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{formatCurrency(job.quote_amount)}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          {job.scheduled_date
            ? formatDate(job.scheduled_date)
            : formatDate(job.created_at)}
        </Text>

        {actionLabel && onAction && (
          <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.label,
    color: Colors.black,
  },
  issue: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  priceText: {
    ...Typography.label,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  actionText: {
    ...Typography.label,
    color: Colors.white,
  },
});
