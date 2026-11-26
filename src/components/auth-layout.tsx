import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
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
const WAVE_HEIGHT = 44;
const FORM_GAP = 16; // jarak antar "Masuk sebagai", Email, Kata sandi, tombol

type Props = {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
};

export function AuthShell({ children, eyebrow, title, subtitle, footer }: Props) {
  const insets = useSafeAreaInsets();
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });

  // Ukur hero (padding box penuh) supaya Svg latar punya ukuran pixel pasti.
  const handleHeroLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setHeroSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  const ready = heroSize.width > 0 && heroSize.height > 0;

  return (
    // 'padding' di iOS & Android: Android edge-to-edge tidak me-resize window
    // saat keyboard muncul, jadi harus ditangani manual.
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
          onLayout={handleHeroLayout}
        >
          {ready ? (
            <Svg
              style={styles.heroBg}
              width={heroSize.width}
              height={heroSize.height}
              viewBox={`0 0 ${heroSize.width} ${heroSize.height}`}
              preserveAspectRatio="none"
              pointerEvents="none"
            >
              <Defs>
                <LinearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#1B2A4E" />
                  <Stop offset="1" stopColor="#2F5AA8" />
                </LinearGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={heroSize.width}
                height={heroSize.height}
                fill="url(#heroGradient)"
              />
            </Svg>
          ) : null}

          <Text style={styles.brand}>Hadirin</Text>

          <View style={styles.illustration}>
            <LoginIllustration />
          </View>

          {/* Lengkung peralihan ke area form */}
          {ready ? (
            <Svg
              style={styles.wave}
              width={heroSize.width}
              height={WAVE_HEIGHT}
              viewBox="0 0 360 44"
              preserveAspectRatio="none"
              pointerEvents="none"
            >
              <Path d="M0 44 L0 20 Q180 -16 360 20 L360 44 Z" fill={SHEET_BG} />
            </Svg>
          ) : null}
        </View>

        <View style={styles.sheet}>
          <View style={[styles.sheetInner, { paddingBottom: insets.bottom + 28 }]}>
            <View style={styles.heading}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <View style={styles.form}>{children}</View>

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
    backgroundColor: NAVY, // fallback sebelum onLayout selesai
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
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
  form: { gap: FORM_GAP },
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