import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { Avatar } from '@/components/shared/Avatar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ChatBubble } from '@/components/ChatBubble';
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
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [job, setJob] = useState<(Job & { plumber?: { full_name: string; avatar_url: string | null } }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: enq } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', enquiryId)
        .single();
      setEnquiry(enq as unknown as Enquiry);

      const { data: j } = await supabase
        .from('jobs')
        .select('*, plumber:profiles!plumber_id(full_name, avatar_url)')
        .eq('enquiry_id', enquiryId)
        .maybeSingle();
      setJob(j as any);
      setLoading(false);
    }
    load();
  }, [enquiryId]);

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

        {enquiry.preferred_date && (
          <Text style={styles.meta}>Date: {formatDate(enquiry.preferred_date)}</Text>
        )}
        {enquiry.preferred_time && (
          <Text style={styles.meta}>Time: {enquiry.preferred_time}</Text>
        )}

        {job && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Plumber</Text>
            <View style={styles.plumberCard}>
              <Avatar uri={job.plumber?.avatar_url} name={job.plumber?.full_name} size="md" />
              <View style={styles.plumberInfo}>
                <Text style={styles.plumberName}>{job.plumber?.full_name}</Text>
                {job.quote_amount != null && (
                  <Text style={styles.quote}>Quote: {formatCurrency(job.quote_amount)}</Text>
                )}
                <Text style={styles.jobStatus}>Status: {job.status.replace('_', ' ')}</Text>
              </View>
            </View>
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
            {transcript.map((msg) => (
              <ChatBubble key={msg.id} content={msg.content} role={msg.role as 'user' | 'assistant'} />
            ))}
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
  meta: { ...Typography.bodySmall, color: Colors.grey500, marginBottom: Spacing.xs },
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
  quote: { ...Typography.bodySmall, color: Colors.primary, marginTop: 2 },
  jobStatus: { ...Typography.caption, color: Colors.grey500, marginTop: 2, textTransform: 'capitalize' },
  imageRow: { flexDirection: 'row', gap: Spacing.md },
  image: { width: 100, height: 100, borderRadius: BorderRadius.md },
  spacer: { height: Spacing.xxl },
});
