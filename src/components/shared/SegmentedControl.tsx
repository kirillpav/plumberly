import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  segments: string[];
  activeIndex: number;
  onPress: (index: number) => void;
}

export function SegmentedControl({ segments, activeIndex, onPress }: Props) {
  return (
    <View style={styles.container}>
      {segments.map((label, i) => (
        <TouchableOpacity
          key={label}
          style={[styles.segment, i === activeIndex && styles.active]}
          onPress={() => onPress(i)}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, i === activeIndex && styles.activeText]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.grey100,
    borderRadius: BorderRadius.button,
    padding: 3,
    marginBottom: Spacing.base,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.button,
  },
  active: {
    backgroundColor: Colors.primary,
  },
  text: {
    ...Typography.label,
    color: Colors.grey700,
  },
  activeText: {
    color: Colors.white,
  },
});
