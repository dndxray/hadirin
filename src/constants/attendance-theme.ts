import { useColorScheme } from 'react-native';

const palettes = {
  light: {
    background: '#F3F7F8',
    surface: '#FFFFFF',
    surfaceMuted: '#E8F0F2',
    ink: '#132A3A',
    inkMuted: '#687B86',
    border: '#D7E2E6',
    primary: '#176B87',
    primaryPressed: '#10546B',
    primarySoft: '#DCEFF4',
    success: '#16805B',
    successSoft: '#DDF4EA',
    danger: '#C94B49',
    dangerSoft: '#FAE6E5',
    warning: '#A96812',
    warningSoft: '#FFF0D4',
    overlay: 'rgba(7, 24, 33, 0.56)',
  },
  dark: {
    background: '#0C171D',
    surface: '#14252E',
    surfaceMuted: '#1B313C',
    ink: '#F3F8FA',
    inkMuted: '#A8BBC4',
    border: '#2B424D',
    primary: '#62BDD7',
    primaryPressed: '#83CBE0',
    primarySoft: '#173A47',
    success: '#66D0A7',
    successSoft: '#163A2D',
    danger: '#F28B88',
    dangerSoft: '#462725',
    warning: '#F0BB63',
    warningSoft: '#493719',
    overlay: 'rgba(0, 0, 0, 0.72)',
  },
} as const;

export type AttendanceTheme = (typeof palettes)[keyof typeof palettes];

export function useAttendanceTheme() {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
