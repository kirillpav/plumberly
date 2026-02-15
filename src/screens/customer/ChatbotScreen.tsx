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

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={pickImage}
            disabled={isStreaming}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={isStreaming ? Colors.grey300 : Colors.grey600}
            />
          </TouchableOpacity>
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
            style={[styles.sendBtn, (!input.trim() && pendingImages.length === 0 || isStreaming) && styles.sendDisabled]}
            onPress={() => handleSend()}
            disabled={(!input.trim() && pendingImages.length === 0) || isStreaming}
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
  messageImages: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: -Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.grey100,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
