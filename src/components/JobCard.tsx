import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography, FontWeight } from '@/constants/typography';
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
  const isNotSelected = job.status === 'cancelled' && job.notes === 'not_selected';
  const isPending = job.status === 'pending';
  const isQuoted = job.status === 'quoted';
  const isAccepted = job.status === 'accepted';
  const isInProgress = job.status === 'in_progress';

  return (
    <TouchableOpacity
      style={[styles.card, isDeclined && styles.cardDeclined, isNotSelected && styles.cardNotSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isNotSelected && (
        <View style={styles.notSelectedBanner}>
          <Ionicons name="information-circle" size={14} color={Colors.grey500} />
          <Text style={styles.notSelectedBannerText}>Not selected</Text>
        </View>
      )}

      {isDeclined && (
        <View style={styles.declinedBanner}>
          <Ionicons name="close-circle" size={14} color={Colors.error} />
          <Text style={styles.declinedBannerText}>Quote declined by customer</Text>
        </View>
      )}

      {isPending && (
        <View style={styles.pendingBanner}>
          <Ionicons name="create-outline" size={14} color={Colors.primary} />
          <Text style={styles.pendingBannerText}>Submit your quote</Text>
        </View>
      )}

      {isQuoted && (
        <View style={styles.quotedBanner}>
          <Ionicons name="hourglass-outline" size={14} color={Colors.warning} />
          <Text style={styles.quotedBannerText}>Customer reviewing quote</Text>
        </View>
      )}

      {isAccepted && (
        <View style={styles.acceptedBanner}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
          <Text style={styles.acceptedBannerText}>Quote accepted</Text>
        </View>
      )}

      {isInProgress && (
        <View style={styles.inProgressBanner}>
          <Ionicons name="construct-outline" size={14} color={Colors.primary} />
          <Text style={styles.inProgressBannerText}>Job in progress</Text>
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
  cardNotSelected: {
    opacity: 0.7,
  },
  notSelectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.grey100,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  notSelectedBannerText: {
    ...Typography.caption,
    color: Colors.grey500,
    fontWeight: FontWeight.semiBold,
  },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorBg,
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
    fontWeight: FontWeight.semiBold,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightBlue,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  pendingBannerText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
  },
  quotedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningBg,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  quotedBannerText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: FontWeight.semiBold,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.successBg,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  acceptedBannerText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: FontWeight.semiBold,
  },
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightBlue,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  inProgressBannerText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
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
    backgroundColor: Colors.errorBg,
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
    fontWeight: FontWeight.semiBold,
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
    fontWeight: FontWeight.bold,
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
