import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import type { AuthStackParamList } from '@/types/navigation';

const RESEND_COOLDOWN = 60;

export function OtpVerificationScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'OtpVerification'>>();
  const { email, phone } = route.params;
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp({ email, phone, token: code });
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp({ email, phone, shouldCreateUser: true });
      setCooldown(RESEND_COOLDOWN);
      Alert.alert('Code Sent', `A new code has been sent to ${email ?? phone}.`);
    } catch (err: any) {
      Alert.alert('Resend Failed', err.message);
    }
  };

  const destination = email ?? phone;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Verify Your {email ? 'Email' : 'Phone'}</Text>
          <Text style={styles.subtitle}>Enter the code sent to {destination}</Text>

          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={Colors.grey300}
            autoFocus
          />

          <PrimaryButton title="Verify" onPress={handleVerify} loading={loading} />

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}
            disabled={cooldown > 0}
          >
            <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
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
  codeInput: {
    ...Typography.h1,
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    color: Colors.black,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  resendText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: Colors.grey500,
    fontWeight: '400',
  },
});
