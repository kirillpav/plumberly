import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { InputField } from '@/components/shared/InputField';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { ImagePickerButton } from '@/components/ImagePickerButton';
import { useEnquiryStore } from '@/store/enquiryStore';
import { useAuthStore } from '@/store/authStore';
import { uploadEnquiryImage } from '@/lib/storage';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { CustomerStackParamList } from '@/types/navigation';

const PROBLEM_TYPES = [
  'Leak',
  'Blocked Drain',
  'Low Water Pressure',
  'Fixture Installation',
  'Boiler Issue',
  'Other',
];

const TIME_SLOTS = [
  'Morning (8am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-8pm)',
  'Flexible',
];

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function NewEnquiryScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<CustomerStackParamList, 'NewEnquiry'>>();
  const transcript = route.params?.transcript;
  const profile = useAuthStore((s) => s.profile);
  const createEnquiry = useEnquiryStore((s) => s.createEnquiry);

  const [problemType, setProblemType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!problemType) {
      Alert.alert('Required', 'Please select a problem type.');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Error', 'Your profile is still loading. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadEnquiryImage(uri, profile.id);
        if (url) uploadedUrls.push(url);
      }

      const cleanTranscript = transcript?.map(({ images: _imgs, ...rest }) => rest);

      await createEnquiry({
        customerId: profile.id,
        title: problemType,
        description,
        preferredDate: selectedDate || undefined,
        preferredTime: timeSlot || undefined,
        images: uploadedUrls,
        chatbotTranscript: cleanTranscript,
      });

      Alert.alert('Success', 'Your enquiry has been submitted!', [
        {
          text: 'View Enquiries',
          onPress: () => nav.navigate('CustomerTabs', { screen: 'Enquiries' }),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Enquiry</Text>

          <Text style={styles.label}>Problem Type</Text>
          <View style={styles.chips}>
            {PROBLEM_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, problemType === t && styles.chipActive]}
                onPress={() => setProblemType(t)}
              >
                <Text style={[styles.chipText, problemType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue..."
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
          />

          <Text style={styles.label}>Preferred Date</Text>
          <Calendar
            onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
            markedDates={
              selectedDate
                ? { [selectedDate]: { selected: true, selectedColor: Colors.primary } }
                : {}
            }
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              todayTextColor: Colors.primary,
              arrowColor: Colors.primary,
              textDayFontFamily: 'Inter-Regular',
              textMonthFontFamily: 'Inter-SemiBold',
              textDayHeaderFontFamily: 'Inter-Medium',
            }}
            style={styles.calendar}
          />

          <Text style={styles.label}>Preferred Time</Text>
          <View style={styles.chips}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, timeSlot === t && styles.chipActive]}
                onPress={() => setTimeSlot(t)}
              >
                <Text style={[styles.chipText, timeSlot === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Photos (optional)</Text>
          <ImagePickerButton images={images} onImagesChange={setImages} maxCount={3} />

          {transcript && (
            <View style={styles.transcriptNote}>
              <Text style={styles.transcriptText}>
                Chat transcript will be included with this enquiry.
              </Text>
            </View>
          )}

          <PrimaryButton title="Submit Enquiry" onPress={handleSubmit} loading={loading} />
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: Spacing.base },
  back: { marginBottom: Spacing.base },
  backText: { ...Typography.body, color: Colors.primary },
  title: { ...Typography.h1, color: Colors.black, marginBottom: Spacing.xl },
  label: { ...Typography.label, color: Colors.grey700, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.label, color: Colors.grey700 },
  chipTextActive: { color: Colors.white },
  calendar: { borderRadius: BorderRadius.card, marginBottom: Spacing.base },
  transcriptNote: {
    backgroundColor: Colors.lightBlue,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  transcriptText: { ...Typography.bodySmall, color: Colors.primary },
  spacer: { height: Spacing.xxl },
});
