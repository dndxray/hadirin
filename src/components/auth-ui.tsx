import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const APP_NAME = 'Hadirin';

export const authColors = {
  navy: '#1B2A4E',
  green: '#16A34A',
  background: '#F4F7FB',
  field: '#F1F4F9',
  border: '#E2E8F0',
  ink: '#1B2A4E',
  muted: '#64748B',
  placeholder: '#94A3B8',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  white: '#FFFFFF',
};

type ShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, subtitle, children, footer }: ShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.circle} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="stats-chart" size={20} color={authColors.white} />
          </View>
          <View>
            <Text style={styles.brandName}>{APP_NAME}</Text>
            <Text style={styles.brandTag}>Presensi Praktikum</Text>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.form}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function AuthField({ label, icon, secureTextEntry, ...inputProps }: FieldProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <Ionicons name={icon} size={18} color={authColors.muted} />
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={authColors.placeholder}
          secureTextEntry={hidden}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={authColors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type Option<T extends string> = { value: T; label: string; icon: keyof typeof Ionicons.glyphMap };

export function AuthOptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.option, active && styles.optionActive]}
            >
              <Ionicons
                name={o.icon}
                size={18}
                color={active ? authColors.white : authColors.muted}
              />
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle-outline" size={18} color={authColors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function AuthButton({
  title,
  loading,
  onPress,
}: {
  title: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={authColors.white} />
      ) : (
        <>
          <Text style={styles.buttonText}>{title}</Text>
          <Ionicons name="arrow-forward" size={18} color={authColors.white} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: authColors.white },
  circle: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: authColors.navy,
  },
  container: { paddingHorizontal: 24, gap: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: authColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { color: authColors.ink, fontSize: 18, fontWeight: '800' },
  brandTag: { color: authColors.muted, fontSize: 11 },
  heading: { gap: 6, marginTop: 36 },
  eyebrow: { color: authColors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: authColors.ink, fontSize: 30, fontWeight: '800' },
  subtitle: { color: authColors.muted, fontSize: 14, lineHeight: 20 },
  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { color: authColors.ink, fontSize: 13, fontWeight: '700' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: authColors.field,
    borderColor: authColors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: { flex: 1, color: authColors.ink, fontSize: 15, paddingVertical: 12 },
  optionRow: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.field,
  },
  optionActive: { backgroundColor: authColors.navy, borderColor: authColors.navy },
  optionText: { color: authColors.muted, fontWeight: '700' },
  optionTextActive: { color: authColors.white },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: authColors.dangerSoft,
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, color: authColors.danger, fontSize: 13 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: authColors.navy,
    borderRadius: 14,
    minHeight: 52,
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: authColors.white, fontSize: 16, fontWeight: '800' },
  footer: { alignItems: 'center', gap: 6 },
});