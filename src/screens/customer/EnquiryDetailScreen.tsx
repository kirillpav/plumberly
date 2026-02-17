import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { Avatar } from '@/components/shared/Avatar';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { SecondaryButton } from '@/components/shared/SecondaryButton';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ChatBubble } from '@/components/ChatBubble';
import { CompletionIndicator } from '@/components/CompletionIndicator';
import { useJobStore } from '@/store/jobStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';
import type { CustomerStackParamList } from '@/types/navigation';
import type { Enquiry, Job, ChatMessage } from '@/types/index';

const statusColors: Record<string, string> = {
  new: Colors.statusNew,
  accepted: Colors.statusAccepted,
  in_progress: Colors.primary,
  completed: Colors.statusCompleted,
};

export function EnquiryDetailScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<CustomerStackParamList, 'EnquiryDetail'>>();
  const { enquiryId } = route.params;
  const { acceptQuote, updateJobStatus, confirmJobDone } = useJobStore();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [job, setJob] = useState<(Job & { plumber?: { full_name: string; avatar_url: string | null } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    const { data: enq } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', enquiryId)
      .single();
    setEnquiry(enq as unknown as Enquiry);

    const { data: j } = await supabase
      .from('jobs')
      .select('*')
      .eq('enquiry_id', enquiryId)
      .maybeSingle();

    if (j?.plumber_id) {
      const { data: plumber } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', j.plumber_id)
        .single();
      setJob({ ...j, plumber: plumber ?? undefined } as any);
    } else {
      setJob(j as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`job-updates-${enquiryId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `enquiry_id=eq.${enquiryId}`,
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enquiryId]);

  const handleAcceptQuote = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await acceptQuote(job.id);
      setJob({ ...job, status: 'in_progress' });
      setEnquiry((prev) => prev ? { ...prev, status: 'in_progress' } : prev);
      Alert.alert('Job Started', 'You have accepted the quote. The plumber has been notified and the job is now in progress.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to accept quote.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineQuote = async () => {
    if (!job) return;
    Alert.alert(
      'Decline Quote',
      'Are you sure you want to decline this quote? The job will be cancelled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await updateJobStatus(job.id, 'cancelled');
              setJob({ ...job, status: 'cancelled' });
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to decline quote.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmDone = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      await confirmJobDone(job.id, 'customer');
      setJob({ ...job, customer_confirmed: true });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to confirm completion.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!enquiry) return null;

  const transcript = enquiry.chatbot_transcript as ChatMessage[] | null;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={styles.description}>{enquiry.description}</Text>
        ) : null}

        <View style={styles.detailsRow}>
          {enquiry.region && (
            <View style={styles.detailChip}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
              <Text style={styles.detailChipText}>{enquiry.region} London</Text>
            </View>
          )}
          {enquiry.preferred_date && (
            <View style={styles.detailChip}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.detailChipText}>{formatDate(enquiry.preferred_date)}</Text>
            </View>
          )}
          {enquiry.preferred_time?.length > 0 && enquiry.preferred_time.map((slot) => (
            <View key={slot} style={styles.detailChip}>
              <Ionicons name="time-outline" size={14} color={Colors.primary} />
              <Text style={styles.detailChipText}>{slot}</Text>
            </View>
          ))}
        </View>

        {job && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Plumber</Text>
            <View style={styles.plumberCard}>
              <Avatar uri={job.plumber?.avatar_url} name={job.plumber?.full_name} size="md" />
              <View style={styles.plumberInfo}>
                <Text style={styles.plumberName}>{job.plumber?.full_name}</Text>
                {job.quote_amount != null && (
                  <Text style={styles.quoteAmount}>Quote: {formatCurrency(job.quote_amount)}</Text>
                )}
                <Text style={styles.jobStatus}>Status: {job.status.replace('_', ' ')}</Text>
              </View>
            </View>

            {job.status === 'quoted' && job.quote_amount != null && (
              <View style={styles.quoteActionCard}>
                <View style={styles.quoteHeader}>
                  <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
                  <Text style={styles.quoteTitle}>Quote Received</Text>
                </View>
                <Text style={styles.quotePriceDisplay}>{formatCurrency(job.quote_amount)}</Text>
                <Text style={styles.quoteSubtext}>
                  Review the quote above. Accept to start the job or decline to cancel.
                </Text>
                <View style={styles.quoteButtons}>
                  <View style={styles.quoteButtonWrap}>
                    <SecondaryButton title="Decline" onPress={handleDeclineQuote} />
                  </View>
                  <View style={styles.quoteButtonWrap}>
                    <PrimaryButton title="Accept Quote" onPress={handleAcceptQuote} loading={actionLoading} />
                  </View>
                </View>
              </View>
            )}

            {job.status === 'pending' && (
              <View style={styles.waitingBanner}>
                <Ionicons name="hourglass-outline" size={18} color={Colors.primary} />
                <Text style={styles.waitingText}>Plumber is preparing a quote for you</Text>
              </View>
            )}

            {(job.status === 'in_progress' || job.status === 'completed') && (
              <View style={styles.completionSection}>
                <CompletionIndicator
                  customerConfirmed={job.customer_confirmed}
                  plumberConfirmed={job.plumber_confirmed}
                  viewerRole="customer"
                />
                {job.status === 'in_progress' && !job.customer_confirmed && (
                  <PrimaryButton
                    title="Confirm Job Done"
                    onPress={handleConfirmDone}
                    loading={actionLoading}
                  />
                )}
                {job.status === 'in_progress' && job.customer_confirmed && !job.plumber_confirmed && (
                  <View style={styles.waitingBanner}>
                    <Ionicons name="hourglass-outline" size={18} color={Colors.primary} />
                    <Text style={styles.waitingText}>
                      Waiting for the plumber to confirm completion
                    </Text>
                  </View>
                )}
              </View>
            )}
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
                <ChatBubble key={msg.id} content={msg.content} role={msg.role as 'user' | 'assistant'} compact />
              ))}
            </View>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h1, color: Colors.black, flex: 1, marginRight: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.caption, color: Colors.white, textTransform: 'capitalize' },
  description: { ...Typography.body, color: Colors.grey700, marginBottom: Spacing.base },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.button,
  },
  detailChipText: { ...Typography.caption, color: Colors.primary, fontWeight: '500' },
  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.h3, color: Colors.black, marginBottom: Spacing.md },
  plumberCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: Spacing.base,
    borderRadius: BorderRadius.card,
    gap: Spacing.md,
    alignItems: 'center',
  },
  plumberInfo: { flex: 1 },
  plumberName: { ...Typography.label, color: Colors.black },
  quoteAmount: { ...Typography.bodySmall, color: Colors.primary, marginTop: 2 },
  jobStatus: { ...Typography.caption, color: Colors.grey500, marginTop: 2, textTransform: 'capitalize' },
  quoteActionCard: {
    backgroundColor: Colors.lightBlue,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  quoteTitle: { ...Typography.h3, color: Colors.primary },
  quotePriceDisplay: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.sm },
  quoteSubtext: { ...Typography.bodySmall, color: Colors.grey700, marginBottom: Spacing.base },
  quoteButtons: { flexDirection: 'row', gap: Spacing.md },
  quoteButtonWrap: { flex: 1 },
  waitingBanner: {
    backgroundColor: Colors.lightBlue,
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  waitingText: { ...Typography.bodySmall, color: Colors.primary, flex: 1 },
  completionSection: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  imageRow: { flexDirection: 'row', gap: Spacing.md },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
  transcriptContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  spacer: { height: Spacing.xxl },
});
