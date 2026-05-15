import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';
import { NewsCardSkeleton } from '../../components/common/Skeleton';
import { fetchNewsPage, NewsArticle } from '../../services/newsService';
import { fetchNewsRaw } from '../../services/newsService';
import { useAppNavigation } from '../../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_BASE_HEIGHT } from '../../components/common/AppHeader';

const NewsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugJson, setDebugJson] = useState<string | null>(null);

  // Synchronous guard — prevents onEndReached from firing multiple concurrent
  // loadPage calls before React propagates the loading=true state update.
  const isLoadingRef = useRef(false);

  const loadPage = useCallback(async (p: number, replace = false) => {
    if (!p || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const { articles: a, nextPage: np } = await fetchNewsPage(p);
      setNextPage(np);
      if (replace) setArticles(a);
      else setArticles(prev => [...prev, ...a]);
    } catch (err: any) {
      console.warn('News load error', err);
      setError(err?.message ?? String(err));
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const markNewsReadRef = useRef(nav.markNewsRead);
  useEffect(() => {
    markNewsReadRef.current = nav.markNewsRead;
  });

  useEffect(() => {
    // initial load
    (async () => {
      await loadPage(1, true);
      // mark as read when user opens the screen
      markNewsReadRef.current();
    })();
  }, [loadPage]);

  const loadMore = useCallback(() => {
    // isLoadingRef check is synchronous — catches rapid onEndReached calls
    // before the loading state update has propagated through React.
    if (isLoadingRef.current || nextPage === null) return;
    loadPage(nextPage);
  }, [nextPage, loadPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPage(1, true);
      await markNewsReadRef.current();
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const keyExtractor = useCallback(
    (item: NewsArticle, index: number) => item.id ?? item.link ?? String(index),
    [],
  );

  const renderItem = useCallback(({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.link) Linking.openURL(item.link);
      }}
    >
      <View style={styles.cardRow}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}

        <View style={styles.cardContent}>
          <Text style={Typography.h3} numberOfLines={2}>
            {item.title}
          </Text>
          {item.pubDate ? (
            <Text style={styles.date}>{formatDate(item.pubDate)}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.desc} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
          {item.source ? (
            <Text style={styles.source}>{item.source}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  // Stable object reference — prevents FlatList from re-computing layout on every render
  const flatListContentStyle = React.useMemo(
    () => ({ paddingVertical: 12, paddingHorizontal: Spacing.lg, paddingBottom: 140 }),
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + HEADER_BASE_HEIGHT }]}>
      {loading && articles.length === 0 ? (
        <View style={{ paddingTop: 24, paddingHorizontal: Spacing.lg }}>
          {[1, 2, 3, 4, 5].map(k => (
            <NewsCardSkeleton key={k} />
          ))}
        </View>
      ) : error ? (
        <View style={{ padding: Spacing.lg }}>
          <Text style={{ color: Colors.accent }}>
            Failed to load news: {error}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            style={{ marginTop: Spacing.md }}
          >
            <Text style={{ color: Colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : articles.length === 0 ? (
        <View style={{ padding: Spacing.lg }}>
          <Text style={{ color: Colors.textSecondary }}>
            No news available.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              setDebugJson('Loading...');
              try {
                const raw = await fetchNewsRaw(1);
                setDebugJson(JSON.stringify(raw, null, 2).slice(0, 2000));
              } catch (e: any) {
                setDebugJson(String(e));
              }
            }}
            style={{ marginTop: Spacing.md }}
          >
            <Text style={{ color: Colors.primary }}>Show API response</Text>
          </TouchableOpacity>
          {debugJson ? (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={{ color: Colors.textSecondary }}>{debugJson}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <NewsCardSkeleton /> : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={flatListContentStyle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // overridden dynamically via insets + HEADER_BASE_HEIGHT
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    // Android shadow
    elevation: 2,
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: Platform.select({ ios: 'visible', android: 'hidden' }),
  },
  imageFull: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: Colors.border,
  },
  cardInner: {
    padding: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  thumb: {
    width: 100,
    height: 72,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.border,
  },
  thumbPlaceholder: {
    width: 100,
    height: 72,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.border,
  },
  cardContent: {
    flex: 1,
  },
  date: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  desc: {
    marginTop: 6,
    color: Colors.textPrimary,
  },
  source: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  title: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
});

function formatDate(s?: string) {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

export default NewsScreen;
