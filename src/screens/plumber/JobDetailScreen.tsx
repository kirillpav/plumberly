import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { ScreenWrapper } from "@/components/shared/ScreenWrapper";
import { Avatar } from "@/components/shared/Avatar";
import { InputField } from "@/components/shared/InputField";
import { PrimaryButton } from "@/components/shared/PrimaryButton";
import { ChatBubble } from "@/components/ChatBubble";
import { CompletionIndicator } from "@/components/CompletionIndicator";
import { PinDisplay } from "@/components/PinDisplay";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useJobStore } from "@/store/jobStore";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { Spacing, BorderRadius } from "@/constants/spacing";
import { formatDate } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import { addJobToCalendar } from "@/lib/calendarExport";
import type { PlumberStackParamList } from "@/types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { Job, Enquiry, UserProfile, ChatMessage } from "@/types/index";

export function JobDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<PlumberStackParamList>>();
  const route = useRoute<RouteProp<PlumberStackParamList, "JobDetail">>();
  const { jobId } = route.params;
  const { submitQuote, confirmJobDone, updateJobStatus } = useJobStore();
  const unreadCounts = useUnreadCounts();

  const [job, setJob] = useState<Job | null>(null);
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [quoteInput, setQuoteInput] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [timeOption, setTimeOption] = useState<"morning" | "afternoon" | "evening" | "custom" | "flexible" | "">("");
  const [customTime, setCustomTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Available dates from enquiry's preferred_time (repurposed to store date strings)
  const availableDates = (enquiry?.preferred_time ?? []).filter((d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d)
  );
  // Legacy time slots (e.g. "Morning (8am-12pm)") from older enquiries
  const legacyTimeSlots = (enquiry?.preferred_time ?? []).filter(
    (d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)
  );

  const loadData = async () => {
    const { data: j } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (j) {
      setJob(j as unknown as Job);
      const { data: enq } = await supabase
        .from("enquiries")
        .select("*")
        .eq("id", j.enquiry_id)
        .single();
      setEnquiry(enq as unknown as Enquiry);

      const { data: cust } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", j.customer_id)
        .single();
      setCustomer(cust as unknown as UserProfile);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const jobChannel = supabase
      .channel(`plumber-job-detail-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, [jobId]);

  const handleSubmitQuote = async () => {
    if (!job) return;
    const amount = parseFloat(quoteInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid", "Please enter a valid quote amount.");
      return;
    }
    if (!quoteDescription.trim()) {
      Alert.alert("Description Required", "Please describe what's included in your quote.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Date Required", "Please select a day for the job.");
      return;
    }
    if (timeOption === "custom" && !customTime.trim()) {
      Alert.alert("Time Required", "Please enter a custom time.");
      return;
    }
    const timeLabels: Record<string, string> = {
      morning: "Morning (8am–12pm)",
      afternoon: "Afternoon (12pm–5pm)",
      evening: "Evening (5pm–8pm)",
      flexible: "Flexible – agree in chat",
    };
    const resolvedTime = timeOption === "custom"
      ? customTime.trim()
      : timeOption
        ? timeLabels[timeOption]
        : undefined;
    setActionLoading(true);
    try {
      await submitQuote(job.id, amount, quoteDescription.trim(), selectedDate || undefined, resolvedTime);
      setJob({
        ...job,
        status: "quoted",
        quote_amount: amount,
        quote_description: quoteDescription.trim(),
        scheduled_date: selectedDate || job.scheduled_date,
        scheduled_time: resolvedTime ?? null,
      });
      Alert.alert(
        "Quote Sent",
        "The customer has been notified. You will be updated when they respond.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDone = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await confirmJobDone(job.id, "plumber");
      setJob({ ...job, plumber_confirmed: true });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = () => {
    if (!job) return;
    Alert.alert(
      "Remove Listing",
      "This will remove the job from your list. You won't be able to requote.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await updateJobStatus(job.id, "cancelled");
              nav.goBack();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const isOtherDate = selectedDate !== "" && !availableDates.includes(selectedDate);

  const renderDatePicker = () => (
    <View style={styles.timePickerSection}>
      <Text style={styles.timePickerLabel}>Select a day for the job</Text>
      <View style={styles.chipRow}>
        {availableDates.map((d) => {
          const isSelected = selectedDate === d;
          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.selectableChip,
                isSelected && styles.selectableChipActive,
              ]}
              onPress={() => { setSelectedDate(isSelected ? "" : d); setShowCalendar(false); }}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isSelected ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.selectableChipText,
                  isSelected && styles.selectableChipTextActive,
                ]}
              >
                {formatDate(d)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[
            styles.selectableChip,
            isOtherDate && styles.selectableChipActive,
          ]}
          onPress={() => {
            if (isOtherDate) {
              setSelectedDate("");
              setShowCalendar(false);
            } else {
              setShowCalendar((v) => !v);
            }
          }}
        >
          <Ionicons
            name="calendar"
            size={14}
            color={isOtherDate ? Colors.white : Colors.primary}
          />
          <Text
            style={[
              styles.selectableChipText,
              isOtherDate && styles.selectableChipTextActive,
            ]}
          >
            {isOtherDate ? formatDate(selectedDate) : "Other date"}
          </Text>
        </TouchableOpacity>
      </View>
      {showCalendar && (
        <Calendar
          onDayPress={(day: { dateString: string }) => {
            setSelectedDate(day.dateString);
            setShowCalendar(false);
          }}
          markedDates={
            isOtherDate
              ? { [selectedDate]: { selected: true, selectedColor: Colors.primary } }
              : {}
          }
          minDate={new Date().toISOString().split("T")[0]}
          theme={{
            todayTextColor: Colors.primary,
            arrowColor: Colors.primary,
            textDayFontFamily: "Inter-Regular",
            textMonthFontFamily: "Inter-SemiBold",
            textDayHeaderFontFamily: "Inter-Medium",
          }}
          style={styles.calendar}
        />
      )}
    </View>
  );

  const renderTimePicker = () => (
    <View style={styles.timePickerSection}>
      <Text style={styles.timePickerLabel}>Proposed time</Text>
      <View style={styles.chipRow}>
        {(["morning", "afternoon", "evening"] as const).map((opt) => {
          const labels = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
          const isSelected = timeOption === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.selectableChip, isSelected && styles.selectableChipActive]}
              onPress={() => { setTimeOption(isSelected ? "" : opt); setCustomTime(""); }}
            >
              <Ionicons name="time-outline" size={14} color={isSelected ? Colors.white : Colors.primary} />
              <Text style={[styles.selectableChipText, isSelected && styles.selectableChipTextActive]}>
                {labels[opt]}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.selectableChip, timeOption === "custom" && styles.selectableChipActive]}
          onPress={() => { setTimeOption(timeOption === "custom" ? "" : "custom"); }}
        >
          <Ionicons name="create-outline" size={14} color={timeOption === "custom" ? Colors.white : Colors.primary} />
          <Text style={[styles.selectableChipText, timeOption === "custom" && styles.selectableChipTextActive]}>
            Custom
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectableChip, timeOption === "flexible" && styles.selectableChipActive]}
          onPress={() => { setTimeOption(timeOption === "flexible" ? "" : "flexible"); setCustomTime(""); }}
        >
          <Ionicons name="chatbubbles-outline" size={14} color={timeOption === "flexible" ? Colors.white : Colors.primary} />
          <Text style={[styles.selectableChipText, timeOption === "flexible" && styles.selectableChipTextActive]}>
            Flexible
          </Text>
        </TouchableOpacity>
      </View>
      {timeOption === "custom" && (
        <InputField
          label=""
          value={customTime}
          onChangeText={setCustomTime}
          placeholder="e.g. 10:00 AM, or 2–4pm"
        />
      )}
      {timeOption === "flexible" && (
        <Text style={styles.flexibleHint}>
          You can agree on a specific time with the customer in chat after the quote is accepted.
        </Text>
      )}
    </View>
  );

  if (loading) return <LoadingSpinner />;
  if (!job) return null;

  const transcript = enquiry?.chatbot_transcript as ChatMessage[] | null;

  const showCompletionSection =
    job.status === "in_progress" || job.status === "completed";

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Job Details</Text>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerRow}>
            <Avatar
              uri={customer?.avatar_url}
              name={customer?.full_name}
              size="md"
            />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer?.full_name}</Text>
              <Text style={styles.customerEmail}>{customer?.email}</Text>
              {customer?.phone && (
                <Text style={styles.customerPhone}>{customer.phone}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Job Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Job Summary</Text>
          <Text style={styles.issueTitle}>{enquiry?.title}</Text>
          {enquiry?.description ? (
            <Text style={styles.description}>{enquiry.description}</Text>
          ) : null}
          {enquiry?.region && (
            <Text style={styles.meta}>Region: {enquiry.region}</Text>
          )}
          {availableDates.length > 0 ? (
            <View style={styles.chipRow}>
              <Text style={styles.meta}>Customer available days:</Text>
              {availableDates.map((d) => (
                <View key={d} style={styles.infoChip}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoChipText}>{formatDate(d)}</Text>
                </View>
              ))}
            </View>
          ) : enquiry?.preferred_date ? (
            <Text style={styles.meta}>
              Date: {formatDate(enquiry.preferred_date)}
            </Text>
          ) : null}
          {legacyTimeSlots.length > 0 && (
            <View style={styles.chipRow}>
              <Text style={styles.meta}>Customer availability:</Text>
              {legacyTimeSlots.map((slot) => (
                <View key={slot} style={styles.infoChip}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={Colors.primary}
                  />
                  <Text style={styles.infoChipText}>{slot}</Text>
                </View>
              ))}
            </View>
          )}
          {job.quote_amount != null && (
            <Text style={styles.quoteDisplay}>
              Quote: {formatCurrency(job.quote_amount)}
            </Text>
          )}
          {job.quote_description && (
            <Text style={styles.quoteDescriptionText}>
              Includes: {job.quote_description}
            </Text>
          )}
          {job.scheduled_date && (
            <View style={[styles.infoChip, { marginTop: Spacing.xs }]}>
              <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
              <Text style={styles.infoChipText}>
                {formatDate(job.scheduled_date)}
              </Text>
            </View>
          )}
          {job.scheduled_time && (
            <View style={[styles.infoChip, { marginTop: Spacing.xs }]}>
              <Ionicons name="time-outline" size={12} color={Colors.primary} />
              <Text style={styles.infoChipText}>
                {job.scheduled_time}
              </Text>
            </View>
          )}
          <Text style={styles.statusText}>
            Status: {job.status.replace("_", " ")}
          </Text>
        </View>

        {/* Images */}
        {enquiry?.images && enquiry.images.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.imageRow}>
              {enquiry.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.image} />
              ))}
            </View>
          </View>
        )}

        {/* Message Customer */}
        {(job.status === "accepted" || job.status === "in_progress") && (
          <TouchableOpacity
            style={styles.messageCard}
            activeOpacity={0.7}
            onPress={() =>
              nav.navigate("ChatJob", {
                jobId: job.id,
                otherPartyName: customer?.full_name || "Customer",
              })
            }
          >
            <View style={styles.messageCardInner}>
              <View style={styles.messageIconWrap}>
                <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
              </View>
              <View style={styles.messageCardText}>
                <Text style={styles.messageCardTitle}>Message Customer</Text>
                <Text style={styles.messageCardSub}>
                  Chat with {customer?.full_name || "the customer"}
                </Text>
              </View>
              {(unreadCounts[job.id] ?? 0) > 0 ? (
                <View style={styles.unreadDot}>
                  <Text style={styles.unreadDotText}>
                    {unreadCounts[job.id]}
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

        {/* Add to Calendar */}
        {(job.status === "accepted" || job.status === "in_progress") && (
          <TouchableOpacity
            style={styles.messageCard}
            activeOpacity={0.7}
            onPress={async () => {
              const ok = await addJobToCalendar(job, enquiry, customer);
              if (ok) {
                Alert.alert("Added", "Job has been added to your calendar.");
              }
            }}
          >
            <View style={styles.messageCardInner}>
              <View style={styles.messageIconWrap}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.messageCardText}>
                <Text style={styles.messageCardTitle}>Add to Calendar</Text>
                <Text style={styles.messageCardSub}>
                  Export this job to your device calendar
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.grey300}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Chat History */}
        {transcript && transcript.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chat History</Text>
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

        {/* Quote Input */}
        {job.status === "pending" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Submit Your Quote</Text>

            <InputField
              label="Quote Amount (GBP)"
              value={quoteInput}
              onChangeText={setQuoteInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 150.00"
            />

            <InputField
              label="What's included in this price?"
              value={quoteDescription}
              onChangeText={setQuoteDescription}
              placeholder="e.g. Labour, parts, call-out fee. Any extras will be quoted separately."
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: "top" }}
            />

            {renderDatePicker()}

            {renderTimePicker()}

            <PrimaryButton
              title="Submit Quote"
              onPress={handleSubmitQuote}
              loading={actionLoading}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}

        {/* Not selected banner */}
        {job.status === "cancelled" && job.notes === "not_selected" && (
          <View style={styles.notSelectedCard}>
            <View style={styles.notSelectedHeader}>
              <View style={styles.notSelectedIconWrap}>
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={Colors.grey500}
                />
              </View>
              <View style={styles.notSelectedHeaderText}>
                <Text style={styles.notSelectedTitle}>
                  Another plumber was selected
                </Text>
                <Text style={styles.notSelectedSubtitle}>
                  The customer chose a different plumber for this job.
                </Text>
              </View>
            </View>
            {job.quote_amount != null && (
              <Text style={styles.notSelectedQuote}>
                Your quote: {formatCurrency(job.quote_amount)}
              </Text>
            )}
          </View>
        )}

        {/* Waiting for customer banner */}
        {(job.status === "quoted" || job.status === "accepted") && (
          <View style={styles.waitingBanner}>
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.waitingText}>
              {job.status === "quoted"
                ? "Quote sent — waiting for the customer to accept"
                : "Customer accepted — job starting soon"}
            </Text>
          </View>
        )}

        {/* Declined — requote or dismiss */}
        {job.status === "declined" && (
          <View style={styles.declinedCard}>
            <View style={styles.declinedHeader}>
              <View style={styles.declinedIconWrap}>
                <Ionicons name="close-circle" size={18} color={Colors.error} />
              </View>
              <View style={styles.declinedHeaderText}>
                <Text style={styles.declinedTitle}>Quote Declined</Text>
                <Text style={styles.declinedSubtitle}>
                  Your quote of{" "}
                  {job.quote_amount != null
                    ? formatCurrency(job.quote_amount)
                    : "—"}{" "}
                  was declined
                </Text>
              </View>
            </View>

            <InputField
              label="New Quote Amount (GBP)"
              value={quoteInput}
              onChangeText={setQuoteInput}
              keyboardType="decimal-pad"
              placeholder={
                job.quote_amount != null
                  ? `Previously ${formatCurrency(job.quote_amount)}`
                  : "e.g. 120.00"
              }
            />

            <InputField
              label="What's included in this price?"
              value={quoteDescription}
              onChangeText={setQuoteDescription}
              placeholder="e.g. Labour, parts, call-out fee. Any extras will be quoted separately."
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: "top" }}
            />

            {renderDatePicker()}

            {renderTimePicker()}

            <PrimaryButton
              title="Send Revised Quote"
              onPress={handleSubmitQuote}
              loading={actionLoading}
              style={{ marginTop: Spacing.sm }}
            />

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={handleDismiss}
              disabled={actionLoading}
              activeOpacity={0.6}
            >
              <Ionicons
                name="eye-off-outline"
                size={16}
                color={Colors.grey500}
              />
              <Text style={styles.dismissBtnText}>Don't show this listing</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completion confirmation */}
        {showCompletionSection && (
          <View style={styles.completionSection}>
            {job.status === "in_progress" && (
              <PinDisplay jobId={job.id} pinVerified={job.pin_verified} />
            )}
            <CompletionIndicator
              customerConfirmed={job.customer_confirmed}
              plumberConfirmed={job.plumber_confirmed}
              viewerRole="plumber"
            />
            {job.status === "in_progress" && !job.plumber_confirmed && job.pin_verified && (
              <PrimaryButton
                title="Confirm Job Done"
                onPress={handleConfirmDone}
                loading={actionLoading}
              />
            )}
            {job.status === "in_progress" && !job.pin_verified && (
              <View style={styles.waitingBanner}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.waitingText}>
                  Share the PIN with the customer to unlock job completion
                </Text>
              </View>
            )}
            {job.status === "in_progress" &&
              job.plumber_confirmed &&
              !job.customer_confirmed && (
                <View style={styles.waitingBanner}>
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={styles.waitingText}>
                    Waiting for the customer to confirm completion
                  </Text>
                </View>
              )}
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: Spacing.base, marginTop: Spacing.sm },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  customerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  customerInfo: { flex: 1 },
  customerName: { ...Typography.label, color: Colors.black },
  customerEmail: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginTop: 2,
  },
  customerPhone: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginTop: 2,
  },
  issueTitle: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.grey700,
    marginBottom: Spacing.sm,
  },
  meta: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginBottom: Spacing.xs,
  },
  quoteDisplay: {
    ...Typography.label,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  quoteDescriptionText: {
    ...Typography.bodySmall,
    color: Colors.grey700,
    marginTop: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: Spacing.xs,
    textTransform: "capitalize",
  },
  imageRow: { flexDirection: "row", gap: Spacing.md },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
  waitingBanner: {
    backgroundColor: Colors.lightBlue,
    padding: Spacing.base,
    borderRadius: BorderRadius.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  waitingText: { ...Typography.bodySmall, color: Colors.primary, flex: 1 },
  completionSection: {
    gap: Spacing.md,
  },
  transcriptContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  infoChipText: {
    ...Typography.caption,
    color: Colors.primary,
  },
  timePickerSection: {
    marginTop: Spacing.md,
  },
  timePickerLabel: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.xs,
  },
  selectableChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  selectableChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectableChipText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },
  selectableChipTextActive: {
    color: Colors.white,
  },
  flexibleHint: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  declinedCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  declinedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  declinedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEECEB",
    alignItems: "center",
    justifyContent: "center",
  },
  declinedHeaderText: {
    flex: 1,
  },
  declinedTitle: {
    ...Typography.label,
    color: Colors.error,
    fontWeight: "700",
  },
  declinedSubtitle: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: 1,
  },
  dismissBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  dismissBtnText: {
    ...Typography.label,
    color: Colors.grey500,
  },
  notSelectedCard: {
    backgroundColor: Colors.grey100,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  notSelectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  notSelectedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  notSelectedHeaderText: {
    flex: 1,
  },
  notSelectedTitle: {
    ...Typography.label,
    color: Colors.grey700,
    fontWeight: "700",
  },
  notSelectedSubtitle: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: 1,
  },
  notSelectedQuote: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    marginTop: Spacing.xs,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
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
  messageCardText: {
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
  calendar: {
    borderRadius: BorderRadius.card,
    marginTop: Spacing.sm,
  },
  spacer: { height: Spacing.xxl },
});
