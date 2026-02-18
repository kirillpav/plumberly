import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing, BorderRadius } from '@/constants/spacing';

const DOT_SIZE = 7;
const DURATION = 450;

function AnimatedDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: DURATION,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { transform: [{ translateY }], opacity },
      ]}
    />
  );
}

export function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Ionicons name="water" size={13} color={Colors.white} />
      </View>
      <View style={styles.bubble}>
        <AnimatedDot delay={0} />
        <AnimatedDot delay={150} />
        <AnimatedDot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#A0A0AE',
  },
});
