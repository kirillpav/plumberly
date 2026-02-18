import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
          <Ionicons name="water" size={13} color={Colors.white} />
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
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: 18,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleCompact: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 6,
  },
  text: {
    ...Typography.bodySmall,
    lineHeight: 21,
  },
  textCompact: {
    ...Typography.caption,
    lineHeight: 18,
  },
  textUser: {
    color: Colors.white,
  },
  textAssistant: {
    color: Colors.grey900,
  },
});
