import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import type { Lab } from '@/types/sprint-three';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { ConfirmModal } from '../asisten/components/ConfirmModal';

import { createLab, deleteLab, isLabInUse, updateLab } from './lab-service';
import type { LabInput } from './lab-validation';
import { LabFormModal } from './LabFormModal';
import { useLabs } from './use-labs';

type IconName = ComponentProps<typeof Ionicons>['name'];

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

// Halaman daftar laboratorium untuk asisten (SRS-22: lihat data lab).
export function LabListScreen() {
  const insets = useSafeAreaInsets();
  const { labs, status, errorMessage, retry } = useLabs();
  const [formOpen, setFormOpen] = useState(false);
  // Lab yang sedang diubah; kosong berarti form dipakai untuk menambah lab baru.
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  // Lab yang menunggu konfirmasi hapus, dan lab yang sedang diproses hapus.
  const [deleteTarget, setDeleteTarget] = useState<Lab | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ title: string; text: string } | null>(null);

  const failed = status === 'offline' || status === 'error';
  const showEmpty = status === 'ready' && labs.length === 0;

  function openCreate() {
    setEditingLab(null);
    setFormOpen(true);
  }

  function openEdit(lab: Lab) {
    setEditingLab(lab);
    setFormOpen(true);
  }

  async function confirmDelete() {
    const lab = deleteTarget;
    setDeleteTarget(null);
    if (!lab) return;
    setActionError(null);

    if (status === 'offline') {
      setActionError({
        title: 'Koneksi bermasalah',
        text: 'Laboratorium baru bisa dihapus setelah tersambung.',
      });
      return;
    }

    setDeletingId(lab.id);
    try {
      // Lab yang masih dipakai sesi tidak boleh dihapus, karena presensi sesi
      // itu membaca lab tersebut untuk memeriksa radius.
      if (await isLabInUse(lab.id)) {
        setActionError({
          title: 'Laboratorium tidak bisa dihapus',
          text: `${lab.name} masih dipakai oleh sesi praktikum. Ganti laboratorium pada sesi tersebut terlebih dahulu.`,
        });
        return;
      }
      await deleteLab(lab.id);
    } catch (error) {
      setActionError({
        title: 'Gagal menghapus laboratorium',
        text: firebaseErrorMessage(error),
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(input: LabInput) {
    // Saat koneksi terputus, tulis ke Firestore tertahan tanpa kabar. Lebih
    // jelas ditolak di sini daripada pengguna menunggu tanpa kepastian.
    if (status === 'offline') {
      throw new Error('Koneksi bermasalah. Data baru bisa disimpan setelah tersambung.');
    }
    if (editingLab) await updateLab(editingLab.id, input);
    else await createLab(input);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityLabel="Kembali">
            <Ionicons name="arrow-back" size={22} color={authColors.white} />
          </Pressable>
          <Pressable
            onPress={openCreate}
            style={styles.addButton}
            accessibilityLabel="Tambah laboratorium">
            <Ionicons name="add" size={18} color={authColors.navy} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>HADIRIN</Text>
        <Text style={styles.title}>Kelola Laboratorium</Text>
        <Text style={styles.subtitle}>
          {status === 'ready' || labs.length > 0
            ? `${labs.length} laboratorium terdaftar.`
            : 'Daftar laboratorium untuk presensi dan peta.'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {status === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={authColors.navy} />
            <Text style={styles.loadingText}>Memuat laboratorium...</Text>
          </View>
        ) : null}

        {failed ? (
          <Notice
            icon={status === 'offline' ? 'cloud-offline-outline' : 'alert-circle-outline'}
            tone="danger"
            title={status === 'offline' ? 'Koneksi bermasalah' : 'Gagal memuat laboratorium'}
            text={
              status === 'offline'
                ? 'Data laboratorium belum bisa dimuat dari server. Periksa koneksi internet kamu, lalu coba lagi.'
                : (errorMessage ?? 'Terjadi masalah saat memuat data laboratorium.')
            }
            actionLabel="Coba lagi"
            onAction={retry}
          />
        ) : null}

        {actionError ? (
          <Notice
            icon="alert-circle-outline"
            tone="danger"
            title={actionError.title}
            text={actionError.text}
            actionLabel="Tutup"
            onAction={() => setActionError(null)}
          />
        ) : null}

        {showEmpty ? (
          <Notice
            icon="information-circle-outline"
            tone="info"
            title="Belum ada laboratorium"
            text="Tekan Tambah untuk menambahkan laboratorium pertama."
          />
        ) : null}

        {labs.map((lab) => (
          <LabCard
            key={lab.id}
            lab={lab}
            deleting={deletingId === lab.id}
            onEdit={() => openEdit(lab)}
            onDelete={() => setDeleteTarget(lab)}
          />
        ))}
      </ScrollView>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Hapus laboratorium?"
        message={`${deleteTarget?.name ?? 'Laboratorium ini'} akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <LabFormModal
        visible={formOpen}
        lab={editingLab}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

function LabCard({
  lab,
  deleting,
  onEdit,
  onDelete,
}: {
  lab: Lab;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons name="business-outline" size={20} color={authColors.navy} />
        </View>
        <Text style={styles.cardName}>{lab.name}</Text>
        <View style={styles.cardActions}>
          <Pressable
            onPress={onEdit}
            disabled={deleting}
            hitSlop={10}
            style={styles.cardAction}
            accessibilityLabel={`Ubah ${lab.name}`}>
            <Ionicons name="create-outline" size={20} color={authColors.navy} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={deleting}
            hitSlop={10}
            style={styles.cardAction}
            accessibilityLabel={`Hapus ${lab.name}`}>
            {deleting ? (
              <ActivityIndicator size="small" color={authColors.danger} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={authColors.danger} />
            )}
          </Pressable>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Koordinat</Text>
        <Text style={styles.cardValue}>
          {lab.latitude.toFixed(5)}, {lab.longitude.toFixed(5)}
        </Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Radius presensi</Text>
        <Text style={styles.cardValue}>{lab.radiusMeters} m</Text>
      </View>
    </View>
  );
}

type NoticeProps = {
  icon: IconName;
  title: string;
  text: string;
  tone: 'danger' | 'info';
  actionLabel?: string;
  onAction?: () => void;
};

function Notice({ icon, title, text, tone, actionLabel, onAction }: NoticeProps) {
  const danger = tone === 'danger';
  return (
    <View style={[styles.notice, danger ? styles.noticeDanger : styles.noticeInfo]}>
      <Ionicons name={icon} size={22} color={danger ? authColors.danger : authColors.navy} />
      <View style={styles.noticeBody}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{text}</Text>
        {actionLabel && onAction ? (
          <Pressable style={styles.noticeButton} onPress={onAction}>
            <Text style={styles.noticeButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  header: {
    backgroundColor: authColors.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: authColors.white,
  },
  addButtonText: { fontSize: 13, fontWeight: '800', color: authColors.navy },
  eyebrow: { color: '#B6C2DB', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: authColors.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#BBC7DC', fontSize: 14, lineHeight: 22, marginTop: 4 },
  content: { padding: 16, gap: 12 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  loadingText: { fontSize: 14, color: authColors.muted },
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: authColors.white,
    borderWidth: 1,
    borderColor: authColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.field,
  },
  cardName: { flex: 1, fontSize: 16, fontWeight: '800', color: authColors.ink },
  cardActions: { flexDirection: 'row', gap: 8 },
  cardAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.field,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardLabel: { fontSize: 13, color: authColors.muted },
  cardValue: { fontSize: 13, fontWeight: '700', color: authColors.ink },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeDanger: { backgroundColor: authColors.dangerSoft, borderColor: authColors.danger },
  noticeInfo: { backgroundColor: authColors.white, borderColor: authColors.border },
  noticeBody: { flex: 1, gap: 4 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: authColors.ink },
  noticeText: { fontSize: 13, lineHeight: 18, color: authColors.ink },
  noticeButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: authColors.navy,
  },
  noticeButtonText: { fontSize: 13, fontWeight: '700', color: authColors.white },
});
