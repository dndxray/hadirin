import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '@/context/app-context';
import type { Role } from '@/types/attendance';

const roleOptions: {
  id: Role;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'praktikan',
    title: 'Praktikan',
    description: 'Lihat jadwal praktikum dan lakukan presensi.',
    icon: 'school-outline',
  },
  {
    id: 'asisten',
    title: 'Asisten',
    description: 'Kelola sesi praktikum dan pantau kehadiran.',
    icon: 'clipboard-outline',
  },
];

export default function PilihIdentitasScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleContinue = () => {
    if (!selectedRole) return;

    // Identitas (id dan nama) ditentukan di dummy-attendance.ts lewat login().
    login(selectedRole);

    router.replace(selectedRole === 'asisten' ? '/jadwal' : '/presensi');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 36,
            paddingBottom: insets.bottom + 28,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="calendar-outline" size={28} color="#2DD4BF" />
          </View>

          <Text style={styles.appName}>Hadirin</Text>
          <Text style={styles.subtitle}>Sistem Presensi Praktikum</Text>
        </View>

        <View style={styles.headingContainer}>
          <Text style={styles.title}>Masuk sebagai siapa?</Text>
          <Text style={styles.description}>
            Pilih peranmu untuk melanjutkan ke aplikasi.
          </Text>
        </View>

        <View style={styles.roleList}>
          {roleOptions.map((role) => {
            const isSelected = selectedRole === role.id;

            return (
              <Pressable
                key={role.id}
                onPress={() => setSelectedRole(role.id)}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerSelected,
                  ]}
                >
                  <Ionicons
                    name={role.icon}
                    size={28}
                    color={isSelected ? '#2DD4BF' : '#A0AEC0'}
                  />
                </View>

                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>
                    {role.description}
                  </Text>
                </View>

                <View
                  style={[styles.radio, isSelected && styles.radioSelected]}
                >
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={!selectedRole}
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
        >
          <Text style={styles.continueText}>Lanjutkan</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color={selectedRole ? '#0B1120' : '#64748B'}
          />
        </Pressable>

        <Text style={styles.footer}>Pilih peran sesuai kebutuhanmu</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#132B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
  },
  headingContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#94A3B8',
  },
  roleList: {
    gap: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C30',
    borderWidth: 1,
    borderColor: '#27364D',
    borderRadius: 18,
    padding: 20,
    minHeight: 122,
    gap: 16,
  },
  roleCardSelected: {
    backgroundColor: '#12312F',
    borderColor: '#2DD4BF',
    borderWidth: 2,
    padding: 19,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#202E43',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#194440',
  },
  roleInfo: {
    flex: 1,
    gap: 7,
  },
  roleTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  roleDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#A0AEC0',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#2DD4BF',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2DD4BF',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2DD4BF',
    borderRadius: 14,
    paddingVertical: 17,
    marginTop: 32,
  },
  continueButtonDisabled: {
    backgroundColor: '#243347',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1120',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: 20,
  },
});