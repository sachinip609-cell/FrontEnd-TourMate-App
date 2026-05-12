import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';
import { BudgetCardSkeleton } from '../../components/common/Skeleton';
import {
  Budget,
  BudgetItem,
  createBudget,
  createBudgetItem,
  deleteBudget,
  deleteBudgetItem,
  fetchBudgetItems,
  fetchBudgets,
  updateBudget,
  updateBudgetItem,
} from '../../services/budgetService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Food',
  'Transport',
  'Hotel',
  'Activities',
  'Shopping',
  'Other',
];

function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ spent: number; target: number }> = ({
  spent,
  target,
}) => {
  if (target <= 0) return null;
  const pct = Math.min(spent / target, 1);
  const color =
    pct >= 1 ? Colors.error : pct >= 0.75 ? '#F5A623' : Colors.primary;
  return (
    <View style={pb.track}>
      <View
        style={[
          pb.fill,
          { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
};
const pb = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3 },
});

// ── BudgetFormModal ───────────────────────────────────────────────────────────

interface BudgetFormProps {
  visible: boolean;
  initial?: Budget | null;
  onClose: () => void;
  onSave: (
    title: string,
    currency: string,
    targetAmount: number,
  ) => Promise<void>;
}

const BudgetFormModal: React.FC<BudgetFormProps> = ({
  visible,
  initial,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState('LKR');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setCurrency(initial?.currency ?? 'LKR');
      setTarget(
        initial && initial.targetAmount > 0 ? String(initial.targetAmount) : '',
      );
      setError('');
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 250);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    const t = title.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }
    const ta = target.trim() ? Number(target) : 0;
    if (!Number.isFinite(ta) || ta < 0) {
      setError('Budget target must be a positive number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(t, currency.trim() || 'LKR', ta);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {initial ? 'Edit Budget' : 'New Budget'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Title</Text>
          <TextInput
            ref={titleRef}
            style={s.input}
            placeholder="e.g. Sri Lanka Trip"
            placeholderTextColor={Colors.inputPlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            returnKeyType="next"
          />

          <Text style={s.label}>Currency</Text>
          <TextInput
            style={s.input}
            placeholder="LKR"
            placeholderTextColor={Colors.inputPlaceholder}
            value={currency}
            onChangeText={setCurrency}
            maxLength={10}
            autoCapitalize="characters"
            returnKeyType="next"
          />

          <Text style={s.label}>Budget Target (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor={Colors.inputPlaceholder}
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.saveBtnText}>
                {initial ? 'Save Changes' : 'Create Budget'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── ItemFormModal ─────────────────────────────────────────────────────────────

interface ItemFormProps {
  visible: boolean;
  initial?: BudgetItem | null;
  onClose: () => void;
  onSave: (title: string, amount: number, category?: string) => Promise<void>;
}

const ItemFormModal: React.FC<ItemFormProps> = ({
  visible,
  initial,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setAmount(initial ? String(initial.amount) : '');
      setCategory(initial?.category ?? '');
      setError('');
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 250);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    const t = title.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError('Amount must be a valid non-negative number.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(t, amt, category.trim() || undefined);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>
              {initial ? 'Edit Expense' : 'Add Expense'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Description</Text>
          <TextInput
            ref={titleRef}
            style={s.input}
            placeholder="e.g. Lunch at Galle Face"
            placeholderTextColor={Colors.inputPlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            returnKeyType="next"
          />

          <Text style={s.label}>Amount</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            placeholderTextColor={Colors.inputPlaceholder}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />

          <Text style={s.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catChip, category === cat && s.catChipActive]}
                onPress={() => setCategory(prev => (prev === cat ? '' : cat))}
              >
                <Text
                  style={[
                    s.catChipText,
                    category === cat && s.catChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!!error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={s.saveBtnText}>
                {initial ? 'Save Changes' : 'Add Expense'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── BudgetDetailModal ─────────────────────────────────────────────────────────

interface DetailProps {
  budget: Budget;
  visible: boolean;
  onClose: () => void;
  onBudgetUpdated: (b: Budget) => void;
}

const BudgetDetailModal: React.FC<DetailProps> = ({
  budget,
  visible,
  onClose,
  onBudgetUpdated,
}) => {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBudgetItems(budget._id);
      setItems(data);
    } catch {
      // silently fail — user can pull to retry
    } finally {
      setLoading(false);
    }
  }, [budget._id]);

  useEffect(() => {
    if (visible) loadItems();
  }, [visible, loadItems]);

  const spent = items.reduce((s, i) => s + i.amount, 0);
  const remaining =
    budget.targetAmount > 0 ? budget.targetAmount - spent : null;

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModal(true);
  };
  const handleEditItem = (item: BudgetItem) => {
    setEditingItem(item);
    setItemModal(true);
  };

  const handleSaveItem = async (
    title: string,
    amount: number,
    category?: string,
  ) => {
    if (editingItem) {
      const updated = await updateBudgetItem(
        budget._id,
        editingItem._id,
        title,
        amount,
        category,
        editingItem.spentAt,
      );
      setItems(prev => prev.map(i => (i._id === updated._id ? updated : i)));
    } else {
      const created = await createBudgetItem(
        budget._id,
        title,
        amount,
        category,
      );
      setItems(prev => [created, ...prev]);
    }
    // Reflect in parent (updatedAt changed)
    onBudgetUpdated({ ...budget, updatedAt: Date.now() });
  };

  const handleDeleteItem = (item: BudgetItem) => {
    Alert.alert('Delete Expense', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudgetItem(budget._id, item._id);
            setItems(prev => prev.filter(i => i._id !== item._id));
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not delete item.');
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={d.root} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={d.header}>
          <TouchableOpacity onPress={onClose} style={d.backBtn}>
            <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={d.headerTitle} numberOfLines={1}>
            {budget.title}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Summary card */}
        <View style={d.summaryCard}>
          <View style={d.summaryRow}>
            <View>
              <Text style={d.summaryLabel}>Total Spent</Text>
              <Text style={d.summarySpent}>
                {fmtAmount(spent, budget.currency)}
              </Text>
            </View>
            {budget.targetAmount > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={d.summaryLabel}>Target</Text>
                <Text style={d.summaryTarget}>
                  {fmtAmount(budget.targetAmount, budget.currency)}
                </Text>
              </View>
            )}
          </View>
          <ProgressBar spent={spent} target={budget.targetAmount} />
          {remaining !== null && (
            <Text
              style={[d.remaining, remaining < 0 && { color: Colors.error }]}
            >
              {remaining >= 0
                ? `${fmtAmount(remaining, budget.currency)} remaining`
                : `Over budget by ${fmtAmount(
                    Math.abs(remaining),
                    budget.currency,
                  )}`}
            </Text>
          )}
        </View>

        {/* Items list */}
        {loading ? (
          <View style={{ padding: 16 }}>
            {[1, 2, 3].map(k => (
              <BudgetCardSkeleton key={k} />
            ))}
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i._id}
            contentContainerStyle={d.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={loadItems}
            refreshing={loading}
            ListEmptyComponent={
              <View style={d.emptyBox}>
                <Icon
                  name="receipt-outline"
                  size={44}
                  color={Colors.textMuted}
                />
                <Text style={d.emptyText}>No expenses yet</Text>
                <Text style={d.emptySubText}>
                  Tap + to add your first expense.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={d.itemCard}>
                <View style={d.itemLeft}>
                  <View style={d.categoryDot}>
                    <Text style={d.categoryDotText}>
                      {(item.category ?? 'Other')[0]}
                    </Text>
                  </View>
                  <View>
                    <Text style={d.itemTitle}>{item.title}</Text>
                    <Text style={d.itemMeta}>
                      {item.category ?? 'Other'} • {fmtDate(item.spentAt)}
                    </Text>
                  </View>
                </View>
                <View style={d.itemRight}>
                  <Text style={d.itemAmount}>
                    {fmtAmount(item.amount, budget.currency)}
                  </Text>
                  <View style={d.itemActions}>
                    <TouchableOpacity
                      onPress={() => handleEditItem(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon
                        name="pencil-outline"
                        size={16}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8 }}
                    >
                      <Icon
                        name="trash-can-outline"
                        size={16}
                        color={Colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={d.fab}
          onPress={handleAddItem}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={26} color={Colors.white} />
        </TouchableOpacity>

        <ItemFormModal
          visible={itemModal}
          initial={editingItem}
          onClose={() => setItemModal(false)}
          onSave={handleSaveItem}
        />
      </SafeAreaView>
    </Modal>
  );
};

const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontWeight: '800',
    fontSize: 17,
  },
  summaryCard: {
    margin: Spacing.base,
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 14,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 1,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 2 },
  summarySpent: { color: Colors.textPrimary, fontWeight: '800', fontSize: 24 },
  summaryTarget: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  remaining: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 120 },
  itemCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,153,168,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  categoryDotText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  itemTitle: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  itemMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemAmount: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  itemActions: { flexDirection: 'row', marginTop: 4 },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 12,
  },
  emptySubText: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.xl,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});

// ── BudgetScreen ──────────────────────────────────────────────────────────────

const BudgetScreen: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [budgetModal, setBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [detailBudget, setDetailBudget] = useState<Budget | null>(null);

  // We also keep a per-budget item map just for the summary total on list
  const [itemTotals, setItemTotals] = useState<Record<string, number>>({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const data = await fetchBudgets();
      setBudgets(data);
      // fetch totals in background (ignore per-budget errors)
      const totals: Record<string, number> = {};
      await Promise.all(
        data.map(async b => {
          try {
            const items = await fetchBudgetItems(b._id);
            totals[b._id] = items.reduce((sum, i) => sum + i.amount, 0);
          } catch {
            totals[b._id] = 0;
          }
        }),
      );
      setItemTotals(totals);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not load budgets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setBudgetModal(true);
  };
  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setBudgetModal(true);
  };

  const handleSaveBudget = async (
    title: string,
    currency: string,
    targetAmount: number,
  ) => {
    if (editingBudget) {
      const updated = await updateBudget(
        editingBudget._id,
        title,
        currency,
        targetAmount,
      );
      setBudgets(prev => prev.map(b => (b._id === updated._id ? updated : b)));
    } else {
      const created = await createBudget(title, currency, targetAmount);
      setBudgets(prev => [created, ...prev]);
    }
  };

  const handleDeleteBudget = (b: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Delete "${b.title}" and all its expenses? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(b._id);
              setBudgets(prev => prev.filter(x => x._id !== b._id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not delete budget.');
            }
          },
        },
      ],
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (loadError) {
      return (
        <View style={s.emptyContainer}>
          <Icon name="cloud-off-outline" size={48} color={Colors.textMuted} />
          <Text style={s.emptyTitle}>Could not load budgets</Text>
          <Text style={s.emptyBody}>{loadError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.emptyContainer}>
        <Icon name="wallet-plus-outline" size={56} color={Colors.textMuted} />
        <Text style={s.emptyTitle}>No budgets yet</Text>
        <Text style={s.emptyBody}>Tap + to create your first trip budget.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      {loading && budgets.length === 0 ? (
        <View style={s.listContent}>
          <Text style={s.screenTitle}>My Trip Budgets</Text>
          {[1, 2, 3].map(k => (
            <BudgetCardSkeleton key={k} />
          ))}
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={b => b._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            <Text style={s.screenTitle}>My Trip Budgets</Text>
          }
          renderItem={({ item: b }) => {
            const spent = itemTotals[b._id] ?? 0;
            const hasTarget = b.targetAmount > 0;
            return (
              <TouchableOpacity
                style={s.budgetCard}
                onPress={() => setDetailBudget(b)}
                activeOpacity={0.82}
              >
                <View style={s.cardTop}>
                  <View style={s.cardTitleRow}>
                    <Icon
                      name="wallet-outline"
                      size={18}
                      color={Colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={s.cardTitle} numberOfLines={1}>
                      {b.title}
                    </Text>
                  </View>
                  <View style={s.cardActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(b)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Icon
                        name="pencil-outline"
                        size={17}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBudget(b)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ padding: 4 }}
                    >
                      <Icon
                        name="trash-can-outline"
                        size={17}
                        color={Colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.cardAmountRow}>
                  <Text style={s.cardSpent}>
                    {fmtAmount(spent, b.currency)}
                  </Text>
                  {hasTarget && (
                    <Text style={s.cardTarget}>
                      {' '}
                      / {fmtAmount(b.targetAmount, b.currency)}
                    </Text>
                  )}
                </View>

                <ProgressBar spent={spent} target={b.targetAmount} />

                {hasTarget && (
                  <Text
                    style={[
                      s.cardRemaining,
                      spent > b.targetAmount && { color: Colors.error },
                    ]}
                  >
                    {spent <= b.targetAmount
                      ? `${fmtAmount(
                          b.targetAmount - spent,
                          b.currency,
                        )} remaining`
                      : `Over budget by ${fmtAmount(
                          spent - b.targetAmount,
                          b.currency,
                        )}`}
                  </Text>
                )}

                <Text style={s.cardTapHint}>Tap to view expenses →</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={s.fab}
        onPress={handleOpenAdd}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={28} color={Colors.white} />
      </TouchableOpacity>

      <BudgetFormModal
        visible={budgetModal}
        initial={editingBudget}
        onClose={() => setBudgetModal(false)}
        onSave={handleSaveBudget}
      />

      {detailBudget && (
        <BudgetDetailModal
          budget={detailBudget}
          visible={!!detailBudget}
          onClose={() => setDetailBudget(null)}
          onBudgetUpdated={updated => {
            setBudgets(prev =>
              prev.map(b => (b._id === updated._id ? updated : b)),
            );
            setDetailBudget(updated);
          }}
        />
      )}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.base, paddingTop: 72, paddingBottom: 120 },
  screenTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },

  // Budget card
  budgetCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: 14,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  cardActions: { flexDirection: 'row', gap: 4 },
  cardAmountRow: { flexDirection: 'row', alignItems: 'baseline' },
  cardSpent: { color: Colors.textPrimary, fontWeight: '800', fontSize: 20 },
  cardTarget: { color: Colors.textSecondary, fontSize: 14 },
  cardRemaining: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  cardTapHint: { color: Colors.textMuted, fontSize: 11, marginTop: 6 },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    marginTop: Spacing.base,
    marginBottom: 6,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.base,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  retryBtnText: { color: Colors.white, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Shared modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sheetTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  label: {
    color: Colors.inputLabel,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  saveBtnText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    marginRight: 8,
    backgroundColor: Colors.inputBackground,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: { color: Colors.textSecondary, fontSize: 13 },
  catChipTextActive: { color: Colors.white, fontWeight: '600' },
});

export default BudgetScreen;
