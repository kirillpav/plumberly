import React, { useState } from 'react';
import { Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography, FontWeight } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { validateField } from '@/utils/validation';
import type { AuthStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function PlumberSignInScreen() {
  const nav = useNavigation<Nav>();
  const signInPlumber = useAuthStore((s) => s.signInPlumber);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleSignIn = async () => {
    const e: Record<string, string | undefined> = {};
    e.email = validateField(email, { required: true, email: true }) ?? undefined;
    e.password = validateField(password, { required: true }) ?? undefined;
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signInPlumber(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Plumber Sign In</Text>
          <Text style={styles.subtitle}>Sign in with your registered email</Text>

          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />

          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            placeholder="Your password"
          />

          <PrimaryButton title="Sign In" onPress={handleSignIn} loading={loading} />

          <TouchableOpacity
            style={styles.link}
            onPress={() => nav.navigate('PlumberRegistration')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingVertical: Spacing.xxl },
  back: { marginBottom: Spacing.base },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.grey500, marginBottom: Spacing.xl },
  link: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  linkText: {
    ...Typography.bodySmall,
    color: Colors.grey700,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: FontWeight.semiBold,
  },
});
