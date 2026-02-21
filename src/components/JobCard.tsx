import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  unreadCount?: number;
}

export function JobCard({ job, onPress, actionLabel, onAction, unreadCount }: Props) {
  const isDeclined = job.status === 'declined';

  return (
    <TouchableOpacity
      style={[styles.card, isDeclined && styles.cardDeclined]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isDeclined && (
        <View style={styles.declinedBanner}>
          <Ionicons name="close-circle" size={14} color={Colors.error} />
          <Text style={styles.declinedBannerText}>Quote declined by customer</Text>
        </View>
      )}

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
          <View style={[styles.pricePill, isDeclined && styles.pricePillDeclined]}>
            <Text style={[styles.priceText, isDeclined && styles.priceTextDeclined]}>
              {formatCurrency(job.quote_amount)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          {job.scheduled_date
            ? formatDate(job.scheduled_date)
            : formatDate(job.created_at)}
        </Text>

        {isDeclined && (
          <View style={styles.requoteHint}>
            <Text style={styles.requoteHintText}>Requote</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </View>
        )}

        {!isDeclined && (
          <View style={styles.footerRight}>
            {!!unreadCount && unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Ionicons name="chatbubble" size={12} color={Colors.white} />
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
            {actionLabel && onAction && (
              <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
                <Text style={styles.actionText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
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
  cardDeclined: {
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEECEB',
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  declinedBannerText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
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
  pricePillDeclined: {
    backgroundColor: '#FEECEB',
  },
  priceText: {
    ...Typography.label,
    color: Colors.primary,
  },
  priceTextDeclined: {
    color: Colors.error,
    textDecorationLine: 'line-through',
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
  requoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  requoteHintText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  unreadBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '700',
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
