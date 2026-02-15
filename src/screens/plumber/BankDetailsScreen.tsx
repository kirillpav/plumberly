import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';

export function BankDetailsScreen() {
  const nav = useNavigation();
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!sortCode.trim() || !accountNumber.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    // In production, send to secure payment provider
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Saved', 'Bank details have been saved securely.');
      nav.goBack();
    }, 1000);
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bank Details</Text>
          <Text style={styles.subtitle}>
            Enter your bank details for receiving payments
          </Text>

          <InputField
            label="Sort Code"
            value={sortCode}
            onChangeText={setSortCode}
            placeholder="00-00-00"
            keyboardType="number-pad"
            maxLength={8}
          />
          <InputField
            label="Account Number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="12345678"
            keyboardType="number-pad"
            maxLength={8}
          />

          <PrimaryButton title="Save" onPress={handleSave} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: Spacing.base },
  back: { marginBottom: Spacing.base },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.grey500, marginBottom: Spacing.xl },
});
