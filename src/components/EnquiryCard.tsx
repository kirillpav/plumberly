import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';
import type { Enquiry } from '@/types/index';

const statusColors: Record<string, string> = {
  new: Colors.statusNew,
  accepted: Colors.statusAccepted,
  in_progress: Colors.primary,
  completed: Colors.statusCompleted,
  cancelled: Colors.grey500,
};

interface Props {
  enquiry: Enquiry;
  onPress: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
  isAccepting?: boolean;
  quoteAmount?: number | null;
  plumberName?: string | null;
  jobStatus?: string | null;
}

export function EnquiryCard({
  enquiry,
  onPress,
  onAccept,
  showAcceptButton,
  isAccepting,
  quoteAmount,
  plumberName,
  jobStatus,
}: Props) {
  const hasQuote = jobStatus === 'quoted' && quoteAmount != null;
  const isPending = jobStatus === 'pending';

  return (
    <TouchableOpacity
      style={[styles.card, hasQuote && styles.cardHighlight]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {hasQuote && (
        <View style={styles.quoteBanner}>
          <View style={styles.quoteBannerLeft}>
            <View style={styles.quoteDot} />
            <Text style={styles.quoteBannerLabel}>Quote received</Text>
          </View>
          <Text style={styles.quoteBannerAmount}>{formatCurrency(quoteAmount!)}</Text>
        </View>
      )}

      {isPending && (
        <View style={styles.pendingBanner}>
          <Ionicons name="hourglass-outline" size={14} color={Colors.primary} />
          <Text style={styles.pendingBannerText}>
            {plumberName ? `${plumberName} is preparing a quote` : 'A plumber is preparing a quote'}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {enquiry.title}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColors[enquiry.status] ?? Colors.grey500 },
          ]}
        >
          <Text style={styles.badgeText}>{enquiry.status.replace('_', ' ')}</Text>
        </View>
      </View>

      {enquiry.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {enquiry.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        {enquiry.region && (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={14} color={Colors.grey500} />
            <Text style={styles.metaText}>{enquiry.region}</Text>
          </View>
        )}

        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={14} color={Colors.grey500} />
          <Text style={styles.metaText}>
            {enquiry.preferred_date
              ? formatDate(enquiry.preferred_date)
              : formatDate(enquiry.created_at)}
          </Text>
        </View>

        {enquiry.images?.length > 0 && (
          <View style={styles.meta}>
            <Ionicons name="image-outline" size={14} color={Colors.grey500} />
            <Text style={styles.metaText}>{enquiry.images.length}</Text>
          </View>
        )}

        {showAcceptButton && onAccept && (
          <TouchableOpacity
            style={[styles.acceptBtn, isAccepting && styles.acceptBtnDisabled]}
            onPress={onAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
        )}

        {hasQuote && (
          <View style={styles.reviewHint}>
            <Text style={styles.reviewHintText}>Review</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
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
  cardHighlight: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  quoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightBlue,
    marginHorizontal: -Spacing.base,
    marginTop: -Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
  },
  quoteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  quoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  quoteBannerLabel: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
  quoteBannerAmount: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '700',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF8EB',
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
    color: Colors.warning,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.black,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.white,
    textTransform: 'capitalize',
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  acceptBtn: {
    marginLeft: 'auto',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    minWidth: 80,
    alignItems: 'center' as const,
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptText: {
    ...Typography.label,
    color: Colors.white,
  },
  reviewHint: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewHintText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
  },
});
