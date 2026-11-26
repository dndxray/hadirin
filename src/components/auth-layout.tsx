import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { LoginIllustration } from './login-illustration';

const SHEET_BG = '#F5F7FA';
const NAVY = '#1B2A4E';
const MUTED = '#64748B';

type Props = {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
};

export function AuthShell({ children, eyebrow, title, subtitle, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#1B2A4E" />
                <Stop offset="1" stopColor="#2F5AA8" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#heroGradient)" />
          </Svg>

          <Text style={styles.brand}>Hadirin</Text>

          <View style={styles.illustration}>
            <LoginIllustration />
          </View>

          {/* Lengkung peralihan ke area form */}
          <Svg
            style={styles.wave}
            width="100%"
            height={44}
            viewBox="0 0 360 44"
            preserveAspectRatio="none"
          >
            <Path d="M0 44 L0 20 Q180 -16 360 20 L360 44 Z" fill={SHEET_BG} />
          </Svg>
        </View>

        <View style={styles.sheet}>
          <View style={[styles.sheetInner, { paddingBottom: insets.bottom + 28 }]}>
            <View style={styles.heading}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            {children}

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export const AuthLayout = AuthShell;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHEET_BG },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    overflow: 'hidden',
  },
    brand: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'MuseoModerno_700Bold',
    letterSpacing: 0.5,
    },
  illustration: {
    width: '100%',
    maxWidth: 400,
    marginTop: 12,
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
  },
  sheet: {
    flex: 1,
    backgroundColor: SHEET_BG,
  },
  sheetInner: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  heading: { marginBottom: 20 },
  eyebrow: {
    color: '#2F5AA8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: { color: NAVY, fontSize: 26, fontWeight: '800' },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 6 },
  footer: { marginTop: 20, alignItems: 'center' },
});