import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { issueTypeToDisplayName, issueTypeToIcon } from '@/utils/intakeHelpers';
import type { IntakeIssueType } from '@/types/index';

const ISSUE_TYPES: IntakeIssueType[] = [
  'leak',
  'clog',
  'toilet',
  'faucet',
  'low_pressure',
  'no_hot_water',
  'smell',
  'other',
];

interface Props {
  selected: IntakeIssueType | null;
  onSelect: (type: IntakeIssueType) => void;
}

export function IssueTypeSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.grid}>
      {ISSUE_TYPES.map((type) => {
        const isSelected = selected === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(type)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
              <Ionicons
                name={issueTypeToIcon(type) as any}
                size={24}
                color={isSelected ? Colors.white : Colors.primary}
              />
            </View>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {issueTypeToDisplayName(type)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.grey100,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.lightBlue,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: Colors.primary,
  },
  label: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.grey700,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.primary,
  },
});
