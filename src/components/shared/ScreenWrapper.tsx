import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenWrapper({ children, style, noPadding, edges }: Props) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges ?? ['top']}>
      <View style={[styles.inner, noPadding && styles.noPadding]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
});
