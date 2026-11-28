import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { StateView } from '@/components/state-view';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import {
  deleteSession,
  ensureSessionQrToken,
  setSessionStatus,
  subscribePermissionRequests,
  subscribeSessionAttendances,
  updateSession,
} from '@/services/assistant-service';
import { syncClassSessions } from '@/services/class-sync';
import { notifyUsers } from '@/services/notification-service';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { initials } from '@/utils/home-format';
import { normalizeNim } from '@/utils/nim';
import { getSessionSchedule, getSessionStatus, isSessionFinished } from '@/utils/session-status';
import { SessionFormModal } from '../../features/asisten/components/SessionFormModal';
import { SessionQRModal } from '../../features/asisten/components/SessionQRModal';
import type { Attendance, PermissionRequestItem } from '../../features/asisten/types';

// Aturan token sama dengan parseAttendanceQr di utils/attendance-location.ts
const QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

const PREVIEW_COUNT = 4;

type Filter = 'semua' | 'hadir' | 'belum' | 'izin';
type RowStatus = 'hadir' | 'belum' | 'izin';
type Row = { key: string; name: string; nim: string; status: RowStatus; time: number | null };

const AVATAR_TONES = [
  { bg: '#FDE8D7', fg: '#C2570C' },
  { bg: '#DCE8FD', fg: '#2F5BEA' },
  { bg: '#DDF5E6', fg: '#15803D' },
  { bg: '#EBE1FA', fg: '#7C3AED' },
];

const STATUS_RANK: Record<RowStatus, number> = { hadir: 0, izin: 1, belum: 2 };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function timePart(range?: string, index = 0) {
  if (!range) return '';
  const parts = String(range).split(/[-–]/);
  return (parts[index] ?? '').replace(/WIB/i, '').trim();
}

function toMs(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function clock(ms: number | null) {
  if (ms === null) return '--.--';
  const d = new Date(ms);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

function sessionDay(session: any): Date | null {
  const raw = session?.dateTimestamp ?? session?.date;
  let d: Date | null = null;
  if (raw?.toDate) d = raw.toDate();
  else if (raw instanceof Date) d = raw;
  else if (typeof raw === 'string' && !Number.isNaN(Date.parse(raw))) d = new Date(raw);
  return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
}

function parseClock(value?: string) {
  const match = String(value ?? '').match(/(\d{1,2})[:.](\d{2})/);
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

function sessionEndMs(session: any): number | null {
  const day = sessionDay(session);
  const t = parseClock(session?.endTime || timePart(session?.timeRange, 1));
  if (!day || !t) return null;
  day.setHours(t.h, t.m, 0, 0);
  return day.getTime();
}

function remainingLabel(ms: number) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  if (mins < 60) return `${mins} menit lagi`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} jam ${m} menit lagi` : `${h} jam lagi`;
}

/** Bottom sheet konfirmasi (buka sesi, tutup sesi, hapus sesi). */
function ConfirmSheet({
  visible,
  tone,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  tone: 'primary' | 'danger';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const danger = tone === 'danger';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Tutup" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetGrabber} />
          <View style={[styles.sheetIcon, { backgroundColor: danger ? '#FEE2E2' : '#E6F6EC' }]}>
            <Ionicons name={icon} size={30} color={danger ? '#DC2626' : '#22C55E'} />
          </View>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetMessage}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.sheetConfirm,
              { backgroundColor: danger ? '#DC2626' : '#1B2A4E' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.sheetConfirmText}>{confirmLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            hitSlop={8}
            style={({ pressed }) => [styles.sheetCancel, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.sheetCancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { profile, loading: authLoading } = useAuth();
  const { records, permissions } = useAttendance();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);
  const [generatedQrToken, setGeneratedQrToken] = useState<string | null>(null);

  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [permissionItems, setPermissionItems] = useState<PermissionRequestItem[]>([]);
  const [roster, setRoster] = useState<{ nim: string; name: string }[]>([]);
  const [filter, setFilter] = useState<Filter>('semua');
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(Date.now);

  const isAsisten = profile?.role === 'asisten';
  const classId: string = session?.classId ?? '';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'sessions', sessionId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setSession(null);
        } else {
          setSession({ id: snapshot.id, ...snapshot.data() });
        }
        setError(null);
        setLoading(false);
      },
      (failure) => {
        setError(firebaseErrorMessage(failure));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (!isAsisten || !sessionId) return;

    const unsubscribe = subscribeSessionAttendances(
      sessionId,
      (items) => {
        setAttendances(items);
        setAttendanceError(null);
      },
      () => setAttendanceError('Gagal memuat data kehadiran. Periksa koneksi.'),
    );

    return () => unsubscribe();
  }, [isAsisten, sessionId]);

  // Izin yang sudah disetujui untuk sesi ini (dipakai di filter "Izin")
  useEffect(() => {
    if (!isAsisten || !sessionId) return;

    const unsubscribe = subscribePermissionRequests(
      (items) =>
        setPermissionItems(
          items.filter((item) => item.sessionId === sessionId && item.status === 'approved'),
        ),
      () => setPermissionItems([]),
    );

    return () => unsubscribe();
  }, [isAsisten, sessionId]);

  useEffect(() => {
    if (!isAsisten || !classId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'classes', classId),
      (snapshot) => setRoster((snapshot.data()?.participants ?? []) as { nim: string; name: string }[]),
      () => setRoster([]),
    );

    return () => unsubscribe();
  }, [isAsisten, classId]);

  // Perbarui hitung mundur "x menit lagi" dan status buka/tutup
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Gabungkan roster kelas dengan data presensi dan izin (khusus tampilan asisten)
  const rows = useMemo<Row[]>(() => {
    const attByNim = new Map<string, Attendance>();
    attendances.forEach((a) => attByNim.set(normalizeNim(String(a.practitionerNim ?? '')), a));
    const izinByNim = new Map<string, PermissionRequestItem>();
    permissionItems.forEach((p) => izinByNim.set(normalizeNim(String(p.practitionerNim ?? '')), p));

    const usedAtt = new Set<string>();
    const usedIzin = new Set<string>();
    const result: Row[] = [];

    roster.forEach((person, index) => {
      const key = normalizeNim(String(person.nim ?? ''));
      const att = attByNim.get(key);
      if (att) {
        usedAtt.add(att.id);
        result.push({
          key: `r-${index}`,
          name: person.name || att.practitionerName || 'Praktikan',
          nim: person.nim,
          status: 'hadir',
          time: toMs(att.checkedInAt),
        });
        return;
      }
      const izin = izinByNim.get(key);
      if (izin) {
        usedIzin.add(izin.id);
        result.push({
          key: `r-${index}`,
          name: person.name || izin.practitionerName || 'Praktikan',
          nim: person.nim,
          status: 'izin',
          time: null,
        });
        return;
      }
      result.push({
        key: `r-${index}`,
        name: person.name || 'Praktikan',
        nim: person.nim,
        status: 'belum',
        time: null,
      });
    });

    // Presensi/izin dari praktikan yang tidak ada di roster kelas
    attendances
      .filter((a) => !usedAtt.has(a.id))
      .forEach((a) =>
        result.push({
          key: `a-${a.id}`,
          name: a.practitionerName || 'Praktikan',
          nim: a.practitionerNim || '-',
          status: 'hadir',
          time: toMs(a.checkedInAt),
        }),
      );
    permissionItems
      .filter((p) => !usedIzin.has(p.id))
      .forEach((p) =>
        result.push({
          key: `p-${p.id}`,
          name: p.practitionerName || 'Praktikan',
          nim: p.practitionerNim || '-',
          status: 'izin',
          time: null,
        }),
      );

    return result.sort(
      (a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.status === 'hadir' ? (b.time ?? 0) - (a.time ?? 0) : a.name.localeCompare(b.name)),
    );
  }, [roster, attendances, permissionItems]);

  if (authLoading) {
    return <View style={styles.screen}><StateView kind="loading" /></View>;
  }

  if (!profile) return <Redirect href="/login" />;

  if (!sessionId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
        <StateView
          kind="empty"
          title="Sesi tidak ditemukan"
          message="Buka detail sesi dari daftar jadwal."
          actionLabel="Kembali ke Home"
          onAction={goBack}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#1B2A4E" />
        <Text style={styles.centerText}>Memuat detail...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
        <StateView
          kind="empty"
          title="Sesi tidak ditemukan"
          message={error ?? 'Data mungkin sudah dihapus oleh asisten.'}
          actionLabel="Kembali ke Home"
          onAction={goBack}
        />
      </View>
    );
  }

  const nowDate = new Date(now);
  const status = getSessionStatus(session, nowDate);
  const finished = isSessionFinished(session, nowDate);
  const schedule = getSessionSchedule(session);
  const notStarted = !!schedule && nowDate < schedule.start;
  const toggleBlocked = finished || notStarted;

  const participantIds: string[] = session.participantIds ?? [];
  const unmappedCount = Math.max(0, roster.length - participantIds.length);
  const isParticipant = !!profile.uid && participantIds.includes(profile.uid);
  const attended = records.some((record) => record.sessionId === session.id);
  const requested = permissions.some((request) => request.sessionId === session.id);

  // Token QR: pakai yang ada di dokumen sesi, atau yang baru dibuat untuk sesi lama
  const snapshotQrToken =
    typeof session.qrToken === 'string' && QR_TOKEN_PATTERN.test(session.qrToken)
      ? session.qrToken
      : null;
  const qrToken = snapshotQrToken ?? generatedQrToken ?? undefined;

  // Chip status + hitung mundur sampai sesi selesai
  const endMs = sessionEndMs(session);
  const timeLeft = status === 'open' && endMs !== null && endMs > now ? endMs - now : null;
  const statusChip = status === 'open'
    ? {
        label: timeLeft !== null
          ? `Sesi sedang dibuka (${remainingLabel(timeLeft)})`
          : 'Sesi sedang dibuka',
        color: '#15803D',
        background: '#E6F6EC',
      }
    : status === 'upcoming'
      ? { label: 'Sesi belum dibuka', color: '#52627A', background: '#EEF1F6' }
      : { label: 'Sesi telah ditutup', color: '#B91C1C', background: '#FEE2E2' };

  const startDisplay = (session.startTime || timePart(session.timeRange, 0) || '--:--').replace(':', '.');
  const endDisplay = (session.endTime || timePart(session.timeRange, 1) || '--:--').replace(':', '.');

  const toggleLabel = status === 'open'
    ? 'Tutup Sesi'
    : finished
      ? 'Sesi Telah Berakhir'
      : notStarted
        ? `Buka Sesi (mulai ${startDisplay})`
        : 'Buka Sesi';

  // Ringkasan kehadiran (khusus asisten)
  const total = rows.length;
  const hadirCount = rows.filter((r) => r.status === 'hadir').length;
  const belumCount = rows.filter((r) => r.status === 'belum').length;
  const izinCount = rows.filter((r) => r.status === 'izin').length;
  const percent = total > 0 ? Math.round((hadirCount / total) * 100) : 0;

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'semua', label: `Semua (${total})` },
    { key: 'hadir', label: `Hadir (${hadirCount})` },
    { key: 'belum', label: `Belum Hadir (${belumCount})` },
    { key: 'izin', label: `Izin (${izinCount})` },
  ];
  const filteredRows = filter === 'semua' ? rows : rows.filter((r) => r.status === filter);
  const visibleRows = showAll ? filteredRows : filteredRows.slice(0, PREVIEW_COUNT);

  async function openQR() {
    if (qrBusy) return;
    if (qrToken) {
      setShowQR(true);
      return;
    }
    setQrBusy(true);
    setError(null);
    try {
      const token = await ensureSessionQrToken(session.id);
      setGeneratedQrToken(token);
      setShowQR(true);
    } catch (failure: any) {
      setError(failure?.message || firebaseErrorMessage(failure));
    } finally {
      setQrBusy(false);
    }
  }

  async function executeToggle() {
    setShowConfirm(false);
    setBusy(true);
    setError(null);
    try {
      const nextStatus = status === 'open' ? 'closed' : 'open';
      await setSessionStatus(session.id, nextStatus);
      if (nextStatus === 'open' && session.participantIds?.length) {
        void notifyUsers(session.participantIds, {
          type: 'sesi_dibuka',
          title: 'Sesi dibuka',
          body: `Presensi ${session.courseName} (${session.className}) sudah bisa dilakukan.`,
          sessionId: session.id,
        }).catch(() => {});
      }
    } catch (failure: any) {
      setError(failure?.message || firebaseErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  async function executeDelete() {
    setShowDeleteConfirm(false);
    setBusy(true);
    try {
      await deleteSession(session.id);
      router.replace('/home');
    } catch (failure: any) {
      setError(firebaseErrorMessage(failure));
      setBusy(false);
    }
  }

  const praktikanBlocked = !isParticipant || busy || attended;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <BackButton onPress={goBack} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{session.courseName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#B6C2DB" />
              <Text style={[styles.metaText, { flexShrink: 1 }]}>
                {session.className} · {session.room}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Chip status */}
          <View style={styles.statusChipWrap}>
            <View style={[styles.statusChip, { backgroundColor: statusChip.background }]}>
              <View style={[styles.statusDot, { backgroundColor: statusChip.color }]} />
              <Text style={[styles.statusText, { color: statusChip.color }]}>{statusChip.label}</Text>
            </View>
          </View>

          {/* Kartu sesi */}
          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="calendar-outline" size={26} color="#1B2A4E" />
            </View>
            <Text style={styles.dateLabel}>{session.dateLabel || 'Tanggal belum diatur'}</Text>
            <Text style={styles.sessionTitle}>{session.courseName}</Text>

            <View style={styles.timeline}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Mulai</Text>
                <Text style={styles.timeValue}>{startDisplay}</Text>
              </View>
              <View style={styles.timeLineWrap}>
                <View style={styles.timeLine} />
                <View style={[styles.timeDot, status === 'open' && styles.timeDotOpen]} />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Selesai</Text>
                <Text style={styles.timeValue}>{endDisplay}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.assistLabel}>Asisten Praktikum</Text>
            <View style={styles.assistList}>
              <View style={styles.assistRow}>
                <View style={[styles.avatar, { backgroundColor: '#DCE8FD' }]}>
                  <Text style={[styles.avatarText, { color: '#2F5BEA' }]}>
                    {initials(session.assistantName || 'Asisten')}
                  </Text>
                </View>
                <Text style={styles.assistName}>{session.assistantName || 'Asisten Hadirin'}</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isAsisten ? (
              <View style={{ width: '100%', gap: 12 }}>
                <Pressable
                  onPress={() => setShowConfirm(true)}
                  disabled={busy || toggleBlocked}
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: toggleBlocked
                        ? '#94A3B8'
                        : status === 'open'
                          ? '#DC2626'
                          : '#22C55E',
                    },
                    pressed && !busy && !toggleBlocked && { opacity: 0.85 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>{toggleLabel}</Text>
                  )}
                </Pressable>

                {status === 'open' ? (
                  <Pressable
                    onPress={() => void openQR()}
                    disabled={qrBusy}
                    style={({ pressed }) => [
                      styles.actionBtnOutline,
                      (pressed || qrBusy) && { opacity: 0.7 },
                    ]}
                  >
                    {qrBusy ? (
                      <ActivityIndicator size="small" color="#1B2A4E" />
                    ) : (
                      <Ionicons name="qr-code-outline" size={18} color="#1B2A4E" />
                    )}
                    <Text style={styles.actionBtnTextOutline}>
                      {qrBusy ? 'Menyiapkan QR...' : 'Tampilkan QR Code'}
                    </Text>
                  </Pressable>
                ) : null}

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => setShowEditModal(true)}
                    style={({ pressed }) => [styles.actionBtnOutline, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="pencil" size={18} color="#1B2A4E" />
                    <Text style={styles.actionBtnTextOutline}>Edit Sesi</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setShowDeleteConfirm(true)}
                    style={({ pressed }) => [styles.actionBtnDanger, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="trash" size={18} color="#B91C1C" />
                    <Text style={styles.actionBtnTextDanger}>Hapus</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ width: '100%', gap: 10 }}>
                {!isParticipant ? (
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#8A5309" />
                    <Text style={styles.infoText}>
                      Belum terdaftar pada sesi kelas ini. Minta asisten menambahkan NIM akunmu ke sesi.
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/presensi', params: { sessionId: session.id } })}
                  disabled={praktikanBlocked}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: praktikanBlocked ? '#E2E8F0' : '#1B2A4E' },
                    pressed && !praktikanBlocked && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.buttonText, praktikanBlocked && { color: '#64748B' }]}>
                    {!isParticipant ? 'Bukan peserta sesi' : attended ? 'Presensi Tercatat' : 'Isi Presensi'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push({
                    pathname: '/izin',
                    params: {
                      sessionId: session.id,
                      courseName: session.courseName,
                      className: session.className,
                    },
                  })}
                  disabled={attended || requested || status === 'closed'}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonOutline,
                    (attended || requested || status === 'closed') && { opacity: 0.5 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: '#1B2A4E' }]}>
                    {requested ? 'Izin Sudah Diajukan' : 'Ajukan Izin'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Bagian di bawah ini hanya untuk asisten */}
          {isAsisten ? (
            <View style={styles.attendanceSection}>
              <View style={styles.attendanceHead}>
                <Text style={styles.sectionTitle}>Praktikan Hadir</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countStrong}>{hadirCount}</Text>
                  <Text style={styles.countMuted}> / {total}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {filterOptions.map((option) => {
                  const active = filter === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        setFilter(option.key);
                        setShowAll(false);
                      }}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {attendanceError ? <Text style={styles.listError}>{attendanceError}</Text> : null}

              <View style={styles.listCard}>
                {visibleRows.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {total === 0
                      ? 'Belum ada praktikan terdaftar di sesi ini.'
                      : 'Belum ada praktikan di kategori ini.'}
                  </Text>
                ) : (
                  visibleRows.map((row, index) => {
                    const tone = AVATAR_TONES[index % AVATAR_TONES.length];
                    return (
                      <View
                        key={row.key}
                        style={[styles.personRow, index > 0 && styles.personRowBorder]}
                      >
                        <View style={[styles.personAvatar, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.personAvatarText, { color: tone.fg }]}>
                            {initials(row.name || 'PR')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName} numberOfLines={1}>
                            {row.name}
                          </Text>
                          <Text style={styles.personNim}>{row.nim || '-'}</Text>
                        </View>
                        {row.status === 'hadir' ? (
                          <View style={[styles.rowBadge, styles.badgeHadir]}>
                            <Ionicons name="checkmark" size={12} color="#15803D" />
                            <Text style={[styles.rowBadgeText, { color: '#15803D' }]}>
                              {clock(row.time)}
                            </Text>
                          </View>
                        ) : row.status === 'izin' ? (
                          <View style={[styles.rowBadge, styles.badgeIzin]}>
                            <Text style={[styles.rowBadgeText, { color: '#92400E' }]}>Izin</Text>
                          </View>
                        ) : (
                          <View style={[styles.rowBadge, styles.badgeBelum]}>
                            <Text style={[styles.rowBadgeText, { color: '#64748B' }]}>Belum</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {filteredRows.length > PREVIEW_COUNT ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAll((v) => !v)}
                  style={({ pressed }) => [styles.seeAllRow, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.seeAllText}>
                    {showAll
                      ? 'Tampilkan lebih sedikit'
                      : `Lihat semua praktikan (${filteredRows.length})`}
                  </Text>
                  <Ionicons
                    name={showAll ? 'chevron-up' : 'chevron-forward'}
                    size={14}
                    color="#1B2A4E"
                  />
                </Pressable>
              ) : null}

              {unmappedCount > 0 ? (
                <Text style={styles.noteText}>
                  {unmappedCount} peserta kelas belum punya akun sehingga belum terdaftar di sesi ini.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <SessionQRModal
        visible={showQR}
        sessionId={session.id}
        qrToken={qrToken}
        courseName={session.courseName}
        className={session.className}
        onClose={() => setShowQR(false)}
      />

      {/* Konfirmasi buka / tutup sesi */}
      <ConfirmSheet
        visible={showConfirm}
        tone={status === 'open' ? 'danger' : 'primary'}
        icon={status === 'open' ? 'lock-closed' : 'checkmark'}
        title={status === 'open' ? 'Tutup Sesi?' : 'Buka Sesi?'}
        message={
          status === 'open'
            ? 'Apakah Anda yakin ingin menutup sesi praktikum ini? Praktikan tidak dapat presensi lagi.'
            : 'Apakah Anda yakin ingin membuka sesi praktikum ini?'
        }
        confirmLabel={status === 'open' ? 'Ya, Tutup Sesi' : 'Ya, Buka Sesi'}
        cancelLabel="Nanti Saja"
        onConfirm={() => void executeToggle()}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Konfirmasi hapus sesi */}
      <ConfirmSheet
        visible={showDeleteConfirm}
        tone="danger"
        icon="trash"
        title="Hapus Sesi?"
        message="Sesi yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?"
        confirmLabel="Ya, Hapus Sesi"
        cancelLabel="Batal"
        onConfirm={() => void executeDelete()}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <SessionFormModal
        visible={showEditModal}
        mode="edit"
        initialData={{
          courseName: session.courseName,
          courseCode: session.courseCode,
          classId: session.classId || undefined,
          className: session.className,
          room: session.room,
          description: session.description || '',
          startTime: session.startTime || timePart(session.timeRange, 0),
          endTime: session.endTime || timePart(session.timeRange, 1),
          dateTimestamp: session.dateTimestamp,
          participantIds,
          labId: session.labId,
          radiusM: session.radiusM,
        }}
        onClose={() => setShowEditModal(false)}
        onSubmit={async (data) => {
          await updateSession(session.id, data);
          const scheduleFields = ['dateLabel', 'startTime', 'endTime', 'timeRange', 'room', 'labId', 'radiusM'] as const;
          const scheduleChanged = scheduleFields.some((field) =>
            field in data && (data as any)[field] !== (session as any)[field],
          );
          if (scheduleChanged && session.participantIds?.length) {
            void notifyUsers(session.participantIds, {
              type: 'jadwal_berubah',
              title: 'Jadwal berubah',
              body: `Jadwal ${session.courseName} (${session.className}) diperbarui.`,
              sessionId: session.id,
            }).catch(() => {});
          }
          if (data.classId) await syncClassSessions(data.classId);
          setShowEditModal(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerText: { marginTop: 12, color: '#64748B' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16 },

  // Header
  header: { backgroundColor: '#1B2A4E', paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#B6C2DB', fontSize: 13, fontWeight: '500' },

  // Chip status
  statusChipWrap: { alignItems: 'flex-start', marginBottom: 14 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Kartu sesi
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    width: '100%',
    marginBottom: 20,
  },
  cardIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E8EDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dateLabel: { color: '#64748B', fontSize: 12, fontWeight: '500', marginBottom: 4 },
  sessionTitle: { color: '#0F172A', fontSize: 24, fontWeight: '800', marginBottom: 22, textAlign: 'center' },

  timeline: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 4 },
  timeCol: { alignItems: 'center' },
  timeLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  timeValue: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  timeLineWrap: { flex: 1, height: 14, marginHorizontal: 14, marginTop: 14, justifyContent: 'center', alignItems: 'center' },
  timeLine: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: '#E2E8F0' },
  timeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  timeDotOpen: { backgroundColor: '#22C55E' },

  divider: { width: '100%', height: 1, backgroundColor: '#EEF1F6', marginVertical: 20 },
  assistLabel: { alignSelf: 'flex-start', color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  assistList: { width: '100%', gap: 12, marginBottom: 22 },
  assistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800' },
  assistName: { color: '#0F172A', fontSize: 15, fontWeight: '700' },

  button: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1B2A4E' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF0D4', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#8A5309', fontSize: 13, lineHeight: 19 },
  errorBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'flex-start', width: '100%' },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', gap: 10, width: '100%' },
  actionBtnOutline: { flex: 1, flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnTextOutline: { color: '#1B2A4E', fontWeight: '700', fontSize: 14 },
  actionBtnDanger: { flex: 1, flexDirection: 'row', backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionBtnTextDanger: { color: '#B91C1C', fontWeight: '700', fontSize: 14 },

  // Praktikan hadir (asisten)
  attendanceSection: { marginBottom: 20 },
  attendanceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
  countPill: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#E8EEF9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  countStrong: { color: '#1B2A4E', fontSize: 15, fontWeight: '800' },
  countMuted: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#0EA5E9' },

  filterRow: { gap: 8, paddingVertical: 16, paddingRight: 8 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  filterChipActive: { backgroundColor: '#1B2A4E', borderColor: '#1B2A4E' },
  filterChipText: { color: '#1B2A4E', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },

  listError: { color: '#B91C1C', fontSize: 13, marginBottom: 10 },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  personRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  personAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  personAvatarText: { fontSize: 14, fontWeight: '800' },
  personName: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  personNim: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  rowBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  rowBadgeText: { fontSize: 12, fontWeight: '800' },
  badgeHadir: { backgroundColor: '#E6F6EC' },
  badgeIzin: { backgroundColor: '#FEF3C7' },
  badgeBelum: { backgroundColor: '#F1F5F9' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 16 },
  seeAllText: { color: '#1B2A4E', fontSize: 14, fontWeight: '700' },
  noteText: { color: '#64748B', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Bottom sheet konfirmasi
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  sheetGrabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', marginBottom: 22 },
  sheetIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sheetTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  sheetMessage: { color: '#64748B', fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24, paddingHorizontal: 8 },
  sheetConfirm: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  sheetConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  sheetCancel: { paddingVertical: 16, minHeight: 48, justifyContent: 'center' },
  sheetCancelText: { color: '#52627A', fontSize: 15, fontWeight: '700' },
});