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
import { Spacing } from '@/constants/spacing';

export function EditProfileScreen() {
  const nav = useNavigation();
  const { profile, updateProfile } = useAuthStore();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);

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
});
