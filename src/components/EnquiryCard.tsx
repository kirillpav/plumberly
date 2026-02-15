import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
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
}

export function EnquiryCard({ enquiry, onPress, onAccept, showAcceptButton }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
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
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptText}>Accept</Text>
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
  },
  acceptText: {
    ...Typography.label,
    color: Colors.white,
  },
});
