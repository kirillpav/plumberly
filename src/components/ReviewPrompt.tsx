import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { StarRating } from '@/components/StarRating';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { SecondaryButton } from '@/components/shared/SecondaryButton';
import { useReviewStore } from '@/store/reviewStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  jobId: string;
  customerId: string;
  plumberId: string;
  plumberName: string;
  onReviewSubmitted: () => void;
  onSkip: () => void;
}

export function ReviewPrompt({ jobId, customerId, plumberId, plumberName, onReviewSubmitted, onSkip }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { submitReview } = useReviewStore();

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await submitReview(jobId, customerId, plumberId, rating, comment.trim() || undefined);
      onReviewSubmitted();
    } catch {
      Alert.alert('Review Failed', 'Your review could not be submitted. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>How was your experience?</Text>
      <Text style={styles.subtext}>Rate {plumberName}</Text>

      <StarRating
        rating={rating}
        size={36}
        interactive
        onRatingChange={setRating}
        style={styles.stars}
      />

      <TextInput
        style={styles.input}
        placeholder="Leave a comment (optional)"
        placeholderTextColor={Colors.grey500}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.buttonRow}>
        <View style={styles.buttonWrap}>
          <SecondaryButton title="Skip" onPress={onSkip} />
        </View>
        <View style={styles.buttonWrap}>
          <PrimaryButton
            title="Submit"
            onPress={handleSubmit}
            disabled={rating === 0}
            loading={submitting}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    marginTop: Spacing.md,
  },
  heading: {
    ...Typography.h3,
    color: Colors.black,
    textAlign: 'center',
  },
  subtext: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  stars: {
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.black,
    minHeight: 80,
    marginBottom: Spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  buttonWrap: {
    flex: 1,
  },
});
