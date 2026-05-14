import React, { useEffect, useState, useCallback } from 'react';
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

const NewsScreen: React.FC = () => {
  const nav = useAppNavigation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState<number>(1);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugJson, setDebugJson] = useState<string | null>(null);

  const loadPage = useCallback(async (p: number, replace = false) => {
    if (!p) return;
    try {
      setError(null);
      if (replace) setLoading(true);
      const { articles: a, nextPage: np } = await fetchNewsPage(p);
      setNextPage(np);
      if (replace) setArticles(a);
      else setArticles(prev => [...prev, ...a]);
    } catch (err: any) {
      console.warn('News load error', err);
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial load
    (async () => {
      await loadPage(1, true);
      // mark as read when user opens the screen
      nav.markNewsRead();
    })();
  }, [loadPage, nav]);

  const loadMore = () => {
    if (loading || !nextPage) return;
    setPage(p => {
      const np = nextPage ?? p + 1;
      loadPage(np);
      return np;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPage(1, true);
      await nav.markNewsRead();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: NewsArticle }) => (
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
  );

  return (
    <View style={styles.container}>
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
          keyExtractor={(item, index) => item.id ?? item.link ?? String(index)}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <NewsCardSkeleton /> : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingVertical: 12,
            paddingHorizontal: Spacing.lg,
            paddingBottom: 140,
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
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
