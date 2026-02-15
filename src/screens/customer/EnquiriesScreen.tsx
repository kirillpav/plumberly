import React, { useCallback, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { EnquiryCard } from '@/components/EnquiryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useEnquiryStore } from '@/store/enquiryStore';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { CustomerStackParamList } from '@/types/navigation';
import type { EnquiryStatus, Enquiry } from '@/types/index';
import { Text } from 'react-native';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const SEGMENTS = ['New', 'Accepted', 'Completed'];
const STATUS_MAP: EnquiryStatus[] = ['new', 'accepted', 'completed'];

export function EnquiriesScreen() {
  const nav = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const { enquiries, isLoading, fetchEnquiries, subscribeToChanges } = useEnquiryStore();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchEnquiries(profile.id);
      const unsub = subscribeToChanges(profile.id);
      return unsub;
    }
  }, [profile?.id]);

  const filtered = enquiries.filter((e) => e.status === STATUS_MAP[activeIndex]);

  const renderItem = useCallback(
    ({ item }: { item: Enquiry }) => (
      <EnquiryCard
        enquiry={item}
        onPress={() => nav.navigate('EnquiryDetail', { enquiryId: item.id })}
      />
    ),
    [nav]
  );

  return (
    <ScreenWrapper>
      <Text style={styles.title}>My Enquiries</Text>
      <SegmentedControl segments={SEGMENTS} activeIndex={activeIndex} onPress={setActiveIndex} />

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No enquiries yet"
          subtitle="Create a new enquiry to get started"
        />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(e) => e.id}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => nav.navigate('NewEnquiry', undefined)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.h1,
    color: Colors.black,
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
