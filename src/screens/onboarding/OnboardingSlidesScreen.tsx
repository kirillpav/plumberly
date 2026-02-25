import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import type { OnboardingStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;
type Route = RouteProp<OnboardingStackParamList, 'OnboardingSlides'>;

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  description: string;
}

const CUSTOMER_SLIDES: Slide[] = [
  {
    icon: 'chatbubble-ellipses-outline',
    headline: 'Describe Your Problem',
    description:
      'Chat with our AI assistant to diagnose your plumbing issue. It detects emergencies and helps you explain the problem clearly.',
  },
  {
    icon: 'map-outline',
    headline: 'Find Local Professionals',
    description:
      'Browse verified plumbers in your area. Compare ratings, hourly rates, and service regions to find the right fit.',
  },
  {
    icon: 'pricetag-outline',
    headline: 'Get Quotes & Book',
    description:
      'Receive quotes directly from plumbers, compare prices, and accept the best offer — all within the app.',
  },
  {
    icon: 'checkmark-circle-outline',
    headline: 'Track Your Job',
    description:
      'Follow your repair from booking to completion with real-time status updates.',
  },
];

const PLUMBER_SLIDES: Slide[] = [
  {
    icon: 'search-outline',
    headline: 'Browse Enquiries',
    description:
      'See customer requests in your service area with AI-generated problem summaries and photos.',
  },
  {
    icon: 'document-text-outline',
    headline: 'Submit Quotes',
    description:
      'Send competitive quotes with flexible scheduling. Get notified instantly when customers respond.',
  },
  {
    icon: 'clipboard-outline',
    headline: 'Manage Your Jobs',
    description:
      'Track every job from quote to completion with real-time updates and direct customer contact.',
  },
  {
    icon: 'trending-up-outline',
    headline: 'Grow Your Business',
    description:
      'Monitor your revenue with weekly and monthly dashboards, and keep your schedule organised.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingSlidesScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { role } = route.params;
  const slides = role === 'plumber' ? PLUMBER_SLIDES : CUSTOMER_SLIDES;

  const session = useAuthStore((s) => s.session);

  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLastSlide = activeIndex === slides.length - 1;

  const handleNext = async () => {
    if (!isLastSlide) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      return;
    }

    // Last slide — "Get Started"
    nav.navigate('SignIn', { role });
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={styles.illustrationContainer}>
        <Ionicons name={item.icon} size={80} color={Colors.primary} />
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <PrimaryButton
          title={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  headline: {
    ...Typography.h2,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.grey500,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.base,
  },
  footer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grey300,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  button: {
    marginHorizontal: Spacing.base,
  },
});
