import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { EmptyState } from '@/components/shared/EmptyState';
import { PlumberCard, PlumberListItem } from '@/components/PlumberCard';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Config } from '@/constants/config';

const ALL_REGIONS = ['North', 'East', 'South', 'West', 'Central'];

type PriceRange = 'any' | '0-25' | '25-50' | '50-75' | '75+';

const PRICE_RANGES: { key: PriceRange; label: string; min: number; max: number }[] = [
  { key: 'any', label: 'Any price', min: 0, max: Infinity },
  { key: '0-25', label: `${Config.currency.symbol}0–25/hr`, min: 0, max: 25 },
  { key: '25-50', label: `${Config.currency.symbol}25–50/hr`, min: 25, max: 50 },
  { key: '50-75', label: `${Config.currency.symbol}50–75/hr`, min: 50, max: 75 },
  { key: '75+', label: `${Config.currency.symbol}75+/hr`, min: 75, max: Infinity },
];

type SortOption = 'rating' | 'price_low' | 'price_high' | 'jobs';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'rating', label: 'Top Rated' },
  { key: 'price_low', label: 'Price: Low' },
  { key: 'price_high', label: 'Price: High' },
  { key: 'jobs', label: 'Most Jobs' },
];

export function FindProsScreen() {
  const [plumbers, setPlumbers] = useState<PlumberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<PriceRange>('any');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(true);

  const fetchPlumbers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, plumber_details(*)')
        .eq('role', 'plumber');

      setPlumbers((data as unknown as PlumberListItem[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch plumbers:', err);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchPlumbers().finally(() => setIsLoading(false));
  }, [fetchPlumbers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlumbers();
    setRefreshing(false);
  }, [fetchPlumbers]);

  const filtered = useMemo(() => {
    let results = [...plumbers];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.plumber_details?.bio ?? '').toLowerCase().includes(q) ||
          (p.plumber_details?.regions ?? []).some((r) =>
            r.toLowerCase().includes(q),
          ),
      );
    }

    // Region filter
    if (selectedRegion) {
      results = results.filter((p) =>
        (p.plumber_details?.regions ?? []).some(
          (r) => r.toLowerCase() === selectedRegion.toLowerCase(),
        ),
      );
    }

    // Price filter
    if (priceRange !== 'any') {
      const range = PRICE_RANGES.find((r) => r.key === priceRange)!;
      results = results.filter((p) => {
        const rate = p.plumber_details?.hourly_rate ?? 0;
        return rate >= range.min && rate < range.max;
      });
    }

    // Availability (verified) filter
    if (availableOnly) {
      results = results.filter((p) => p.plumber_details?.verified === true);
    }

    // Sort
    results.sort((a, b) => {
      const aD = a.plumber_details;
      const bD = b.plumber_details;

      switch (sortBy) {
        case 'rating':
          return (bD?.rating ?? 0) - (aD?.rating ?? 0);
        case 'price_low':
          return (aD?.hourly_rate ?? 0) - (bD?.hourly_rate ?? 0);
        case 'price_high':
          return (bD?.hourly_rate ?? 0) - (aD?.hourly_rate ?? 0);
        case 'jobs':
          return (bD?.jobs_completed ?? 0) - (aD?.jobs_completed ?? 0);
        default:
          return 0;
      }
    });

    return results;
  }, [plumbers, search, selectedRegion, priceRange, availableOnly, sortBy]);

  const activeFilterCount =
    (selectedRegion ? 1 : 0) +
    (priceRange !== 'any' ? 1 : 0) +
    (availableOnly ? 1 : 0);

  const clearFilters = () => {
    setSelectedRegion(null);
    setPriceRange('any');
    setAvailableOnly(false);
    setSearch('');
  };

  const renderPlumber = useCallback(
    ({ item }: { item: PlumberListItem }) => (
      <PlumberCard plumber={item} onPress={() => {}} />
    ),
    [],
  );

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find Professionals</Text>
        <TouchableOpacity
          style={[
            styles.filterToggle,
            showFilters && styles.filterToggleActive,
          ]}
          onPress={() => setShowFilters((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilters ? Colors.white : Colors.primary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.grey500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, region, or keyword..."
            placeholderTextColor={Colors.grey500}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.grey300} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Region chips */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Region</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  !selectedRegion && styles.chipActive,
                ]}
                onPress={() => setSelectedRegion(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    !selectedRegion && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {ALL_REGIONS.map((region) => (
                <TouchableOpacity
                  key={region}
                  style={[
                    styles.chip,
                    selectedRegion === region && styles.chipActive,
                  ]}
                  onPress={() =>
                    setSelectedRegion(selectedRegion === region ? null : region)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedRegion === region && styles.chipTextActive,
                    ]}
                  >
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Price chips */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Hourly Rate</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {PRICE_RANGES.map((range) => (
                <TouchableOpacity
                  key={range.key}
                  style={[
                    styles.chip,
                    priceRange === range.key && styles.chipActive,
                  ]}
                  onPress={() => setPriceRange(range.key)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      priceRange === range.key && styles.chipTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Availability + Sort row */}
          <View style={styles.bottomFilterRow}>
            <TouchableOpacity
              style={[
                styles.availableChip,
                availableOnly && styles.availableChipActive,
              ]}
              onPress={() => setAvailableOnly((v) => !v)}
            >
              <Ionicons
                name={availableOnly ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={16}
                color={availableOnly ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.availableText,
                  availableOnly && styles.availableTextActive,
                ]}
              >
                Available
              </Text>
            </TouchableOpacity>

            <View style={styles.sortRow}>
              <Ionicons name="swap-vertical-outline" size={14} color={Colors.grey500} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sortChips}
              >
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSortBy(opt.key)}
                    style={[
                      styles.sortChip,
                      sortBy === opt.key && styles.sortChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sortChipText,
                        sortBy === opt.key && styles.sortChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Ionicons name="close-outline" size={14} color={Colors.error} />
              <Text style={styles.clearText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filtered.length} professional{filtered.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={renderPlumber}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No professionals found"
              subtitle="Try adjusting your filters or search terms"
            />
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    ...Typography.h1,
    color: Colors.black,
  },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleActive: {
    backgroundColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  searchRow: {
    marginBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
    height: 46,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.black,
    paddingVertical: 0,
  },
  filtersContainer: {
    marginBottom: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    ...Typography.caption,
    color: Colors.grey500,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey100,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.label,
    color: Colors.grey700,
  },
  chipTextActive: {
    color: Colors.white,
  },
  bottomFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  availableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  availableChipActive: {
    backgroundColor: Colors.primary,
  },
  availableText: {
    ...Typography.label,
    color: Colors.primary,
  },
  availableTextActive: {
    color: Colors.white,
  },
  sortRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sortChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sortChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sortChipActive: {
    backgroundColor: Colors.lightBlue,
  },
  sortChipText: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  sortChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  clearText: {
    ...Typography.caption,
    color: Colors.error,
  },
  resultsBar: {
    marginBottom: Spacing.md,
  },
  resultsText: {
    ...Typography.bodySmall,
    color: Colors.grey500,
  },
  list: {
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
