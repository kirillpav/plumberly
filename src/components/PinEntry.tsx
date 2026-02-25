import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { useJobStore } from "@/store/jobStore";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, BorderRadius } from "@/constants/spacing";

interface PinEntryProps {
  jobId: string;
  pinVerified: boolean;
}

export function PinEntry({ jobId, pinVerified }: PinEntryProps) {
  const { verifyJobPin } = useJobStore();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  if (pinVerified) {
    return (
      <View style={styles.verifiedCard}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <Text style={styles.verifiedText}>Plumber arrival verified</Text>
      </View>
    );
  }

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    const digit = cleaned[cleaned.length - 1];
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);
    if (index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const pin = digits.join("");
    if (pin.length !== 4) {
      setError("Please enter all 4 digits");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const success = await verifyJobPin(jobId, pin);
      if (!success) {
        setError("Incorrect PIN. Please try again.");
        setDigits(["", "", "", ""]);
        refs.current[0]?.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Enter Plumber's PIN</Text>
      <Text style={styles.instruction}>
        Ask the plumber for their 4-digit arrival PIN
      </Text>
      <View style={styles.digitRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { refs.current[i] = r; }}
            style={[styles.digitInput, error ? styles.digitInputError : null]}
            value={d}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <PrimaryButton
        title="Verify PIN"
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: Spacing.md, width: "100%" }}
      />
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
  digitInput: {
    width: 52,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: Colors.black,
  },
  digitInputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.sm,
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
