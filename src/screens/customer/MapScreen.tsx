import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { RegionMap } from '@/components/RegionMap';
import { Avatar } from '@/components/shared/Avatar';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface PlumberListItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  plumber_details: {
    regions: string[];
    rating: number;
    jobs_completed: number;
  } | null;
}

export function MapScreen() {
  const [plumbers, setPlumbers] = useState<PlumberListItem[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, plumber_details(*)')
        .eq('role', 'plumber');
      setPlumbers((data as unknown as PlumberListItem[]) ?? []);
    }
    load();
  }, []);

  return (
    <ScreenWrapper noPadding>
      <View style={styles.mapContainer}>
        <RegionMap
          plumbers={plumbers.map((p, i) => ({
            id: p.id,
            name: p.full_name,
            avatarUrl: p.avatar_url ?? undefined,
            latitude: 51.5 + (i * 0.01),
            longitude: -0.12 + (i * 0.01),
          }))}
          onPlumberPress={() => setShowList(true)}
        />
      </View>

      {plumbers.length > 0 && (
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Plumbers in your area</Text>
          <FlatList
            data={plumbers}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={styles.plumberRow}>
                <Avatar uri={item.avatar_url} name={item.full_name} size="sm" />
                <View style={styles.plumberInfo}>
                  <Text style={styles.plumberName}>{item.full_name}</Text>
                  <Text style={styles.plumberMeta}>
                    {item.plumber_details?.regions?.join(', ') ?? 'N/A'} •{' '}
                    {item.plumber_details?.jobs_completed ?? 0} jobs
                  </Text>
                </View>
                <Text style={styles.rating}>
                  {item.plumber_details?.rating?.toFixed(1) ?? '—'}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1 },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.base,
    maxHeight: '40%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.grey300,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: { ...Typography.h3, color: Colors.black, marginBottom: Spacing.md },
  plumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  plumberInfo: { flex: 1 },
  plumberName: { ...Typography.label, color: Colors.black },
  plumberMeta: { ...Typography.caption, color: Colors.grey500, marginTop: 2 },
  rating: { ...Typography.h3, color: Colors.primary },
});
