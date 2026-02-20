import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { IssueTypeSelector } from '@/components/intake/IssueTypeSelector';
import { DynamicFields, validateDynamicFields } from '@/components/intake/DynamicFields';
import { IntakeSummary } from '@/components/intake/IntakeSummary';
import { useChatStore } from '@/store/chatStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Config } from '@/constants/config';
import type { CustomerStackParamList } from '@/types/navigation';
import type { ChatMessage, IntakeIssueType, IntakeData } from '@/types/index';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function ChatbotScreen() {
  const nav = useNavigation<Nav>();
  const {
    messages,
    isStreaming,
    currentPhase,
    triageMetadata,
    intakeData: storeIntakeData,
    sendMessage,
    setIntakeData,
    clearChat,
    getTranscriptWithIntake,
  } = useChatStore();

  // Intake form state
  const [intakeStep, setIntakeStep] = useState(1);
  const [selectedIssueType, setSelectedIssueType] = useState<IntakeIssueType | null>(null);
  const [whenStarted, setWhenStarted] = useState('');
  const [fields, setFields] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<string[]>([]);

  // Chat state
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const userExchanges = messages.filter((m) => m.role === 'user').length;
  const showBookCTA =
    userExchanges >= Config.chatbot.minExchangesForCTA &&
    !isStreaming &&
    triageMetadata &&
    !triageMetadata.isEmergency;

  // Category-aware CTA: Cat 2-3 show CTA immediately after first response
  const showImmediateCTA =
    !isStreaming &&
    triageMetadata &&
    !triageMetadata.isEmergency &&
    triageMetadata.category >= 2 &&
    messages.length >= 2;

  const handleFieldChange = useCallback((key: string, value: any) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleIntakeNext = () => {
    if (intakeStep === 1 && selectedIssueType) {
      setFields({});
      setWhenStarted('');
      setPhotos([]);
      setIntakeStep(2);
    } else if (intakeStep === 2) {
      setIntakeStep(3);
    }
  };

  const handleIntakeBack = () => {
    if (intakeStep === 2) {
      setIntakeStep(1);
    } else if (intakeStep === 3) {
      setIntakeStep(2);
    }
  };

  const handleStartChat = () => {
    if (!selectedIssueType) return;
    const data: IntakeData = {
      issueType: selectedIssueType,
      whenStarted,
      fields,
      photos,
    };
    setIntakeData(data);
  };

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isStreaming) return;
    setInput('');
    sendMessage(msg);
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    Alert.alert('New Chat', 'Start a fresh conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Chat',
        onPress: () => {
          clearChat();
          setInput('');
          setIntakeStep(1);
          setSelectedIssueType(null);
          setWhenStarted('');
          setFields({});
          setPhotos([]);
        },
      },
    ]);
  };

  const handleBook = () => {
    const { intakeData, transcript } = getTranscriptWithIntake();
    nav.navigate('NewEnquiry', { transcript, intakeData: intakeData ?? undefined });
  };

  const isStep2Valid =
    selectedIssueType && validateDynamicFields(selectedIssueType, whenStarted, fields);

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble content={item.content} role={item.role as 'user' | 'assistant'} />
  );

  // ——— INTAKE PHASE ———
  if (currentPhase === 'intake') {
    return (
      <ScreenWrapper noPadding>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="water" size={16} color={Colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Tell us about your issue</Text>
            <Text style={styles.subtitle}>Step {intakeStep} of 3</Text>
          </View>
        </View>

        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.stepDot,
                step <= intakeStep && styles.stepDotActive,
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.intakeContent}
          keyboardShouldPersistTaps="handled"
        >
          {intakeStep === 1 && (
            <View>
              <Text style={styles.sectionTitle}>What type of issue?</Text>
              <IssueTypeSelector
                selected={selectedIssueType}
                onSelect={setSelectedIssueType}
              />
            </View>
          )}

          {intakeStep === 2 && selectedIssueType && (
            <View>
              <TouchableOpacity onPress={handleIntakeBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Tell us more</Text>
              <DynamicFields
                issueType={selectedIssueType}
                whenStarted={whenStarted}
                onWhenStartedChange={setWhenStarted}
                fields={fields}
                onFieldChange={handleFieldChange}
                photos={photos}
                onPhotosChange={setPhotos}
              />
            </View>
          )}

          {intakeStep === 3 && selectedIssueType && (
            <View>
              <TouchableOpacity onPress={handleIntakeBack} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>Review your details</Text>
              <IntakeSummary
                issueType={selectedIssueType}
                whenStarted={whenStarted}
                fields={fields}
                photos={photos}
                onEdit={() => setIntakeStep(2)}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.intakeFooter}>
          {intakeStep === 1 && (
            <PrimaryButton
              title="Next"
              onPress={handleIntakeNext}
              disabled={!selectedIssueType}
            />
          )}
          {intakeStep === 2 && (
            <PrimaryButton
              title="Next"
              onPress={handleIntakeNext}
              disabled={!isStep2Valid}
            />
          )}
          {intakeStep === 3 && (
            <PrimaryButton title="Start Chat" onPress={handleStartChat} />
          )}
        </View>
      </ScreenWrapper>
    );
  }

  // ——— CHAT PHASE ———
  return (
    <ScreenWrapper noPadding>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={88}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="water" size={16} color={Colors.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Plumbing Assistant</Text>
            <Text style={styles.subtitle}>AI-powered diagnostics</Text>
          </View>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={handleNewChat}
            activeOpacity={0.6}
            disabled={isStreaming}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={isStreaming ? Colors.grey300 : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Emergency Overlay */}
        {triageMetadata?.isEmergency && (
          <View style={styles.emergencyBanner}>
            <Ionicons name="warning" size={24} color={Colors.white} />
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>Emergency Detected</Text>
              <Text style={styles.emergencySubtitle}>
                Follow the safety steps below. If you smell gas, leave the property immediately and call the National Gas Emergency number: 0800 111 999.
              </Text>
            </View>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isStreaming ? <TypingIndicator /> : null}
        />

        {/* Emergency CTA */}
        {triageMetadata?.isEmergency && !isStreaming && (
          <View style={styles.ctaRow}>
            <PrimaryButton
              title="Book Emergency Plumber"
              onPress={handleBook}
              style={{ backgroundColor: Colors.error }}
            />
          </View>
        )}

        {/* Category-aware CTA */}
        {(showBookCTA || showImmediateCTA) && !triageMetadata?.isEmergency && (
          <View style={styles.ctaRow}>
            <PrimaryButton
              title={triageMetadata && triageMetadata.category >= 2 ? 'Get Professional Help' : 'Book a Plumber'}
              onPress={handleBook}
            />
          </View>
        )}

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.grey300}
              multiline
              maxLength={500}
              editable={!isStreaming}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isStreaming) && styles.sendDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.grey100,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.grey900,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: 1,
  },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grey300,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  // Intake
  intakeContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.grey900,
    marginBottom: Spacing.base,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.base,
  },
  backText: {
    ...Typography.body,
    color: Colors.primary,
  },
  intakeFooter: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.grey100,
  },
  // Chat
  list: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  ctaRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  // Emergency
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  emergencyText: { flex: 1 },
  emergencyTitle: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.white,
  },
  emergencySubtitle: {
    ...Typography.caption,
    color: Colors.white,
    marginTop: 4,
    opacity: 0.9,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.grey100,
    gap: Spacing.xs,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.base,
    justifyContent: 'center',
  },
  input: {
    ...Typography.body,
    color: Colors.grey900,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.35 },
});
