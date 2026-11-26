import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

export type QuickKind =
  | 'jadwal'
  | 'presensi'
  | 'riwayat'
  | 'maps'
  | 'kelas'
  | 'izin'
  | 'akun';

const SIZE = 60;
const TILE_BG = '#E4EDFE'; // latar biru muda polos, sama untuk semua ikon

/**
 * Ikon menu cepat: ilustrasi berwarna di atas latar biru muda polos.
 * Dibuat dari View + Ionicons (tanpa aset gambar), ukuran 60x60.
 * Kalau nanti ada PNG/SVG dari Figma, cukup ganti isi tiap fungsi di bawah.
 */
export function QuickIllustration({ kind }: { kind: QuickKind }) {
  return (
    <View style={styles.tile}>
      {kind === 'jadwal' ? <JadwalArt /> : null}
      {kind === 'presensi' ? <PresensiArt /> : null}
      {kind === 'riwayat' ? <RiwayatArt /> : null}
      {kind === 'maps' ? <MapsArt /> : null}
      {kind === 'kelas' ? <KelasArt /> : null}
      {kind === 'izin' ? <IzinArt /> : null}
      {kind === 'akun' ? <AkunArt /> : null}
    </View>
  );
}

function JadwalArt() {
  return (
    <>
      <View style={jadwal.body}>
        <View style={jadwal.band} />
        <View style={jadwal.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[jadwal.cell, i === 4 && { backgroundColor: '#EF4444' }]} />
          ))}
        </View>
      </View>
      <View style={[jadwal.ring, { left: 20 }]} />
      <View style={[jadwal.ring, { left: 36 }]} />
      <View style={jadwal.badge}>
        <Ionicons name="time" size={14} color="#FFFFFF" />
      </View>
    </>
  );
}

function PresensiArt() {
  return (
    <>
      <View style={presensi.phone}>
        <View style={presensi.check}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
        <View style={presensi.line} />
        <View style={[presensi.line, { width: 10 }]} />
      </View>
      <View style={presensi.pin}>
        <Ionicons name="location" size={22} color="#F97316" />
      </View>
    </>
  );
}

function RiwayatArt() {
  return (
    <>
      <View style={[riwayat.paper, { left: 17, top: 9, backgroundColor: '#C4B5FD' }]} />
      <View style={[riwayat.paper, { left: 12, top: 13 }]}>
        <View style={riwayat.line} />
        <View style={riwayat.line} />
        <View style={[riwayat.line, { width: 12 }]} />
      </View>
      <View style={riwayat.clock}>
        <View style={riwayat.handV} />
        <View style={riwayat.handH} />
      </View>
    </>
  );
}

function MapsArt() {
  return (
    <>
      <View style={maps.map}>
        <View style={[maps.panel, { backgroundColor: '#86EFAC' }]} />
        <View style={[maps.panel, { backgroundColor: '#7DD3FC' }]} />
        <View style={[maps.panel, { backgroundColor: '#BBF7D0' }]} />
      </View>
      <View style={maps.road} />
      <View style={maps.pin}>
        <Ionicons name="location" size={28} color="#EF4444" />
      </View>
    </>
  );
}

function KelasArt() {
  return (
    <>
      <View style={kelas.board}>
        <View style={kelas.band} />
        <View style={kelas.iconWrap}>
          <Ionicons name="school" size={22} color="#3B82F6" />
        </View>
      </View>
      <View style={kelas.badge}>
        <Ionicons name="people" size={12} color="#FFFFFF" />
      </View>
    </>
  );
}

function IzinArt() {
  return (
    <>
      <View style={izin.paper}>
        <View style={izin.line} />
        <View style={izin.line} />
        <View style={[izin.line, { width: 12 }]} />
      </View>
      <View style={izin.badge}>
        <Ionicons name="create" size={13} color="#FFFFFF" />
      </View>
    </>
  );
}

function AkunArt() {
  return (
    <>
      <View style={akun.avatar}>
        <Ionicons name="person" size={26} color="#3B82F6" />
      </View>
      <View style={akun.badge}>
        <Ionicons name="settings" size={12} color="#FFFFFF" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: 20,
    backgroundColor: TILE_BG,
    overflow: 'hidden',
  },
});

const jadwal = StyleSheet.create({
  body: {
    position: 'absolute',
    left: 11,
    top: 13,
    width: 38,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  band: { height: 11, backgroundColor: '#3B82F6' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingTop: 5,
    gap: 3,
  },
  cell: { width: 8, height: 6, borderRadius: 2, backgroundColor: '#BFDBFE' },
  ring: {
    position: 'absolute',
    top: 8,
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#1E3A8A',
  },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const presensi = StyleSheet.create({
  phone: {
    position: 'absolute',
    left: 17,
    top: 8,
    width: 26,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 7,
    gap: 3,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  check: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  line: { width: 15, height: 3, borderRadius: 2, backgroundColor: '#E2E8F0' },
  pin: { position: 'absolute', right: 6, bottom: 4 },
});

const riwayat = StyleSheet.create({
  paper: {
    position: 'absolute',
    width: 28,
    height: 36,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingTop: 8,
    gap: 4,
  },
  line: { width: 18, height: 3, borderRadius: 2, backgroundColor: '#DDD6FE' },
  clock: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  handV: {
    position: 'absolute',
    left: 10,
    top: 4,
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  handH: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});

const maps = StyleSheet.create({
  map: {
    position: 'absolute',
    left: 9,
    top: 18,
    width: 42,
    height: 30,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  panel: { flex: 1 },
  road: {
    position: 'absolute',
    left: 12,
    top: 36,
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-12deg' }],
  },
  pin: { position: 'absolute', left: 16, top: 4 },
});

const kelas = StyleSheet.create({
  board: {
    position: 'absolute',
    left: 10,
    top: 12,
    width: 40,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  band: { height: 8, backgroundColor: '#3B82F6' },
  iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const izin = StyleSheet.create({
  paper: {
    position: 'absolute',
    left: 14,
    top: 9,
    width: 30,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingTop: 10,
    gap: 4,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  line: { width: 18, height: 3, borderRadius: 2, backgroundColor: '#BFDBFE' },
  badge: {
    position: 'absolute',
    right: 5,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const akun = StyleSheet.create({
  avatar: {
    position: 'absolute',
    left: 11,
    top: 11,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    right: 5,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});