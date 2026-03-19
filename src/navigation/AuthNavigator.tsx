import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { CreateAccountScreen } from '@/screens/auth/CreateAccountScreen';
import { PlumberRegistrationScreen } from '@/screens/auth/PlumberRegistrationScreen';
import { PlumberSignInScreen } from '@/screens/auth/PlumberSignInScreen';
import type { AuthStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="PlumberRegistration" component={PlumberRegistrationScreen} />
      <Stack.Screen name="PlumberSignIn" component={PlumberSignInScreen} />
    </Stack.Navigator>
  );
}
