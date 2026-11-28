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
import { Redirect } from 'expo-router';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { AuthError, authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { BottomTabInset } from '@/constants/theme';
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
import { db } from '@/lib/firebase';
import { syncClassSessions } from '@/services/class-sync';
import { hasRole } from '@/utils/roles';

// Ruangan tidak lagi diisi di sini: ditentukan saat asisten membuat sesi.
// Field `room` tetap ada di tipe ClassInput, jadi dikirim kosong (dan nilai
// lama dipertahankan saat mengubah kelas).
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
  const [pickerSearch, setPickerSearch] = useState('');
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
    // room lama dipertahankan agar data yang sudah ada tidak terhapus
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
      const q = pickerSearch.trim().toLowerCase();
      // Praktikan yang sudah ada di kelas ini tidak ditampilkan lagi
      // (kecuali yang sedang diubah)
      const enrolled = new Set((activeClass?.participants ?? []).map((p) => p.nim.trim()));

      options = users
        .filter((u) => typeof u.nim === 'string' && u.nim.trim() !== '')
        .filter((u) => !enrolled.has(u.nim.trim()) || u.nim.trim() === editingNim)
        .filter(
          (u) =>
            !q ||
            String(u.name ?? '').toLowerCase().includes(q) ||
            u.nim.toLowerCase().includes(q),
        )
        .sort((a, b) => a.nim.localeCompare(b.nim))
        .map(u => ({
          label: `${u.name} (${u.nim})`,
          value: { name: u.name, nim: u.nim },
        }));
    }

    const emptyText =
      pickerMode === 'student' && pickerSearch.trim()
        ? `Tidak ada hasil untuk "${pickerSearch.trim()}".`
        : 'Data tidak ditemukan.';

    return ( 
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setPickerMode(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Pressable style={styles.modalOverlay} onPress={() => setPickerMode(null)}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <Text style={styles.modalTitle}>{title}</Text>

              {pickerMode === 'student' && (
                <View style={{ marginBottom: 12 }}>
                  <TextInput
                    style={styles.pickerSearch}
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    placeholder="Ketik nama atau NIM (contoh: 065)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.pickerCount}>{options.length} praktikan</Text>
                </View>
              )}

              <ScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
                {options.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#64748B', marginTop: 20 }}>{emptyText}</Text>
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
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return ( 
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 40 }} showsVerticalScrollIndicator={false}>
        {/* Header (sama seperti halaman Jadwal) */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerCircleA} />
          <View style={styles.headerCircleB} />

          <View style={styles.headerInner}>
            <View style={styles.headerRow}>
              <BackButton />

              <View style={styles.headerText}>
                <Text style={styles.title}>Kelola Kelas</Text>
                <Text style={styles.subtitle}>
                  {loading ? 'Memuat kelas…' : `${classes.length} kelas praktikum`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Kartu aksi yang menumpuk di bawah header */}
        <View style={styles.addWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tambah kelas"
            onPress={openAdd}
            style={({ pressed }) => [styles.addCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.addIcon}>
              <Ionicons name="add" size={22} color={authColors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>Tambah Kelas</Text>
              <Text style={styles.addHint}>Buat kelas praktikum baru</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </Pressable>
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
        <Text style={styles.sheetSubtitle}>
          Isi data kelas praktikum. Ruangan dipilih saat membuat sesi.
        </Text>

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
            <Pressable
              style={styles.dropdownInput}
              onPress={() => {
                setPickerSearch('');
                setPickerMode('student');
              }}
            >
              <Text style={[styles.dropdownInputText, !pForm.name && { color: '#94A3B8' }]}>
                {pForm.name ? `${pForm.name} (${pForm.nim})` : 'Klik untuk mencari praktikan'}
              </Text>
              <Ionicons name="search" size={18} color="#64748B" />
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
  screen: { flex: 1, backgroundColor: '#F4F7FB' },

  // Header, disamakan dengan halaman Jadwal
  header: {
    backgroundColor: '#1B2A4E',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 56,
    overflow: 'hidden',
    alignItems: 'center',
  },
  headerCircleA: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(96,165,250,0.18)' },
  headerCircleB: { position: 'absolute', bottom: -70, left: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)' },
  headerInner: { width: '100%', maxWidth: 800 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 13, marginTop: 2 },

  // Kartu "Tambah Kelas" (posisi dan gaya sama dengan kartu minggu di Jadwal)
  addWrap: { alignItems: 'center', paddingHorizontal: 24, marginTop: -28 },
  addCard: {
    width: '100%',
    maxWidth: 800,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 60,
    shadowColor: '#1B2A4E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
  },
  addIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8EEF9', alignItems: 'center', justifyContent: 'center' },
  addTitle: { fontSize: 15, fontWeight: '800', color: authColors.ink },
  addHint: { fontSize: 11, color: '#64748B', marginTop: 2 },

  listWrap: { alignItems: 'center', paddingHorizontal: 24, marginTop: 20 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1B2A4E', marginBottom: 16, textAlign: 'center' },
  pickerSearch: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: authColors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: authColors.ink },
  pickerCount: { fontSize: 12, color: '#64748B', marginTop: 6 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#1B2A4E', fontWeight: '600' },
  modalCloseBtn: { marginTop: 16, paddingVertical: 14, backgroundColor: '#F1F5F9', borderRadius: 12, alignItems: 'center' },
  modalCloseBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});