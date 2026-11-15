import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { StateView } from '@/components/state-view';
import { initials } from '@/utils/home-format';
import { getSessionStatus } from '@/utils/session-status';

export default function DetailSesiScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[]; action?: string | string[] }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const action = Array.isArray(params.action) ? params.action[0] : params.action;
  
  const { profile, loading: authLoading } = useAuth();
  
  const [kelas, setKelas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  const isAsisten = profile?.role === 'asisten';

  const goBack = () => { 
    if (router.canGoBack()) router.back(); 
    else router.replace('/home'); 
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      try {
        let docSnap = null;
        let collectionName = 'sessions';

        try {
          const docRef = doc(db, 'sessions', sessionId);
          docSnap = await getDoc(docRef);
        } catch (e) {
          console.log('Bukan di sessions, ngecek classes...');
        }

        if (!docSnap || !docSnap.exists()) {
          collectionName = 'classes';
          const docRef = doc(db, 'classes', sessionId);
          docSnap = await getDoc(docRef);
        }
        
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          setKelas({ 
            id: docSnap.id, 
            _collection: collectionName,
            ...data,
            courseName: data.courseName || data.course || 'Mata Kuliah',
            className: data.className || data.name || 'Kelas',
            timeRange: data.timeRange || `${data.startTime || data.timeStart || '--'} - ${data.endTime || data.timeEnd || '--'}`,
            assistantName: data.assistantName || 'Asisten Hadirin'
          });
        }
      } catch (error) {
        console.error("Error load detail:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [sessionId]);

  if (authLoading) {
    return <View style={styles.screen}><StateView kind="loading" /></View>;
  }
  
  if (!profile) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1B2A4E" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Memuat detail...</Text>
      </View>
    );
  }

  if (!kelas) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 32, paddingHorizontal: 20 }]}>
        <StateView 
          kind="empty"
          title="Kelas tidak ditemukan"
          message="Data mungkin sudah dihapus atau kamu tidak punya akses."
          actionLabel="Kembali ke Home"
          onAction={goBack} 
        />
      </View>
    );
  }

  const autoStatus = getSessionStatus(kelas); 
  const currentStatus = manualStatus || autoStatus;

  const isWithinTime = autoStatus === 'open';
  const canToggle = isWithinTime;

  let buttonBg = '#94A3B8';
  let buttonText = autoStatus === 'upcoming' ? 'Sesi Belum Dimulai' : 'Sesi Telah Berakhir';

  if (canToggle) {
    if (currentStatus === 'open') {
      buttonBg = '#B91C1C';
      buttonText = 'Tutup Sesi Praktikum';
    } else {
      buttonBg = '#15803D';
      buttonText = 'Buka Sesi Praktikum';
    }
  }

  const status = currentStatus === 'open'
    ? { label: 'Sesi sedang dibuka', color: '#15803D', background: '#E6F6EC' }
    : currentStatus === 'upcoming'
      ? { label: 'Sesi belum dibuka', color: '#52627A', background: '#EEF1F6' }
      : { label: 'Sesi telah ditutup', color: '#B91C1C', background: '#FEE2E2' };

  const handleToggleStatus = async () => {
    if (!canToggle) return;
    
    try {
      setLoadingToggle(true);
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      
      await updateDoc(doc(db, kelas._collection, kelas.id), {
        status: newStatus
      });
      
      setManualStatus(newStatus);
      alert(`Sesi berhasil di-${newStatus === 'open' ? 'buka' : 'tutup'}!`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Gagal mengubah status sesi.");
    } finally {
      setLoadingToggle(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{kelas.courseName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#B6C2DB" />
              <Text style={[styles.metaText, { flexShrink: 1 }]}>{kelas.className} · {kelas.room}</Text>
            </View>
          </View>
        </View>
      </View>
      
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <View style={styles.statusChipWrap}>
            <View style={[styles.statusChip, { backgroundColor: status.background }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardIconWrap}><Ionicons name="calendar-outline" size={26} color="#1B2A4E" /></View>
            <Text style={styles.dateLabel}>{kelas.dateLabel || 'Tanggal belum diatur'}</Text>
            <Text style={styles.sessionTitle}>{kelas.courseName}</Text>
            
            <View style={styles.timeline}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>Waktu praktikum</Text>
                <Text style={styles.timeValue}>{kelas.timeRange}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.assistLabel}>Asisten praktikum</Text>
            <View style={styles.assistList}>
              <View style={styles.assistRow}>
                <View style={[styles.avatar, { backgroundColor: '#E0E7FF' }]}>
                  <Text style={[styles.avatarText, { color: '#4338CA' }]}>{initials(kelas.assistantName)}</Text>
                </View>
                <Text style={styles.assistName}>{kelas.assistantName}</Text>
              </View>
            </View>
            
            {isAsisten ? (
              <Pressable
                onPress={handleToggleStatus}
                disabled={loadingToggle || !canToggle}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: buttonBg },
                  pressed && canToggle && { opacity: 0.85 },
                ]}
              >
                {loadingToggle ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>{buttonText}</Text>
                )}
              </Pressable>
            ) : (
              <View style={{ width: '100%', marginTop: 10 }}>
                 <Pressable
                    onPress={() => router.push(`/izin?id=${kelas.id}`)}
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1B2A4E' },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[styles.buttonText, { color: '#1B2A4E' }]}>
                      Ajukan Izin
                    </Text>
                  </Pressable>
              </View>
            )}
            
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  timeLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  timeValue: { color: '#1B2A4E', fontSize: 20, fontWeight: '800' },
  divider: { width: '100%', height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  assistLabel: { alignSelf: 'flex-start', color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  assistList: { width: '100%', gap: 12, marginBottom: 24 },
  assistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  assistName: { color: '#1B2A4E', fontSize: 15, fontWeight: '700' },
  button: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});