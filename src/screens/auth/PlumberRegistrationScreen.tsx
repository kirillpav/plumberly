import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { validateField } from '@/utils/validation';

const REGIONS = ['North', 'East', 'South', 'West', 'Central'];

export function PlumberRegistrationScreen() {
  const nav = useNavigation();
  const signUp = useAuthStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleSignUp = async () => {
    const e: Record<string, string | undefined> = {};
    e.name = validateField(name, { required: true }) ?? undefined;
    e.email = validateField(email, { required: true, email: true }) ?? undefined;
    e.phone = validateField(phone, { required: true, phone: true }) ?? undefined;
    e.password = validateField(password, { required: true, minLength: 6 }) ?? undefined;
    if (selectedRegions.length === 0) e.regions = 'Select at least one region';
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        fullName: name.trim(),
        role: 'plumber',
        phone: phone.trim(),
        regions: selectedRegions,
        bio: bio.trim() || undefined,
      });
      Alert.alert('Success', 'Registration submitted! Please check your email.');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message);
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
          <Text style={styles.title}>Plumber Registration</Text>
          <Text style={styles.subtitle}>Join our network of professionals</Text>

          <InputField label="Full Name" value={name} onChangeText={setName} error={errors.name} placeholder="John Smith" />
          <InputField label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
          <InputField label="Phone" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" placeholder="+44 7700 000000" />
          <InputField label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Min 6 characters" />

          <Text style={styles.label}>Service Regions</Text>
          {errors.regions && <Text style={styles.errorText}>{errors.regions}</Text>}
          <View style={styles.chips}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, selectedRegions.includes(r) && styles.chipActive]}
                onPress={() => toggleRegion(r)}
              >
                <Text style={[styles.chipText, selectedRegions.includes(r) && styles.chipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField
            label="Bio (optional)"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about your experience..."
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <PrimaryButton title="Register" onPress={handleSignUp} loading={loading} />
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
  label: { ...Typography.label, color: Colors.grey700, marginBottom: Spacing.sm },
  errorText: { ...Typography.caption, color: Colors.error, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { ...Typography.label, color: Colors.grey700 },
  chipTextActive: { color: Colors.white },
});
