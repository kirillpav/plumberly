import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJobChatStore } from '@/store/jobChatStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { JobMessage } from '@/types/index';
import type { CustomerStackParamList } from '@/types/navigation';

type ChatJobRouteProp = RouteProp<CustomerStackParamList, 'ChatJob'>;

export function ChatJobScreen() {
  const nav = useNavigation();
  const route = useRoute<ChatJobRouteProp>();
  const { jobId, otherPartyName } = route.params;

  const profile = useAuthStore((s) => s.profile);
  const {
    messages,
    isLoading,
    isSending,
    fetchMessages,
    sendMessage,
    markAllRead,
    subscribeToMessages,
    clearMessages,
  } = useJobChatStore();

  const [text, setText] = useState('');
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const chatEnabled = jobStatus === 'accepted' || jobStatus === 'in_progress';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      const { data: job } = await supabase
        .from('jobs')
        .select('status, customer_id, plumber_id')
        .eq('id', jobId)
        .single();

      if (cancelled) return;

      if (job) {
        setJobStatus(job.status);
        const otherId = job.customer_id === profile?.id ? job.plumber_id : job.customer_id;
        setRecipientId(otherId);
      }
      setStatusLoading(false);

      if (job && (job.status === 'accepted' || job.status === 'in_progress') && profile?.id) {
        await fetchMessages(jobId);
        if (cancelled) return;
        await markAllRead(jobId, profile.id);
        if (cancelled) return;
        unsubscribe = subscribeToMessages(jobId, profile.id);
      }
    }

    init();

    return () => {
      cancelled = true;
      unsubscribe?.();
      clearMessages();
    };
  }, [jobId, profile?.id]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !profile?.id || !recipientId) return;

    setText('');
    try {
      await sendMessage({
        jobId,
        content: trimmed,
        senderId: profile.id,
        recipientId,
        senderName: profile.full_name || 'Someone',
      });
    } catch {
      Alert.alert('Message not sent', 'Something went wrong. Please try again.');
    }
  }, [text, profile, recipientId, jobId, sendMessage]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const renderTimeSeparator = (current: JobMessage, previous: JobMessage | undefined) => {
    if (!previous) return null;
    const diff = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
    if (diff < 5 * 60 * 1000) return null;

    const date = new Date(current.created_at);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const label = isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <View style={styles.timeSeparator}>
        <Text style={styles.timeSeparatorText}>{label}</Text>
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: JobMessage; index: number }) => {
    const isMine = item.sender_id === profile?.id;
    const previous = index > 0 ? messages[index - 1] : undefined;

    return (
      <>
        {renderTimeSeparator(item, previous)}
        <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
              {item.content}
            </Text>
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </>
    );
  };

  if (statusLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!chatEnabled) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{otherPartyName}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.grey300} />
          <Text style={styles.lockedTitle}>Chat Unavailable</Text>
          <Text style={styles.lockedText}>
            Chat will become available once the plumber accepts the job and a quote is agreed upon.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{otherPartyName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="chatbubbles-outline" size={40} color={Colors.grey300} />
                <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.grey500}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || isSending}
          >
            <Ionicons
              name="send"
              size={20}
              color={text.trim() && !isSending ? Colors.white : Colors.grey300}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  lockedTitle: {
    ...Typography.h3,
    color: Colors.grey700,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  lockedText: {
    ...Typography.body,
    color: Colors.grey500,
    textAlign: 'center',
  },
  messageList: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  timeSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  timeSeparatorText: {
    ...Typography.caption,
    color: Colors.grey500,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.card,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    ...Typography.body,
    color: Colors.black,
  },
  bubbleTextMine: {
    color: Colors.white,
  },
  bubbleTime: {
    ...Typography.caption,
    color: Colors.grey500,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.grey500,
    marginTop: Spacing.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.grey100,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.black,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.grey100,
  },
});
