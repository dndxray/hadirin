import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttendanceConfirmationModal, type AttendanceModalPhase } from '@/components/attendance-confirmation-modal';
import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { DeviceFeatureBoundary } from '@/components/device-feature-boundary';
import { StateView } from '@/components/state-view';
import { BottomTabInset } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { useSessionLab } from '@/hooks/use-session-lab';
import { acquireDevicePosition, LocationAccessError } from '@/services/device-location';
import type { CloudSession } from '@/types/practitioner';
import type { AttendanceQr, DevicePosition } from '@/types/sprint-three';
import { assessPosition, sessionRadius, validateCheckIn } from '@/utils/attendance-location';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { getSessionStatus } from '@/utils/session-status';

const QrScanner = lazy(() => import('@/components/attendance-qr-scanner'));
const STATUS = { upcoming: 'Belum dibuka', open: 'Dibuka', closed: 'Ditutup' } as const;
const STATUS_COLOR = {
  upcoming: { bg: '#EEF1F6', fg: '#64748B' },
  open: { bg: '#E6F6EC', fg: '#15803D' },
  closed: { bg: '#FEE2E2', fg: '#B91C1C' },
} as const;

export default function AttendanceScreen() {
  const { profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const requested = (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId) || '';
  const [choice, setChoice] = useState<{ requested: string; selected: string } | null>(null);
  const { sessions, sessionState, retry } = useAttendance();

  useFocusEffect(useCallback(() => {
    setChoice(null);
  }, []));

  // Status dihitung dari jam sesi, bukan hanya dari field database
  const openSessions = sessions.filter((session) => getSessionStatus(session) === 'open');
  const automaticId = openSessions.length === 1 ? openSessions[0].id : '';
  const selectedId = choice?.requested === requested ? choice.selected : requested || automaticId;
  const selected = sessions.find((session) => session.id === selectedId);
  const showSessionList = () => setChoice({ requested, selected: '' });
  if (loading) return <StateView kind="loading" title="Memuat akun" />;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'praktikan') return <Redirect href="/home" />;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 32 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={[styles.inner, styles.headerRow]}>
            <BackButton
              accessibilityLabel="Kembali ke halaman sebelumnya"
              onPress={() => {
                if (selected) showSessionList();
                else if (router.canGoBack()) router.back();
                else router.replace('/home');
              }}
            />
            <Text accessibilityRole="header" style={styles.title}>Presensi</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>

        <View style={[styles.inner, styles.body]}>
          {sessionState.loading ? (
            <StateView kind="loading" title="Memuat sesi praktikum" />
          ) : sessionState.error ? (
            <StateView kind="error" title="Sesi belum dapat dimuat" message={sessionState.error} actionLabel="Coba lagi" onAction={retry} />
          ) : !sessions.length ? (
            <StateView
              kind="empty"
              title="Belum ada sesi untukmu"
              message="Minta asisten menambahkan NIM akunmu ke peserta sesi. Sesi yang terdaftar akan muncul di sini."
            />
          ) : (
            <>
              {!selected ? (
                <View style={styles.card}>
                  <Text accessibilityRole="header" style={styles.cardTitle}>Pilih sesi</Text>
                  {sessions.map((session) => {
                    const liveStatus = getSessionStatus(session);
                    const sc = STATUS_COLOR[liveStatus] ?? STATUS_COLOR.upcoming;
                    return (
                      <Pressable
                        key={session.id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${session.courseName}, ${session.className}, ${STATUS[liveStatus] ?? 'Status tidak valid'}`}
                        accessibilityState={{ checked: selectedId === session.id }}
                        onPress={() => setChoice({ requested, selected: session.id })}
                        style={({ pressed }) => [
                          styles.sessionOption,
                          selectedId === session.id && styles.selectedOption,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.flex}>
                          <Text style={styles.optionTitle}>{session.courseName}</Text>
                          <Text style={styles.meta}>
                            {session.className} · {session.dateLabel} · {session.timeRange}
                          </Text>
                        </View>
                        <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.pillText, { color: sc.fg }]}>
                            {STATUS[liveStatus] ?? 'Tidak valid'}
                          </Text>
                        </View>
                        <Ionicons
                          name={selectedId === session.id ? 'radio-button-on' : 'radio-button-off'}
                          size={22}
                          color={authColors.navy}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {selected ? (
                <SelectedSession key={`${profile.uid}:${selected.id}`} session={selected} />
              ) : (
                <StateView
                  kind={selectedId ? 'error' : 'empty'}
                  title={selectedId ? 'Sesi tidak tersedia untuk akunmu' : 'Pilih sesi untuk melanjutkan'}
                  message={
                    selectedId
                      ? 'Sesi mungkin dihapus atau kamu belum menjadi peserta. Hubungi asisten untuk memastikan.'
                      : 'Informasi lab, pemeriksaan lokasi, dan tombol presensi akan tampil setelah sesi dipilih.'
                  }
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SelectedSession({ session }: { session: CloudSession }) {
  const { checkIn, records, permissions, sessionState, attendanceState, permissionState, retry } = useAttendance();
  const labState = useSessionLab(session.labId);
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [qr, setQr] = useState<AttendanceQr | null>(null);
  const [phase, setPhase] = useState<AttendanceModalPhase>('closed');
  const [now, setNow] = useState(Date.now);
  const lock = useRef(false);
  const alive = useRef(true);
  const focused = useRef(false);
  const locationRequest = useRef<AbortController | null>(null);

  // Status dihitung dari jam, di-refresh tiap 5 detik lewat `now`
  const liveStatus = getSessionStatus(session, new Date(now));

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; locationRequest.current?.abort(); };
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => { setNow(Date.now()); };
    const startTimer = () => { if (!timer) timer = setInterval(tick, 5000); };
    if (AppState.currentState === 'active') startTimer();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (timer) { clearInterval(timer); timer = undefined; }
        locationRequest.current?.abort(); setPosition(null); setScanner(false);
      } else if (state === 'active') { tick(); startTimer(); }
    });
    return () => {
      focused.current = false;
      if (timer) clearInterval(timer);
      appState.remove(); locationRequest.current?.abort();
      setScanner(false); setPosition(null); setPhase('closed');
    };
  }, []));

  const attended = records.some((item) => item.sessionId === session.id);
  const requested = permissions.some((item) => item.sessionId === session.id);
  const stateError = sessionState.error || attendanceState.error || permissionState.error;
  const loading = sessionState.loading || attendanceState.loading || permissionState.loading;
  const cached = sessionState.fromCache || attendanceState.fromCache || permissionState.fromCache || labState.fromCache;
  let radius = 0;
  let assessment: ReturnType<typeof assessPosition> | null = null;
  let assessmentError: string | null = null;
  try {
    if (labState.lab) {
      radius = sessionRadius(session, labState.lab);
      if (position) assessment = assessPosition(position, labState.lab, radius, now);
    }
  } catch (failure) { assessmentError = (failure as Error).message; }
  const available = !loading && !stateError && !cached && !!labState.lab && !labState.loading && !labState.error
    && radius > 0 && liveStatus === 'open' && !attended && !requested;
  const canSubmit = available && !!assessment?.inside && !busy && !locating;

  async function locate() {
    if (lock.current || locating) return;
    setLocating(true); setPosition(null); setLocationError(null); setError(null);
    try {
      locationRequest.current = new AbortController();
      const next = await acquireDevicePosition(locationRequest.current.signal);
      if (alive.current) { setPosition(next); setNow(Date.now()); }
    } catch (failure) { if (alive.current) setLocationError((failure as Error).message); }
    finally { if (alive.current) setLocating(false); }
  }

  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setLocationError(null);
    try {
      if (!available || !labState.lab) throw new Error('Data sesi/lab belum siap atau sesi tidak lagi dapat digunakan. Periksa data dan koneksi kembali.');
      locationRequest.current = new AbortController();
      const current = await acquireDevicePosition(locationRequest.current.signal);
      if (!alive.current || AppState.currentState === 'background') return;
      setPosition(current); setNow(Date.now());
      const evidence = { position: current, method: qr ? 'qr' as const : 'location' as const, ...(qr ? { qr } : {}) };
      validateCheckIn(session, labState.lab, evidence);
      await checkIn(session.id, evidence);
      if (alive.current && focused.current) setPhase('success');
    } catch (failure) {
      if (alive.current) {
        setPhase('closed');
        setError(failure instanceof LocationAccessError ? failure.message : (failure as { code?: string })?.code === 'permission-denied'
          ? 'Server menolak presensi. Periksa ulang lokasi, status sesi, dan kepesertaan; minta asisten memeriksa Rules bila masalah berlanjut.'
          : firebaseErrorMessage(failure));
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  const sc = STATUS_COLOR[liveStatus] ?? STATUS_COLOR.upcoming;
  const locationChip = assessment
    ? assessment.inside
      ? { text: `Di dalam radius · ${Math.ceil(assessment.distance)} m`, bg: '#E6F6EC', fg: '#166534' }
      : { text: `Di luar radius · ${Math.ceil(assessment.distance)} m`, bg: '#FFF3D6', fg: '#92400E' }
    : { text: 'Lokasi belum diperiksa', bg: '#EEF1F6', fg: '#64748B' };

  return (
    <View style={styles.details}>
      <View style={styles.card}>
        <View style={styles.sessionHead}>
          <View style={styles.sessionIcon}>
            <Ionicons name="calendar-outline" size={32} color={authColors.navy} />
          </View>
          <View style={styles.flex}>
            <Text accessibilityRole="header" style={styles.courseName}>{session.courseName}</Text>
            <Text style={styles.meta}>{session.className} · {session.room}</Text>
            <View style={[styles.pill, styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.pillText, { color: sc.fg }]}>
                {STATUS[liveStatus] ?? 'Tidak valid'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={22} color={authColors.navy} />
          <Text style={styles.infoText}>{session.dateLabel}{'\n'}{session.timeRange}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={22} color={authColors.navy} />
          <Text style={styles.infoText}>Asisten: {session.assistantName}</Text>
        </View>
      </View>

      {attended ? (
        <StateView
          kind="empty"
          title="Presensi sudah tercatat"
          message="Kehadiranmu tersimpan. Kamu tidak dapat melakukan presensi dua kali pada sesi yang sama."
          actionLabel="Lihat Riwayat"
          onAction={() => router.push('/explore')}
        />
      ) : requested ? (
        <StateView
          kind="empty"
          title="Izin sudah diajukan"
          message="Presensi tidak dapat dicatat bersamaan dengan izin pada sesi yang sama. Periksa pengajuan di Riwayat."
          actionLabel="Lihat status izin"
          onAction={() => router.push('/explore')}
        />
      ) : null}
      {loading ? <StateView kind="loading" title="Memeriksa catatan akun" /> : null}
      {stateError ? <StateView kind="error" message={stateError} actionLabel="Coba lagi" onAction={retry} /> : null}
      {cached ? <Notice text="Data masih dari cache. Sambungkan internet dan tunggu sinkronisasi server sebelum presensi." /> : null}

      {!attended && !requested ? (
        <>
          {liveStatus === 'upcoming' ? (
            <Notice text="Sesi belum dibuka. Presensi bisa dilakukan setelah jam mulai." />
          ) : null}
          {liveStatus === 'closed' ? (
            <Notice text="Sesi sudah ditutup. Presensi tidak dapat dilakukan lagi." />
          ) : null}
          {!session.labId ? (
            <Notice text="Laboratorium sesi belum diatur. Hubungi asisten untuk melengkapinya." />
          ) : null}

          <View style={[styles.card, styles.labCard]}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={authColors.navy} />
              <Text accessibilityRole="header" style={styles.cardTitleInline}>Lokasi Laboratorium</Text>
            </View>

            {labState.loading ? (
              <StateView kind="loading" title="Memuat laboratorium" />
            ) : labState.error ? (
              <StateView kind="error" message={labState.error} actionLabel="Muat ulang lab" onAction={labState.retry} />
            ) : labState.lab ? (
              <View style={styles.labRow}>
                <View style={styles.flex}>
                  <Text style={styles.labName}>{labState.lab.name}</Text>
                  <Text style={styles.meta}>Radius presensi {radius} meter</Text>
                  <View style={[styles.pill, styles.locationChip, { backgroundColor: locationChip.bg }]}>
                    <Text style={[styles.pillText, { color: locationChip.fg }]}>{locationChip.text}</Text>
                  </View>
                </View>
                <MapPreview inside={assessment?.inside} />
              </View>
            ) : null}

            {assessment ? (
              <View
                accessibilityLiveRegion="polite"
                style={[styles.locationResult, !assessment.inside && styles.locationOutside]}
              >
                <Ionicons
                  name={assessment.inside ? 'checkmark-circle-outline' : 'location-outline'}
                  size={22}
                  color={assessment.inside ? '#166534' : '#92400E'}
                />
                <View style={styles.flex}>
                  <Text style={styles.resultTitle}>{assessment.inside ? 'Di dalam radius lab' : 'Di luar radius lab'}</Text>
                  <Text style={styles.text}>
                    Jarak sekitar {Math.ceil(assessment.distance)} m · akurasi ±{Math.ceil(position!.accuracy!)} m
                  </Text>
                </View>
              </View>
            ) : null}
            {locationError || assessmentError ? (
              <Text accessibilityRole="alert" style={styles.error}>{locationError || assessmentError}</Text>
            ) : null}
            <Action
              label={locating ? 'Mencari lokasi…' : 'Periksa lokasi'}
              icon="location-outline"
              disabled={busy || locating || !labState.lab}
              loading={locating}
              onPress={() => void locate()}
              secondary
            />
            {(locationError || assessmentError) && Platform.OS !== 'web' ? (
              <Action
                label="Buka pengaturan perangkat"
                icon="settings-outline"
                secondary
                onPress={() => {
                  void Linking.openSettings().catch(() =>
                    setLocationError('Buka pengaturan perangkat secara manual untuk mengizinkan lokasi.'),
                  );
                }}
              />
            ) : null}
          </View>

          <View style={styles.actions}>
            {qr ? (
              <Notice text="QR sesi berhasil dibaca. Kehadiran belum tersimpan; tekan Konfirmasi presensi QR untuk melanjutkan validasi lokasi." />
            ) : null}
            {qr ? (
              <Action label="Hapus hasil QR" icon="close-outline" secondary disabled={busy} onPress={() => setQr(null)} />
            ) : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Action
              label={busy ? 'Memvalidasi dan menyimpan…' : qr ? 'Konfirmasi presensi QR' : 'Presensi sekarang'}
              icon="checkmark-circle-outline"
              disabled={!canSubmit}
              loading={busy}
              onPress={() => setPhase('confirm')}
            />
            <Action
              label={qr ? 'Pindai ulang QR sesi' : 'Pindai QR dari asisten'}
              icon="qr-code-outline"
              secondary
              disabled={!available || busy || locating}
              onPress={() => { setError(null); setScanner(true); }}
            />
          </View>
        </>
      ) : null}

      <AttendanceConfirmationModal
        session={session}
        phase={phase}
        busy={busy}
        onClose={() => { if (!busy) setPhase('closed'); }}
        onConfirm={() => void submit()}
        onViewHistory={() => { setPhase('closed'); router.push('/explore'); }}
      />
      <Modal visible={scanner} animationType="slide" onRequestClose={() => setScanner(false)}>
        <ScrollView
          contentContainerStyle={[styles.scanner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.inner}>
            <Action label="Tutup pemindai" icon="close-outline" secondary onPress={() => setScanner(false)} />
            <Text accessibilityRole="header" style={styles.cardTitle}>Pindai QR sesi</Text>
            {scanner ? (
              <DeviceFeatureBoundary>
                <Suspense fallback={<StateView kind="loading" title="Menyiapkan kamera" />}>
                  <QrScanner
                    sessionId={session.id}
                    onScanned={(value) => {
                      setScanner(false);
                      if (!session.qrToken || value.token !== session.qrToken) {
                        setError('QR sudah tidak berlaku. Minta QR terbaru kepada asisten.');
                        return;
                      }
                      setQr(value);
                      setError(null);
                    }}
                  />
                </Suspense>
              </DeviceFeatureBoundary>
            ) : null}
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

// Ilustrasi peta dekoratif (bukan peta sungguhan).
function MapPreview({ inside }: { inside?: boolean }) {
  return (
    <View style={styles.map} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.mapGreen} />
      <View style={[styles.mapRoad, { top: 19, transform: [{ rotate: '-24deg' }] }]} />
      <View style={[styles.mapRoad, { top: 43, transform: [{ rotate: '18deg' }] }]} />
      <Ionicons
        name="location"
        size={26}
        color={inside === false ? '#B45309' : authColors.navy}
        style={styles.mapPin}
      />
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name="information-circle-outline" size={22} color={authColors.navy} />
      <Text style={[styles.text, styles.flex]}>{text}</Text>
    </View>
  );
}

function Action({ label, icon, onPress, disabled, loading, secondary }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean;
}) {
  const color = secondary ? authColors.navy : authColors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={21} color={color} />}
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  flex: { flex: 1 },
  inner: { width: '100%', maxWidth: 600, alignSelf: 'center' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 64,
    backgroundColor: authColors.navy,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSpacer: { width: 44 },
  title: { flex: 1, color: authColors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },

  body: { paddingHorizontal: 20, marginTop: -40, gap: 14 },
  details: { gap: 14 },

  card: {
    padding: 18,
    backgroundColor: authColors.white,
    borderRadius: 22,
    gap: 12,
    shadowColor: '#1B2A4E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  // Kartu Lokasi Laboratorium dibuat lebih ringkas
  labCard: { padding: 14, gap: 10, borderRadius: 18 },
  cardTitle: { color: authColors.navy, fontSize: 20, lineHeight: 28, fontWeight: '800' },
  cardTitleInline: { color: authColors.navy, fontSize: 15, fontWeight: '800' },

  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sessionIcon: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#E3E9F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseName: { color: authColors.navy, fontSize: 19, lineHeight: 26, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: authColors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, color: authColors.ink, fontSize: 15, lineHeight: 23 },

  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '800' },
  statusPill: { marginTop: 6 },
  locationChip: { marginTop: 6 },

  labRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  labName: { color: authColors.navy, fontSize: 16, fontWeight: '800', marginBottom: 2 },

  map: {
    width: 88,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#E8EDF7',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGreen: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#CFEBD8',
  },
  mapRoad: { position: 'absolute', left: -16, width: 130, height: 7, backgroundColor: '#F8FAFD' },
  mapPin: { marginTop: -4 },

  sessionOption: {
    padding: 14,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: authColors.white,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: 14,
  },
  selectedOption: { borderColor: authColors.navy, backgroundColor: '#EAF0FA' },
  optionTitle: { color: authColors.navy, fontSize: 16, fontWeight: '700', marginBottom: 4 },

  text: { color: authColors.ink, fontSize: 15, lineHeight: 23 },
  meta: { color: '#52627A', fontSize: 14, lineHeight: 21 },

  actions: { gap: 12 },
  action: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: authColors.navy,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionText: { fontSize: 15, lineHeight: 22, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  secondary: { backgroundColor: '#E8EDF7' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },

  notice: { padding: 14, backgroundColor: '#E8EDF7', borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  error: { color: '#991B1B', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 22 },
  locationResult: { padding: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#E6F6EC' },
  locationOutside: { backgroundColor: '#FFF3D6' },
  resultTitle: { color: authColors.navy, fontSize: 15, lineHeight: 22, fontWeight: '800' },

  scanner: { padding: 20, flexGrow: 1, backgroundColor: authColors.background },
});