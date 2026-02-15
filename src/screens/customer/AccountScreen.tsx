import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { Avatar } from '@/components/shared/Avatar';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { CustomerStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string }[] = [
  { icon: 'person-outline', label: 'Personal Info', route: 'EditProfile' },
  { icon: 'location-outline', label: 'Address' },
  { icon: 'card-outline', label: 'Payment Methods' },
  { icon: 'notifications-outline', label: 'Notifications' },
  { icon: 'document-text-outline', label: 'Terms of Service' },
  { icon: 'shield-outline', label: 'Privacy Policy' },
];

export function AccountScreen() {
  const nav = useNavigation<Nav>();
  const { profile, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScreenWrapper>
      <View style={styles.profileSection}>
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="lg" />
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => {
              if (item.route === 'EditProfile') nav.navigate('EditProfile');
            }}
          >
            <Ionicons name={item.icon} size={22} color={Colors.grey700} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color={Colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  name: { ...Typography.h2, color: Colors.black, marginTop: Spacing.md },
  email: { ...Typography.bodySmall, color: Colors.grey500, marginTop: Spacing.xs },
  menu: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
    gap: Spacing.md,
  },
  menuLabel: { ...Typography.body, color: Colors.black, flex: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    padding: Spacing.base,
  },
  logoutText: { ...Typography.button, color: Colors.error },
});
