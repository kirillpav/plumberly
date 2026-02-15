import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = 'document-text-outline', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={Colors.grey300} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    ...Typography.h3,
    color: Colors.grey700,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
