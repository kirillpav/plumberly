import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenWrapper } from '@/components/shared/ScreenWrapper';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
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
  { label: 'Leak', icon: 'water-outline' as const, message: "I have a water leak in my home." },
  { label: 'Drain', icon: 'funnel-outline' as const, message: "My drain is blocked or slow." },
  { label: 'Pressure', icon: 'speedometer-outline' as const, message: "I have low water pressure." },
  { label: 'Fixture', icon: 'build-outline' as const, message: "I need a fixture installed or repaired." },
];

export function ChatbotScreen() {
  const nav = useNavigation<Nav>();
  const { messages, isStreaming, sendMessage, clearChat, getTranscriptJSON } = useChatStore();
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<{ uri: string; base64: string }[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const userExchanges = messages.filter((m) => m.role === 'user').length;
  const showBookCTA = userExchanges >= Config.chatbot.minExchangesForCTA;

  const pickImage = async () => {
    if (pendingImages.length >= 2) {
      Alert.alert('Limit reached', 'You can attach up to 2 images per message.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      allowsMultipleSelection: false,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      setPendingImages((prev) => [...prev, { uri: asset.uri, base64: asset.base64! }]);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if ((!msg && pendingImages.length === 0) || isStreaming) return;

    const imageDataUris = pendingImages.map((img) => {
      const ext = img.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      return `data:image/${ext};base64,${img.base64}`;
    });

    setInput('');
    setPendingImages([]);
    sendMessage(msg || 'What do you see in this image?', imageDataUris.length > 0 ? imageDataUris : undefined);
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    Alert.alert('New Chat', 'Start a fresh conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'New Chat', onPress: () => { clearChat(); setPendingImages([]); setInput(''); } },
    ]);
  };

  const handleBook = () => {
    nav.navigate('NewEnquiry', { transcript: getTranscriptJSON() });
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View>
      <ChatBubble content={item.content} role={item.role as 'user' | 'assistant'} />
      {item.images && item.images.length > 0 && (
        <View style={styles.messageImages}>
          {item.images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.messageImage} />
          ))}
        </View>
      )}
    </View>
  );

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
          {messages.length > 0 && (
            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={handleNewChat}
              activeOpacity={0.6}
              disabled={isStreaming}
            >
              <Ionicons name="create-outline" size={20} color={isStreaming ? Colors.grey300 : Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>How can we help?</Text>
            <Text style={styles.emptySubtitle}>
              Describe your plumbing issue or tap a topic below
            </Text>
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((qa) => (
                <TouchableOpacity
                  key={qa.label}
                  style={styles.quickBtn}
                  onPress={() => handleSend(qa.message)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={qa.icon} size={18} color={Colors.primary} />
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
            ListFooterComponent={isStreaming ? <TypingIndicator /> : null}
          />
        )}

        {showBookCTA && !isStreaming && (
          <View style={styles.ctaRow}>
            <PrimaryButton title="Book a Plumber" onPress={handleBook} />
          </View>
        )}

        {pendingImages.length > 0 && (
          <View style={styles.pendingRow}>
            {pendingImages.map((img, i) => (
              <View key={img.uri} style={styles.pendingThumb}>
                <Image source={{ uri: img.uri }} style={styles.pendingImage} />
                <TouchableOpacity
                  style={styles.pendingRemove}
                  onPress={() => removePendingImage(i)}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={pickImage}
            disabled={isStreaming}
            activeOpacity={0.6}
          >
            <Ionicons
              name="image-outline"
              size={22}
              color={isStreaming ? Colors.grey300 : Colors.grey500}
            />
          </TouchableOpacity>
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
              ((!input.trim() && pendingImages.length === 0) || isStreaming) && styles.sendDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={(!input.trim() && pendingImages.length === 0) || isStreaming}
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
  headerText: {
    flex: 1,
  },
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
  list: {
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.grey900,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.grey500,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    justifyContent: 'center',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.grey100,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickText: {
    ...Typography.label,
    fontWeight: '600',
    color: Colors.grey700,
  },
  ctaRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  messageImages: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
  },
  messageImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
  },
  pendingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.grey100,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  pendingImage: {
    width: '100%',
    height: '100%',
  },
  pendingRemove: {
    position: 'absolute',
    top: 1,
    right: 1,
  },
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
  attachBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
