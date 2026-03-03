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
  const signIn = useAuthStore((s) => s.signIn);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('Google Sign In Failed', err.message);
    } finally {
      setGoogleLoading(false);
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
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

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
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing in…' : 'G  Sign in with Google'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleLink}
            onPress={() => nav.navigate('CreateAccount')}
          >
            <Text style={styles.toggleText}>
              New here?{' '}
              <Text style={styles.toggleBold}>Create an account</Text>
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
  googleButton: {
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  googleButtonText: {
    ...Typography.body,
    color: Colors.grey700,
    fontWeight: '600',
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
