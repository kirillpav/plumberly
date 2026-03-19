import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing } from "@/constants/spacing";

export function AwaitingApprovalScreen() {
  const { signOut, session, fetchProfile, plumberDetails } = useAuthStore();
  const [identityLoading, setIdentityLoading] = useState(false);
  const [returnedFromIdentity, setReturnedFromIdentity] = useState(false);

  const handleRefresh = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  const handleStartIdentity = async () => {
    setIdentityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-identity-session');
      if (error) throw error;
      if (!data?.url) throw new Error('No verification URL returned');
      await Linking.openURL(data.url);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start identity verification');
    } finally {
      setIdentityLoading(false);
    }
  };

  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      const parsed = Linking.parse(event.url);
      if (parsed.queryParams?.identity === 'return') {
        setReturnedFromIdentity(true);
      }
    });
    return () => subscription.remove();
  }, []);

  const isFrozen = plumberDetails?.status === 'frozen';
  const isSuspended = plumberDetails?.status === 'suspended';
  const isAwaiting = !isFrozen && !isSuspended;

  const icon = isFrozen || isSuspended
    ? 'warning-outline'
    : returnedFromIdentity
      ? 'checkmark-circle-outline'
      : 'hourglass-outline';
  const iconColor = isFrozen || isSuspended
    ? Colors.error
    : returnedFromIdentity
      ? Colors.success
      : Colors.primary;

  const title = isFrozen
    ? 'Account Frozen'
    : isSuspended
      ? 'Account Suspended'
      : returnedFromIdentity
        ? 'Verification Submitted!'
        : 'Awaiting Approval';

  const subtitle = isFrozen
    ? plumberDetails?.frozen_reason
      ? `Your account has been frozen: ${plumberDetails.frozen_reason}. Please contact support for assistance.`
      : 'Your account has been frozen. Please contact support for assistance.'
    : isSuspended
      ? 'Your account has been suspended. Please contact support to resolve this issue.'
      : returnedFromIdentity
        ? 'Your identity verification has been submitted. Tap below to check your status.'
        : 'Your plumber account is being reviewed. Complete identity verification to speed up the approval process.';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, (isFrozen || isSuspended) && styles.iconWrapError, returnedFromIdentity && styles.iconWrapSuccess]}>
          <Ionicons name={icon} size={48} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {isAwaiting && !returnedFromIdentity && (
          <PrimaryButton
            title="Start Identity Check"
            onPress={handleStartIdentity}
            loading={identityLoading}
            style={styles.button}
          />
        )}
        {isAwaiting && (
          <PrimaryButton
            title={returnedFromIdentity ? "Refresh Status" : "Check Status"}
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
      </ScrollView>
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
    backgroundColor: Colors.errorBgAlt2,
  },
  iconWrapSuccess: {
    backgroundColor: Colors.successBg,
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
