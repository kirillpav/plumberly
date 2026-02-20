import type { IntakeIssueType, IntakeData } from '@/types/index';

const DISPLAY_NAMES: Record<IntakeIssueType, string> = {
  leak: 'Water Leak',
  clog: 'Blocked Drain',
  toilet: 'Toilet Issue',
  faucet: 'Faucet Problem',
  low_pressure: 'Low Water Pressure',
  no_hot_water: 'No Hot Water',
  smell: 'Bad Smell',
  other: 'Other Issue',
};

const ICONS: Record<IntakeIssueType, string> = {
  leak: 'water-outline',
  clog: 'funnel-outline',
  toilet: 'tablet-portrait-outline',
  faucet: 'build-outline',
  low_pressure: 'speedometer-outline',
  no_hot_water: 'flame-outline',
  smell: 'alert-circle-outline',
  other: 'ellipsis-horizontal-outline',
};

const PROBLEM_TYPE_MAP: Record<IntakeIssueType, string> = {
  leak: 'Leak',
  clog: 'Blocked Drain',
  toilet: 'Other',
  faucet: 'Fixture Installation',
  low_pressure: 'Low Water Pressure',
  no_hot_water: 'Boiler Issue',
  smell: 'Other',
  other: 'Other',
};

export function issueTypeToDisplayName(type: IntakeIssueType): string {
  return DISPLAY_NAMES[type] ?? 'Other Issue';
}

export function issueTypeToIcon(type: IntakeIssueType): string {
  return ICONS[type] ?? 'help-circle-outline';
}

export function generateIntakeSummary(data: IntakeData): string {
  const lines = [
    `Issue: ${issueTypeToDisplayName(data.issueType)}`,
    `Started: ${data.whenStarted}`,
  ];

  for (const [key, value] of Object.entries(data.fields)) {
    if (value !== undefined && value !== null && value !== '') {
      const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
      lines.push(`${key.replace(/_/g, ' ')}: ${display}`);
    }
  }

  if (data.photos.length > 0) {
    lines.push(`Photos: ${data.photos.length} attached`);
  }

  return lines.join('\n');
}

export function generateDescription(data: IntakeData): string {
  const parts = [
    `${issueTypeToDisplayName(data.issueType)} - started ${data.whenStarted.toLowerCase()}.`,
  ];

  for (const [key, value] of Object.entries(data.fields)) {
    if (value !== undefined && value !== null && value !== '') {
      const label = key.replace(/_/g, ' ');
      const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
      parts.push(`${label}: ${display}`);
    }
  }

  return parts.join(' ');
}

export function issueTypeToProblemType(type: IntakeIssueType): string {
  return PROBLEM_TYPE_MAP[type] ?? 'Other';
}
