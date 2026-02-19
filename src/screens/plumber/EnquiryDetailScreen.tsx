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
import { Typography } from '@/constants/typography';
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
  const [selectedTime, setSelectedTime] = useState('');
  const [customTimeframe, setCustomTimeframe] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);

  const isFlexible = selectedTime.toLowerCase() === 'flexible';

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
    if (isFlexible && !customTimeframe.trim()) {
      Alert.alert('Time Required', 'Please propose a timeframe for the customer.');
      return;
    }
    const resolvedTime = isFlexible ? customTimeframe.trim() : (selectedTime || undefined);
    setQuoteLoading(true);
    try {
      await submitQuote(jobId, amount, resolvedTime);
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
            {enquiry.preferred_date && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={Colors.grey500} />
                <Text style={styles.detailText}>Preferred date: {formatDate(enquiry.preferred_date)}</Text>
              </View>
            )}
            {enquiry.preferred_time?.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color={Colors.grey500} />
                <Text style={styles.detailText}>Availability: {enquiry.preferred_time.join(', ')}</Text>
              </View>
            )}
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

              {enquiry.preferred_time && enquiry.preferred_time.length > 0 && (
                <View style={styles.timePickerSection}>
                  <Text style={styles.timePickerLabel}>Choose your preferred time</Text>
                  <View style={styles.chipRow}>
                    {enquiry.preferred_time.map((slot) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          style={[styles.selectableChip, isSelected && styles.selectableChipActive]}
                          onPress={() => {
                            setSelectedTime(isSelected ? '' : slot);
                            if (slot.toLowerCase() !== 'flexible') setCustomTimeframe('');
                          }}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={isSelected ? Colors.white : Colors.primary}
                          />
                          <Text style={[styles.selectableChipText, isSelected && styles.selectableChipTextActive]}>
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {isFlexible && (
                    <View style={styles.flexibleInput}>
                      <Text style={styles.flexibleLabel}>Propose a timeframe for the customer</Text>
                      <InputField
                        label=""
                        value={customTimeframe}
                        onChangeText={setCustomTimeframe}
                        placeholder="e.g. Tuesday 2–4pm, or next Thursday morning"
                      />
                    </View>
                  )}
                </View>
              )}

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
    fontWeight: '600',
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
  flexibleInput: {
    marginTop: Spacing.md,
  },
  flexibleLabel: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.xs,
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
