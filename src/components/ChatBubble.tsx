import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  content: string;
  role: 'user' | 'assistant';
  compact?: boolean;
}

export function ChatBubble({ content, role, compact }: Props) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          compact && styles.bubbleCompact,
        ]}
      >
        <Text
          style={[
            compact ? styles.textCompact : styles.text,
            isUser ? styles.textUser : styles.textAssistant,
          ]}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.grey300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  avatarText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.grey700,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  bubbleCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.grey100,
    borderBottomLeftRadius: 4,
  },
  text: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  textCompact: {
    ...Typography.caption,
    lineHeight: 18,
  },
  textUser: {
    color: Colors.white,
  },
  textAssistant: {
    color: Colors.black,
  },
});
