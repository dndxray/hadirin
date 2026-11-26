import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthButton, AuthError, AuthField, authColors } from '@/components/auth-ui';
import { LocationAccessError, acquireDevicePosition } from '@/services/device-location';
import type { Lab } from '@/types/sprint-three';
import { firebaseErrorMessage } from '@/utils/firebase-error';

import {
  LAB_NAME_MAX_LENGTH,
  validateLabForm,
  type LabFormErrors,
  type LabFormValues,
  type LabInput,
} from './lab-validation';

type Props = {
  visible: boolean;
  // Diisi saat mengubah lab; kosong berarti menambah lab baru.
  lab?: Lab | null;
  onClose: () => void;
  onSubmit: (input: LabInput) => Promise<void>;
};

const EMPTY_VALUES: LabFormValues = { name: '', latitude: '', longitude: '', radiusMeters: '' };

// Keyboard angka bawaan Android sering tidak punya tanda minus, jadi koordinat
// memakai keyboard biasa di Android.
const COORDINATE_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default';

function valuesFrom(lab?: Lab | null): LabFormValues {
  if (!lab) return EMPTY_VALUES;
  return {
    name: lab.name,
    latitude: String(lab.latitude),
    longitude: String(lab.longitude),
    radiusMeters: String(lab.radiusMeters),
  };
}

// Form tambah dan ubah laboratorium (SRS-22).
export function LabFormModal({ visible, lab, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<LabFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<LabFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Pengisian koordinat dari lokasi perangkat.
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<{ message: string; blocked: boolean } | null>(
    null,
  );
  const [locationNote, setLocationNote] = useState<string | null>(null);
  // Penanda form yang sedang dibuka, supaya hasil lokasi dari form yang sudah
  // ditutup tidak mengisi form berikutnya.
  const openCount = useRef(0);

  // Isi ulang form setiap kali dibuka.
  useEffect(() => {
    if (!visible) return;
    openCount.current += 1;
    const id = setTimeout(() => {
      setValues(valuesFrom(lab));
      setErrors({});
      setSubmitError(null);
      setSaving(false);
      setLocating(false);
      setLocationError(null);
      setLocationNote(null);
    }, 0);
    return () => clearTimeout(id);
  }, [visible, lab]);

  const editing = !!lab;

  function setField(field: keyof LabFormValues, text: string) {
    setValues((current) => ({ ...current, [field]: text }));
    // Hapus pesan error kolom itu saat pengguna mulai memperbaikinya.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Mengisi latitude dan longitude dari lokasi perangkat (berguna saat asisten
  // sedang berada di lab). Kondisi izin, GPS, dan koordinat dijelaskan ke pengguna.
  async function handleUseLocation() {
    if (locating || saving) return;
    const session = openCount.current;
    setLocating(true);
    setLocationError(null);
    setLocationNote(null);
    try {
      const position = await acquireDevicePosition();
      if (session !== openCount.current) return;
      setValues((current) => ({
        ...current,
        latitude: position.latitude.toFixed(6),
        longitude: position.longitude.toFixed(6),
      }));
      setErrors((current) => ({ ...current, latitude: undefined, longitude: undefined }));
      setLocationNote(
        position.accuracy === null
          ? 'Koordinat terisi dari lokasi kamu.'
          : `Koordinat terisi dari lokasi kamu (akurasi sekitar ${Math.round(position.accuracy)} m).`,
      );
    } catch (error) {
      if (session !== openCount.current) return;
      setLocationError({
        message:
          error instanceof Error
            ? error.message
            : 'Koordinat belum tersedia. Periksa izin lokasi dan GPS, lalu coba lagi.',
        blocked: error instanceof LocationAccessError && error.code === 'blocked',
      });
    } finally {
      if (session === openCount.current) setLocating(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const result = validateLabForm(values);
    setErrors(result.errors);
    setSubmitError(null);
    if (!result.input) return;

    setSaving(true);
    try {
      await onSubmit(result.input);
      onClose();
    } catch (error) {
      setSubmitError(firebaseErrorMessage(error));
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? 'Ubah Laboratorium' : 'Tambah Laboratorium'}</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Tutup form">
              <Ionicons name="close" size={22} color={authColors.muted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}>
            <View style={styles.group}>
              <AuthField
                label="Nama laboratorium"
                icon="business-outline"
                placeholder="Contoh: Laboratorium A"
                value={values.name}
                onChangeText={(text) => setField('name', text)}
                maxLength={LAB_NAME_MAX_LENGTH}
              />
              <FieldError message={errors.name} />
            </View>

            <View style={styles.group}>
              <AuthField
                label="Latitude"
                icon="navigate-outline"
                placeholder="Contoh: -7.0505"
                value={values.latitude}
                onChangeText={(text) => setField('latitude', text)}
                keyboardType={COORDINATE_KEYBOARD}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FieldError message={errors.latitude} />
            </View>

            <View style={styles.group}>
              <AuthField
                label="Longitude"
                icon="compass-outline"
                placeholder="Contoh: 110.441"
                value={values.longitude}
                onChangeText={(text) => setField('longitude', text)}
                keyboardType={COORDINATE_KEYBOARD}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FieldError message={errors.longitude} />

              <Pressable
                onPress={handleUseLocation}
                disabled={locating || saving}
                style={[styles.locate, (locating || saving) && styles.locateDisabled]}
                accessibilityLabel="Gunakan lokasi saya untuk mengisi koordinat">
                {locating ? (
                  <ActivityIndicator size="small" color={authColors.navy} />
                ) : (
                  <Ionicons name="locate-outline" size={18} color={authColors.navy} />
                )}
                <Text style={styles.locateText}>
                  {locating ? 'Mencari lokasi...' : 'Gunakan lokasi saya'}
                </Text>
              </Pressable>

              {locationNote ? <Text style={styles.locationNote}>{locationNote}</Text> : null}
              {locationError ? (
                <>
                  <AuthError message={locationError.message} />
                  {locationError.blocked && Platform.OS !== 'web' ? (
                    <Pressable onPress={() => Linking.openSettings()} style={styles.settings}>
                      <Text style={styles.settingsText}>Buka pengaturan</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.hint}>
                Atau salin koordinat dari Google Maps: tekan lama di lokasi lab.
              </Text>
            </View>

            <View style={styles.group}>
              <AuthField
                label="Radius presensi (meter)"
                icon="radio-button-on-outline"
                placeholder="Contoh: 50"
                value={values.radiusMeters}
                onChangeText={(text) => setField('radiusMeters', text)}
                keyboardType="number-pad"
              />
              <FieldError message={errors.radiusMeters} />
              <Text style={styles.hint}>
                Jarak maksimal dari titik lab agar presensi diterima (1 sampai 1.000 meter).
              </Text>
            </View>

            <AuthError message={submitError} />
            <AuthButton title="Simpan" loading={saving} onPress={handleSave} />
            <Pressable onPress={handleClose} disabled={saving} style={styles.cancel}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: authColors.white,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: authColors.ink },
  form: { padding: 20, gap: 16 },
  group: { gap: 6 },
  fieldError: { fontSize: 12, color: authColors.danger },
  hint: { fontSize: 12, color: authColors.muted },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authColors.navy,
  },
  locateDisabled: { opacity: 0.6 },
  locateText: { fontSize: 14, fontWeight: '700', color: authColors.navy },
  locationNote: { fontSize: 12, color: authColors.green },
  settings: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: authColors.navy,
  },
  settingsText: { fontSize: 13, fontWeight: '700', color: authColors.white },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 14, fontWeight: '700', color: authColors.muted },
});
