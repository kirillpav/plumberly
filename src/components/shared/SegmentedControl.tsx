import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  segments: string[];
  activeIndex: number;
  onPress: (index: number) => void;
}

export function SegmentedControl({ segments, activeIndex, onPress }: Props) {
  const translateX = useSharedValue(0);
  const segmentWidth = useSharedValue(0);

  const containerOnLayout = (e: any) => {
    const totalWidth = e.nativeEvent.layout.width - 6; // account for padding: 3 on each side
    segmentWidth.value = totalWidth / segments.length;
    translateX.value = activeIndex * (totalWidth / segments.length);
  };

  useEffect(() => {
    if (segmentWidth.value > 0) {
      translateX.value = withTiming(activeIndex * segmentWidth.value, { duration: 200 });
    }
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container} onLayout={containerOnLayout}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {segments.map((label, i) => (
        <TouchableOpacity
          key={label}
          style={styles.segment}
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
  indicator: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.button,
  },
  text: {
    ...Typography.label,
    color: Colors.grey700,
  },
  activeText: {
    color: Colors.white,
  },
});
