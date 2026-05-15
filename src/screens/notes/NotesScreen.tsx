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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEADER_BASE_HEIGHT } from '../../components/common/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../../theme';
import { NoteCardSkeleton } from '../../components/common/Skeleton';
import {
  createNote,
  deleteNote,
  fetchNotes,
  Note,
  updateNote,
} from '../../services/notesService';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── NoteFormModal ─────────────────────────────────────────────────────────────

interface NoteFormModalProps {
  visible: boolean;
  initial?: Note | null;
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void>;
}

const NoteFormModal: React.FC<NoteFormModalProps> = ({
  visible,
  initial,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setContent(initial?.content ?? '');
      setError('');
      setSaving(false);
      // Small delay so the modal finishes animating before focusing
      setTimeout(() => titleRef.current?.focus(), 250);
    }
  }, [visible, initial]);

  const handleSave = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      setError('Title is required.');
      return;
    }
    if (!c) {
      setError('Content is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(t, c);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save note.');
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
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initial ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title input */}
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            ref={titleRef}
            style={styles.titleInput}
            placeholder="Note title…"
            placeholderTextColor={Colors.inputPlaceholder}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
            returnKeyType="next"
          />

          {/* Content input */}
          <Text style={styles.fieldLabel}>Content</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Write your note here…"
            placeholderTextColor={Colors.inputPlaceholder}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={5000}
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* Actions */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {initial ? 'Save Changes' : 'Add Note'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── NoteCard ──────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.8}
    >
      <View style={styles.noteCardTop}>
        <View style={styles.noteCardTitleRow}>
          <Icon
            name="note-text-outline"
            size={16}
            color={Colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.noteCardTitle} numberOfLines={1}>
            {note.title}
          </Text>
        </View>
        <View style={styles.noteCardActions}>
          <TouchableOpacity
            onPress={() => onEdit(note)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconBtn}
          >
            <Icon name="pencil-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(note)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.iconBtn}
          >
            <Icon name="trash-can-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded ? (
        <ScrollView
          style={styles.noteExpandedScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.noteContent}>{note.content}</Text>
        </ScrollView>
      ) : (
        <Text style={styles.noteContentPreview} numberOfLines={2}>
          {note.content}
        </Text>
      )}

      <Text style={styles.noteDate}>
        {note.updatedAt !== note.createdAt
          ? `Updated ${formatDate(note.updatedAt)}`
          : formatDate(note.createdAt)}
      </Text>
    </TouchableOpacity>
  );
};

// ── NotesScreen ───────────────────────────────────────────────────────────────

const NotesScreen: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const data = await fetchNotes();
      setNotes(data);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── CRUD handlers ───────────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setEditingNote(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setModalVisible(true);
  };

  const handleSave = async (title: string, content: string) => {
    if (editingNote) {
      const updated = await updateNote(editingNote._id, title, content);
      setNotes(prev => prev.map(n => (n._id === updated._id ? updated : n)));
    } else {
      const created = await createNote(title, content);
      setNotes(prev => [created, ...prev]);
    }
  };

  const handleDelete = (note: Note) => {
    Alert.alert(
      'Delete Note',
      `Delete "${note.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNote(note._id);
              setNotes(prev => prev.filter(n => n._id !== note._id));
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not delete note.');
            }
          },
        },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderEmpty = () => {
    if (loading) return null;
    if (loadError) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="cloud-off-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Could not load notes</Text>
          <Text style={styles.emptyBody}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Icon name="note-plus-outline" size={56} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptyBody}>
          Tap the + button to add your first trip note.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {loading && notes.length === 0 ? (
        <View style={[styles.listContent, { paddingTop: insets.top + HEADER_BASE_HEIGHT }]}>
          <Text style={styles.screentitle}>My Trip Notes</Text>
          {[1, 2, 3, 4].map(k => (
            <NoteCardSkeleton key={k} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={item => item._id}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + HEADER_BASE_HEIGHT }]}
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.screentitle}>My Trip Notes</Text>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAdd}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Note form modal */}
      <NoteFormModal
        visible={modalVisible}
        initial={editingNote}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: {
    padding: Spacing.base,
    paddingTop: 0, // overridden dynamically via insets + HEADER_BASE_HEIGHT
    paddingBottom: 100, // clear FAB
  },

  screentitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },

  // ── Note card ────────────────────────────────────────────────────────────
  noteCard: {
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
  noteCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  noteCardTitle: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  noteCardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  noteContentPreview: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteExpandedScroll: { maxHeight: 180, marginBottom: 8 },
  noteContent: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  noteDate: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // ── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    // raised higher to avoid being covered by BottomNav
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

  // ── Modal ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  fieldLabel: {
    color: Colors.inputLabel,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  titleInput: {
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
  contentInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 14,
    height: 140,
    marginBottom: 4,
    lineHeight: 20,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  saveButtonText: { color: Colors.white, fontWeight: '800', fontSize: 15 },
});

export default NotesScreen;
