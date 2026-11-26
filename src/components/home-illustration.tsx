import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

/**
 * Ilustrasi kecil di pojok kanan header Home:
 * HP dengan centang hijau, QR, dan jam.
 * Dibuat dari View + Ionicons supaya tidak perlu aset gambar tambahan.
 * Kalau nanti punya file PNG/SVG dari Figma, cukup ganti isi komponen ini.
 */
export function HomeIllustration() {
  return (
    <View style={styles.wrap}>
      <View style={styles.blob} />

      {/* HP */}
      <View style={styles.phone}>
        <View style={styles.phoneCheck}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.phoneLine} />
        <View style={[styles.phoneLine, { width: 22 }]} />
        <View style={styles.phoneButton} />
      </View>

      {/* QR */}
      <View style={[styles.chip, styles.chipQr]}>
        <Ionicons name="qr-code" size={26} color="#1B2A4E" />
      </View>

      {/* Jam (sekarang di kiri HP) */}
      <View style={[styles.chip, styles.chipClock]}>
        <Ionicons name="time" size={16} color="#F59E0B" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 170,
    height: 130,
    pointerEvents: 'none',
  },
  blob: {
    position: 'absolute',
    top: 6,
    left: 14,
    right: -10,
    bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phone: {
    position: 'absolute',
    top: 14,
    left: 62,
    width: 58,
    height: 104,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingTop: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  phoneCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  phoneLine: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' },
  phoneButton: {
    marginTop: 6,
    width: 34,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B2A4E',
  },
  chip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipQr: { right: 1, top: 30, width: 42, height: 42, borderRadius: 12 },
  chipClock: { left: 26, top: 70, width: 28, height: 28, borderRadius: 14 },
});