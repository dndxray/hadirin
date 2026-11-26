import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { authColors } from '@/components/auth-ui';
import { LabInfoSheet } from '@/components/lab-info-sheet';
import { useLabs, type LabsStatus } from '@/hooks/use-labs';

// Pusat peta sementara: seluruh Indonesia. Dipakai selama belum ada lab
// dan posisi pengguna yang bisa dijadikan acuan.
const INDONESIA_REGION = {
  latitude: -2.5,
  longitude: 118,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

// Zoom saat hanya ada satu titik acuan (kira-kira level kampus).
const SINGLE_POINT_DELTA = 0.01;

// Ruang kosong di tepi saat peta menyesuaikan tampilan ke semua titik.
const FIT_PADDING = { top: 90, right: 60, bottom: 90, left: 60 };

type IconName = ComponentProps<typeof Ionicons>['name'];

// Kondisi lokasi yang perlu diberi tahu ke pengguna (SRS-25).
type LocationIssue = 'denied' | 'servicesOff' | 'unavailable';

const LOCATION_MESSAGES: Record<
  LocationIssue,
  { title: string; text: string; action: 'settings' | 'retry' }
> = {
  denied: {
    title: 'Izin lokasi ditolak',
    text: 'Posisi kamu tidak bisa ditampilkan di peta. Izinkan akses lokasi untuk aplikasi ini di pengaturan HP.',
    action: 'settings',
  },
  servicesOff: {
    title: 'Lokasi HP sedang mati',
    text: 'Nyalakan layanan lokasi (GPS) di HP, lalu coba lagi.',
    action: 'retry',
  },
  unavailable: {
    title: 'Posisi belum bisa didapat',
    text: 'Koordinat kamu belum terbaca. Coba pindah ke tempat terbuka, lalu coba lagi.',
    action: 'retry',
  },
};

// Kondisi data laboratorium yang gagal dimuat (SRS-25).
const LABS_MESSAGES: Partial<Record<LabsStatus, { icon: IconName; title: string; text: string }>> = {
  offline: {
    icon: 'cloud-offline-outline',
    title: 'Koneksi bermasalah',
    text: 'Data laboratorium belum bisa dimuat dari server. Periksa koneksi internet kamu, lalu coba lagi.',
  },
  denied: {
    icon: 'lock-closed-outline',
    title: 'Data laboratorium tidak bisa diakses',
    text: 'Akun kamu belum diizinkan membaca data laboratorium. Coba lagi nanti atau hubungi tim pengembang.',
  },
  error: {
    icon: 'alert-circle-outline',
    title: 'Gagal memuat laboratorium',
    text: 'Terjadi masalah saat memuat data laboratorium. Coba lagi.',
  },
};

type Coord = { latitude: number; longitude: number };

type NoticeProps = {
  icon: IconName;
  title: string;
  text: string;
  tone?: 'danger' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
};

function Notice({ icon, title, text, tone = 'danger', actionLabel, onAction, disabled }: NoticeProps) {
  const danger = tone === 'danger';
  return (
    <View style={[styles.notice, danger ? styles.noticeDanger : styles.noticeInfo]}>
      <Ionicons name={icon} size={22} color={danger ? authColors.danger : authColors.navy} />
      <View style={styles.noticeBody}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{text}</Text>
        {actionLabel && onAction ? (
          <Pressable style={styles.noticeButton} disabled={disabled} onPress={onAction}>
            <Text style={styles.noticeButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// Versi HP (Android/iOS). Versi web ada di lab-map.web.tsx karena
// react-native-maps tidak mendukung web.
export function LabMap() {
  const mapRef = useRef<MapView>(null);
  // Titik biru baru dinyalakan setelah izin diberikan, karena di Android
  // showsUserLocation tidak aktif kalau izin baru ada setelah peta tampil.
  const [granted, setGranted] = useState(false);
  const [issue, setIssue] = useState<LocationIssue | null>(null);
  const [checking, setChecking] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userCoord, setUserCoord] = useState<Coord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { labs, status: labsStatus, retry: retryLabs } = useLabs();

  const locate = useCallback(async () => {
    setChecking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGranted(false);
        setIssue('denied');
        return;
      }
      setGranted(true);

      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) {
        setIssue('servicesOff');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setIssue(null);
      setUserCoord({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      // Izin ada dan GPS menyala, tetapi koordinat gagal dibaca.
      setIssue('unavailable');
    } finally {
      setChecking(false);
    }
  }, []);

  // Cek lokasi saat halaman dibuka.
  useEffect(() => {
    const id = setTimeout(() => {
      void locate();
    }, 0);
    return () => clearTimeout(id);
  }, [locate]);

  // Kalau pengguna kembali dari pengaturan HP dan masih ada masalah,
  // cek ulang otomatis.
  useEffect(() => {
    if (!issue) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') locate();
    });
    return () => sub.remove();
  }, [issue, locate]);

  // Penanda perubahan posisi lab, supaya peta tidak menyesuaikan ulang
  // setiap kali Firestore mengirim pembaruan yang isinya sama.
  const labsKey = useMemo(
    () => labs.map((lab) => `${lab.id}:${lab.latitude}:${lab.longitude}`).join('|'),
    [labs],
  );

  // Sesuaikan tampilan peta agar semua lab dan posisi pengguna terlihat.
  useEffect(() => {
    if (!mapReady) return;
    const coords: Coord[] = [
      ...labs.map((lab) => ({ latitude: lab.latitude, longitude: lab.longitude })),
      ...(userCoord ? [userCoord] : []),
    ];
    if (coords.length === 0) return;

    if (coords.length === 1) {
      mapRef.current?.animateToRegion(
        { ...coords[0], latitudeDelta: SINGLE_POINT_DELTA, longitudeDelta: SINGLE_POINT_DELTA },
        600,
      );
      return;
    }
    mapRef.current?.fitToCoordinates(coords, { edgePadding: FIT_PADDING, animated: true });
    // `labs` sengaja tidak masuk dependensi: perubahan isinya diwakili labsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, userCoord, labsKey]);

  const locationMessage = issue ? LOCATION_MESSAGES[issue] : null;
  const labsMessage = LABS_MESSAGES[labsStatus] ?? null;
  const showEmpty = labsStatus === 'ready' && labs.length === 0;
  const selectedLab = labs.find((lab) => lab.id === selectedId) ?? null;

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INDONESIA_REGION}
        showsUserLocation={granted}
        showsMyLocationButton={granted}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedId(null)}>
        {labs.map((lab) => (
          <Circle
            key={`radius-${lab.id}`}
            center={{ latitude: lab.latitude, longitude: lab.longitude }}
            radius={lab.radiusMeters}
            strokeWidth={1}
            strokeColor="rgba(27, 42, 78, 0.6)"
            fillColor="rgba(27, 42, 78, 0.12)"
          />
        ))}
        {labs.map((lab) => (
          <Marker
            key={lab.id}
            coordinate={{ latitude: lab.latitude, longitude: lab.longitude }}
            pinColor={authColors.navy}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedId(lab.id);
            }}
          />
        ))}
      </MapView>

      <View style={styles.notices} pointerEvents="box-none">
        {locationMessage ? (
          <Notice
            icon="location-outline"
            title={locationMessage.title}
            text={locationMessage.text}
            actionLabel={locationMessage.action === 'settings' ? 'Buka pengaturan' : 'Coba lagi'}
            onAction={() =>
              locationMessage.action === 'settings' ? Linking.openSettings() : locate()
            }
            disabled={checking}
          />
        ) : null}

        {labsMessage ? (
          <Notice
            icon={labsMessage.icon}
            title={labsMessage.title}
            text={labsMessage.text}
            actionLabel="Coba lagi"
            onAction={retryLabs}
          />
        ) : null}

        {showEmpty ? (
          <Notice
            icon="information-circle-outline"
            tone="info"
            title="Belum ada laboratorium"
            text="Belum ada laboratorium yang terdaftar. Asisten dapat menambahkannya."
          />
        ) : null}
      </View>

      {selectedLab ? (
        <LabInfoSheet lab={selectedLab} onClose={() => setSelectedId(null)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  map: { flex: 1 },
  notices: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    gap: 8,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  noticeDanger: {
    backgroundColor: authColors.dangerSoft,
    borderColor: authColors.danger,
  },
  noticeInfo: {
    backgroundColor: authColors.white,
    borderColor: authColors.border,
  },
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
