import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { EnquiryCard } from '@/components/EnquiryCard';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useJobStore } from '@/store/jobStore';
import { useEnquiryStore } from '@/store/enquiryStore';
import { useAuthStore } from '@/store/authStore';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { PlumberStackParamList } from '@/types/navigation';
import type { Job, Enquiry } from '@/types/index';

type Nav = NativeStackNavigationProp<PlumberStackParamList>;
const SEGMENTS = ['New', 'Existing', 'Completed'];

export function JobsScreen() {
  const nav = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const plumberDetails = useAuthStore((s) => s.plumberDetails);
  const { jobs, isLoading: jobsLoading, fetchJobs, acceptJob, subscribeToChanges } = useJobStore();
  const { enquiries, isLoading: enqLoading, fetchEnquiries, subscribeToChanges: subscribeEnquiries } = useEnquiryStore();
  const unreadCounts = useUnreadCounts();
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchJobs(profile.id);
      fetchEnquiries();
      const unsubJobs = subscribeToChanges(profile.id);
      const unsubEnquiries = subscribeEnquiries();
      return () => {
        unsubJobs();
        unsubEnquiries();
      };
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchJobs(profile.id);
        fetchEnquiries();
      }
    }, [profile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchJobs(profile?.id), fetchEnquiries()]);
    setRefreshing(false);
  };

  const myEnquiryIds = new Set(jobs.map((j) => j.enquiry_id));
  const newEnquiries = enquiries.filter(
    (e) => (e.status === 'new' || e.status === 'accepted') && !myEnquiryIds.has(e.id)
  );

  const plumberRegions = useMemo(
    () => new Set((plumberDetails?.regions ?? []).map((r) => r.toLowerCase())),
    [plumberDetails?.regions],
  );
  const hasRegions = plumberRegions.size > 0;

  const enquirySections = useMemo(() => {
    if (!hasRegions) {
      return [{ key: 'all', title: 'All Enquiries', data: newEnquiries }];
    }

    const inArea: Enquiry[] = [];
    const other: Enquiry[] = [];

    for (const e of newEnquiries) {
      if (e.region && plumberRegions.has(e.region.toLowerCase())) {
        inArea.push(e);
      } else {
        other.push(e);
      }
    }

    const sections: { key: string; title: string; data: Enquiry[] }[] = [];
    if (inArea.length > 0) {
      sections.push({ key: 'in-area', title: 'In Your Area', data: inArea });
    }
    if (other.length > 0) {
      sections.push({ key: 'other', title: 'Other Areas', data: other });
    }
    return sections;
  }, [newEnquiries, plumberRegions, hasRegions]);

  const existingJobs = jobs.filter((j) => ['pending', 'quoted', 'declined', 'accepted', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (enquiry: Enquiry) => {
    if (!profile?.id || acceptingIds.has(enquiry.id)) return;
    setAcceptingIds((prev) => new Set(prev).add(enquiry.id));
    try {
      await acceptJob(enquiry.id, profile.id, enquiry.customer_id);
      await fetchEnquiries();
      nav.navigate('EnquiryDetail', { enquiryId: enquiry.id });
    } catch {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(enquiry.id);
        return next;
      });
    }
  };

  const isLoading = jobsLoading || enqLoading;

  const renderEnquiryItem = ({ item }: { item: Enquiry }) => (
    <EnquiryCard
      enquiry={item}
      onPress={() => nav.navigate('EnquiryDetail', { enquiryId: item.id })}
      showAcceptButton
      onAccept={() => handleAccept(item)}
      isAccepting={acceptingIds.has(item.id)}
    />
  );

  const renderSectionHeader = ({ section }: { section: { key: string; title: string } }) => {
    const isInArea = section.key === 'in-area';
    return (
      <View style={[styles.sectionHeader, isInArea ? styles.sectionHeaderInArea : styles.sectionHeaderOther]}>
        <View style={[styles.sectionIcon, isInArea ? styles.sectionIconInArea : styles.sectionIconOther]}>
          <Ionicons
            name={isInArea ? 'location' : 'globe-outline'}
            size={14}
            color={isInArea ? Colors.primary : Colors.grey500}
          />
        </View>
        <Text style={[styles.sectionTitle, isInArea ? styles.sectionTitleInArea : styles.sectionTitleOther]}>
          {section.title}
        </Text>
        {isInArea && (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>Nearby</Text>
          </View>
        )}
      </View>
    );
  };

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
          <SectionList
            sections={enquirySections}
            keyExtractor={(e) => e.id}
            renderItem={renderEnquiryItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
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
                unreadCount={unreadCounts[item.id] ?? 0}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  sectionHeaderInArea: {
    borderBottomWidth: 0,
  },
  sectionHeaderOther: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.grey100,
    paddingTop: Spacing.base,
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconInArea: {
    backgroundColor: Colors.lightBlue,
  },
  sectionIconOther: {
    backgroundColor: Colors.grey100,
  },
  sectionTitle: {
    ...Typography.label,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitleInArea: {
    color: Colors.grey900,
  },
  sectionTitleOther: {
    color: Colors.grey500,
  },
  sectionBadge: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sectionBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
});
