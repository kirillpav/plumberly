import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "@/components/shared/ScreenWrapper";
import { Avatar } from "@/components/shared/Avatar";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { SecondaryButton } from "@/components/shared/SecondaryButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ChatBubble } from "@/components/ChatBubble";
import { CompletionIndicator } from "@/components/CompletionIndicator";
import { useJobStore } from "@/store/jobStore";
import { useEnquiryStore } from "@/store/enquiryStore";
import { useAuthStore } from "@/store/authStore";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, BorderRadius } from "@/constants/spacing";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import type { CustomerStackParamList } from "@/types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Enquiry, Job, ChatMessage } from "@/types/index";

type JobWithPlumber = Job & {
  plumber?: { full_name: string; avatar_url: string | null };
};

const statusColors: Record<string, string> = {
  new: Colors.statusNew,
  accepted: Colors.statusAccepted,
  in_progress: Colors.primary,
  completed: Colors.statusCompleted,
};

export function EnquiryDetailScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const route = useRoute<RouteProp<CustomerStackParamList, "EnquiryDetail">>();
  const { enquiryId } = route.params;
  const { acceptQuote, updateJobStatus, confirmJobDone } = useJobStore();
  const { deleteEnquiry } = useEnquiryStore();
  const profile = useAuthStore((s) => s.profile);
  const unreadCounts = useUnreadCounts();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [allJobs, setAllJobs] = useState<JobWithPlumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    const { data: enq } = await supabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .single();
    setEnquiry(enq as unknown as Enquiry);

    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*, plumber:profiles!plumber_id(full_name, avatar_url)")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false });

    setAllJobs((jobsData ?? []) as unknown as JobWithPlumber[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const jobChannel = supabase
      .channel(`cust-enq-jobs-${enquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `enquiry_id=eq.${enquiryId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    const enqChannel = supabase
      .channel(`cust-enq-detail-${enquiryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enquiries",
          filter: `id=eq.${enquiryId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(enqChannel);
    };
  }, [enquiryId]);

  // Derive job categories
  const activeJob = allJobs.find(
    (j) => j.status === "in_progress" || j.status === "completed",
  );
  const quotedJobs = allJobs.filter((j) => j.status === "quoted");
  const pendingJobs = allJobs.filter((j) => j.status === "pending");
  const declinedJobs = allJobs.filter((j) => j.status === "declined");

  const handleAcceptQuote = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await acceptQuote(jobId);
      await loadData();
      Alert.alert(
        "Job Started",
        "You have accepted the quote. The plumber has been notified and the job is now in progress.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to accept quote.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineQuote = async (job: JobWithPlumber) => {
    Alert.alert(
      "Decline Quote",
      "The plumber will be notified and can send a revised quote.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setActionLoading(job.id);
            try {
              await updateJobStatus(job.id, "declined");
              await loadData();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to decline quote.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleConfirmDone = async () => {
    if (!activeJob) return;
    setActionLoading(activeJob.id);
    try {
      await confirmJobDone(activeJob.id, "customer");
      await loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to confirm completion.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = () => {
    if (!enquiry || !profile?.id) return;
    Alert.alert(
      "Delete Enquiry",
      "Are you sure you want to delete this enquiry? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading("delete");
            try {
              await deleteEnquiry(enquiry.id, profile.id);
              nav.goBack();
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to delete enquiry.");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingSpinner />;
  if (!enquiry) return null;

  const transcript = enquiry.chatbot_transcript as ChatMessage[] | null;
  const hasNoActiveJobs = allJobs.every((j) => j.status === "cancelled");
  const canDelete = allJobs.length === 0 || hasNoActiveJobs;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <Text style={styles.title}>{enquiry.title}</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: statusColors[enquiry.status] ?? Colors.grey500,
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {enquiry.status.replace("_", " ")}
            </Text>
          </View>
        </View>

        {enquiry.description ? (
          <Text style={styles.description}>{enquiry.description}</Text>
        ) : null}

        <View style={styles.detailsRow}>
          {enquiry.region && (
            <View style={styles.detailChip}>
              <Ionicons
                name="location-outline"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.detailChipText}>{enquiry.region} London</Text>
            </View>
          )}
          {enquiry.preferred_date &&
            !enquiry.preferred_time?.some((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)) && (
            <View style={styles.detailChip}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.detailChipText}>
                {formatDate(enquiry.preferred_date)}
              </Text>
            </View>
          )}
          {enquiry.preferred_time?.length > 0 &&
            enquiry.preferred_time.map((slot) => (
              <View key={slot} style={styles.detailChip}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.detailChipText}>
                  {/^\d{4}-\d{2}-\d{2}$/.test(slot) ? formatDate(slot) : slot}
                </Text>
              </View>
            ))}
        </View>

        {/* Active job (in_progress or completed) — single plumber chosen */}
        {activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Plumber</Text>
            <View style={styles.plumberCardAccepted}>
              <View style={styles.acceptedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.white} />
                <Text style={styles.acceptedBadgeText}>Quote Accepted</Text>
              </View>
              <View style={styles.plumberCardRow}>
                <Avatar
                  uri={activeJob.plumber?.avatar_url}
                  name={activeJob.plumber?.full_name}
                  size="md"
                />
                <View style={styles.plumberInfo}>
                  <Text style={styles.plumberName}>
                    {activeJob.plumber?.full_name}
                  </Text>
                  {activeJob.quote_amount != null && (
                    <Text style={styles.quoteAmountAccepted}>
                      {formatCurrency(activeJob.quote_amount)}
                    </Text>
                  )}
                  {activeJob.scheduled_date && (
                    <View style={styles.quoteTimeBadgeInline}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.statusCompleted} />
                      <Text style={[styles.quoteTimeTextInline, { color: Colors.statusCompleted }]}>
                        {formatDate(activeJob.scheduled_date)}
                      </Text>
                    </View>
                  )}
                  {activeJob.scheduled_time && (
                    <View style={styles.quoteTimeBadgeInline}>
                      <Ionicons name="time-outline" size={12} color={Colors.statusCompleted} />
                      <Text style={[styles.quoteTimeTextInline, { color: Colors.statusCompleted }]}>
                        {activeJob.scheduled_time}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {activeJob.quote_description && (
              <View style={styles.quoteDescriptionBox}>
                <Text style={styles.quoteDescriptionLabel}>What's included:</Text>
                <Text style={styles.quoteDescriptionText}>{activeJob.quote_description}</Text>
              </View>
            )}

            {(activeJob.status === "accepted" || activeJob.status === "in_progress") && (
              <TouchableOpacity
                style={styles.messageCard}
                activeOpacity={0.7}
                onPress={() =>
                  nav.navigate("ChatJob", {
                    jobId: activeJob.id,
                    otherPartyName: activeJob.plumber?.full_name || "Plumber",
                  })
                }
              >
                <View style={styles.messageCardInner}>
                  <View style={styles.messageIconWrap}>
                    <Ionicons
                      name="chatbubbles"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.messageCardTextWrap}>
                    <Text style={styles.messageCardTitle}>Message Plumber</Text>
                    <Text style={styles.messageCardSub}>
                      Chat with {activeJob.plumber?.full_name || "the plumber"}
                    </Text>
                  </View>
                  {(unreadCounts[activeJob.id] ?? 0) > 0 ? (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>
                        {unreadCounts[activeJob.id]}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={Colors.grey300}
                    />
                  )}
                </View>
              </TouchableOpacity>
            )}

            {(activeJob.status === "in_progress" || activeJob.status === "completed") && (
              <View style={styles.completionSection}>
                <CompletionIndicator
                  customerConfirmed={activeJob.customer_confirmed}
                  plumberConfirmed={activeJob.plumber_confirmed}
                  viewerRole="customer"
                />
                {activeJob.status === "in_progress" &&
                  !activeJob.customer_confirmed && (
                    <PrimaryButton
                      title="Confirm Job Done"
                      onPress={handleConfirmDone}
                      loading={actionLoading === activeJob.id}
                    />
                  )}
                {activeJob.status === "in_progress" &&
                  activeJob.customer_confirmed &&
                  !activeJob.plumber_confirmed && (
                    <View style={styles.waitingBanner}>
                      <Ionicons
                        name="hourglass-outline"
                        size={18}
                        color={Colors.primary}
                      />
                      <Text style={styles.waitingText}>
                        Waiting for the plumber to confirm completion
                      </Text>
                    </View>
                  )}
              </View>
            )}
          </View>
        )}

        {/* Quoted jobs — multiple quotes to review */}
        {!activeJob && quotedJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Quotes Received ({quotedJobs.length})
            </Text>
            {quotedJobs.map((job) => (
              <View key={job.id} style={styles.quoteCard}>
                <View style={styles.quoteCardHeader}>
                  <Avatar
                    uri={job.plumber?.avatar_url}
                    name={job.plumber?.full_name}
                    size="md"
                  />
                  <View style={styles.plumberInfo}>
                    <Text style={styles.plumberName}>
                      {job.plumber?.full_name}
                    </Text>
                    {job.scheduled_date && (
                      <View style={styles.quoteTimeBadgeInline}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={Colors.primary}
                        />
                        <Text style={styles.quoteTimeTextInline}>
                          {formatDate(job.scheduled_date)}
                        </Text>
                      </View>
                    )}
                    {job.scheduled_time && (
                      <View style={styles.quoteTimeBadgeInline}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={Colors.primary}
                        />
                        <Text style={styles.quoteTimeTextInline}>
                          {job.scheduled_time}
                        </Text>
                      </View>
                    )}
                  </View>
                  {job.quote_amount != null && (
                    <Text style={styles.quoteCardPrice}>
                      {formatCurrency(job.quote_amount)}
                    </Text>
                  )}
                </View>
                {job.quote_description && (
                  <View style={styles.quoteDescriptionBox}>
                    <Text style={styles.quoteDescriptionLabel}>What's included:</Text>
                    <Text style={styles.quoteDescriptionText}>{job.quote_description}</Text>
                  </View>
                )}
                <View style={styles.quoteButtons}>
                  <View style={styles.quoteButtonWrap}>
                    <SecondaryButton
                      title="Decline"
                      onPress={() => handleDeclineQuote(job)}
                    />
                  </View>
                  <View style={styles.quoteButtonWrap}>
                    <PrimaryButton
                      title="Accept"
                      onPress={() => handleAcceptQuote(job.id)}
                      loading={actionLoading === job.id}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending jobs — plumbers still preparing quotes */}
        {!activeJob && pendingJobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.pendingBanner}>
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={Colors.warning}
              />
              <Text style={styles.pendingText}>
                {pendingJobs.length} plumber
                {pendingJobs.length !== 1 ? "s" : ""} preparing{" "}
                {pendingJobs.length !== 1 ? "quotes" : "a quote"}
              </Text>
            </View>
          </View>
        )}

        {/* Declined jobs */}
        {!activeJob && declinedJobs.length > 0 && (
          <View style={styles.section}>
            {declinedJobs.map((job) => (
              <View key={job.id} style={styles.declinedBanner}>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={Colors.error}
                />
                <Text style={styles.declinedText}>
                  You declined {job.plumber?.full_name}'s quote of{" "}
                  {job.quote_amount != null
                    ? formatCurrency(job.quote_amount)
                    : "—"}
                  . They may send a revised offer.
                </Text>
              </View>
            ))}
          </View>
        )}

        {enquiry.images?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.imageRow}>
              {enquiry.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.image} />
              ))}
            </View>
          </View>
        )}

        {transcript && transcript.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chat Transcript</Text>
            <View style={styles.transcriptContainer}>
              {transcript.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  content={msg.content}
                  role={msg.role as "user" | "assistant"}
                  compact
                />
              ))}
            </View>
          </View>
        )}

        {canDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            disabled={actionLoading !== null}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Delete Enquiry</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: Spacing.base, marginTop: Spacing.sm },
  backText: { ...Typography.body, color: Colors.primary },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.black,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.white,
    textTransform: "capitalize",
  },
  description: {
    ...Typography.body,
    color: Colors.grey700,
    marginBottom: Spacing.base,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.button,
  },
  detailChipText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "500",
  },
  section: { marginTop: Spacing.xl },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  plumberCardAccepted: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.success,
    overflow: "hidden",
  },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  acceptedBadgeText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: "700",
  },
  plumberCardRow: {
    flexDirection: "row",
    padding: Spacing.base,
    gap: Spacing.md,
    alignItems: "center",
  },
  plumberInfo: { flex: 1 },
  plumberName: { ...Typography.label, color: Colors.black },
  quoteAmountAccepted: {
    ...Typography.h3,
    color: Colors.success,
    fontWeight: "700",
    marginTop: 2,
  },
  quoteCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  quoteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quoteCardPrice: {
    ...Typography.h2,
    color: Colors.primary,
    fontWeight: "700",
  },
  quoteDescriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quoteDescriptionLabel: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.xs,
  },
  quoteDescriptionText: {
    ...Typography.bodySmall,
    color: Colors.grey700,
  },
  quoteTimeBadgeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  quoteTimeTextInline: { ...Typography.caption, color: Colors.primary },
  quoteButtons: { flexDirection: "row", gap: Spacing.md },
  quoteButtonWrap: { flex: 1 },
  pendingBanner: {
    backgroundColor: "#FFF8EB",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pendingText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: "600",
    flex: 1,
  },
  declinedBanner: {
    backgroundColor: "#FEECEB",
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  declinedText: { ...Typography.bodySmall, color: Colors.error, flex: 1 },
  waitingBanner: {
    backgroundColor: Colors.lightBlue,
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  waitingText: { ...Typography.bodySmall, color: Colors.primary, flex: 1 },
  completionSection: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  imageRow: { flexDirection: "row", gap: Spacing.md },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
  transcriptContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    marginTop: Spacing.xl,
  },
  deleteBtnText: {
    ...Typography.label,
    color: Colors.error,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  messageCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  messageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  messageCardTextWrap: {
    flex: 1,
  },
  messageCardTitle: {
    ...Typography.label,
    color: Colors.black,
    fontWeight: "600",
  },
  messageCardSub: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: 1,
  },
  unreadDot: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadDotText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: "700",
  },
  spacer: { height: Spacing.xxl },
});
