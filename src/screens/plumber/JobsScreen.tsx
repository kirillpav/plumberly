import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { EnquiryCard } from '@/components/EnquiryCard';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useJobStore } from '@/store/jobStore';
import { useEnquiryStore } from '@/store/enquiryStore';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import type { PlumberStackParamList } from '@/types/navigation';
import type { Job, Enquiry } from '@/types/index';

type Nav = NativeStackNavigationProp<PlumberStackParamList>;
const SEGMENTS = ['New', 'Existing', 'Completed'];

export function JobsScreen() {
  const nav = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const { jobs, isLoading: jobsLoading, fetchJobs, acceptJob, subscribeToChanges } = useJobStore();
  const { enquiries, isLoading: enqLoading, fetchEnquiries } = useEnquiryStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchJobs(profile.id);
      fetchEnquiries(); // all enquiries for plumber
      const unsub = subscribeToChanges(profile.id);
      return unsub;
    }
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(profile?.id), fetchEnquiries()]);
    setRefreshing(false);
  };

  const newEnquiries = enquiries.filter((e) => e.status === 'new');
  const existingJobs = jobs.filter((j) => ['pending', 'quoted', 'accepted', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (enquiry: Enquiry) => {
    if (!profile?.id || acceptingIds.has(enquiry.id)) return;
    setAcceptingIds((prev) => new Set(prev).add(enquiry.id));
    try {
      await acceptJob(enquiry.id, profile.id, enquiry.customer_id);
      await fetchEnquiries();
      setActiveIndex(1);
    } catch {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(enquiry.id);
        return next;
      });
    }
  };

  const isLoading = jobsLoading || enqLoading;

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Jobs</Text>
      <SegmentedControl segments={SEGMENTS} activeIndex={activeIndex} onPress={setActiveIndex} />

      {isLoading && !refreshing ? (
        <LoadingSpinner />
      ) : activeIndex === 0 ? (
        newEnquiries.length === 0 ? (
          <EmptyState icon="briefcase-outline" title="No new enquiries" subtitle="Check back soon for new jobs" />
        ) : (
          <FlatList
            data={newEnquiries}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => (
              <EnquiryCard
                enquiry={item}
                onPress={() => nav.navigate('EnquiryDetail', { enquiryId: item.id })}
                showAcceptButton
                onAccept={() => handleAccept(item)}
                isAccepting={acceptingIds.has(item.id)}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          />
        )
      ) : activeIndex === 1 ? (
        existingJobs.length === 0 ? (
          <EmptyState icon="construct-outline" title="No active jobs" subtitle="Accept an enquiry to get started" />
        ) : (
          <FlatList
            data={existingJobs}
            keyExtractor={(j) => j.id}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onPress={() => nav.navigate('JobDetail', { jobId: item.id })}
                actionLabel="View"
                onAction={() => nav.navigate('JobDetail', { jobId: item.id })}
              />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          />
        )
      ) : completedJobs.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title="No completed jobs" subtitle="Complete jobs to build your history" />
      ) : (
        <FlatList
          data={completedJobs}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => nav.navigate('JobDetail', { jobId: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        />
      )}
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
});
