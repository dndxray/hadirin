import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { authColors } from '@/components/auth-ui';
import { LabInfoSheet } from '@/components/lab-info-sheet';
import { useLabs, type LabsStatus } from '@/hooks/use-labs';
import { useLabSessions } from '@/hooks/use-lab-sessions';

const LOCATION_MESSAGES: Record<'denied' | 'servicesOff' | 'unavailable', { title: string; text: string; action: 'settings' | 'retry' }> = {
  denied: { title: 'Izin lokasi ditolak', text: 'Posisi kamu tidak bisa ditampilkan di peta. Izinkan akses lokasi untuk aplikasi ini di pengaturan HP.', action: 'settings' },
  servicesOff: { title: 'Lokasi HP sedang mati', text: 'Nyalakan layanan lokasi (GPS) di HP, lalu coba lagi.', action: 'retry' },
  unavailable: { title: 'Posisi belum bisa didapat', text: 'Koordinat kamu belum terbaca. Coba pindah ke tempat terbuka, lalu coba lagi.', action: 'retry' },
};

const LABS_MESSAGES: Partial<Record<LabsStatus, { icon: ComponentProps<typeof Ionicons>['name']; title: string; text: string }>> = {
  offline: { icon: 'cloud-offline-outline', title: 'Koneksi bermasalah', text: 'Data laboratorium belum bisa dimuat dari server. Periksa koneksi internet kamu, lalu coba lagi.' },
  denied: { icon: 'lock-closed-outline', title: 'Data laboratorium tidak bisa diakses', text: 'Akun kamu belum diizinkan membaca data laboratorium. Coba lagi nanti.' },
  error: { icon: 'alert-circle-outline', title: 'Gagal memuat laboratorium', text: 'Terjadi masalah saat memuat data laboratorium. Coba lagi.' },
};

type Coord = { latitude: number; longitude: number };

function Notice({ icon, title, text, tone = 'danger', actionLabel, onAction, disabled }: any) {
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

export function LabMap() {
  const webViewRef = useRef<WebView>(null);
  const [granted, setGranted] = useState(false);
  const [issue, setIssue] = useState<'denied' | 'servicesOff' | 'unavailable' | null>(null);
  const [checking, setChecking] = useState(false);
  const [userCoord, setUserCoord] = useState<Coord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { labs, status: labsStatus, retry: retryLabs } = useLabs();
  
  const selectedLab = labs.find((lab) => lab.id === selectedId) ?? null;
  
  // FIX: Panggil hook pakai 'name' biar sinkron sama tabel 'classes'
  const { sessions, loading: loadingSessions, error: sessionsError } = useLabSessions(selectedLab?.name);

  const locate = useCallback(async () => {
    setChecking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGranted(false); setIssue('denied'); return; }
      setGranted(true);
      const servicesOn = await Location.hasServicesEnabledAsync();
      if (!servicesOn) { setIssue('servicesOff'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setIssue(null);
      setUserCoord({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch { setIssue('unavailable'); } finally { setChecking(false); }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void locate(), 0);
    return () => clearTimeout(id);
  }, [locate]);

  useEffect(() => {
    if (!issue) return;
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') locate(); });
    return () => sub.remove();
  }, [issue, locate]);

  const updateMapData = useCallback(() => {
    if (!webViewRef.current || Platform.OS === 'web') return;
    const labsData = JSON.stringify(labs);
    const userData = userCoord ? JSON.stringify(userCoord) : 'null';
    webViewRef.current.injectJavaScript(`
      if (window.updateMapData) { window.updateMapData(${labsData}, ${userData}); }
      true;
    `);
  }, [labs, userCoord]);

  useEffect(() => {
    const timer = setTimeout(updateMapData, 500);
    return () => clearTimeout(timer);
  }, [updateMapData]);

  const initialLabs = JSON.stringify(labs);
  const initialUser = userCoord ? JSON.stringify(userCoord) : 'null';

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #f1f5f9; }
        #map { width: 100vw; height: 100vh; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([-2.5, 118], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var labMarkers = {}; var labCircles = []; var userMarker = null;

        window.updateMapData = function(labs, user) {
          Object.values(labMarkers).forEach(m => map.removeLayer(m)); labMarkers = {};
          labCircles.forEach(c => map.removeLayer(c)); labCircles = [];
          if (userMarker) map.removeLayer(userMarker);
          var bounds = [];

          labs.forEach(function(lab) {
            var circle = L.circle([lab.latitude, lab.longitude], { radius: lab.radiusMeters, color: '#1B2A4E', fillColor: '#1B2A4E', fillOpacity: 0.12, weight: 1 }).addTo(map);
            labCircles.push(circle);
            var marker = L.marker([lab.latitude, lab.longitude]).addTo(map);
            marker.on('click', function() {
              if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: lab.id })); }
            });
            labMarkers[lab.id] = marker; bounds.push([lab.latitude, lab.longitude]);
          });

          if (user) {
            userMarker = L.circleMarker([user.latitude, user.longitude], { radius: 8, color: '#FFF', weight: 2, fillColor: '#1E90FF', fillOpacity: 1 }).addTo(map);
            bounds.push([user.latitude, user.longitude]);
          }
          if (bounds.length === 1) { map.setView(bounds[0], 16); } else if (bounds.length > 1) { map.fitBounds(bounds, { padding: [50, 50] }); }
        };
        
        map.on('click', function() { if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' })); } });
        
        window.updateMapData(${initialLabs}, ${initialUser});
      </script>
    </body>
    </html>
  `;

  const locationMessage = issue ? LOCATION_MESSAGES[issue] : null;
  const labsMessage = LABS_MESSAGES[labsStatus] ?? null;
  const showEmpty = labsStatus === 'ready' && labs.length === 0;

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html: mapHtml }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerClick') { setSelectedId(data.id); } else if (data.type === 'mapClick') { setSelectedId(null); }
          } catch (e) {}
        }}
        onLoadEnd={updateMapData}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      <View style={styles.notices} pointerEvents="box-none">
        {locationMessage ? <Notice icon="location-outline" title={locationMessage.title} text={locationMessage.text} actionLabel={locationMessage.action === 'settings' ? 'Buka pengaturan' : 'Coba lagi'} onAction={() => locationMessage.action === 'settings' ? Linking.openSettings() : locate()} disabled={checking} /> : null}
        {labsMessage ? <Notice icon={labsMessage.icon} title={labsMessage.title} text={labsMessage.text} actionLabel="Coba lagi" onAction={retryLabs} /> : null}
        {showEmpty ? <Notice icon="information-circle-outline" tone="info" title="Belum ada laboratorium" text="Belum ada laboratorium yang terdaftar." /> : null}
      </View>

      {selectedLab ? (
        <LabInfoSheet 
          lab={selectedLab} 
          sessions={sessions}
          loading={loadingSessions}
          error={sessionsError}
          onClose={() => setSelectedId(null)} 
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 }, 
  map: { flex: 1 }, 
  notices: { position: 'absolute', top: 12, left: 12, right: 12, gap: 8 },
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  noticeDanger: { backgroundColor: authColors.dangerSoft, borderColor: authColors.danger },
  noticeInfo: { backgroundColor: authColors.white, borderColor: authColors.border },
  noticeBody: { flex: 1, gap: 4 }, 
  noticeTitle: { fontSize: 14, fontWeight: '700', color: authColors.ink },
  noticeText: { fontSize: 13, lineHeight: 18, color: authColors.ink },
  noticeButton: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: authColors.navy },
  noticeButtonText: { fontSize: 13, fontWeight: '700', color: authColors.white },
});