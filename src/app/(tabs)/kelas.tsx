import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import firestore udah digabung jadi satu di sini
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Redirect } from 'expo-router';

import { AuthError, authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { BottomTabInset } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { db } from '@/lib/firebase';
import { syncClassSessions } from '@/services/class-sync';
import { hasRole } from '@/utils/roles';
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

// COURSE_OPTIONS udah dihapus karena sekarang ambil dari database
const CLASS_OPTIONS = ['Kelas A', 'Kelas B', 'Kelas C', 'E101', 'E102'];

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
  scroll,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.grabber} />
            {scroll ? (
              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ gap: 12 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetButton({ title, loading, onPress }: { title: string; loading?: boolean; onPress: () => void; }) {
  return (
    <Pressable style={[styles.sheetButton, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={authColors.white} /> : <Text style={styles.sheetButtonText}>{title}</Text>}
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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassData | null>(null);
  const [form, setForm] = useState<ClassInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pickerMode, setPickerMode] = useState<'course' | 'name' | 'student' | null>(null);
  const [availableCourses, setAvailableCourses] = useState<{ label: string; value: string }[]>([]);
  
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

    // Tarik data user yang rolenya praktikan buat Dropdown
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((u: any) => hasRole(u, 'praktikan') && u.id !== currentUser?.id),
        );
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();

    // Tarik data matkul & FILTER berdasarkan hak akses asisten
    const fetchMatkul = async () => {
      try {
        const matkulSnap = await getDocs(collection(db, 'matkul'));
        const allMatkul = matkulSnap.docs.map(d => ({
          id: d.id,
          nama: d.data().nama_matkul || d.data().nama || d.id, 
        }));

        let filtered = allMatkul;

        // Ambil data user terbaru LANGSUNG dari Firestore biar ga pake data cache context yang usang
        if (currentUser?.id) {
          const userRef = doc(db, 'users', currentUser.id);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const matkulDiampu = userData.matkul_diampu || [];

            console.log('Data matkul_diampu dari DB:', matkulDiampu);

            if (currentUser.role === 'asisten') {
              filtered = allMatkul.filter((m) => matkulDiampu.includes(m.id));
            }
          }
        }

        setAvailableCourses(filtered.map(m => ({ label: m.nama, value: m.nama }))); 
      } catch (err) {
        console.error('Gagal load matkul:', err);
      }
    };

    if (currentUser) {
      fetchMatkul();
    }

    return () => unsubscribe();
  }, [currentUser?.id]);

  if (currentUser?.role !== 'asisten') return <Redirect href="/home" />;

  const activeClass = classes.find((c) => c.id === participantClassId) ?? null;
  const unmappedParticipants = activeClass
    ? activeClass.participants.filter(
        (p) => !users.some((u) => typeof u.nim === 'string' && u.nim.trim() === p.nim.trim()),
      )
    : [];

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

    // Validasi extra buat keamanan
    const isAllowed = availableCourses.some(c => c.value === input.course);
    if (!isAllowed) {
      return setFormError('Akses ditolak: Anda tidak berhak membuat kelas untuk matkul ini.');
    }

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
        ? activeClass.participants.map((p) => (p.nim === editingNim ? { nim, name } : p))
        : [...activeClass.participants, { nim, name }];
      await saveParticipants(activeClass.id, next);
      await syncClassSessions(activeClass.id);
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
      await saveParticipants(activeClass.id, activeClass.participants.filter((p) => p.nim !== nim));
      await syncClassSessions(activeClass.id);
      if (editingNim === nim) resetParticipantForm();
    } catch {
      setPError('Gagal menghapus peserta. Coba lagi.');
    }
  };

  const renderPickerModal = () => {
    if (!pickerMode) return null;
    let title = '';
    let options: { label: string; value: any }[] = [];

    if (pickerMode === 'course') {
      title = 'Pilih Mata Praktikum';
      options = availableCourses; // <--- PAKAI STATE YANG SUDAH DIFILTER
    } else if (pickerMode === 'name') {
      title = 'Pilih Kelas';
      options = CLASS_OPTIONS.map(o => ({ label: o, value: o }));
    } else if (pickerMode === 'student') {
      title = 'Pilih Praktikan';
      options = users
        .filter((u) => typeof u.nim === 'string' && u.nim.trim() !== '')
        .map(u => ({
          label: `${u.name} (${u.nim})`,
          value: { name: u.name, nim: u.nim },
        }));
    }

    return ( 
      <Modal visible transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerMode(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 20 }}>Data tidak ditemukan.</Text>
              ) : (
                options.map((opt, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.modalItem}
                    onPress={() => {
                      if (pickerMode === 'course') setForm(f => ({ ...f, course: opt.value }));
                      else if (pickerMode === 'name') setForm(f => ({ ...f, name: opt.value }));
                      else if (pickerMode === 'student') setPForm(opt.value);
                      setPickerMode(null);
                    }}
                  >
                    <Text style={styles.modalItemText}>{opt.label}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setPickerMode(null)}>
              <Text style={styles.modalCloseBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return ( 
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
          <View style={styles.headerInner}>
            <View style={styles.headerTopRow}>
              <BackButton />
              <Text style={styles.headerEyebrow}>HADIRIN</Text>
            </View>
            <Text style={styles.headerTitle}>Kelola Kelas</Text>
            <Text style={styles.headerSubtitle}>Tambah, ubah, dan hapus kelas praktikum.</Text>

            <Pressable style={styles.addButton} onPress={openAdd}>
              <Ionicons name="add" size={18} color={authColors.navy} />
              <Text style={styles.addButtonText}>Tambah Kelas</Text>
            </Pressable>
          </View>
        </View>

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
                <Text style={styles.stateText}>Tekan &quot;Tambah Kelas&quot; untuk membuat kelas pertama.</Text>
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
                      <Text style={styles.cardMeta}>{item.name}{item.room ? ` · ${item.room}` : ''}</Text>
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
                    <Pressable style={styles.actionDanger} onPress={() => { setDeleteError(null); setToDelete(item); }}>
                      <Text style={styles.actionDangerText}>Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} scroll>
        <Text style={styles.sheetTitle}>{editing ? 'Ubah Kelas' : 'Tambah Kelas'}</Text>
        <Text style={styles.sheetSubtitle}>Isi data kelas praktikum.</Text>

        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.dropdownLabel}>Mata praktikum</Text>
            <Pressable style={styles.dropdownInput} onPress={() => setPickerMode('course')}>
              <Text style={[styles.dropdownInputText, !form.course && { color: '#94A3B8' }]}>
                {form.course || 'Pilih Mata Praktikum'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View>
            <Text style={styles.dropdownLabel}>Nama kelas</Text>
            <Pressable style={styles.dropdownInput} onPress={() => setPickerMode('name')}>
              <Text style={[styles.dropdownInputText, !form.name && { color: '#94A3B8' }]}>
                {form.name || 'Pilih Kelas'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View>
            <Text style={styles.dropdownLabel}>Ruangan</Text>
            <Pressable style={styles.dropdownInput} onPress={() => {}}>
               <Text style={styles.dropdownInputText}>Isi manual di bawah ini</Text>
            </Pressable>
            <View style={{ height: 10 }} /> 
            <TextInput
              style={styles.inputField}
              value={form.room}
              onChangeText={(v) => setForm((f) => ({ ...f, room: v }))}
              placeholder="Contoh: Lab. RPL 01"
            />
          </View>
          <AuthError message={formError} />
        </View>

        <SheetButton title="Simpan" loading={saving} onPress={handleSave} />
        <SheetLink title="Batal" onPress={() => setFormOpen(false)} />
      </Sheet>

      <Sheet visible={!!activeClass} onClose={() => setParticipantClassId(null)}>
        <Text style={styles.sheetTitle}>Peserta</Text>
        <Text style={styles.sheetSubtitle}>{activeClass ? `${activeClass.course} · ${activeClass.name}` : ''}</Text>
        {unmappedParticipants.length ? (
          <Text style={styles.sheetSubtitle}>
            {unmappedParticipants.length} peserta belum punya akun, jadi belum masuk ke sesi
            ({unmappedParticipants.map((p) => p.nim).join(', ')}).
          </Text>
        ) : null}

        <ScrollView style={{ maxHeight: 230 }} showsVerticalScrollIndicator={false}>
          {activeClass && activeClass.participants.length === 0 ? (
            <Text style={styles.emptyParticipants}>Belum ada peserta di kelas ini.</Text>
          ) : (
            activeClass?.participants.map((p, i) => {
              const color = AVATARS[i % AVATARS.length];
              return (
                <View key={p.nim} style={styles.participantRow}>
                  <View style={[styles.participantAvatar, { backgroundColor: color.bg }]}>
                    <Text style={[styles.participantAvatarText, { color: color.fg }]}>{initials(p.name)}</Text>
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
          <Text style={styles.formHeading}>{editingNim ? 'Ubah peserta' : 'Tambah peserta'}</Text>
          
          <View>
            <Text style={styles.dropdownLabel}>Pilih Praktikan</Text>
            <Pressable style={styles.dropdownInput} onPress={() => setPickerMode('student')}>
              <Text style={[styles.dropdownInputText, !pForm.name && { color: '#94A3B8' }]}>
                {pForm.name ? `${pForm.name} (${pForm.nim})` : 'Klik untuk memilih'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </Pressable>
          </View>

          <AuthError message={pError} />
        </View>

        <SheetButton title={editingNim ? 'Simpan Perubahan' : 'Tambah Peserta'} loading={pSaving} onPress={handleSaveParticipant} />
        <SheetLink title={editingNim ? 'Batal Ubah' : 'Tutup'} onPress={() => (editingNim ? resetParticipantForm() : setParticipantClassId(null))} />
      </Sheet>

      <Sheet visible={!!toDelete} onClose={() => setToDelete(null)}>
        <View style={styles.confirmIcon}>
          <Ionicons name="close" size={28} color={authColors.danger} />
        </View>
        <Text style={[styles.sheetTitle, { textAlign: 'center' }]}>Hapus Kelas?</Text>
        <Text style={[styles.sheetSubtitle, { textAlign: 'center' }]}>{toDelete ? `${toDelete.course} · ${toDelete.name}` : ''} akan dihapus beserta daftar pesertanya.</Text>
        <AuthError message={deleteError} />
        <SheetButton title="Ya, Hapus Kelas" loading={deleting} onPress={handleDelete} />
        <SheetLink title="Nanti Saja" onPress={() => setToDelete(null)} />
      </Sheet>

      {renderPickerModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  header: { backgroundColor: authColors.navy, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 56, alignItems: 'center' },
  headerInner: { width: '100%', maxWidth: 800, gap: 6 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  headerEyebrow: { color: '#5EEAD4', fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  headerTitle: { color: authColors.white, fontSize: 28, fontWeight: '800' },
  headerSubtitle: { color: '#B6C2DB', fontSize: 14 },
  addButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: authColors.white, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12 },
  addButtonText: { color: authColors.navy, fontWeight: '800' },
  listWrap: { alignItems: 'center', paddingHorizontal: 20, marginTop: -32 },
  list: { width: '100%', maxWidth: 800, gap: 14 },
  stateCard: { backgroundColor: authColors.white, borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, shadowColor: '#1B2A4E', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  stateIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  stateText: { color: authColors.muted, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: authColors.white, borderRadius: 20, padding: 16, gap: 14, shadowColor: '#1B2A4E', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: authColors.navy, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { color: authColors.white, fontWeight: '800', fontSize: 14 },
  cardTitle: { color: authColors.ink, fontSize: 16, fontWeight: '800' },
  cardMeta: { color: authColors.muted, fontSize: 13, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F6EC', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: authColors.green, fontSize: 12, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionPrimary: { flex: 1.2, alignItems: 'center', paddingVertical: 11, borderRadius: 12, backgroundColor: authColors.navy },
  actionPrimaryText: { color: authColors.white, fontWeight: '800', fontSize: 13 },
  actionOutline: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.field },
  actionOutlineText: { color: authColors.navy, fontWeight: '800', fontSize: 13 },
  actionDanger: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, backgroundColor: authColors.dangerSoft },
  actionDangerText: { color: authColors.danger, fontWeight: '800', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: authColors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '92%' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: authColors.border, marginBottom: 6 },
  sheetTitle: { color: authColors.ink, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: authColors.muted, fontSize: 13, lineHeight: 19 },
  sheetButton: { backgroundColor: authColors.navy, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetButtonText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  sheetLink: { alignItems: 'center', paddingVertical: 8 },
  sheetLinkText: { color: authColors.muted, fontWeight: '700' },
  confirmIcon: { alignSelf: 'center', width: 64, height: 64, borderRadius: 18, backgroundColor: authColors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyParticipants: { color: authColors.muted, paddingVertical: 12, textAlign: 'center' },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: authColors.border },
  participantAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  participantAvatarText: { fontWeight: '800', fontSize: 12 },
  participantName: { color: authColors.ink, fontWeight: '700' },
  participantNim: { color: authColors.muted, fontSize: 12, marginTop: 1 },
  formHeading: { color: authColors.ink, fontWeight: '800', fontSize: 14 },
  
  dropdownLabel: { fontSize: 13, fontWeight: '600', color: authColors.muted, marginBottom: 6 },
  dropdownInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: authColors.field, borderWidth: 1, borderColor: authColors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, justifyContent: 'space-between' },
  dropdownInputText: { fontSize: 14, color: authColors.ink, fontWeight: '500' },
  inputField: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: authColors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: authColors.ink },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#1B2A4E', fontWeight: '600' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 14, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
  modalCloseBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});