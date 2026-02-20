import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { issueTypeToDisplayName, issueTypeToIcon } from '@/utils/intakeHelpers';
import { Config } from '@/constants/config';
import type { IntakeIssueType, IntakeFieldDefinition } from '@/types/index';

interface Props {
  issueType: IntakeIssueType;
  whenStarted: string;
  fields: Record<string, any>;
  photos: string[];
  onEdit: () => void;
}

export function IntakeSummary({ issueType, whenStarted, fields, photos, onEdit }: Props) {
  const fieldDefs = Config.chatbot.intakeFields[issueType] as IntakeFieldDefinition[];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={issueTypeToIcon(issueType) as any} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{issueTypeToDisplayName(issueType)}</Text>
        <TouchableOpacity onPress={onEdit} style={styles.editBtn} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Started</Text>
        <Text style={styles.value}>{whenStarted}</Text>
      </View>

      {fieldDefs.map((def) => {
        const val = fields[def.key];
        if (val === undefined || val === null || val === '') return null;
        const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
        return (
          <View key={def.key} style={styles.row}>
            <Text style={styles.label}>{def.label.replace(/\?$/, '')}</Text>
            <Text style={styles.value}>{display}</Text>
          </View>
        );
      })}

      {photos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photosRow}>
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.grey100,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.grey900,
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.lightBlue,
  },
  editText: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey100,
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    flex: 1,
  },
  value: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.grey900,
    flex: 1,
    textAlign: 'right',
  },
  photosSection: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  photosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
  },
});
