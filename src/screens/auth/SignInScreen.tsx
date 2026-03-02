import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { validateField } from '@/utils/validation';
import type { AuthStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function SignInScreen() {
  const nav = useNavigation<Nav>();
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleContinue = async () => {
    const e: Record<string, string | undefined> = {};
    e.email = validateField(email, { required: true, email: true }) ?? undefined;
    if (isNewUser) {
      e.fullName = validateField(fullName, { required: true }) ?? undefined;
    }
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await sendOtp({
        email: email.trim(),
        shouldCreateUser: true,
        fullName: isNewUser ? fullName.trim() : undefined,
        role: 'customer',
      });
      nav.navigate('OtpVerification', { email: email.trim() });
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
          <View style={styles.header}>
            <Text style={styles.logo}>Flux Service</Text>
            <Text style={styles.subtitle}>
              {isNewUser ? 'Create your account' : 'Sign in to your account'}
            </Text>
          </View>

          {isNewUser && (
            <InputField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="John Smith"
            />
          )}

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

          <PrimaryButton title="Continue" onPress={handleContinue} loading={loading} />

          <TouchableOpacity
            style={styles.toggleLink}
            onPress={() => setIsNewUser((v) => !v)}
          >
            <Text style={styles.toggleText}>
              {isNewUser
                ? 'Already have an account? '
                : 'New here? '}
              <Text style={styles.toggleBold}>
                {isNewUser ? 'Sign in' : 'Create an account'}
              </Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.plumberButton}
            onPress={() => nav.navigate('PlumberRegistration' as any)}
          >
            <Text style={styles.plumberButtonTitle}>Plumber Portal</Text>
            <Text style={styles.plumberButtonSub}>Sign in or register as a tradesperson</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
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
  },
  toggleLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  toggleText: {
    ...Typography.bodySmall,
    color: Colors.grey700,
  },
  toggleBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grey300,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginHorizontal: Spacing.base,
  },
  plumberButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  plumberButtonTitle: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '700',
  },
  plumberButtonSub: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginTop: 2,
  },
});
