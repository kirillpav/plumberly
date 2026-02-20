import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InputField } from '@/components/shared/InputField';
import { ImagePickerButton } from '@/components/ImagePickerButton';
import { Config } from '@/constants/config';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { IntakeIssueType, IntakeFieldDefinition } from '@/types/index';

const WHEN_OPTIONS = [
  'Just now',
  'Today',
  'Yesterday',
  'This week',
  'Longer than a week',
];

interface Props {
  issueType: IntakeIssueType;
  whenStarted: string;
  onWhenStartedChange: (value: string) => void;
  fields: Record<string, any>;
  onFieldChange: (key: string, value: any) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function DynamicFields({
  issueType,
  whenStarted,
  onWhenStartedChange,
  fields,
  onFieldChange,
  photos,
  onPhotosChange,
}: Props) {
  const fieldDefs = Config.chatbot.intakeFields[issueType] as IntakeFieldDefinition[];

  const renderField = (def: IntakeFieldDefinition) => {
    const value = fields[def.key];

    if (def.type === 'select' && def.options) {
      return (
        <View key={def.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {def.label}
            {def.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.chips}>
            {def.options.map((opt) => {
              const isSelected = value === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => onFieldChange(def.key, isSelected ? '' : opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    if (def.type === 'boolean') {
      return (
        <View key={def.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {def.label}
            {def.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.chips}>
            {['Yes', 'No'].map((opt) => {
              const boolVal = opt === 'Yes';
              const isSelected = value === boolVal;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => onFieldChange(def.key, boolVal)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    // text
    return (
      <View key={def.key} style={styles.fieldGroup}>
        <InputField
          label={`${def.label}${def.required ? ' *' : ''}`}
          value={value ?? ''}
          onChangeText={(text) => onFieldChange(def.key, text)}
          placeholder="Type here..."
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />
      </View>
    );
  };

  // Split into required first, then optional
  const requiredFields = fieldDefs.filter((f) => f.required);
  const optionalFields = fieldDefs.filter((f) => !f.required);

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          When did this start?<Text style={styles.required}> *</Text>
        </Text>
        <View style={styles.chips}>
          {WHEN_OPTIONS.map((opt) => {
            const isSelected = whenStarted === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => onWhenStartedChange(opt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {requiredFields.map(renderField)}
      {optionalFields.map(renderField)}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Photos (optional, max 3)</Text>
        <ImagePickerButton images={photos} onImagesChange={onPhotosChange} maxCount={3} />
      </View>
    </View>
  );
}

export function validateDynamicFields(
  issueType: IntakeIssueType,
  whenStarted: string,
  fields: Record<string, any>
): boolean {
  if (!whenStarted) return false;

  const fieldDefs = Config.chatbot.intakeFields[issueType] as IntakeFieldDefinition[];
  for (const def of fieldDefs) {
    if (!def.required) continue;
    const val = fields[def.key];
    if (val === undefined || val === null || val === '') return false;
  }
  return true;
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.base,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.grey700,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.error,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
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
});
