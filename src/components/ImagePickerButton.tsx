import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxCount?: number;
}

export function ImagePickerButton({ images, onImagesChange, maxCount = 3 }: Props) {
  const pickImage = async () => {
    if (images.length >= maxCount) {
      Alert.alert('Limit reached', `You can upload up to ${maxCount} images.`);
      return;
    }

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
      onImagesChange([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {images.map((uri, i) => (
          <View key={uri} style={styles.thumb}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeImage(i)}
            >
              <Ionicons name="close-circle" size={22} color={Colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < maxCount && (
          <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
            <Ionicons name="camera-outline" size={28} color={Colors.grey500} />
            <Text style={styles.addText}>
              {images.length}/{maxCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  addBtn: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    ...Typography.caption,
    color: Colors.grey500,
  },
});
