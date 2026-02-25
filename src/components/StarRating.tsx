import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface Props {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

export function StarRating({ rating, size = 28, interactive = false, onRatingChange, style }: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.container, style]}>
      {stars.map((star) => {
        const filled = star <= rating;
        const icon = filled ? 'star' : 'star-outline';
        const color = filled ? Colors.warning : Colors.grey300;

        if (interactive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => onRatingChange?.(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name={icon} size={size} color={color} />
            </TouchableOpacity>
          );
        }

        return <Ionicons key={star} name={icon} size={size} color={color} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
