import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';

import { theme } from '../theme';

interface DecisionModalProps {
  visible: boolean;
  type: 'approved' | 'rejected';
  practitionerName: string;
  onConfirm: (note: string) => Promise<void>;
  onCancel: () => void;
}

export function DecisionModal({
  visible,
  type,
  practitionerName,
  onConfirm,
  onCancel,
}: DecisionModalProps) {
  const isApproved = type === 'approved';
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(note);
      setNote('');
      onCancel();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan keputusan.');
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
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isApproved ? '#ECFDF5' : '#FEF2F2' },
            ]}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: isApproved ? theme.colors.green : theme.colors.red,
              }}
            >
              {isApproved ? '✓' : '✕'}
            </Text>
          </View>

          <Text style={styles.title}>
            {isApproved ? 'Setujui Pengajuan Izin' : 'Tolak Pengajuan Izin'}
          </Text>

          <Text style={styles.subtitle}>
            {isApproved
              ? `Apakah Anda yakin ingin menyetujui izin untuk ${practitionerName}?`
              : `Apakah Anda yakin ingin menolak izin untuk ${practitionerName}?`}
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Catatan Asisten (Opsional):</Text>
            <TextInput
              style={styles.input}
              placeholder={
                isApproved
                  ? 'Contoh: Silakan beristirahat dan lekas sembuh.'
                  : 'Contoh: Alasan tidak memenuhi kriteria izin praktikum.'
              }
              placeholderTextColor={theme.colors.textMuted}
              value={note}
              onChangeText={setNote}
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
              style={[
                styles.button,
                { backgroundColor: isApproved ? theme.colors.green : theme.colors.red },
              ]}
              onPress={handleConfirm}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {isApproved ? 'Ya, Setujui Izin' : 'Ya, Tolak Izin'}
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={busy}
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </Pressable>
          </View>
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
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 32,
    alignItems: 'center',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  fieldGroup: {
    width: '100%',
    marginBottom: 16,
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
    width: '100%',
  },
  errorText: {
    color: '#991B1B',
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    gap: 8,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
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
