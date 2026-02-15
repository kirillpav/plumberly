import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { ChatBubble } from '@/components/ChatBubble';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useChatStore } from '@/store/chatStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Config } from '@/constants/config';
import type { CustomerStackParamList } from '@/types/navigation';
import type { ChatMessage } from '@/types/index';

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

const QUICK_ACTIONS = [
  { label: 'Leak', message: "I have a water leak in my home." },
  { label: 'Drain', message: "My drain is blocked or slow." },
  { label: 'Pressure', message: "I have low water pressure." },
  { label: 'Fixture', message: "I need a fixture installed or repaired." },
];

export function ChatbotScreen() {
  const nav = useNavigation<Nav>();
  const { messages, isStreaming, sendMessage, getTranscriptJSON } = useChatStore();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const userExchanges = messages.filter((m) => m.role === 'user').length;
  const showBookCTA = userExchanges >= Config.chatbot.minExchangesForCTA;

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;
    setInput('');
    sendMessage(msg);
  };

  const handleBook = () => {
    nav.navigate('NewEnquiry', { transcript: getTranscriptJSON() });
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble content={item.content} role={item.role as 'user' | 'assistant'} />
  );

  return (
    <ScreenWrapper noPadding>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={88}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Plumbing Assistant</Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses" size={48} color={Colors.grey300} />
            <Text style={styles.emptyTitle}>How can we help?</Text>
            <Text style={styles.emptySubtitle}>
              Describe your plumbing issue or tap a quick action below
            </Text>
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((qa) => (
                <TouchableOpacity
                  key={qa.label}
                  style={styles.quickBtn}
                  onPress={() => handleSend(qa.message)}
                >
                  <Text style={styles.quickText}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {showBookCTA && !isStreaming && (
          <View style={styles.ctaRow}>
            <PrimaryButton title="Book a Plumber" onPress={handleBook} />
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor={Colors.grey500}
            multiline
            maxLength={500}
            editable={!isStreaming}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isStreaming}
          >
            <Ionicons name="send" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
    backgroundColor: Colors.white,
  },
  title: { ...Typography.h2, color: Colors.black },
  list: { paddingVertical: Spacing.md },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: { ...Typography.h2, color: Colors.grey700, marginTop: Spacing.base },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.grey500, textAlign: 'center', marginTop: Spacing.sm },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xl, justifyContent: 'center' },
  quickBtn: {
    backgroundColor: Colors.lightBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  quickText: { ...Typography.label, color: Colors.primary },
  ctaRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.grey100,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    maxHeight: 100,
    ...Typography.body,
    color: Colors.black,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
});
