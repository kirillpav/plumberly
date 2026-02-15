import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { useJobStore } from '@/store/jobStore';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatCurrencyWhole } from '@/utils/formatCurrency';

const PERIODS = ['Week', 'Month', 'Year'];

// Mock data for chart
const mockWeekData = [
  { value: 120 }, { value: 250 }, { value: 180 },
  { value: 320 }, { value: 280 }, { value: 400 }, { value: 350 },
];
const mockMonthData = [
  { value: 800 }, { value: 1200 }, { value: 950 },
  { value: 1400 }, { value: 1100 }, { value: 1600 },
];
const mockYearData = [
  { value: 3200 }, { value: 4500 }, { value: 3800 }, { value: 5200 },
  { value: 4800 }, { value: 6100 }, { value: 5400 }, { value: 7000 },
  { value: 6200 }, { value: 7500 }, { value: 6800 }, { value: 8200 },
];

const PRICING_ESTIMATES = [
  { service: 'Leak Repair', price: '£80 - £150' },
  { service: 'Blocked Drain', price: '£60 - £120' },
  { service: 'Boiler Service', price: '£100 - £200' },
  { service: 'Tap Replacement', price: '£50 - £90' },
  { service: 'Toilet Repair', price: '£70 - £130' },
  { service: 'Pipe Replacement', price: '£150 - £300' },
];

export function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { jobs, fetchJobs } = useJobStore();
  const [periodIndex, setPeriodIndex] = useState(1);

  useEffect(() => {
    if (profile?.id) fetchJobs(profile.id);
  }, [profile?.id]);

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const totalRevenue = completedJobs.reduce((sum, j) => sum + (j.quote_amount ?? 0), 0);

  const chartData = periodIndex === 0 ? mockWeekData : periodIndex === 1 ? mockMonthData : mockYearData;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Dashboard</Text>

        {/* Revenue Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Revenue</Text>
          <Text style={styles.revenue}>{formatCurrencyWhole(totalRevenue)}</Text>
          <SegmentedControl
            segments={PERIODS}
            activeIndex={periodIndex}
            onPress={setPeriodIndex}
          />
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={280}
              height={150}
              color={Colors.primary}
              startFillColor={Colors.lightBlue}
              endFillColor={Colors.background}
              startOpacity={0.8}
              endOpacity={0.1}
              curved
              hideDataPoints
              hideYAxisText
              hideRules
              thickness={2}
              areaChart
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedJobs.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {jobs.filter((j) => j.status === 'in_progress').length}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {jobs.filter((j) => j.status === 'pending' || j.status === 'quoted').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Pricing Estimates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing Estimates</Text>
          {PRICING_ESTIMATES.map((item) => (
            <View key={item.service} style={styles.pricingRow}>
              <Text style={styles.pricingService}>{item.service}</Text>
              <Text style={styles.pricingPrice}>{item.price}</Text>
            </View>
          ))}
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
  revenue: { ...Typography.h1, color: Colors.primary, marginBottom: Spacing.md, fontSize: 32 },
  chartContainer: { alignItems: 'center', marginTop: Spacing.sm },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    alignItems: 'center',
  },
  statValue: { ...Typography.h2, color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.grey500, marginTop: Spacing.xs },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  pricingService: { ...Typography.body, color: Colors.black },
  pricingPrice: { ...Typography.label, color: Colors.primary },
  spacer: { height: Spacing.xxl },
});
