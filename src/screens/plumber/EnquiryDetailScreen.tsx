import React, { useEffect, useState, useCallback } from 'react';
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
import { PrimaryButton } from '@/components/shared/PrimaryButton';
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
  const { acceptJob } = useJobStore();

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

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
          .select('id')
          .eq('enquiry_id', enquiryId)
          .eq('plumber_id', profile.id)
          .maybeSingle();
        if (existingJob) {
          setAlreadyAccepted(true);
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
      Alert.alert('Accepted', 'You have accepted this enquiry. It is now in your Existing jobs.');
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

  if (loading) return <LoadingSpinner />;
  if (!enquiry) return null;

  const transcript = enquiry.chatbot_transcript as ChatMessage[] | null;
  const isNew = enquiry.status === 'new' && !alreadyAccepted;

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

        {alreadyAccepted ? (
          <View style={styles.acceptedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.acceptedText}>You have accepted this enquiry</Text>
          </View>
        ) : isNew ? (
          <PrimaryButton title="Accept Enquiry" onPress={handleAccept} loading={accepting} disabled={accepting} />
        ) : null}

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
  acceptedBanner: {
    backgroundColor: Colors.success,
    padding: Spacing.base,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  acceptedText: { ...Typography.button, color: Colors.white },
  spacer: { height: Spacing.xxl },
});
