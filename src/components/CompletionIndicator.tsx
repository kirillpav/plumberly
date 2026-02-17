import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  customerConfirmed: boolean;
  plumberConfirmed: boolean;
  viewerRole: 'customer' | 'plumber';
}

export function CompletionIndicator({ customerConfirmed, plumberConfirmed, viewerRole }: Props) {
  const bothDone = customerConfirmed && plumberConfirmed;
  const confirmCount = (customerConfirmed ? 1 : 0) + (plumberConfirmed ? 1 : 0);

  return (
    <View style={styles.container}>
      <View style={styles.circleRow}>
        <View style={styles.circleContainer}>
          <View style={styles.circleBase}>
            {/* Left half — customer */}
            <View style={[styles.half, styles.halfLeft, customerConfirmed && styles.halfConfirmed]} />
            {/* Right half — plumber */}
            <View style={[styles.half, styles.halfRight, plumberConfirmed && styles.halfConfirmed]} />
            {/* Divider line */}
            {!bothDone && <View style={styles.divider} />}
            {/* Center icon */}
            <View style={styles.centerIcon}>
              {bothDone ? (
                <Ionicons name="checkmark-circle" size={32} color={Colors.white} />
              ) : (
                <Text style={styles.countText}>{confirmCount}/2</Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.statusLabel, bothDone && styles.statusLabelDone]}>
        {bothDone ? 'Job Complete' : 'Awaiting Confirmation'}
      </Text>

      <View style={styles.parties}>
        <PartyRow
          label={viewerRole === 'customer' ? 'You' : 'Customer'}
          confirmed={customerConfirmed}
        />
        <PartyRow
          label={viewerRole === 'plumber' ? 'You' : 'Plumber'}
          confirmed={plumberConfirmed}
        />
      </View>
    </View>
  );
}

function PartyRow({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <View style={styles.partyRow}>
      <View style={[styles.partyDot, confirmed && styles.partyDotConfirmed]}>
        {confirmed && <Ionicons name="checkmark" size={12} color={Colors.white} />}
      </View>
      <Text style={[styles.partyLabel, confirmed && styles.partyLabelConfirmed]}>
        {label}
      </Text>
      <Text style={[styles.partyStatus, confirmed && styles.partyStatusConfirmed]}>
        {confirmed ? 'Confirmed' : 'Pending'}
      </Text>
    </View>
  );
}

const CIRCLE_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    alignItems: 'center',
  },
  circleRow: {
    marginBottom: Spacing.md,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  circleBase: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: Colors.grey100,
    flexDirection: 'row',
  },
  half: {
    width: CIRCLE_SIZE / 2,
    height: CIRCLE_SIZE,
    backgroundColor: Colors.grey300,
  },
  halfLeft: {
    borderTopLeftRadius: CIRCLE_SIZE / 2,
    borderBottomLeftRadius: CIRCLE_SIZE / 2,
  },
  halfRight: {
    borderTopRightRadius: CIRCLE_SIZE / 2,
    borderBottomRightRadius: CIRCLE_SIZE / 2,
  },
  halfConfirmed: {
    backgroundColor: Colors.success,
  },
  divider: {
    position: 'absolute',
    left: CIRCLE_SIZE / 2 - 0.5,
    top: 8,
    bottom: 8,
    width: 1,
    backgroundColor: Colors.white,
    zIndex: 1,
  },
  centerIcon: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  countText: {
    ...Typography.label,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  statusLabel: {
    ...Typography.label,
    color: Colors.grey500,
    marginBottom: Spacing.md,
  },
  statusLabelDone: {
    color: Colors.success,
    fontWeight: '600',
  },
  parties: {
    width: '100%',
    gap: Spacing.sm,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  partyDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyDotConfirmed: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  partyLabel: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    flex: 1,
  },
  partyLabelConfirmed: {
    color: Colors.black,
  },
  partyStatus: {
    ...Typography.caption,
    color: Colors.grey500,
  },
  partyStatusConfirmed: {
    color: Colors.success,
    fontWeight: '600',
  },
});
