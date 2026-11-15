import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { theme } from '../theme';
import {
  resolveParticipantUids,
  type ClassParticipant,
  type SessionInput,
} from '../../../src/services/assistant-service';
import { ClassData, subscribeClasses } from '../../../src/lib/classes';

interface SessionFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<SessionInput>;
  onClose: () => void;
  onSubmit: (data: SessionInput) => Promise<void>;
}

export function SessionFormModal({
  visible,
  mode,
  initialData,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [className, setClassName] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    mapped: number;
    total: number;
    unmatched: ClassParticipant[];
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mappingRequest = useRef(0);

  // Subscribe to available classes for quick auto-fill
  useEffect(() => {
    const unsub = subscribeClasses(
      (items) => setClasses(items),
      () => {}
    );
    return () => unsub();
  }, []);

  const handleSelectClass = async (c: ClassData) => {
    const requestId = ++mappingRequest.current;
    setClassName(c.name);
    if (!courseName && c.course) setCourseName(c.course);
    if (!room && c.room) setRoom(c.room);

    if (c.participants.length === 0) {
      setParticipantIds([]);
      setMapping({ mapped: 0, total: 0, unmatched: [] });
      return;
    }

    const result = await resolveParticipantUids(c.participants);
    if (mappingRequest.current !== requestId) return;

    setParticipantIds(result.uids);
    setMapping({
      mapped: result.uids.length,
      total: c.participants.length,
      unmatched: result.unmatched,
    });
  };

  const handleSave = async () => {
    if (!courseName.trim()) return setError('Nama praktikum wajib diisi.');
    if (!className.trim()) return setError('Kelas wajib diisi.');
    if (!dateLabel.trim()) return setError('Tanggal jadwal wajib diisi.');
    if (!timeRange.trim()) return setError('Waktu jadwal wajib diisi.');
    if (!room.trim()) return setError('Ruangan praktikum wajib diisi.');

    setError(null);
    setBusy(true);

    try {
      await onSubmit({
        courseName: courseName.trim(),
        courseCode: courseCode.trim(),
        className: className.trim(),
        dateLabel: dateLabel.trim(),
        timeRange: timeRange.trim(),
        room: room.trim(),
        description: description.trim(),
        participantIds,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan sesi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
      onShow={() => {
        setCourseName(initialData?.courseName || '');
        setCourseCode(initialData?.courseCode || '');
        setClassName(initialData?.className || '');
        setDateLabel(initialData?.dateLabel || '');
        setTimeRange(initialData?.timeRange || '');
        setRoom(initialData?.room || '');
        setDescription(initialData?.description || '');
        setParticipantIds(initialData?.participantIds || []);
        setMapping(null);
        setError(null);
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <Text style={styles.modalTitle}>
            {mode === 'create' ? 'Tambah Sesi Praktikum' : 'Ubah Sesi Praktikum'}
          </Text>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {classes.length > 0 && mode === 'create' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Pilih Dari Kelas Tersedia:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {classes.map((c) => (
                      <Pressable
                        key={c.id}
                        style={[
                          styles.chip,
                          className === c.name && styles.chipActive,
                        ]}
                        onPress={() => handleSelectClass(c)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            className === c.name && styles.chipTextActive,
                          ]}
                        >
                          {c.name} ({c.course || 'Praktikum'})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {mapping ? (
                  <Text style={styles.mappingText}>
                    {mapping.total === 0
                      ? 'Kelas ini belum memiliki peserta.'
                      : `${mapping.mapped} dari ${mapping.total} peserta terpetakan ke akun.`}
                    {mapping.unmatched.length > 0
                      ? ' Sebagian peserta belum dapat dipetakan. Pastikan NIM profil terisi dan tidak ganda.'
                      : ''}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama Mata Praktikum *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Pemrograman Mobile"
                placeholderTextColor={theme.colors.textMuted}
                value={courseName}
                onChangeText={setCourseName}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kode Mata Kuliah (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: IF184023"
                placeholderTextColor={theme.colors.textMuted}
                value={courseCode}
                onChangeText={setCourseCode}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kelas *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: TI-3A atau IF-B"
                placeholderTextColor={theme.colors.textMuted}
                value={className}
                onChangeText={(value) => {
                  mappingRequest.current += 1;
                  setClassName(value);
                  setParticipantIds([]);
                  setMapping(null);
                }}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tanggal Praktikum *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Kamis, 12 November 2026"
                placeholderTextColor={theme.colors.textMuted}
                value={dateLabel}
                onChangeText={setDateLabel}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Waktu / Sesi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 10.20 - 12.10 WIB"
                placeholderTextColor={theme.colors.textMuted}
                value={timeRange}
                onChangeText={setTimeRange}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ruangan / Lab *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Lab B atau Lab Komputer 2"
                placeholderTextColor={theme.colors.textMuted}
                value={room}
                onChangeText={setRoom}
                editable={!busy}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Deskripsi Sesi (Opsional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Contoh: Modul 04 - Firebase Authentication & Firestore"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!busy}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.buttonRow}>
              <Pressable
                disabled={busy}
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {mode === 'create' ? 'Buat Sesi' : 'Simpan Perubahan'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                disabled={busy}
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  formScroll: {
    maxHeight: 520,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  mappingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: theme.fontSize.md,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
});
