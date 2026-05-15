import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';
import { FontSizes, FontWeight, Radius } from '../../theme/tokens';
import { useAppNavigation } from '../../navigation/AppNavigator';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Slider data ──────────────────────────────────────────────────────────────

interface SlideItem {
  id: string;
  image: ImageSourcePropType;
  location: string;
  caption: string;
}

const SLIDES: SlideItem[] = [
  {
    id: '1',
    image: require('../../assets/image1.jpg'),
    location: 'Kandy, Sri Lanka',
    caption: 'Temple of the Sacred Tooth',
  },
  {
    id: '2',
    image: require('../../assets/image2.jpg'),
    location: 'Ella, Sri Lanka',
    caption: "Misty hills of Ceylon's highlands",
  },
  {
    id: '3',
    image: require('../../assets/image3.jpg'),
    location: 'Southern Coast, Sri Lanka',
    caption: 'Pristine shores meet the Indian Ocean',
  },
];

// ─── Card dimensions — centered full-page slots (no peek) ──────────────────

const PAGE_W = SW; // each FlatList page fills the screen width (prevents peeking)
const CARD_MARGIN_SIDE = 32; // left/right inset inside each page
const CARD_W = SW - CARD_MARGIN_SIDE * 2; // inner card width
const CARD_H = SH * 0.42; // slightly smaller card height

// ─── Dot indicator ───────────────────────────────────────────────────────────

const Dots: React.FC<{ count: number; activeIndex: number }> = ({
  count,
  activeIndex,
}) => (
  <View style={dot.row}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={[dot.base, i === activeIndex ? dot.active : dot.inactive]}
      />
    ))}
  </View>
);

const dot = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  base: {
    borderRadius: 4,
    marginHorizontal: 3,
  },
  active: {
    width: 22,
    height: 7,
    backgroundColor: Colors.primary,
  },
  inactive: {
    width: 7,
    height: 7,
    backgroundColor: Colors.border,
  },
});

// ─── Slide card ───────────────────────────────────────────────────────────────

const SlideCard: React.FC<{
  item: SlideItem;
  index: number;
  scrollX: Animated.Value;
}> = ({ item, index, scrollX }) => {
  // Scale & opacity parallax based on distance from centre (page-based)
  const inputRange = [
    (index - 1) * PAGE_W,
    index * PAGE_W,
    (index + 1) * PAGE_W,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  const cardOpacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.7, 1, 0.7],
    extrapolate: 'clamp',
  });

  return (
    <View style={[card.slot, { width: PAGE_W }]}> 
      <Animated.View
        style={[card.card, { transform: [{ scale }], opacity: cardOpacity }]}
      >
        {/* Hero image */}
        <Image source={item.image} style={card.image} resizeMode="cover" />

        {/* Gradient overlay for text legibility */}
        <View style={card.overlay} />

        {/* Location badge */}
        <View style={card.locationBadge}>
          <Icon name="map-marker" size={11} color={Colors.white} />
          <Text style={card.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {/* Caption */}
        <Text style={card.caption} numberOfLines={2}>
          {item.caption}
        </Text>
      </Animated.View>
    </View>
  );
};

const card = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    // Android elevation
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    // simulate gradient from transparent → dark
    backgroundColor: 'rgba(0,0,0,0.01)',
    // We layer a second view for a realistic fade
  },
  locationBadge: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  locationText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  caption: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

// ─── WelcomeScreen ────────────────────────────────────────────────────────────

interface Props {
  userName: string;
}

const WelcomeScreen: React.FC<Props> = ({ userName }) => {
  const nav = useAppNavigation();
  const flatRef = useRef<FlatList<SlideItem>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeIndexRef = useRef(0);
  // looped data for infinite forward-only carousel: [last, ...slides, first]
  const loopedSlides = useMemo(() => {
    if (SLIDES.length <= 1) return SLIDES;
    return [SLIDES[SLIDES.length - 1], ...SLIDES, SLIDES[0]] as SlideItem[];
  }, []);
  const LOOPED_LEN = loopedSlides.length;
  const currentLoopedIndexRef = useRef(1); // 1 => first real slide
  const isAnimatingRef = useRef(false);

  const startAutoPlay = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current as any);
    }
    autoTimer.current = setInterval(() => {
      if (isAnimatingRef.current) return; // don't interrupt ongoing animation
      const nextLooped = currentLoopedIndexRef.current + 1;
      isAnimatingRef.current = true;
      flatRef.current?.scrollToOffset({ offset: nextLooped * PAGE_W, animated: true });
      currentLoopedIndexRef.current = nextLooped;
      // real activeIndex will be set on momentum end
    }, 3000);
  }, []);

  // First-name only for the greeting
  const firstName = userName.split(' ')[0] ?? userName;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const loopedIdx = viewableItems[0].index;
        const realIdx = ((loopedIdx - 1) + SLIDES.length) % SLIDES.length;
        activeIndexRef.current = realIdx;
        setActiveIndex(realIdx);
      }
    },
    [],
  );

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // on mount: position to first real slide, start autoplay
  useEffect(() => {
    // wait a tick for FlatList to mount
    const t = setTimeout(() => {
      if (flatRef.current) {
        flatRef.current.scrollToOffset({ offset: PAGE_W * 1, animated: false });
        currentLoopedIndexRef.current = 1;
        activeIndexRef.current = 0;
        setActiveIndex(0);
      }
      startAutoPlay();
    }, 50);

    return () => {
      clearTimeout(t);
      if (autoTimer.current) {
        clearInterval(autoTimer.current as any);
        autoTimer.current = null;
      }
    };
  }, [startAutoPlay]);

  // Pause autoplay when user interacts; resume on momentum end
  const handleScrollBeginDrag = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current as any);
      autoTimer.current = null;
    }
  }, []);

  const handleMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x || 0;
    const loopedIdx = Math.round(offsetX / PAGE_W);
    currentLoopedIndexRef.current = loopedIdx;
    const realIdx = ((loopedIdx - 1) + SLIDES.length) % SLIDES.length;
    activeIndexRef.current = realIdx;
    setActiveIndex(realIdx);
    isAnimatingRef.current = false;

    // If we're on the duplicated boundaries - jump to the corresponding real slide without animation
    if (loopedIdx === LOOPED_LEN - 1) {
      // landed on duplicate of first -> jump to first real
      requestAnimationFrame(() => {
        flatRef.current?.scrollToOffset({ offset: PAGE_W * 1, animated: false });
        currentLoopedIndexRef.current = 1;
      });
    } else if (loopedIdx === 0) {
      // landed on duplicate of last -> jump to last real
      const lastRealLooped = LOOPED_LEN - 2;
      requestAnimationFrame(() => {
        flatRef.current?.scrollToOffset({ offset: PAGE_W * lastRealLooped, animated: false });
        currentLoopedIndexRef.current = lastRealLooped;
      });
    }

    // restart autoplay after user stops interacting
    startAutoPlay();
  }, [LOOPED_LEN, startAutoPlay]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.background}
        translucent={false}
      />

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingLine}>Hi {firstName} 👋</Text>
          <Text style={styles.welcomeTitle}>Welcome to TourMate</Text>
        </View>
        {/* Decorative compass pill */}
        {/* <View style={styles.compassPill}>
          <Icon name="compass-outline" size={22} color={Colors.primary} />
        </View> */}
      </View>

      {/* ── Slider ────────────────────────────────────────────────────────── */}
      <View style={styles.sliderWrapper}>
        <Animated.FlatList
          ref={flatRef}
          data={loopedSlides}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          horizontal
          pagingEnabled={true}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{}}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          onScrollBeginDrag={handleScrollBeginDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          viewabilityConfig={viewConfig}
          renderItem={({ item, index }) => (
            <SlideCard item={item} index={index} scrollX={scrollX} />
          )}
        />
      </View>

      {/* ── Dot indicators ────────────────────────────────────────────────── */}
      <Dots count={SLIDES.length} activeIndex={activeIndex} />

      {/* ── Bottom copy ───────────────────────────────────────────────────── */}
      <View style={styles.copyBlock}>
        <Text style={styles.headline}>
          Every destination begins{'\n'}with the right guide.
        </Text>
        <Text style={styles.subline}>
          Discover places. Track memories. Travel with TourMate.
        </Text>
      </View>

      {/* ── CTA button ────────────────────────────────────────────────────── */}
      <View style={styles.ctaBlock}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => nav.navigate('Home')}
          activeOpacity={0.87}
        >
          <Text style={styles.ctaBtnText}>Start Trip</Text>
          <Icon
            name="arrow-right"
            size={16}
            color={Colors.white}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Greeting row
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.sm,
  },
  greetingLine: {
    fontSize: FontSizes.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  compassPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(47,158,136,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(47,158,136,0.18)',
  },

  // Slider wrapper — centres the peek layout correctly
  sliderWrapper: {
    marginTop: Spacing.base,
  },

  // Copy block
  copyBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  headline: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  subline: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },

  // CTA
  ctaBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : Spacing.sm,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    // iOS shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    // Android elevation
    elevation: 8,
  },
  ctaBtnText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default WelcomeScreen;
