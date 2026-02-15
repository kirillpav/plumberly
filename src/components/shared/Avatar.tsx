import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

type Size = 'sm' | 'md' | 'lg';

const sizes: Record<Size, number> = { sm: 36, md: 48, lg: 72 };
const fontSizes: Record<Size, number> = { sm: 14, md: 18, lg: 28 };

interface Props {
  uri?: string | null;
  name?: string;
  size?: Size;
}

export function Avatar({ uri, name, size = 'md' }: Props) {
  const dim = sizes[size];
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: dim, height: dim, borderRadius: dim / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: fontSizes[size] }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.grey100,
  },
  fallback: {
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
});
