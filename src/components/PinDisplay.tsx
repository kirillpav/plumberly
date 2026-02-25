import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useJobStore } from "@/store/jobStore";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, BorderRadius } from "@/constants/spacing";

interface PinDisplayProps {
  jobId: string;
  pinVerified: boolean;
}

export function PinDisplay({ jobId, pinVerified }: PinDisplayProps) {
  const { getJobPin } = useJobStore();
  const [pin, setPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pinVerified) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const result = await getJobPin(jobId);
        if (mounted) setPin(result);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [jobId, pinVerified]);

  if (pinVerified) {
    return (
      <View style={styles.verifiedCard}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <Text style={styles.verifiedText}>Customer has verified your arrival</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Arrival PIN</Text>
      <Text style={styles.instruction}>
        Share this PIN with the customer when you arrive on site
      </Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.md }} />
      ) : pin ? (
        <View style={styles.digitRow}>
          {pin.split("").map((digit, i) => (
            <View key={i} style={styles.digitBox}>
              <Text style={styles.digitText}>{digit}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.errorText}>Unable to load PIN</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    alignItems: "center",
  },
  heading: {
    ...Typography.h3,
    color: Colors.black,
    marginBottom: Spacing.xs,
  },
  instruction: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  digitRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  digitBox: {
    width: 52,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.lightBlue,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  verifiedCard: {
    backgroundColor: "#E8F9EE",
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  verifiedText: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: "600",
    flex: 1,
  },
});
