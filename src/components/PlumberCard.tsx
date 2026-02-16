import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './shared/Avatar';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Config } from '@/constants/config';

export interface PlumberListItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  plumber_details: {
    regions: string[];
    hourly_rate: number;
    bio: string | null;
    verified: boolean;
    rating: number;
    jobs_completed: number;
  } | null;
}

interface Props {
  plumber: PlumberListItem;
  onPress: () => void;
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#F5A623" />,
      );
    } else if (i === full && half) {
      stars.push(
        <Ionicons key={i} name="star-half" size={14} color="#F5A623" />,
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={14} color={Colors.grey300} />,
      );
    }
  }

  return <View style={starStyles.row}>{stars}</View>;
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});

export function PlumberCard({ plumber, onPress }: Props) {
  const details = plumber.plumber_details;
  const rate = details?.hourly_rate ?? 0;
  const rating = details?.rating ?? 0;
  const jobsDone = details?.jobs_completed ?? 0;
  const regions = details?.regions ?? [];
  const bio = details?.bio;
  const verified = details?.verified ?? false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Avatar uri={plumber.avatar_url} name={plumber.full_name} size="md" />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {plumber.full_name}
            </Text>
            {verified && (
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            )}
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={rating} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.jobsText}>{jobsDone} jobs</Text>
          </View>
        </View>

        <View style={styles.rateBox}>
          <Text style={styles.rateAmount}>
            {Config.currency.symbol}{rate}
          </Text>
          <Text style={styles.rateUnit}>/hr</Text>
        </View>
      </View>

      {bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {bio}
        </Text>
      ) : null}

      {regions.length > 0 && (
        <View style={styles.tagsRow}>
          {regions.map((region) => (
            <View key={region} style={styles.regionTag}>
              <Ionicons name="location-outline" size={11} color={Colors.primary} />
              <Text style={styles.regionText}>{region}</Text>
            </View>
          ))}
        </View>
      )}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 3,
  },
  name: {
    ...Typography.label,
    color: Colors.black,
    fontWeight: '600',
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.grey700,
    fontWeight: '600',
    marginLeft: 2,
  },
  dot: {
    ...Typography.caption,
    color: Colors.grey300,
  },
  jobsText: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  rateBox: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  rateAmount: {
    ...Typography.h3,
    color: Colors.primary,
    fontWeight: '700',
  },
  rateUnit: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: -2,
  },
  bio: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  regionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  regionText: {
    ...Typography.caption,
    color: Colors.primary,
  },
});
