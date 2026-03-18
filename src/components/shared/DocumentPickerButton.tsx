import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface Props {
  label: string;
  fileName: string | null;
  onPick: (uri: string, fileName: string) => void;
  onClear: () => void;
  error?: string;
  hint?: string;
}

export function DocumentPickerButton({
  label,
  fileName,
  onPick,
  onClear,
  error,
  hint,
}: Props) {
  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert('File too large', 'Please select a file under 10MB.');
        return;
      }
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'image';
      onPick(asset.uri, name);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert('File too large', 'Please select a file under 10MB.');
          return;
        }
        onPick(asset.uri, asset.name);
      }
    } catch {
      Alert.alert('Error', 'Could not pick document. Please try again.');
    }
  };

  const showOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Choose from Library', 'Choose Document'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickFromLibrary();
          if (index === 2) pickDocument();
        },
      );
    } else {
      Alert.alert('Select File', 'Choose a source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Choose Document', onPress: pickDocument },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      {fileName ? (
        <View style={styles.fileRow}>
          <Ionicons name="document-attach" size={20} color={Colors.primary} />
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.pickBtn} onPress={showOptions}>
          <Ionicons name="cloud-upload-outline" size={24} color={Colors.grey500} />
          <Text style={styles.pickText}>Tap to upload</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  label: {
    ...Typography.label,
    color: Colors.grey700,
    marginBottom: Spacing.xs,
  },
  hint: {
    ...Typography.caption,
    color: Colors.grey500,
    marginBottom: Spacing.sm,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderStyle: 'dashed',
    backgroundColor: Colors.inputBg,
  },
  pickText: {
    ...Typography.bodySmall,
    color: Colors.grey500,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.lightBlue,
  },
  fileName: {
    ...Typography.bodySmall,
    color: Colors.black,
    flex: 1,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
