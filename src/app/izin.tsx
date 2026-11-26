import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '@/components/auth-ui';
import { BackButton } from '@/components/back-button';
import { HistoryDataState } from '@/components/permission-history';
import { StateView } from '@/components/state-view';
import { useAttendance } from '@/context/attendance-context';
import { useAuth } from '@/context/auth-context';
import { validateReason } from '@/services/practitioner-service';
import { firebaseErrorMessage } from '@/utils/firebase-error';
import { getSessionStatus } from '@/utils/session-status';

export default function PermissionScreen() {
  const params = useLocalSearchParams<{ courseName?: string | string[]; className?: string | string[]; sessionId?: string | string[] }>();
  const courseName = Array.isArray(params.courseName) ? params.courseName[0] : params.courseName;
  const className = Array.isArray(params.className) ? params.className[0] : params.className;
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizeClass = (value: string) => normalize(value).replace(/^kelas\s+/, '');
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const { sessions, records, permissions, sessionState, attendanceState, permissionState, submitPermission, retry } = useAttendance();
  const [sessionId, setSessionId] = useState(() => (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId) || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  const lock = useRef(false);
  const eligible = sessions.filter((session) => getSessionStatus(session) !== 'closed'
    && (!courseName || normalize(session.courseName) === normalize(courseName))
    && (!className || normalizeClass(session.className) === normalizeClass(className))
    && !records.some((record) => record.sessionId === session.id)
    && !permissions.some((request) => request.sessionId === session.id));
  const selected = eligible.find((session) => session.id === sessionId);
  const ready = !sessionState.loading && !attendanceState.loading && !permissionState.loading
    && !sessionState.error && !attendanceState.error && !permissionState.error
    && !sessionState.fromCache && !attendanceState.fromCache && !permissionState.fromCache;
  const dataLoading = sessionState.loading || attendanceState.loading || permissionState.loading;
  const dataError = sessionState.error || attendanceState.error || permissionState.error;
  const fromCache = sessionState.fromCache || attendanceState.fromCache || permissionState.fromCache;
  const disabled = busy || !ready || !eligible.length;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  async function submit() {
    if (lock.current) return;
    const invalid = !selected ? 'Pilih sesi terlebih dahulu.' : validateReason(reason);
    if (invalid) { setError(invalid); return; }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await submitPermission(sessionId, reason);
      setSuccess(true);
      setReason('');
      setSessionId('');
    } catch (failure) { setError(firebaseErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }

  if (authLoading) return <View style={styles.loadingScreen}><ActivityIndicator color={authColors.navy} accessibilityLabel="Memuat akun" /></View>;
  if (!profile) return <Redirect href="/login" />;
  if (profile.role !== 'praktikan') return <Redirect href="/home" />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        aria-hidden={success}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.inner}>
            <BackButton
              accessibilityLabel="Kembali ke sesi"
              disabled={busy}
              onPress={goBack}
              style={styles.back}
            />
            <Text accessibilityRole="header" style={styles.title}>Pengajuan izin</Text>
            <Text style={styles.subtitle}>Jelaskan ketidakhadiranmu untuk sesi praktikum.</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.inner, styles.form]}>
            {courseName ? <View style={styles.contextRow}>
              <Ionicons name="book-outline" size={20} color={authColors.navy} />
              <View style={styles.flexible}>
                <Text style={styles.contextTitle}>{courseName}</Text>
                {className ? <Text style={styles.meta}>{className}</Text> : null}
              </View>
            </View> : null}

            <HistoryDataState loading={dataLoading} error={dataError} fromCache={fromCache} retry={retry} />

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Pilih sesi</Text>
              {ready && !eligible.length ? <StateView kind="empty" title="Tidak ada sesi yang dapat diajukan"
                message="Sesi yang selesai, sudah dihadiri, atau sudah diajukan izinnya tidak tersedia."
                actionLabel="Lihat status izin" onAction={() => router.push('/explore')} /> : null}
              {eligible.map((session) => {
                const active = session.id === sessionId;
                return <Pressable
                  key={session.id}
                  accessibilityRole="radio"
                  aria-checked={active}
                  accessibilityLabel={`${session.courseName} · ${session.className}, ${session.dateLabel}, ${session.timeRange}`}
                  accessibilityState={{ checked: active, disabled: busy || !ready }}
                  disabled={busy || !ready}
                  onPress={() => { setSessionId(session.id); setError(null); }}
                  style={({ pressed }) => [styles.session, active && styles.sessionSelected, pressed && styles.sessionPressed, (busy || !ready) && styles.faded]}
                >
                  <View style={[styles.flexible, styles.sessionContent]}>
                    <Text style={styles.sessionTitle}>{session.courseName}</Text>
                    <Text style={styles.meta}>{session.className}</Text>
                    <Text style={styles.meta}>{session.dateLabel}{'\n'}{session.timeRange}</Text>
                    <Text style={[styles.sessionStatus, getSessionStatus(session) === 'open' ? styles.statusOpen : styles.statusUpcoming]}>
                      {getSessionStatus(session) === 'open' ? 'Sesi dibuka' : 'Akan berlangsung'}
                    </Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'radio-button-off-outline'} size={24} color={active ? authColors.navy : authColors.muted} />
                </Pressable>;
              })}
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Alasan ketidakhadiran</Text>
              <TextInput
                accessibilityLabel="Alasan ketidakhadiran"
                multiline
                editable={!disabled}
                value={reason}
                onChangeText={(value) => { setReason(value); setError(null); }}
                maxLength={1000}
                placeholder="Contoh: Saya sedang sakit dan perlu beristirahat sesuai anjuran dokter."
                placeholderTextColor={authColors.placeholder}
                selectionColor={authColors.navy}
                underlineColorAndroid="transparent"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, focused && styles.inputFocused, disabled && styles.inputDisabled]}
              />
              <View style={styles.helperRow}>
                <Text style={styles.meta}>Minimal 10 karakter</Text>
                <Text style={styles.meta}>{reason.trim().length}/1.000 karakter</Text>
              </View>
              {error ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
                <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View> : null}
            </View>

            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={busy ? 'Menyimpan pengajuan…' : 'Kirim pengajuan izin'}
                accessibilityState={{ disabled, busy }}
                aria-busy={busy}
                disabled={disabled}
                onPress={() => void submit()}
                style={({ pressed }) => [styles.primary, disabled && styles.primaryDisabled, pressed && styles.faded]}
              >
                {busy ? <ActivityIndicator color={authColors.navy} /> : <Ionicons name="paper-plane-outline" size={18} color={disabled ? authColors.placeholder : authColors.white} />}
                <Text style={[styles.primaryText, disabled && styles.disabledText]}>{busy ? 'Menyimpan pengajuan…' : 'Kirim pengajuan izin'}</Text>
              </Pressable>
              <View style={styles.info}>
                <Ionicons name="information-circle-outline" size={19} color={authColors.placeholder} />
                <Text style={[styles.meta, styles.flexible]}>Keputusan diberikan oleh asisten; hasil AI hanya informasi pendukung.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={success} animationType="fade" onRequestClose={() => setSuccess(false)}>
        <View style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View accessibilityViewIsModal style={styles.modal}>
              <View style={styles.successIcon}><Ionicons name="checkmark-circle-outline" size={32} color="#166534" /></View>
              <Text accessibilityRole="header" style={styles.modalTitle}>Izin berhasil diajukan</Text>
              <Text style={styles.modalBody}>Pengajuan tersimpan dengan status menunggu. Pantau keputusan asisten di Riwayat. Izin tetap tersimpan apabila klasifikasi AI gagal.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Lihat status izin" onPress={() => { setSuccess(false); router.push('/explore'); }}
                style={({ pressed }) => [styles.primary, pressed && styles.faded]}>
                <Text style={styles.primaryText}>Lihat status izin</Text>
                <Ionicons name="arrow-forward" size={18} color={authColors.white} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setSuccess(false)} style={({ pressed }) => [styles.close, pressed && styles.sessionPressed]}>
                <Text style={styles.closeText}>Tutup</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: authColors.background },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { backgroundColor: authColors.navy, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 24, paddingBottom: 28 },
  back: { marginBottom: 16 },
  title: { color: authColors.white, fontSize: 26, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: '#BBC7DC', fontSize: 14, lineHeight: 22, marginTop: 6 },
  body: { paddingHorizontal: 20, paddingTop: 24 },
  form: { gap: 24 },
  flexible: { flex: 1, minWidth: 0 },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contextTitle: { color: authColors.navy, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  meta: { color: authColors.placeholder, fontSize: 13, lineHeight: 20 },
  section: { gap: 12 },
  sectionTitle: { color: authColors.navy, fontSize: 18, lineHeight: 26, fontWeight: '800' },
  session: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.white },
  sessionSelected: { borderColor: authColors.navy, backgroundColor: '#EDF2FA' },
  sessionPressed: { backgroundColor: '#E8EEF9' },
  sessionContent: { gap: 4 },
  sessionTitle: { color: authColors.navy, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  sessionStatus: { alignSelf: 'flex-start', fontSize: 12, lineHeight: 18, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginTop: 4 },
  statusOpen: { color: '#166534', backgroundColor: '#E6F6EC' },
  statusUpcoming: { color: '#8A5309', backgroundColor: '#FFF0D4' },
  input: { backgroundColor: authColors.white, borderWidth: 1, borderColor: authColors.border, borderRadius: 14, padding: 16, minHeight: 156, color: authColors.ink, fontSize: 15, lineHeight: 23, textAlignVertical: 'top' },
  inputFocused: { borderColor: authColors.navy },
  inputDisabled: { backgroundColor: authColors.field },
  helperRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 16, rowGap: 4 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: authColors.dangerSoft },
  errorText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 20 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: authColors.navy, borderRadius: 14, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  primaryText: { color: authColors.white, fontSize: 15, lineHeight: 22, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  primaryDisabled: { backgroundColor: '#E2E8F0' },
  disabledText: { color: authColors.placeholder },
  faded: { opacity: 0.7 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  modalScroll: { width: '100%', maxWidth: 420 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modal: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 16, gap: 16, backgroundColor: authColors.white },
  successIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E6F6EC', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: authColors.navy, fontSize: 22, lineHeight: 30, fontWeight: '800' },
  modalBody: { color: authColors.placeholder, fontSize: 14, lineHeight: 22 },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12 },
  closeText: { color: authColors.navy, fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
