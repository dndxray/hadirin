import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { db } from '@/lib/firebase';
import { theme } from '../theme';
import { ConfirmModal } from './ConfirmModal';
import { EmptyState } from './EmptyState';

export type Participant = { id: string; name: string; nim: string };

type Props = {
  visible: boolean;
  participantIds?: string[];
  /** NIM praktikan yang sudah presensi, supaya tidak muncul lagi di daftar */
  attendedNims: string[];
  onClose: () => void;
  onMark: (participant: Participant) => Promise<void>;
};

// Firestore membatasi operator "in" maksimal 10 nilai (aman untuk semua versi)
const CHUNK = 10;

export function ManualAttendanceModal({
  visible,
  participantIds,
  attendedNims,
  onClose,
  onMark,
}: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Participant | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    const ids = participantIds ?? [];
    if (ids.length === 0) {
      setParticipants([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result: Participant[] = [];
        for (let i = 0; i < ids.length; i += CHUNK) {
          const chunk = ids.slice(i, i + CHUNK);
          const snap = await getDocs(
            query(collection(db, 'users'), where(documentId(), 'in', chunk))
          );
          snap.docs.forEach((d) => {
            const data: any = d.data();
            result.push({
              id: d.id,
              name: data.name ?? '-',
              nim: data.nim ?? '-',
            });
          });
        }
        result.sort((a, b) => a.nim.localeCompare(b.nim));
        if (!cancelled) setParticipants(result);
      } catch {
        if (!cancelled) setError('Gagal memuat daftar praktikan. Periksa koneksi Anda.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, participantIds]);

  // Reset pencarian setiap modal dibuka
  useEffect(() => {
    if (visible) {
      setSearch('');
      setDoneIds([]);
    }
  }, [visible]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return participants.filter((p) => {
      if (attendedNims.includes(p.nim) || doneIds.includes(p.id)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.nim.toLowerCase().includes(q);
    });
  }, [participants, attendedNims, doneIds, search]);

  const handleConfirm = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onMark(selected);
      setDoneIds((prev) => [...prev, selected.id]);
      setSelected(null);
    } catch (e: any) {
      setError(e?.message || 'Gagal mencatat presensi.');
      setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Presensi Manual</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Untuk praktikan yang tidak bisa presensi sendiri, misalnya HP mati.
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Ketik nama atau NIM (contoh: 065)"
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState
                  icon="✅"
                  title={
                    search
                      ? `Tidak ada hasil untuk "${search}"`
                      : 'Semua praktikan sudah presensi'
                  }
                />
              }
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => setSelected(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowNim}>{item.nim}</Text>
                  </View>
                  <Text style={styles.rowAction}>Hadirkan</Text>
                </Pressable>
              )}
            />
          )}
        </View>

        <ConfirmModal
          visible={!!selected}
          title="Hadirkan Praktikan"
          message={`Apakah Anda yakin ingin menandai ${selected?.name} (${selected?.nim}) hadir secara manual?`}
          confirmLabel={busy ? 'Menyimpan...' : 'Hadirkan'}
          confirmColor="green"
          onConfirm={handleConfirm}
          onCancel={() => !busy && setSelected(null)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  center: { paddingVertical: theme.spacing.lg, alignItems: 'center' },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: { color: '#991B1B', fontSize: theme.fontSize.sm, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.text },
  rowNim: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 2 },
  rowAction: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.green },
});