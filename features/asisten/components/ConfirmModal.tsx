import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '@/components/auth-ui';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmColor: 'green' | 'red';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Nanti Saja',
  confirmColor,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isRed = confirmColor === 'red';

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />

          <View style={[styles.icon, { backgroundColor: isRed ? '#FEE2E2' : '#E6F6EC' }]}>
            <Ionicons
              name={isRed ? 'close' : 'checkmark'}
              size={28}
              color={isRed ? authColors.danger : authColors.green}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.confirm} onPress={onConfirm}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: authColors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: authColors.border,
    marginBottom: 8,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: authColors.ink, fontSize: 18, fontWeight: '800', marginTop: 6 },
  message: {
    color: authColors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 10,
  },
  confirm: {
    alignSelf: 'stretch',
    backgroundColor: authColors.navy,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  cancel: { paddingVertical: 10 },
  cancelText: { color: authColors.muted, fontWeight: '700' },
});