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
import { Spacing } from '@/constants/spacing';
import { validateField } from '@/utils/validation';
import type { AuthStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<AuthStackParamList>;

export function SignInScreen() {
  const nav = useNavigation<Nav>();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSignIn = async () => {
    const emailErr = validateField(email, { required: true, email: true });
    const passErr = validateField(password, { required: true, minLength: 6 });
    if (emailErr || passErr) {
      setErrors({ email: emailErr ?? undefined, password: passErr ?? undefined });
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

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>Plumberly</Text>
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
            autoComplete="password"
            placeholder="Enter your password"
          />

          <PrimaryButton title="Sign In" onPress={handleSignIn} loading={loading} />

          <TouchableOpacity
            style={styles.link}
            onPress={() => nav.navigate('CreateAccount')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Create one</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => nav.navigate('PlumberRegistration')}
          >
            <Text style={styles.linkText}>
              Are you a plumber? <Text style={styles.linkBold}>Register here</Text>
            </Text>
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
    fontWeight: '600',
  },
});
