import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';


import { Colors, Spacing } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TravelCardSkeleton } from '../../components/common/Skeleton';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { AppConfig } from '../../constants/AppConfig';
import { getToken } from '../../services/authService';
import {
  getSearchHistory,
  clearSearchHistory,
  formatSearchTime,
  SearchHistoryItem,
} from '../../services/searchHistoryService';

interface PlaceItem {
  _id: string;
  name: string;
  category: string;
  shortDescription: string;
  latitude: number;
  longitude: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  Heritage: '🏛️',
  Nature: '🌿',
  Restaurant: '🍽️',
  Beach: '🏖️',
  Mountain: '⛰️',
  City: '🏙️',
  Adventure: '🏕️',
  Museum: '🖼️',
};

const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] ?? '📍';

const TravelHistoryScreen: React.FC = () => {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const loadSearchHistory = async () => {
    const history = await getSearchHistory();
    setSearchHistory(history);
  };

  // destinations list removed: Travel history now shows only search history

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSearchHistory();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSearchHistory();
    setRefreshing(false);
  };

  const handleClearHistory = async () => {
    await clearSearchHistory();
    setSearchHistory([]);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✈️</Text>
      <Text style={styles.emptyTitle}>No Trips Yet</Text>
      <Text style={styles.emptyDesc}>
        Start exploring places using the Map or AR features. Your visited
        destinations will appear here.
      </Text>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => nav.navigate('Map')}
      >
        <Text style={styles.exploreBtnText}>Explore Map</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, index }: { item: SearchHistoryItem; index: number }) => (
    <View key={`${item.id}_${item.searchedAt}`} style={[styles.card, index === 0 && styles.cardFirst]}>
      <View style={[styles.cardIcon, styles.searchCardIcon]}>
        <Text style={styles.cardIconText}>🔍</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>Searched: “{item.searchQuery}”</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.badge, styles.searchBadge]}>
            <Text style={[styles.badgeText, styles.searchBadgeText]}>{item.category}</Text>
          </View>
          <Text style={styles.searchTime}>{formatSearchTime(item.searchedAt)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Travel History</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={{ padding: Spacing.base }}>
          {[1, 2, 3, 4, 5].map(k => (
            <TravelCardSkeleton key={k} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={searchHistory}
          keyExtractor={item => `${item.id}_${item.searchedAt}`}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8, // overridden dynamically via insets.top + 8
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  backBtn: { width: 40 },
  backIcon: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorIcon: { fontSize: 40, marginBottom: Spacing.md },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 10,
  },
  retryBtnText: { color: Colors.white, fontWeight: '700' },

  list: { padding: Spacing.base, paddingBottom: 100 },
  listHeader: { marginBottom: Spacing.md },
  listHeaderText: { fontSize: 13, color: Colors.textSecondary },

  cardFirst: { marginTop: 0 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'flex-start',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EAF6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardIconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardMeta: { flexDirection: 'row' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#EAF6F8',
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  // ── Search history extras ───────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  clearHistoryTxt: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  searchCardIcon: {
    backgroundColor: '#EDE7F6',
  },
  searchBadge: {
    backgroundColor: '#EDE7F6',
  },
  searchBadgeText: {
    color: '#7B1FA2',
  },
  searchTime: {
    fontSize: 11,
    color: Colors.textMuted ?? Colors.textSecondary,
    marginLeft: Spacing.sm,
    alignSelf: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.inputBorder,
    marginVertical: Spacing.md,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  exploreBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  exploreBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});

export default TravelHistoryScreen;
