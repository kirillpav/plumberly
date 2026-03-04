import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { OnboardingStackParamList } from '@/types/navigation';
import type { UserRole } from '@/types/index';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

interface RoleCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

function RoleCard({ icon, title, description, onPress }: RoleCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={40} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export function RoleSelectionScreen() {
  const nav = useNavigation<Nav>();

  const handleSelect = (role: UserRole) => {
    nav.navigate('OnboardingSlides', { role });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>FluxService</Text>
          <Text style={styles.subtitle}>How would you like to use FluxService?</Text>
        </View>

        <View style={styles.cards}>
          <RoleCard
            icon="home-outline"
            title="I need a plumber"
            description="Get AI-powered diagnosis, find local professionals, and manage your repairs"
            onPress={() => handleSelect('customer')}
          />
          <RoleCard
            icon="construct-outline"
            title="I'm a plumber"
            description="Browse enquiries in your area, submit quotes, and grow your business"
            onPress={() => handleSelect('plumber')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    ...Typography.h1,
    color: Colors.primary,
    fontSize: 36,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.grey500,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  cards: {
    gap: Spacing.base,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  cardTitle: {
    ...Typography.h2,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    ...Typography.body,
    color: Colors.grey500,
    textAlign: 'center',
    lineHeight: 22,
  },
});
