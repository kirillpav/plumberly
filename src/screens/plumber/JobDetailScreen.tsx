import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { Avatar } from '@/components/shared/Avatar';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { ChatBubble } from '@/components/ChatBubble';
import { CompletionIndicator } from '@/components/CompletionIndicator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';
import type { PlumberStackParamList } from '@/types/navigation';
import type { Job, Enquiry, UserProfile, ChatMessage } from '@/types/index';

export function JobDetailScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<PlumberStackParamList, 'JobDetail'>>();
  const { jobId } = route.params;
  const { submitQuote, confirmJobDone } = useJobStore();

  const [job, setJob] = useState<Job | null>(null);
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [quoteInput, setQuoteInput] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    const { data: j } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (j) {
      setJob(j as unknown as Job);
      const { data: enq } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', j.enquiry_id)
        .single();
      setEnquiry(enq as unknown as Enquiry);

      const { data: cust } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', j.customer_id)
        .single();
      setCustomer(cust as unknown as UserProfile);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const jobChannel = supabase
      .channel(`plumber-job-detail-${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`,
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
    };
  }, [jobId]);

  const handleSubmitQuote = async () => {
    if (!job) return;
    const amount = parseFloat(quoteInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid', 'Please enter a valid quote amount.');
      return;
    }
    setActionLoading(true);
    try {
      await submitQuote(job.id, amount, selectedTime || undefined);
      setJob({ ...job, status: 'quoted', quote_amount: amount, scheduled_time: selectedTime || null });
      Alert.alert('Quote Sent', 'The customer has been notified. You will be updated when they respond.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDone = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await confirmJobDone(job.id, 'plumber');
      setJob({ ...job, plumber_confirmed: true });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return null;

  const transcript = enquiry?.chatbot_transcript as ChatMessage[] | null;

  const showCompletionSection = job.status === 'in_progress' || job.status === 'completed';

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Job Details</Text>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerRow}>
            <Avatar uri={customer?.avatar_url} name={customer?.full_name} size="md" />
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
          {enquiry?.preferred_date && (
            <Text style={styles.meta}>Date: {formatDate(enquiry.preferred_date)}</Text>
          )}
          {enquiry?.preferred_time && enquiry.preferred_time.length > 0 && (
            <View style={styles.chipRow}>
              <Text style={styles.meta}>Customer availability:</Text>
              {enquiry.preferred_time.map((slot) => (
                <View key={slot} style={styles.infoChip}>
                  <Ionicons name="time-outline" size={12} color={Colors.primary} />
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
          {job.scheduled_time && (
            <View style={[styles.infoChip, { marginTop: Spacing.xs }]}>
              <Ionicons name="time-outline" size={12} color={Colors.primary} />
              <Text style={styles.infoChipText}>Scheduled: {job.scheduled_time}</Text>
            </View>
          )}
          <Text style={styles.statusText}>
            Status: {job.status.replace('_', ' ')}
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

        {/* Chat History */}
        {transcript && transcript.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chat History</Text>
            <View style={styles.transcriptContainer}>
              {transcript.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  content={msg.content}
                  role={msg.role as 'user' | 'assistant'}
                  compact
                />
              ))}
            </View>
          </View>
        )}

        {/* Quote Input */}
        {job.status === 'pending' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Submit Your Quote</Text>

            <InputField
              label="Quote Amount (GBP)"
              value={quoteInput}
              onChangeText={setQuoteInput}
              keyboardType="decimal-pad"
              placeholder="e.g. 150.00"
            />

            {enquiry?.preferred_time && enquiry.preferred_time.length > 0 && (
              <View style={styles.timePickerSection}>
                <Text style={styles.timePickerLabel}>Choose your preferred time</Text>
                <View style={styles.chipRow}>
                  {enquiry.preferred_time.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.selectableChip, isSelected && styles.selectableChipActive]}
                        onPress={() => setSelectedTime(isSelected ? '' : slot)}
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
              </View>
            )}

            <PrimaryButton
              title="Submit Quote"
              onPress={handleSubmitQuote}
              loading={actionLoading}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}

        {/* Waiting for customer banner */}
        {(job.status === 'quoted' || job.status === 'accepted') && (
          <View style={styles.waitingBanner}>
            <Ionicons name="hourglass-outline" size={20} color={Colors.primary} />
            <Text style={styles.waitingText}>
              {job.status === 'quoted'
                ? 'Quote sent — waiting for the customer to accept'
                : 'Customer accepted — job starting soon'}
            </Text>
          </View>
        )}

        {/* Completion confirmation */}
        {showCompletionSection && (
          <View style={styles.completionSection}>
            <CompletionIndicator
              customerConfirmed={job.customer_confirmed}
              plumberConfirmed={job.plumber_confirmed}
              viewerRole="plumber"
            />
            {job.status === 'in_progress' && !job.plumber_confirmed && (
              <PrimaryButton
                title="Confirm Job Done"
                onPress={handleConfirmDone}
                loading={actionLoading}
              />
            )}
            {job.status === 'in_progress' && job.plumber_confirmed && !job.customer_confirmed && (
              <View style={styles.waitingBanner}>
                <Ionicons name="hourglass-outline" size={18} color={Colors.primary} />
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
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: Spacing.md },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  customerInfo: { flex: 1 },
  customerName: { ...Typography.label, color: Colors.black },
  customerEmail: { ...Typography.bodySmall, color: Colors.grey500, marginTop: 2 },
  customerPhone: { ...Typography.bodySmall, color: Colors.grey500, marginTop: 2 },
  issueTitle: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.sm },
  description: { ...Typography.body, color: Colors.grey700, marginBottom: Spacing.sm },
  meta: { ...Typography.bodySmall, color: Colors.grey500, marginBottom: Spacing.xs },
  quoteDisplay: { ...Typography.label, color: Colors.primary, marginTop: Spacing.sm },
  statusText: { ...Typography.caption, color: Colors.grey500, marginTop: Spacing.xs, textTransform: 'capitalize' },
  imageRow: { flexDirection: 'row', gap: Spacing.md },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  spacer: { height: Spacing.xxl },
});
