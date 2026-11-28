import { StyleSheet, Text, View } from 'react-native';

import { AvatarArt } from '@/components/avatar-art';
import { DEFAULT_AVATAR_COLOR, findAvatar } from '@/constants/avatars';

type Props = {
  avatarId?: string | null;
  color?: string | null;
  name?: string | null;
  size?: number;
};

/** Avatar bulat: ilustrasi bawaan kalau sudah dipilih, kalau belum tampil huruf awal nama. */
export function ProfileAvatar({ avatarId, color, name, size = 84 }: Props) {
  const avatar = findAvatar(avatarId);
  const bg = color || DEFAULT_AVATAR_COLOR;
  const initial = name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      {avatar ? (
        <AvatarArt id={avatar.id} size={size} />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { color: '#8B4A2B', fontWeight: '800' },
});