import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subWeeks, subMonths, format, isWithinInterval, getDay,
} from 'date-fns';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useJobStore } from '@/store/jobStore';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatCurrencyWhole } from '@/utils/formatCurrency';
import type { PlumberStackParamList } from '@/types/navigation';
import type { Job } from '@/types/index';

type Nav = NativeStackNavigationProp<PlumberStackParamList>;
const PERIODS = ['Week', 'Month'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return Colors.success;
    case 'in_progress': return Colors.primary;
    case 'quoted': return Colors.warning;
    default: return Colors.grey500;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'in_progress': return 'In Progress';
    case 'quoted': return 'Quoted';
    case 'pending': return 'Pending';
    case 'completed': return 'Completed';
    case 'accepted': return 'Accepted';
    default: return status;
  }
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const profile = useAuthStore((s) => s.profile);
  const { jobs, isLoading, fetchJobs, subscribeToChanges } = useJobStore();
  const [periodIndex, setPeriodIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  // Screen padding (16*2) + card padding (16*2) + y-axis labels space (~45)
  const chartWidth = screenWidth - 110;

  useEffect(() => {
    if (profile?.id) {
      fetchJobs(profile.id);
      const unsub = subscribeToChanges(profile.id);
      return unsub;
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) fetchJobs(profile.id);
    }, [profile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(profile?.id);
    setRefreshing(false);
  };

  // Revenue calculations
  const { currentRevenue, previousRevenue, chartData, maxValue } = useMemo(() => {
    const now = new Date();
    // Include jobs that are in_progress or completed with a quote (revenue earned)
    const revenueJobs = jobs.filter(
      (j) => (j.status === 'completed' || j.status === 'in_progress') && j.quote_amount != null
    );

    let data: { value: number; label: string; frontColor: string }[];
    let curRev = 0;
    let prevRev = 0;

    if (periodIndex === 0) {
      // Week view: current week vs previous week
      const currentStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentEnd = endOfWeek(now, { weekStartsOn: 1 });
      const prevWeek = subWeeks(now, 1);
      const prevStart = startOfWeek(prevWeek, { weekStartsOn: 1 });
      const prevEnd = endOfWeek(prevWeek, { weekStartsOn: 1 });

      const currentJobs = revenueJobs.filter((j) => isWithinInterval(new Date(j.updated_at), { start: currentStart, end: currentEnd }));
      const prevJobs = revenueJobs.filter((j) => isWithinInterval(new Date(j.updated_at), { start: prevStart, end: prevEnd }));

      curRev = currentJobs.reduce((sum, j) => sum + (j.quote_amount ?? 0), 0);
      prevRev = prevJobs.reduce((sum, j) => sum + (j.quote_amount ?? 0), 0);

      const todayIdx = (getDay(now) + 6) % 7;
      const byDay = Array(7).fill(0);
      for (const j of currentJobs) {
        const dayIdx = (getDay(new Date(j.updated_at)) + 6) % 7;
        byDay[dayIdx] += j.quote_amount ?? 0;
      }
      data = byDay.map((value, i) => ({
        value,
        label: DAY_LABELS[i],
        frontColor: Colors.primary,
      }));
    } else {
      // Month view: find the range of months that have completed jobs
      const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Determine how many months back we have data (max 6)
      let monthsBack = 0;
      for (let i = 1; i <= 5; i++) {
        const mStart = startOfMonth(subMonths(now, i));
        const mEnd = endOfMonth(subMonths(now, i));
        const hasData = revenueJobs.some((j) =>
          isWithinInterval(new Date(j.updated_at), { start: mStart, end: mEnd })
        );
        if (hasData) monthsBack = i;
      }
      // Always show at least 2 months (current + previous) for comparison
      const numMonths = Math.max(monthsBack + 1, 2);

      const months: { start: Date; end: Date; label: string }[] = [];
      for (let i = numMonths - 1; i >= 0; i--) {
        const m = subMonths(now, i);
        months.push({ start: startOfMonth(m), end: endOfMonth(m), label: MONTH_LABELS[m.getMonth()] });
      }

      data = months.map(({ start, end, label }) => {
        const monthRev = revenueJobs
          .filter((j) => isWithinInterval(new Date(j.updated_at), { start, end }))
          .reduce((sum, j) => sum + (j.quote_amount ?? 0), 0);
        return { value: monthRev, label, frontColor: Colors.primary };
      });

      // Current = last bar (this month), previous = second to last
      curRev = data[data.length - 1].value;
      prevRev = data.length >= 2 ? data[data.length - 2].value : 0;
    }

    const max = Math.max(...data.map((d) => d.value), 1);
    // Round max up to a nice number for y-axis sections
    const niceMax = Math.ceil(max / 100) * 100 || 100;

    return { currentRevenue: curRev, previousRevenue: prevRev, chartData: data, maxValue: niceMax };
  }, [jobs, periodIndex]);

  const changePercent = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : currentRevenue > 0 ? 100 : 0;
  const changePositive = changePercent >= 0;

  // Today's schedule — check both scheduled_date and enquiry.preferred_date
  // Group jobs by their time slot for calendar-style display
  const scheduleGroups = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayJobs = jobs
      .filter((j) => {
        const jobDate = j.scheduled_date ?? j.enquiry?.preferred_date ?? null;
        return jobDate === todayStr;
      })
      .sort((a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''));

    const groups: { timeSlot: string; jobs: Job[] }[] = [];
    for (const job of todayJobs) {
      const slot = job.scheduled_time ?? 'Unscheduled';
      const existing = groups.find((g) => g.timeSlot === slot);
      if (existing) {
        existing.jobs.push(job);
      } else {
        groups.push({ timeSlot: slot, jobs: [job] });
      }
    }
    return groups;
  }, [jobs]);

  if (isLoading && jobs.length === 0) {
    return (
      <ScreenWrapper>
        <Text style={styles.title}>Dashboard</Text>
        <LoadingSpinner />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <Text style={styles.title}>Dashboard</Text>

        {/* Revenue Overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Revenue Overview</Text>
          <View style={styles.revenueRow}>
            <Text style={styles.revenue}>{formatCurrencyWhole(currentRevenue)}</Text>
            {(currentRevenue > 0 || previousRevenue > 0) && (
              <View style={[styles.changeBadge, { backgroundColor: changePositive ? '#E8F5E9' : '#FFEBEE' }]}>
                <Ionicons
                  name={changePositive ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={changePositive ? Colors.success : Colors.error}
                />
                <Text style={[styles.changeText, { color: changePositive ? Colors.success : Colors.error }]}>
                  {changePositive ? '+' : ''}{Math.round(changePercent)}%
                </Text>
              </View>
            )}
          </View>
          <SegmentedControl segments={PERIODS} activeIndex={periodIndex} onPress={setPeriodIndex} />
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={chartWidth}
              height={160}
              maxValue={maxValue}
              noOfSections={4}
              barWidth={Math.floor((chartWidth - 20) / chartData.length * 0.6)}
              barBorderRadius={6}
              spacing={Math.floor((chartWidth - 20) / chartData.length * 0.4)}
              initialSpacing={10}
              endSpacing={5}
              disableScroll
              yAxisTextStyle={styles.yAxisLabel}
              formatYLabel={(val: string) => `£${Number(val)}`}
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelTextStyle={styles.xAxisLabel}
              rulesType="dashed"
              rulesColor={Colors.grey100}
              dashWidth={4}
              dashGap={4}
              isAnimated
              animationDuration={400}
            />
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Schedule</Text>
          {scheduleGroups.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Ionicons name="calendar-outline" size={32} color={Colors.grey300} />
              <Text style={styles.emptyText}>No jobs scheduled for today</Text>
            </View>
          ) : (
            scheduleGroups.map((group, gi) => (
              <View key={group.timeSlot}>
                {/* Time slot header */}
                <View style={styles.timeSlotHeader}>
                  <View style={styles.timeSlotDot} />
                  <Text style={styles.timeSlotText}>{group.timeSlot}</Text>
                </View>
                {/* Job cards under this time slot */}
                {group.jobs.map((job, ji) => {
                  const isLast = gi === scheduleGroups.length - 1 && ji === group.jobs.length - 1;
                  return (
                    <View key={job.id} style={styles.timelineRow}>
                      <View style={styles.timelineTrack}>
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>
                      <TouchableOpacity
                        style={styles.scheduleCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                      >
                        <View style={styles.scheduleCardTop}>
                          <Text style={styles.scheduleCustomer} numberOfLines={1}>
                            {job.customer?.full_name ?? 'Customer'}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                              {getStatusLabel(job.status)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.scheduleJob} numberOfLines={1}>
                          {job.enquiry?.title ?? 'Job'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* All Jobs Summary — stub */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Jobs Summary</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>

        {/* Pricing Estimates — stub */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing Estimates</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  cardTitle: { ...Typography.h3, color: Colors.black, marginBottom: Spacing.sm },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  revenue: { ...Typography.h1, color: Colors.primary, fontSize: 32 },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  changeText: { ...Typography.caption, fontWeight: '600' },
  chartContainer: { marginTop: Spacing.sm, marginLeft: -Spacing.sm },
  xAxisLabel: { color: Colors.grey500, fontSize: 11 },
  yAxisLabel: { color: Colors.grey500, fontSize: 10 },
  // Schedule — timeline / calendar style
  emptySchedule: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodySmall, color: Colors.grey500 },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  timeSlotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 3,
  },
  timeSlotText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineTrack: {
    width: 16,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.grey100,
  },
  scheduleCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  scheduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scheduleCustomer: { ...Typography.body, color: Colors.black, fontWeight: '600', flex: 1 },
  scheduleJob: { ...Typography.caption, color: Colors.grey500, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  statusText: { ...Typography.caption, fontWeight: '600' },
  // Stubs
  comingSoon: { ...Typography.bodySmall, color: Colors.grey500, paddingVertical: Spacing.md },
  spacer: { height: Spacing.xxl },
});
