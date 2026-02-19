import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { EnquiryCard } from '@/components/EnquiryCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useEnquiryStore } from '@/store/enquiryStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import type { CustomerStackParamList } from '@/types/navigation';
import type { EnquiryStatus, Enquiry } from '@/types/index';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const SEGMENTS = ['New', 'Active', 'Completed'];
const ACTIVE_STATUSES: EnquiryStatus[] = ['accepted', 'in_progress'];

interface JobInfo {
  enquiry_id: string;
  status: string;
  quote_amount: number | null;
  plumber_name: string | null;
}

export function EnquiriesScreen() {
  const nav = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const { enquiries, isLoading, fetchEnquiries, subscribeToChanges } = useEnquiryStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobMap, setJobMap] = useState<Record<string, JobInfo>>({});

  const fetchJobs = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('jobs')
      .select('enquiry_id, status, quote_amount, plumber:profiles!jobs_plumber_id_fkey(full_name)')
      .eq('customer_id', profile.id);

    if (data) {
      const map: Record<string, JobInfo> = {};
      for (const row of data as any[]) {
        map[row.enquiry_id] = {
          enquiry_id: row.enquiry_id,
          status: row.status,
          quote_amount: row.quote_amount,
          plumber_name: row.plumber?.full_name ?? null,
        };
      }
      setJobMap(map);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      fetchEnquiries(profile.id);
      fetchJobs();
      const unsubEnquiries = subscribeToChanges(profile.id);

      const jobChannel = supabase
        .channel(`cust-jobs-list-${profile.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `customer_id=eq.${profile.id}`,
        }, () => {
          fetchJobs();
        })
        .subscribe();

      return () => {
        unsubEnquiries();
        supabase.removeChannel(jobChannel);
      };
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchEnquiries(profile.id);
        fetchJobs();
      }
    }, [profile?.id, fetchJobs])
  );

  const filtered = useMemo(() => {
    const list = enquiries.filter((e) => {
      const jobInfo = jobMap[e.id];
      const hasActiveJob = jobInfo && jobInfo.status !== 'cancelled';

      if (activeIndex === 0) {
        return e.status === 'new' && !hasActiveJob;
      }
      if (activeIndex === 1) {
        return ACTIVE_STATUSES.includes(e.status) || hasActiveJob && !['completed', 'cancelled'].includes(jobInfo!.status);
      }
      return e.status === 'completed' || (hasActiveJob && jobInfo!.status === 'completed');
    });

    if (activeIndex === 1) {
      return [...list].sort((a, b) => {
        const aJob = jobMap[a.id];
        const bJob = jobMap[b.id];
        const aHasQuote = aJob?.status === 'quoted' ? 1 : 0;
        const bHasQuote = bJob?.status === 'quoted' ? 1 : 0;
        return bHasQuote - aHasQuote;
      });
    }
    return list;
  }, [enquiries, activeIndex, jobMap]);

  const renderItem = useCallback(
    ({ item }: { item: Enquiry }) => {
      const jobInfo = jobMap[item.id];
      return (
        <EnquiryCard
          enquiry={item}
          onPress={() => nav.navigate('EnquiryDetail', { enquiryId: item.id })}
          quoteAmount={jobInfo?.quote_amount}
          plumberName={jobInfo?.plumber_name}
          jobStatus={jobInfo?.status}
        />
      );
    },
    [nav, jobMap]
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
