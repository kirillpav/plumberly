import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing } from "@/constants/spacing";

export function AwaitingApprovalScreen() {
  const { signOut, session, fetchProfile, plumberDetails } = useAuthStore();

  const handleRefresh = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  const isFrozen = plumberDetails?.status === 'frozen';
  const isSuspended = plumberDetails?.status === 'suspended';

  const icon = isFrozen || isSuspended ? 'warning-outline' : 'hourglass-outline';
  const iconColor = isFrozen || isSuspended ? Colors.error : Colors.primary;

  const title = isFrozen
    ? 'Account Frozen'
    : isSuspended
      ? 'Account Suspended'
      : 'Awaiting Approval';

  const subtitle = isFrozen
    ? plumberDetails?.frozen_reason
      ? `Your account has been frozen: ${plumberDetails.frozen_reason}. Please contact support for assistance.`
      : 'Your account has been frozen. Please contact support for assistance.'
    : isSuspended
      ? 'Your account has been suspended. Please contact support to resolve this issue.'
      : 'Your plumber account is being reviewed. We\'ll verify your details and approve your account shortly. Once approved, you\'ll have full access to receive enquiries and send quotes.';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, (isFrozen || isSuspended) && styles.iconWrapError]}>
          <Ionicons name={icon} size={48} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {!isFrozen && !isSuspended && (
          <PrimaryButton
            title="Check Status"
            onPress={handleRefresh}
            style={styles.button}
          />
        )}
        <PrimaryButton
          title="Sign Out"
          onPress={signOut}
          style={styles.signOutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  iconWrapError: {
    backgroundColor: '#FDECEA',
  },
  title: {
    ...Typography.h1,
    color: Colors.black,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  signOutButton: {
    width: "100%",
    backgroundColor: Colors.grey100,
  },
});
