import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/shared/ScreenWrapper";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { EnquiryCard } from "@/components/EnquiryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useEnquiryStore } from "@/store/enquiryStore";
import { useAuthStore } from "@/store/authStore";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import type { CustomerStackParamList } from "@/types/navigation";
import type { EnquiryStatus, Enquiry } from "@/types/index";

type Nav = NativeStackNavigationProp<CustomerStackParamList>;
const SEGMENTS = ["New", "Active", "Completed"];
const ACTIVE_STATUSES: EnquiryStatus[] = ["accepted", "in_progress"];

interface JobInfo {
  job_id: string;
  enquiry_id: string;
  status: string;
  quote_amount: number | null;
  plumber_name: string | null;
}

export function EnquiriesScreen() {
  const nav = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const { enquiries, isLoading, fetchEnquiries, subscribeToChanges } =
    useEnquiryStore();
  const unreadCounts = useUnreadCounts();
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobMap, setJobMap] = useState<Record<string, JobInfo[]>>({});

  const fetchJobs = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, enquiry_id, status, quote_amount, plumber:profiles!jobs_plumber_id_fkey(full_name)",
      )
      .eq("customer_id", profile.id);

    if (data) {
      const map: Record<string, JobInfo[]> = {};
      for (const row of data as any[]) {
        const info: JobInfo = {
          job_id: row.id,
          enquiry_id: row.enquiry_id,
          status: row.status,
          quote_amount: row.quote_amount,
          plumber_name: row.plumber?.full_name ?? null,
        };
        if (!map[row.enquiry_id]) {
          map[row.enquiry_id] = [];
        }
        map[row.enquiry_id].push(info);
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
            filter: `customer_id=eq.${profile.id}`,
          },
          () => {
            fetchJobs();
          },
        )
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
    }, [profile?.id, fetchJobs]),
  );

  const filtered = useMemo(() => {
    const list = enquiries.filter((e) => {
      const jobs = jobMap[e.id] ?? [];
      const activeJobs = jobs.filter((j) => j.status !== "cancelled");
      const hasActiveJob = activeJobs.length > 0;

      if (activeIndex === 0) {
        // Show 'new' enquiries only if no plumber has started working on them yet
        return e.status === "new" && !hasActiveJob;
      }
      const allJobsDone =
        hasActiveJob &&
        activeJobs.every((j) => j.status === "completed");

      if (activeIndex === 1) {
        // Exclude enquiries whose jobs are all completed
        if (allJobsDone) return false;
        return (
          ACTIVE_STATUSES.includes(e.status) ||
          (hasActiveJob &&
            !activeJobs.every((j) =>
              ["completed", "cancelled"].includes(j.status),
            ))
        );
      }
      return (
        e.status === "completed" || allJobsDone
      );
    });

    if (activeIndex === 1) {
      return [...list].sort((a, b) => {
        const aJobs = jobMap[a.id] ?? [];
        const bJobs = jobMap[b.id] ?? [];
        const aHasQuote = aJobs.some((j) => j.status === "quoted") ? 1 : 0;
        const bHasQuote = bJobs.some((j) => j.status === "quoted") ? 1 : 0;
        return bHasQuote - aHasQuote;
      });
    }
    return list;
  }, [enquiries, activeIndex, jobMap]);

  const renderItem = useCallback(
    ({ item }: { item: Enquiry }) => {
      const jobs = jobMap[item.id] ?? [];
      const quotedJobs = jobs.filter((j) => j.status === "quoted");
      const pendingJobs = jobs.filter((j) => j.status === "pending");
      const activeJob = jobs.find((j) =>
        ["in_progress", "completed"].includes(j.status),
      );

      // Compute total unread count across all jobs for this enquiry
      const totalUnread = jobs.reduce(
        (sum, j) => sum + (unreadCounts[j.job_id] ?? 0),
        0,
      );

      // Multi-quote scenario
      if (quotedJobs.length > 0 || pendingJobs.length > 0) {
        const quotedAmounts = quotedJobs
          .map((j) => j.quote_amount)
          .filter((a): a is number => a != null);
        const lowestQuote =
          quotedAmounts.length > 0 ? Math.min(...quotedAmounts) : null;

        return (
          <EnquiryCard
            enquiry={item}
            onPress={() =>
              nav.navigate("EnquiryDetail", { enquiryId: item.id })
            }
            quoteCount={quotedJobs.length}
            pendingCount={pendingJobs.length}
            lowestQuote={lowestQuote}
            jobStatus={
              activeJob?.status ??
              (quotedJobs.length > 0 ? "quoted" : "pending")
            }
            unreadCount={totalUnread}
          />
        );
      }

      // Single active job (in_progress/completed) or no jobs
      const singleJob = activeJob ?? jobs[0];
      return (
        <EnquiryCard
          enquiry={item}
          onPress={() => nav.navigate("EnquiryDetail", { enquiryId: item.id })}
          quoteAmount={singleJob?.quote_amount}
          plumberName={singleJob?.plumber_name}
          jobStatus={singleJob?.status}
          unreadCount={totalUnread}
        />
      );
    },
    [nav, jobMap, unreadCounts],
  );

  return (
    <ScreenWrapper>
      <Text style={styles.title}>My Enquiries</Text>
      <SegmentedControl
        segments={SEGMENTS}
        activeIndex={activeIndex}
        onPress={setActiveIndex}
      />

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
        onPress={() => nav.navigate("NewEnquiry", undefined)}
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
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
