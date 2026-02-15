import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { Avatar } from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/authStore';
import { uploadEnquiryImage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const REGIONS = ['North', 'East', 'South', 'West', 'Central'];

export function EditProfileScreen() {
  const nav = useNavigation();
  const { profile, plumberDetails, updateProfile, fetchProfile } = useAuthStore();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(plumberDetails?.bio ?? '');
  const [hourlyRate, setHourlyRate] = useState(plumberDetails?.hourly_rate?.toString() ?? '');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(plumberDetails?.regions ?? []);
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);

  const toggleRegion = (r: string) => {
    setSelectedRegions((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      let avatar_url = profile.avatar_url;
      if (avatarUri && avatarUri !== profile.avatar_url) {
        const uploaded = await uploadEnquiryImage(avatarUri, profile.id);
        if (uploaded) avatar_url = uploaded;
      }
      await updateProfile({ full_name: name.trim(), phone: phone.trim(), avatar_url });

      if (plumberDetails?.id) {
        await supabase.from('plumber_details').update({
          bio: bio.trim(),
          hourly_rate: parseFloat(hourlyRate) || 0,
          regions: selectedRegions,
        }).eq('id', plumberDetails.id);
      }

      await fetchProfile(profile.id);
      Alert.alert('Saved', 'Your profile has been updated.');
      nav.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
          <Text style={styles.title}>Edit Profile</Text>

          <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar}>
            <Avatar uri={avatarUri} name={name} size="lg" />
            <Text style={styles.changePhoto}>Change Photo</Text>
          </TouchableOpacity>

          <InputField label="Full Name" value={name} onChangeText={setName} />
          <InputField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <InputField label="Hourly Rate (GBP)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="decimal-pad" />
          <InputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <Text style={styles.label}>Service Regions</Text>
          <View style={styles.chips}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, selectedRegions.includes(r) && styles.chipActive]}
                onPress={() => toggleRegion(r)}
              >
                <Text style={[styles.chipText, selectedRegions.includes(r) && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xl },
  avatarBtn: { alignItems: 'center', marginBottom: Spacing.xl },
  changePhoto: { ...Typography.label, color: Colors.primary, marginTop: Spacing.sm },
  label: { ...Typography.label, color: Colors.grey700, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.label, color: Colors.grey700 },
  chipTextActive: { color: Colors.white },
});
