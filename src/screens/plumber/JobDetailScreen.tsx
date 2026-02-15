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
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { Avatar } from '@/components/shared/Avatar';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { SecondaryButton } from '@/components/shared/SecondaryButton';
import { ChatBubble } from '@/components/ChatBubble';
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
  const { submitQuote, updateJobStatus, completeJob } = useJobStore();

  const [job, setJob] = useState<Job | null>(null);
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [quoteInput, setQuoteInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, [jobId]);

  const handleAction = async () => {
    if (!job) return;
    setActionLoading(true);
    try {
      switch (job.status) {
        case 'pending': {
          const amount = parseFloat(quoteInput);
          if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid', 'Please enter a valid quote amount.');
            setActionLoading(false);
            return;
          }
          await submitQuote(job.id, amount);
          setJob({ ...job, status: 'quoted', quote_amount: amount });
          break;
        }
        case 'quoted':
          await updateJobStatus(job.id, 'accepted');
          setJob({ ...job, status: 'accepted' });
          break;
        case 'accepted':
          await updateJobStatus(job.id, 'in_progress');
          setJob({ ...job, status: 'in_progress' });
          break;
        case 'in_progress':
          await completeJob(job.id);
          setJob({ ...job, status: 'completed' });
          break;
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!job) return null;

  const transcript = enquiry?.chatbot_transcript as ChatMessage[] | null;

  const actionLabels: Record<string, string> = {
    pending: 'Submit Quote',
    quoted: 'Start Work',
    accepted: 'Start Work',
    in_progress: 'Mark Complete',
  };

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
          {enquiry?.preferred_date && (
            <Text style={styles.meta}>Date: {formatDate(enquiry.preferred_date)}</Text>
          )}
          {job.quote_amount != null && (
            <Text style={styles.quoteDisplay}>
              Quote: {formatCurrency(job.quote_amount)}
            </Text>
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
            {transcript.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                role={msg.role as 'user' | 'assistant'}
              />
            ))}
          </View>
        )}

        {/* Quote Input */}
        {job.status === 'pending' && (
          <InputField
            label="Quote Amount (GBP)"
            value={quoteInput}
            onChangeText={setQuoteInput}
            keyboardType="decimal-pad"
            placeholder="e.g. 150.00"
          />
        )}

        {/* Action Button */}
        {actionLabels[job.status] && (
          <PrimaryButton
            title={actionLabels[job.status]}
            onPress={handleAction}
            loading={actionLoading}
          />
        )}

        {job.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>Job Completed</Text>
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
  completedBanner: {
    backgroundColor: Colors.statusCompleted,
    padding: Spacing.base,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  },
  completedText: { ...Typography.button, color: Colors.white },
  spacer: { height: Spacing.xxl },
});
