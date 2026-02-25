import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@/components/shared/Avatar';
import { StarRating } from '@/components/StarRating';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { Review } from '@/types/index';

interface Props {
  review: Review;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function ReviewCard({ review }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar
          uri={review.customer?.avatar_url}
          name={review.customer?.full_name}
          size="sm"
        />
        <View style={styles.headerText}>
          <Text style={styles.name}>{review.customer?.full_name ?? 'Customer'}</Text>
          <Text style={styles.date}>{formatRelativeDate(review.created_at)}</Text>
        </View>
      </View>
      <StarRating rating={review.rating} size={16} style={styles.stars} />
      {review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...Typography.label,
    color: Colors.black,
  },
  date: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  stars: {
    marginBottom: Spacing.xs,
  },
  comment: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    marginTop: Spacing.xs,
  },
});
