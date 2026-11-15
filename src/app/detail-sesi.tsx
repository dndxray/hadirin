import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSessionStatus } from '@/utils/session-status'; // IMPORT UTILITY KITA

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [kelas, setKelas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sessionId) return;
      try {
        const docRef = doc(db, 'classes', sessionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setKelas({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error load detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [sessionId]);

  const handlePresensi = async () => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        router.replace('/explore');
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B2A4E" />
      </View>
    );
  }

  if (!kelas) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 40, paddingHorizontal: 20 }]}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1B2A4E' }}>Sesi tidak ditemukan</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  // CEK STATUS OTOMATIS DARI JAM GMT+7
  const dynamicStatus = getSessionStatus(kelas);
  const isOpen = dynamicStatus === 'open';
  const isUpcoming = dynamicStatus === 'upcoming';

  let statusColor = '#94A3B8', statusBg = '#EEF1F6', statusTextColor = '#64748B', statusLabel = 'Sesi belum dibuka';
  if (isOpen) {
    statusColor = '#22C55E'; statusBg = '#E6F6EC'; statusTextColor = '#15803D'; statusLabel = 'Sesi sedang dibuka';
  } else if (!isUpcoming) {
    statusColor = '#EF4444'; statusBg = '#FEE2E2'; statusTextColor = '#B91C1C'; statusLabel = 'Sesi telah ditutup';
  }

  return (
    <View style={styles.screen}>
      {/* HEADER BIRU */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {kelas.course}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#B6C2DB" />
              <Text style={styles.metaText}>
                {kelas.timeStart || '--:--'} - {kelas.timeEnd || '--:--'}
              </Text>
              <Text style={styles.metaText}>·</Text>
              <Text style={styles.metaText}>{kelas.room}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          
          {/* STATUS CHIP OTOMATIS */}
          <View style={styles.statusChipWrap}>
            <View style={[styles.statusChip, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusTextColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="calendar-outline" size={26} color="#1B2A4E" />
            </View>
            <Text style={styles.dateLabel}>
              {kelas.dateLabel || 'Tanggal belum diatur'}
            </Text>
            <Text style={styles.sessionTitle}>
              Sesi Praktikum {kelas.name ? kelas.name.replace('Kelas ', '') : 'B'}
            </Text>

            <View style={styles.timeline}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Mulai</Text>
                <Text style={styles.timeValue}>{kelas.timeStart || '--:--'}</Text>
              </View>
              <View style={styles.timeLine}>
                <View style={styles.lineBar} />
                <View style={styles.lineDot} />
                <View style={styles.lineBar} />
              </View>
              <View style={[styles.timeCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.timeLabel}>Selesai</Text>
                <Text style={styles.timeValue}>{kelas.timeEnd || '--:--'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.assistLabel}>Asisten Praktikum</Text>
            <View style={styles.assistList}>
              <View style={styles.assistRow}>
                <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={[styles.avatarText, { color: '#4338CA' }]}>FW</Text>
                </View>
                <Text style={styles.assistName}>Fadhil</Text>
              </View>
              <View style={styles.assistRow}>
                <View style={[styles.avatar, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.avatarText, { color: '#15803D' }]}>CF</Text>
                </View>
                <Text style={styles.assistName}>Cesar</Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowModal(true)}
              disabled={!isOpen}
              style={({ pressed }) => [
                styles.button,
                !isOpen && { backgroundColor: '#94A3B8' },
                pressed && isOpen && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.buttonText}>
                {isOpen ? 'Isi Presensi' : isUpcoming ? 'Belum Dibuka' : 'Sesi Ditutup'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* MODAL POPUP */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={() => setShowModal(false)} />
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.iconCircleSuccess}>
                  <Ionicons name="checkmark" size={36} color="#22C55E" />
                </View>
                <Text style={styles.modalTitle}>Presensi Berhasil!</Text>
                <Text style={styles.modalSubtitle}>Kehadiran kamu sudah tercatat di sistem.</Text>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => { setShowModal(false); router.replace('/explore'); }}
                >
                  <Text style={styles.btnPrimaryText}>Lihat Riwayat</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark" size={36} color="#22C55E" />
                </View>
                <Text style={styles.modalTitle}>Konfirmasi Presensi</Text>
                <Text style={styles.modalSubtitle}>Apakah Anda yakin ingin melakukan presensi?</Text>
                <Pressable
                  style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
                  onPress={handlePresensi}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Ya, Presensi Sekarang</Text>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.btnSecondaryText}>Nanti Saja</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FA' },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16 },
  header: { backgroundColor: '#1B2A4E', paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#B6C2DB', fontSize: 13, fontWeight: '500' },
  statusChipWrap: { alignItems: 'flex-start', marginBottom: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#1B2A4E', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 3, width: '100%' },
  cardIconWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#EEF1F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dateLabel: { color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  sessionTitle: { color: '#1B2A4E', fontSize: 22, fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  timeline: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  timeCol: { alignItems: 'flex-start' },
  timeLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  timeValue: { color: '#1B2A4E', fontSize: 20, fontWeight: '800' },
  timeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16 },
  lineBar: { flex: 1, height: 2, backgroundColor: '#E2E8F0' },
  lineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  assistLabel: { alignSelf: 'flex-start', color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  assistList: { width: '100%', gap: 12, marginBottom: 24 },
  assistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  assistName: { color: '#1B2A4E', fontSize: 15, fontWeight: '700' },
  button: { width: '100%', backgroundColor: '#1B2A4E', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, alignItems: 'center', minHeight: 350 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, marginBottom: 24 },
  iconCircle: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#E6F6EC', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconCircleSuccess: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E6F6EC', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1B2A4E', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 20 },
  btnPrimary: { width: '100%', backgroundColor: '#1B2A4E', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  btnSecondary: { width: '100%', paddingVertical: 16, alignItems: 'center' },
  btnSecondaryText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  successContainer: { alignItems: 'center', width: '100%', paddingTop: 10 },
});
