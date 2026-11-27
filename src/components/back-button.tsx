import { router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  /** Kalau kosong: kembali ke halaman sebelumnya, atau ke /home bila tidak ada. */
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Warna ikon. Default navy, karena tombolnya berlatar biru muda. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({
  onPress,
  accessibilityLabel = 'Kembali',
  disabled = false,
  color = '#1B2A4E',
  style,
}: Props) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && { opacity: 0.6 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {/* Garis "<" dengan ujung dan sudut membulat */}
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M15 5 L8.5 12 L15 19"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});