import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RoleSelectionScreen } from '@/screens/onboarding/RoleSelectionScreen';
import { OnboardingSlidesScreen } from '@/screens/onboarding/OnboardingSlidesScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { CreateAccountScreen } from '@/screens/auth/CreateAccountScreen';
import { PlumberRegistrationScreen } from '@/screens/auth/PlumberRegistrationScreen';
import type { OnboardingStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="OnboardingSlides" component={OnboardingSlidesScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="PlumberRegistration" component={PlumberRegistrationScreen} />
    </Stack.Navigator>
  );
}
