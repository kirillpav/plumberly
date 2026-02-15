import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { Avatar } from './shared/Avatar';
import type { Region as RegionType } from '@/types/index';

const defaultRegions: RegionType[] = [
  {
    name: 'North',
    color: Colors.regionNorth,
    coordinates: [
      { latitude: 51.55, longitude: -0.18 },
      { latitude: 51.55, longitude: -0.08 },
      { latitude: 51.58, longitude: -0.08 },
      { latitude: 51.58, longitude: -0.18 },
    ],
  },
  {
    name: 'East',
    color: Colors.regionEast,
    coordinates: [
      { latitude: 51.49, longitude: -0.05 },
      { latitude: 51.49, longitude: 0.02 },
      { latitude: 51.55, longitude: 0.02 },
      { latitude: 51.55, longitude: -0.05 },
    ],
  },
  {
    name: 'South',
    color: Colors.regionSouth,
    coordinates: [
      { latitude: 51.44, longitude: -0.15 },
      { latitude: 51.44, longitude: -0.05 },
      { latitude: 51.49, longitude: -0.05 },
      { latitude: 51.49, longitude: -0.15 },
    ],
  },
  {
    name: 'West',
    color: Colors.regionWest,
    coordinates: [
      { latitude: 51.49, longitude: -0.25 },
      { latitude: 51.49, longitude: -0.18 },
      { latitude: 51.55, longitude: -0.18 },
      { latitude: 51.55, longitude: -0.25 },
    ],
  },
  {
    name: 'Central',
    color: Colors.regionCentral,
    coordinates: [
      { latitude: 51.49, longitude: -0.15 },
      { latitude: 51.49, longitude: -0.08 },
      { latitude: 51.55, longitude: -0.08 },
      { latitude: 51.55, longitude: -0.15 },
    ],
  },
];

interface PlumberPin {
  id: string;
  name: string;
  avatarUrl?: string;
  latitude: number;
  longitude: number;
}

interface Props {
  regions?: RegionType[];
  plumbers?: PlumberPin[];
  onPlumberPress?: (id: string) => void;
}

export function RegionMap({ regions = defaultRegions, plumbers = [], onPlumberPress }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={Config.defaultMapRegion}
      showsUserLocation
    >
      {regions.map((region) => (
        <Polygon
          key={region.name}
          coordinates={region.coordinates}
          fillColor={region.color}
          strokeColor={region.color.replace('0.2', '0.6')}
          strokeWidth={1}
        />
      ))}
      {plumbers.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.latitude, longitude: p.longitude }}
          onPress={() => onPlumberPress?.(p.id)}
        >
          <View style={styles.pin}>
            <Avatar uri={p.avatarUrl} name={p.name} size="sm" />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  pin: {
    alignItems: 'center',
  },
});
