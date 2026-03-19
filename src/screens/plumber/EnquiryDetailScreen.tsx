import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { InputField } from '@/components/shared/InputField';
import { ChatBubble } from '@/components/ChatBubble';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useJobStore } from '@/store/jobStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
import type { PlumberStackParamList } from '@/types/navigation';
import type { Enquiry, ChatMessage } from '@/types/index';

const statusColors: Record<string, string> = {
  new: Colors.statusNew,
  accepted: Colors.statusAccepted,
  in_progress: Colors.primary,
  completed: Colors.statusCompleted,
};

export function EnquiryDetailScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<PlumberStackParamList, 'EnquiryDetail'>>();
  const { enquiryId } = route.params;
  const profile = useAuthStore((s) => s.profile);
  const { acceptJob, submitQuote } = useJobStore();

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [quoteSent, setQuoteSent] = useState(false);

  const [quoteInput, setQuoteInput] = useState('');
  const [quoteDescription, setQuoteDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timeOption, setTimeOption] = useState<'morning' | 'afternoon' | 'evening' | 'custom' | 'flexible' | ''>('');
  const [customTime, setCustomTime] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  const availableDates = (enquiry?.preferred_time ?? []).filter((d) =>
    /^\d{4}-\d{2}-\d{2}$/.test(d)
  );

  useEffect(() => {
    async function load() {
      const { data: enq } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', enquiryId)
        .single();
      setEnquiry(enq as unknown as Enquiry);

      if (profile?.id) {
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id, status, quote_amount')
          .eq('enquiry_id', enquiryId)
          .eq('plumber_id', profile.id)
          .maybeSingle();
        if (existingJob) {
          setAlreadyAccepted(true);
          setJobId(existingJob.id);
          if (existingJob.quote_amount != null) {
            setQuoteSent(true);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, [enquiryId, profile?.id]);

  const handleAccept = useCallback(async () => {
    if (!profile?.id || !enquiry || accepting || alreadyAccepted) return;
    setAccepting(true);
    try {
      await acceptJob(enquiry.id, profile.id, enquiry.customer_id);
      setAlreadyAccepted(true);

      const { data: newJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('enquiry_id', enquiry.id)
        .eq('plumber_id', profile.id)
        .single();
      if (newJob) {
        setJobId(newJob.id);
      }
    } catch (err: any) {
      if (err.message?.includes('already accepted')) {
        setAlreadyAccepted(true);
        Alert.alert('Already Accepted', 'This enquiry has already been accepted.');
      } else {
        Alert.alert('Error', err.message ?? 'Failed to accept enquiry.');
      }
    } finally {
      setAccepting(false);
    }
  }, [profile?.id, enquiry, accepting, alreadyAccepted, acceptJob]);

  const handleSubmitQuote = async () => {
    if (!jobId) return;
    const amount = parseFloat(quoteInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid', 'Please enter a valid quote amount.');
      return;
    }
    if (!quoteDescription.trim()) {
      Alert.alert('Description Required', "Please describe what's included in your quote.");
      return;
    }
    if (availableDates.length > 0 && !selectedDate) {
      Alert.alert('Date Required', 'Please select a day for the job.');
      return;
    }
    if (timeOption === 'custom' && !customTime.trim()) {
      Alert.alert('Time Required', 'Please enter a custom time.');
      return;
    }
    const timeLabels: Record<string, string> = {
      morning: 'Morning (8am–12pm)',
      afternoon: 'Afternoon (12pm–5pm)',
      evening: 'Evening (5pm–8pm)',
      flexible: 'Flexible – agree in chat',
    };
    const resolvedTime = timeOption === 'custom'
      ? customTime.trim()
      : timeOption
        ? timeLabels[timeOption]
        : undefined;
    setQuoteLoading(true);
    try {
      await submitQuote(jobId, amount, quoteDescription.trim(), selectedDate || undefined, resolvedTime);
      setQuoteSent(true);
      Alert.alert('Quote Sent', 'The customer has been notified. You will be updated when they respond.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setQuoteLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!enquiry) return null;

  const transcript = enquiry.chatbot_transcript as ChatMessage[] | null;
  const isNew = enquiry.status === 'new' && !alreadyAccepted;
  const showQuoteInput = alreadyAccepted && jobId && !quoteSent;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={88}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <Text style={styles.title}>{enquiry.title}</Text>
            <View style={[styles.badge, { backgroundColor: statusColors[enquiry.status] ?? Colors.grey500 }]}>
              <Text style={styles.badgeText}>{enquiry.status.replace('_', ' ')}</Text>
            </View>
          </View>

          {enquiry.description ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{enquiry.description}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            {enquiry.region && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={Colors.grey500} />
                <Text style={styles.detailText}>Area: {enquiry.region} London</Text>
              </View>
            )}
            {availableDates.length > 0 ? (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.grey500} />
                <Text style={styles.detailText}>
                  Available days: {availableDates.map((d) => formatDate(d)).join(', ')}
                </Text>
              </View>
            ) : enquiry.preferred_date ? (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.grey500} />
                <Text style={styles.detailText}>Preferred date: {formatDate(enquiry.preferred_date)}</Text>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={Colors.grey500} />
              <Text style={styles.detailText}>Created: {formatDate(enquiry.created_at)}</Text>
            </View>
          </View>

          {enquiry.images?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Photos</Text>
              <View style={styles.imageRow}>
                {enquiry.images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.image} />
                ))}
              </View>
            </View>
          )}

          {transcript && transcript.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Chat Transcript</Text>
              <View style={styles.transcriptContainer}>
                {transcript.map((msg) => (
                  <ChatBubble key={msg.id} content={msg.content} role={msg.role as 'user' | 'assistant'} compact />
                ))}
              </View>
            </View>
          )}

          {isNew && (
            <PrimaryButton title="Accept Enquiry" onPress={handleAccept} loading={accepting} disabled={accepting} />
          )}

          {showQuoteInput && (
            <View style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <View style={styles.quoteIconWrap}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                </View>
                <Text style={styles.quoteHeaderText}>Enquiry accepted — send your quote</Text>
              </View>

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
                style={{ height: 80, textAlignVertical: 'top' }}
              />

              {availableDates.length > 0 && (
                <View style={styles.timePickerSection}>
                  <Text style={styles.timePickerLabel}>Select a day for the job</Text>
                  <View style={styles.chipRow}>
                    {availableDates.map((d) => {
                      const isSelected = selectedDate === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.selectableChip, isSelected && styles.selectableChipActive]}
                          onPress={() => setSelectedDate(isSelected ? '' : d)}
                        >
                          <Ionicons name="calendar-outline" size={14} color={isSelected ? Colors.white : Colors.primary} />
                          <Text style={[styles.selectableChipText, isSelected && styles.selectableChipTextActive]}>
                            {formatDate(d)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.timePickerSection}>
                <Text style={styles.timePickerLabel}>Proposed time</Text>
                <View style={styles.chipRow}>
                  {(['morning', 'afternoon', 'evening'] as const).map((opt) => {
                    const labels = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
                    const isSelected = timeOption === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.selectableChip, isSelected && styles.selectableChipActive]}
                        onPress={() => { setTimeOption(isSelected ? '' : opt); setCustomTime(''); }}
                      >
                        <Ionicons name="time-outline" size={14} color={isSelected ? Colors.white : Colors.primary} />
                        <Text style={[styles.selectableChipText, isSelected && styles.selectableChipTextActive]}>
                          {labels[opt]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.selectableChip, timeOption === 'custom' && styles.selectableChipActive]}
                    onPress={() => { setTimeOption(timeOption === 'custom' ? '' : 'custom'); }}
                  >
                    <Ionicons name="create-outline" size={14} color={timeOption === 'custom' ? Colors.white : Colors.primary} />
                    <Text style={[styles.selectableChipText, timeOption === 'custom' && styles.selectableChipTextActive]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.selectableChip, timeOption === 'flexible' && styles.selectableChipActive]}
                    onPress={() => { setTimeOption(timeOption === 'flexible' ? '' : 'flexible'); setCustomTime(''); }}
                  >
                    <Ionicons name="chatbubbles-outline" size={14} color={timeOption === 'flexible' ? Colors.white : Colors.primary} />
                    <Text style={[styles.selectableChipText, timeOption === 'flexible' && styles.selectableChipTextActive]}>
                      Flexible
                    </Text>
                  </TouchableOpacity>
                </View>
                {timeOption === 'custom' && (
                  <InputField
                    label=""
                    value={customTime}
                    onChangeText={setCustomTime}
                    placeholder="e.g. 10:00 AM, or 2–4pm"
                  />
                )}
                {timeOption === 'flexible' && (
                  <Text style={styles.flexibleHint}>
                    You can agree on a specific time with the customer in chat after the quote is accepted.
                  </Text>
                )}
              </View>

              <PrimaryButton
                title="Submit Quote"
                onPress={handleSubmitQuote}
                loading={quoteLoading}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}

          {quoteSent && (
            <View style={styles.waitingBanner}>
              <Ionicons name="hourglass-outline" size={20} color={Colors.primary} />
              <Text style={styles.waitingText}>Quote sent — waiting for the customer to accept</Text>
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { marginBottom: Spacing.base, marginTop: Spacing.sm },
  backText: { ...Typography.body, color: Colors.primary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h1, color: Colors.black, flex: 1, marginRight: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.caption, color: Colors.white, textTransform: 'capitalize' },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.card, padding: Spacing.base, marginBottom: Spacing.base },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: Spacing.md },
  description: { ...Typography.body, color: Colors.grey700 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  detailText: { ...Typography.bodySmall, color: Colors.grey500 },
  imageRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
  transcriptContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  quoteCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  quoteIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F9EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteHeaderText: {
    ...Typography.label,
    color: Colors.success,
    fontWeight: FontWeight.semiBold,
    flex: 1,
  },
  timePickerSection: {
    marginTop: Spacing.md,
  },
  timePickerLabel: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  selectableChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontStyle: 'italic',
  },
  waitingBanner: {
    backgroundColor: Colors.lightBlue,
    padding: Spacing.base,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  waitingText: { ...Typography.bodySmall, color: Colors.primary, flex: 1 },
  spacer: { height: Spacing.xxl },
});
