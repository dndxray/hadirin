import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAsisten } from '../../../features/asisten/AsistenContext';
import { SessionCard } from '../../../features/asisten/components/SessionCard';
import { EmptyState } from '../../../features/asisten/components/EmptyState';
import { theme } from '../../../features/asisten/theme';

export default function AsistenIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { assistant, sessions } = useAsisten();

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Jadwal Praktikum</Text>
            <Text style={styles.subtitle}>Asisten: {assistant.name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/(asisten)/sessions/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="📅" title="Belum ada jadwal praktikum" />
        }
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    maxWidth: theme.layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
});
