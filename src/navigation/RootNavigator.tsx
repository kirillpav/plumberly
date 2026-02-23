import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { CustomerTabNavigator } from './CustomerTabNavigator';
import { PlumberTabNavigator } from './PlumberTabNavigator';
import type { RootStackParamList } from '@/types/navigation';
import { Colors } from '@/constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, profile, isLoading, onboardingComplete } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const needsOnboarding = () => {
    if (session && profile?.onboarding_complete) return false;
    if (session && !profile?.onboarding_complete) return true;
    if (!session && onboardingComplete) return false;
    return true; // !session && !onboardingComplete
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {needsOnboarding() ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : !session ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : profile?.role === 'plumber' ? (
        <Stack.Screen name="Plumber" component={PlumberTabNavigator} />
      ) : (
        <Stack.Screen name="Customer" component={CustomerTabNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
