import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import type { SessionInput } from '../../../src/services/assistant-service';
import { useAsisten } from '../AsistenContext';
import { EmptyState } from '../components/EmptyState';
import { SessionCard } from '../components/SessionCard';
import { SessionFormModal } from '../components/SessionFormModal';
import { theme } from '../theme';

export function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, loading: authLoading } = useAuth();
  const isAsisten = profile?.role === 'asisten';
  const { assistant, sessions, createSession, loading, error } = useAsisten();

  const [showAddModal, setShowAddModal] = useState(false);

  const handleCreateSession = async (input: SessionInput) => {
    await createSession(input);
  };

  if (loading || authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Memuat jadwal...</Text>
      </View>
    );
  }

  const errorBanner = error ? (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>⚠️ {error}</Text>
      <Text style={styles.errorHint}>Coba periksa koneksi internet Anda.</Text>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerTextSection}>
                <Text style={styles.title}>Jadwal Praktikum</Text>
                <Text style={styles.subtitle}>
                  {isAsisten
                    ? `Asisten: ${profile?.name || assistant.name}`
                    : 'Daftar sesi praktikum terdaftar'}
                </Text>
              </View>

              {isAsisten && (
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.permissionsButton}
                    onPress={() => router.push('/permissions')}
                  >
                    <Text style={styles.permissionsButtonText}>📄 Izin</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Tambah jadwal sesi"
                    style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={26} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </View>
            {errorBanner}
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => {
              if (isAsisten) {
                router.push({
                  pathname: '/(asisten)/sessions/[sessionId]',
                  params: { sessionId: item.id },
                });
              } else {
                router.push({
                  pathname: '/detail-sesi',
                  params: { id: item.id },
                });
              }
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="Belum ada jadwal praktikum"
            subtitle={
              isAsisten
                ? 'Tekan tombol + untuk membuat jadwal baru.'
                : 'Sesi praktikum akan muncul saat dibuka oleh asisten.'
            }
          />
        }
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
      />

      {isAsisten && (
        <SessionFormModal
          visible={showAddModal}
          mode="create"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateSession}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    color: '#991B1B',
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  errorHint: {
    color: '#B91C1C',
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTextSection: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionsButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionsButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2F5AA8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F5AA8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});