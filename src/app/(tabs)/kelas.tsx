import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, AuthField, authColors } from '@/components/auth-ui';
import { useApp } from '@/context/app-context';
import {
  createClass,
  removeClass,
  saveParticipants,
  subscribeClasses,
  updateClass,
  type ClassData,
  type ClassInput,
  type Participant,
} from '@/lib/classes';

const EMPTY_FORM: ClassInput = { name: '', course: '', room: '' };

const AVATARS = [
  { bg: '#FDE7D6', fg: '#C2410C' },
  { bg: '#DCE6FB', fg: '#1D4ED8' },
  { bg: '#DDF3E4', fg: '#15803D' },
  { bg: '#EBDDF7', fg: '#7E22CE' },
];

function initials(text: string) {
  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.grabber} />
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetButton({
  title,
  loading,
  onPress,
}: {
  title: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.sheetButton, loading && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={authColors.white} />
      ) : (
        <Text style={styles.sheetButtonText}>{title}</Text>
      )}
    </Pressable>
  );
}

function SheetLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.sheetLink}>
      <Text style={styles.sheetLinkText}>{title}</Text>
    </Pressable>
  );
}

export default function KelasScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassData | null>(null);
  const [form, setForm] = useState<ClassInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<ClassData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [participantClassId, setParticipantClassId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<Participant>({ nim: '', name: '' });
  const [editingNim, setEditingNim] = useState<string | null>(null);
  const [pError, setPError] = useState<string | null>(null);
  const [pSaving, setPSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeClasses(
      (data) => {
        setClasses(data);
        setLoadError(null);
        setLoading(false);
      },
      () => {
        setLoadError('Gagal memuat data kelas. Periksa koneksi lalu coba lagi.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  if (currentUser?.role !== 'asisten') return null;

  const activeClass = classes.find((c) => c.id === participantClassId) ?? null;

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (item: ClassData) => {
    setEditing(item);
    setForm({ name: item.name, course: item.course, room: item.room });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    const input: ClassInput = {
      name: form.name.trim(),
      course: form.course.trim(),
      room: form.room.trim(),
    };
    if (!input.name) return setFormError('Nama kelas wajib diisi.');
    if (!input.course) return setFormError('Mata praktikum wajib diisi.');

    setFormError(null);
    setSaving(true);
    try {
      if (editing) {
        await updateClass(editing.id, input);
      } else {
        await createClass(input, currentUser.id);
      }
      setFormOpen(false);
    } catch {
      setFormError('Gagal menyimpan kelas. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await removeClass(toDelete.id);
      setToDelete(null);
    } catch {
      setDeleteError('Gagal menghapus kelas. Coba lagi.');
    } finally {
      setDeleting(false);
    }
  };

  const resetParticipantForm = () => {
    setPForm({ nim: '', name: '' });
    setEditingNim(null);
    setPError(null);
  };

  const openParticipants = (item: ClassData) => {
    resetParticipantForm();
    setParticipantClassId(item.id);
  };

  const startEditParticipant = (p: Participant) => {
    setPForm({ nim: p.nim, name: p.name });
    setEditingNim(p.nim);
    setPError(null);
  };

  const handleSaveParticipant = async () => {
    if (!activeClass) return;
    const nim = pForm.nim.trim();
    const name = pForm.name.trim();
    if (!nim) return setPError('NIM wajib diisi.');
    if (!name) return setPError('Nama wajib diisi.');
    const duplicate = activeClass.participants.some(
      (p) => p.nim === nim && p.nim !== editingNim,
    );
    if (duplicate) return setPError('NIM sudah terdaftar di kelas ini.');

    setPError(null);
    setPSaving(true);
    try {
      const next = editingNim
        ? activeClass.participants.map((p) =>
            p.nim === editingNim ? { nim, name } : p,
          )
        : [...activeClass.participants, { nim, name }];
      await saveParticipants(activeClass.id, next);
      resetParticipantForm();
    } catch {
      setPError('Gagal menyimpan peserta. Coba lagi.');
    } finally {
      setPSaving(false);
    }
  };

  const handleDeleteParticipant = async (nim: string) => {
    if (!activeClass) return;
    setPError(null);
    try {
      await saveParticipants(
        activeClass.id,
        activeClass.participants.filter((p) => p.nim !== nim),
      );
      if (editingNim === nim) resetParticipantForm();
    } catch {
      setPError('Gagal menghapus peserta. Coba lagi.');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header navy melengkung */}
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.headerInner}>
            <Text style={styles.headerEyebrow}>HADIRIN</Text>
            <Text style={styles.headerTitle}>Kelola Kelas</Text>
            <Text style={styles.headerSubtitle}>
              Tambah, ubah, dan hapus kelas praktikum.
            </Text>

            <Pressable style={styles.addButton} onPress={openAdd}>
              <Ionicons name="add" size={18} color={authColors.navy} />
              <Text style={styles.addButtonText}>Tambah Kelas</Text>
            </Pressable>
          </View>
        </View>

        {/* Daftar kelas */}
        <View style={styles.listWrap}>
          <View style={styles.list}>
            {loading ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={authColors.navy} />
                <Text style={styles.stateText}>Memuat kelas…</Text>
              </View>
            ) : loadError ? (
              <AuthError message={loadError} />
            ) : classes.length === 0 ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIcon}>
                  <Ionicons name="school-outline" size={24} color={authColors.navy} />
                </View>
                <Text style={styles.stateTitle}>Belum ada kelas</Text>
                <Text style={styles.stateText}>
                  Tekan &quot;Tambah Kelas&quot; untuk membuat kelas pertama.
                </Text>
              </View>
            ) : (
              classes.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardAvatar}>
                      <Text style={styles.cardAvatarText}>{initials(item.course)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{item.course}</Text>
                      <Text style={styles.cardMeta}>
                        {item.name}
                        {item.room ? ` · ${item.room}` : ''}
                      </Text>
                    </View>
                    <View style={styles.chip}>
                      <Ionicons name="people-outline" size={13} color={authColors.green} />
                      <Text style={styles.chipText}>{item.participants.length}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable style={styles.actionPrimary} onPress={() => openParticipants(item)}>
                      <Text style={styles.actionPrimaryText}>Peserta</Text>
                    </Pressable>
                    <Pressable style={styles.actionOutline} onPress={() => openEdit(item)}>
                      <Text style={styles.actionOutlineText}>Ubah</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionDanger}
                      onPress={() => {
                        setDeleteError(null);
                        setToDelete(item);
                      }}
                    >
                      <Text style={styles.actionDangerText}>Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sheet: tambah / ubah kelas */}
      <Sheet visible={formOpen} onClose={() => setFormOpen(false)}>
        <Text style={styles.sheetTitle}>{editing ? 'Ubah Kelas' : 'Tambah Kelas'}</Text>
        <Text style={styles.sheetSubtitle}>Isi data kelas praktikum.</Text>

        <View style={{ gap: 14 }}>
          <AuthField
            label="Nama kelas"
            icon="people-outline"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Contoh: Kelas A"
          />
          <AuthField
            label="Mata praktikum"
            icon="book-outline"
            value={form.course}
            onChangeText={(v) => setForm((f) => ({ ...f, course: v }))}
            placeholder="Contoh: Pembelajaran Mesin"
          />
          <AuthField
            label="Ruangan"
            icon="location-outline"
            value={form.room}
            onChangeText={(v) => setForm((f) => ({ ...f, room: v }))}
            placeholder="Contoh: Lab. RPL 01"
          />
          <AuthError message={formError} />
        </View>

        <SheetButton title="Simpan" loading={saving} onPress={handleSave} />
        <SheetLink title="Batal" onPress={() => setFormOpen(false)} />
      </Sheet>

      {/* Sheet: peserta */}
      <Sheet visible={!!activeClass} onClose={() => setParticipantClassId(null)}>
        <Text style={styles.sheetTitle}>Peserta</Text>
        <Text style={styles.sheetSubtitle}>
          {activeClass ? `${activeClass.course} · ${activeClass.name}` : ''}
        </Text>

        <ScrollView style={{ maxHeight: 230 }} showsVerticalScrollIndicator={false}>
          {activeClass && activeClass.participants.length === 0 ? (
            <Text style={styles.emptyParticipants}>Belum ada peserta di kelas ini.</Text>
          ) : (
            activeClass?.participants.map((p, i) => {
              const color = AVATARS[i % AVATARS.length];
              return (
                <View key={p.nim} style={styles.participantRow}>
                  <View style={[styles.participantAvatar, { backgroundColor: color.bg }]}>
                    <Text style={[styles.participantAvatarText, { color: color.fg }]}>
                      {initials(p.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName}>{p.name}</Text>
                    <Text style={styles.participantNim}>{p.nim}</Text>
                  </View>
                  <Pressable onPress={() => startEditParticipant(p)} hitSlop={8}>
                    <Ionicons name="create-outline" size={20} color={authColors.navy} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteParticipant(p.nim)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={authColors.danger} />
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={{ gap: 14, marginTop: 6 }}>
          <Text style={styles.formHeading}>
            {editingNim ? 'Ubah peserta' : 'Tambah peserta'}
          </Text>
          <AuthField
            label="NIM"
            icon="card-outline"
            value={pForm.nim}
            onChangeText={(v) => setPForm((f) => ({ ...f, nim: v }))}
            placeholder="Contoh: 2210511012"
            autoCapitalize="none"
          />
          <AuthField
            label="Nama lengkap"
            icon="person-outline"
            value={pForm.name}
            onChangeText={(v) => setPForm((f) => ({ ...f, name: v }))}
            placeholder="Nama lengkap"
          />
          <AuthError message={pError} />
        </View>

        <SheetButton
          title={editingNim ? 'Simpan Perubahan' : 'Tambah Peserta'}
          loading={pSaving}
          onPress={handleSaveParticipant}
        />
        <SheetLink
          title={editingNim ? 'Batal Ubah' : 'Tutup'}
          onPress={() =>
            editingNim ? resetParticipantForm() : setParticipantClassId(null)
          }
        />
      </Sheet>

      {/* Sheet: konfirmasi hapus */}
      <Sheet visible={!!toDelete} onClose={() => setToDelete(null)}>
        <View style={styles.confirmIcon}>
          <Ionicons name="close" size={28} color={authColors.danger} />
        </View>
        <Text style={[styles.sheetTitle, { textAlign: 'center' }]}>Hapus Kelas?</Text>
        <Text style={[styles.sheetSubtitle, { textAlign: 'center' }]}>
          {toDelete ? `${toDelete.course} · ${toDelete.name}` : ''} akan dihapus beserta
          daftar pesertanya.
        </Text>
        <AuthError message={deleteError} />

        <SheetButton title="Ya, Hapus Kelas" loading={deleting} onPress={handleDelete} />
        <SheetLink title="Nanti Saja" onPress={() => setToDelete(null)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },

  header: {
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 56,
    alignItems: 'center',
  },
  headerInner: { width: '100%', maxWidth: 800, gap: 6 },
  headerEyebrow: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  headerTitle: { color: authColors.white, fontSize: 28, fontWeight: '800' },
  headerSubtitle: { color: '#B6C2DB', fontSize: 14 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: authColors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  addButtonText: { color: authColors.navy, fontWeight: '800' },

  listWrap: { alignItems: 'center', paddingHorizontal: 20, marginTop: -32 },
  list: { width: '100%', maxWidth: 800, gap: 14 },

  stateCard: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  stateText: { color: authColors.muted, fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: authColors.white,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { color: authColors.white, fontWeight: '800', fontSize: 14 },
  cardTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  cardMeta: { color: authColors.muted, fontSize: 13, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F6EC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: authColors.green, fontSize: 12, fontWeight: '800' },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionPrimary: {
    flex: 1.2,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: authColors.navy,
  },
  actionPrimaryText: { color: authColors.white, fontWeight: '800', fontSize: 13 },
  actionOutline: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.field,
  },
  actionOutlineText: { color: authColors.navy, fontWeight: '800', fontSize: 13 },
  actionDanger: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: authColors.dangerSoft,
  },
  actionDangerText: { color: authColors.danger, fontWeight: '800', fontSize: 13 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: authColors.border,
    marginBottom: 6,
  },
  sheetTitle: { color: authColors.ink, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: authColors.muted, fontSize: 13, lineHeight: 19 },
  sheetButton: {
    backgroundColor: authColors.navy,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  sheetButtonText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  sheetLink: { alignItems: 'center', paddingVertical: 8 },
  sheetLinkText: { color: authColors.muted, fontWeight: '700' },

  confirmIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: authColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  emptyParticipants: {
    color: authColors.muted,
    paddingVertical: 12,
    textAlign: 'center',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: authColors.border,
  },
  participantAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantAvatarText: { fontWeight: '800', fontSize: 12 },
  participantName: { color: authColors.ink, fontWeight: '700' },
  participantNim: { color: authColors.muted, fontSize: 12, marginTop: 1 },
  formHeading: { color: authColors.ink, fontWeight: '800', fontSize: 14 },
});
