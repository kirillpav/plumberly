import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { validateField } from '@/utils/validation';

export function CreateAccountScreen() {
  const nav = useNavigation();
  const signUp = useAuthStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const handleSignUp = async () => {
    const e: Record<string, string | undefined> = {};
    e.name = validateField(name, { required: true }) ?? undefined;
    e.email = validateField(email, { required: true, email: true }) ?? undefined;
    e.password = validateField(password, { required: true, minLength: 6 }) ?? undefined;
    if (password !== confirm) e.confirm = 'Passwords do not match';
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, fullName: name.trim(), role: 'customer' });
      Alert.alert('Success', 'Account created! Please check your email to verify.');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up as a homeowner</Text>

          <InputField label="Full Name" value={name} onChangeText={setName} error={errors.name} placeholder="John Smith" />
          <InputField label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <InputField label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Min 6 characters" />
          <InputField label="Confirm Password" value={confirm} onChangeText={setConfirm} error={errors.confirm} secureTextEntry placeholder="Re-enter password" />

          <PrimaryButton title="Create Account" onPress={handleSignUp} loading={loading} />
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
});
