import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

// Ilustrasi karakter bawaan, digambar murni dengan SVG (tanpa file gambar).
// Latar bulat berwarna diberikan oleh ProfileAvatar.
const INK = '#1B2A4E';
const SHIRT = '#2F5AA8';
const BLUSH = '#FF8FA3';
const OUTLINE = '#E3E8F0';

function Shoulders({ fill = SHIRT }: { fill?: string }) {
  return <Path d="M14 100 Q18 82 50 82 Q82 82 86 100 Z" fill={fill} />;
}

function Eyes({ y = 52 }: { y?: number }) {
  return (
    <>
      <Circle cx={41} cy={y} r={3.4} fill={INK} />
      <Circle cx={59} cy={y} r={3.4} fill={INK} />
      <Circle cx={42.2} cy={y - 1.2} r={1.1} fill="#FFFFFF" />
      <Circle cx={60.2} cy={y - 1.2} r={1.1} fill="#FFFFFF" />
    </>
  );
}

function Blush({ x = 34, y = 62 }: { x?: number; y?: number }) {
  return (
    <>
      <Circle cx={x} cy={y} r={4.5} fill={BLUSH} opacity={0.55} />
      <Circle cx={100 - x} cy={y} r={4.5} fill={BLUSH} opacity={0.55} />
    </>
  );
}

const MOUTH = 'M50 61.5 L50 64 M50 64 Q46 68 43 65 M50 64 Q54 68 57 65';

const ART: Record<string, () => ReactNode> = {
  cat: () => (
    <>
      <Shoulders />
      <Path d="M25 42 L28 14 L46 29 Z" fill="#F4A259" />
      <Path d="M75 42 L72 14 L54 29 Z" fill="#F4A259" />
      <Path d="M30 35 L31 22 L40 29 Z" fill="#FFC9D1" />
      <Path d="M70 35 L69 22 L60 29 Z" fill="#FFC9D1" />
      <Circle cx={50} cy={54} r={28} fill="#F4A259" />
      <Path d="M50 27 L50 35 M43 28 L44 34 M57 28 L56 34" stroke="#E0802F" strokeWidth={2.4} strokeLinecap="round" />
      <Ellipse cx={50} cy={63} rx={11} ry={8} fill="#FFE7CF" />
      <Eyes />
      <Blush />
      <Path d="M47 58 L53 58 L50 61.5 Z" fill={BLUSH} />
      <Path d={MOUTH} stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M31 60 L19 58 M31 64 L20 67 M69 60 L81 58 M69 64 L80 67" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
    </>
  ),

  dog: () => (
    <>
      <Shoulders />
      <Path d="M27 36 Q9 38 11 62 Q13 74 25 67 Z" fill="#8B5E3C" />
      <Path d="M73 36 Q91 38 89 62 Q87 74 75 67 Z" fill="#8B5E3C" />
      <Circle cx={50} cy={54} r={28} fill="#E3B07E" />
      <Circle cx={60} cy={50} r={10} fill="#B9814F" opacity={0.55} />
      <Ellipse cx={50} cy={63} rx={12} ry={9} fill="#FFF1DE" />
      <Eyes />
      <Blush x={32} />
      <Ellipse cx={50} cy={58} rx={5} ry={3.5} fill={INK} />
      <Path d="M50 61.5 L50 66 M50 66 Q45 71 41 67 M50 66 Q55 71 59 67" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),

  bear: () => (
    <>
      <Shoulders />
      <Circle cx={27} cy={30} r={11} fill="#8A5A32" />
      <Circle cx={27} cy={30} r={5.5} fill="#D8A877" />
      <Circle cx={73} cy={30} r={11} fill="#8A5A32" />
      <Circle cx={73} cy={30} r={5.5} fill="#D8A877" />
      <Circle cx={50} cy={54} r={28} fill="#A9743F" />
      <Ellipse cx={50} cy={63} rx={11} ry={8} fill="#EBCB9E" />
      <Eyes />
      <Blush />
      <Ellipse cx={50} cy={58} rx={4.5} ry={3} fill={INK} />
      <Path d={MOUTH} stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),

  rabbit: () => (
    <>
      <Shoulders />
      <Ellipse cx={38} cy={20} rx={8} ry={16} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.5} />
      <Ellipse cx={38} cy={21} rx={4} ry={11} fill="#FFC9D1" />
      <Ellipse cx={62} cy={20} rx={8} ry={16} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.5} />
      <Ellipse cx={62} cy={21} rx={4} ry={11} fill="#FFC9D1" />
      <Circle cx={50} cy={54} r={28} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.5} />
      <Eyes />
      <Blush />
      <Path d="M47 58 L53 58 L50 61.5 Z" fill={BLUSH} />
      <Path d={MOUTH} stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Rect x={47} y={65} width={6} height={6} rx={1.5} fill="#FFFFFF" stroke="#D6DCE6" strokeWidth={1} />
    </>
  ),

  fox: () => (
    <>
      <Shoulders />
      <Path d="M24 42 L26 14 L46 30 Z" fill="#F08A3C" />
      <Path d="M76 42 L74 14 L54 30 Z" fill="#F08A3C" />
      <Path d="M29 35 L28 21 L40 29 Z" fill="#4A2E1F" />
      <Path d="M71 35 L72 21 L60 29 Z" fill="#4A2E1F" />
      <Circle cx={50} cy={54} r={28} fill="#F08A3C" />
      <Path d="M22 58 Q36 54 50 66 Q36 79 24 71 Z" fill="#FFF3E6" />
      <Path d="M78 58 Q64 54 50 66 Q64 79 76 71 Z" fill="#FFF3E6" />
      <Eyes />
      <Ellipse cx={50} cy={64} rx={4.2} ry={3} fill={INK} />
      <Path d="M50 67 Q47 70.5 44 68.5 M50 67 Q53 70.5 56 68.5" stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </>
  ),

  panda: () => (
    <>
      <Shoulders />
      <Circle cx={27} cy={30} r={10} fill="#2B2F3A" />
      <Circle cx={73} cy={30} r={10} fill="#2B2F3A" />
      <Circle cx={50} cy={54} r={28} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={1.5} />
      <Ellipse cx={40} cy={52} rx={7} ry={9} fill="#2B2F3A" transform="rotate(20 40 52)" />
      <Ellipse cx={60} cy={52} rx={7} ry={9} fill="#2B2F3A" transform="rotate(-20 60 52)" />
      <Circle cx={41} cy={52} r={3} fill="#FFFFFF" />
      <Circle cx={59} cy={52} r={3} fill="#FFFFFF" />
      <Circle cx={41.4} cy={52.4} r={1.6} fill={INK} />
      <Circle cx={59.4} cy={52.4} r={1.6} fill={INK} />
      <Blush x={32} y={65} />
      <Ellipse cx={50} cy={61} rx={4.2} ry={3} fill="#2B2F3A" />
      <Path d="M50 64 L50 66 M50 66 Q46 70 43 67 M50 66 Q54 70 57 67" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),

  frog: () => (
    <>
      <Shoulders />
      <Ellipse cx={50} cy={58} rx={30} ry={26} fill="#7BC96F" />
      <Circle cx={33} cy={32} r={11} fill="#7BC96F" />
      <Circle cx={67} cy={32} r={11} fill="#7BC96F" />
      <Circle cx={33} cy={32} r={7.5} fill="#FFFFFF" />
      <Circle cx={67} cy={32} r={7.5} fill="#FFFFFF" />
      <Circle cx={34} cy={33} r={3.8} fill={INK} />
      <Circle cx={66} cy={33} r={3.8} fill={INK} />
      <Circle cx={35.2} cy={31.8} r={1.2} fill="#FFFFFF" />
      <Circle cx={67.2} cy={31.8} r={1.2} fill="#FFFFFF" />
      <Circle cx={46} cy={53} r={1.3} fill="#4E9A47" />
      <Circle cx={54} cy={53} r={1.3} fill="#4E9A47" />
      <Circle cx={30} cy={64} r={4.5} fill={BLUSH} opacity={0.55} />
      <Circle cx={70} cy={64} r={4.5} fill={BLUSH} opacity={0.55} />
      <Path d="M32 62 Q50 78 68 62" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </>
  ),

  penguin: () => (
    <>
      <Shoulders fill="#2E3A66" />
      <Circle cx={50} cy={54} r={28} fill="#2E3A66" />
      <Circle cx={42} cy={54} r={13} fill="#FFFFFF" />
      <Circle cx={58} cy={54} r={13} fill="#FFFFFF" />
      <Ellipse cx={50} cy={63} rx={16} ry={11} fill="#FFFFFF" />
      <Circle cx={41} cy={52} r={3.2} fill={INK} />
      <Circle cx={59} cy={52} r={3.2} fill={INK} />
      <Circle cx={42.1} cy={50.9} r={1} fill="#FFFFFF" />
      <Circle cx={60.1} cy={50.9} r={1} fill="#FFFFFF" />
      <Blush x={33} y={61} />
      <Path d="M44.5 58.5 Q50 55.5 55.5 58.5 L50 66 Z" fill="#F6A623" />
    </>
  ),

  owl: () => (
    <>
      <Shoulders />
      <Path d="M25 40 L23 16 L42 30 Z" fill="#9B6B43" />
      <Path d="M75 40 L77 16 L58 30 Z" fill="#9B6B43" />
      <Circle cx={50} cy={54} r={28} fill="#B07D4F" />
      <Circle cx={39} cy={52} r={12} fill="#FFFFFF" />
      <Circle cx={61} cy={52} r={12} fill="#FFFFFF" />
      <Circle cx={39} cy={53} r={5.5} fill={INK} />
      <Circle cx={61} cy={53} r={5.5} fill={INK} />
      <Circle cx={40.8} cy={51.2} r={1.8} fill="#FFFFFF" />
      <Circle cx={62.8} cy={51.2} r={1.8} fill="#FFFFFF" />
      <Path d="M46 60 L54 60 L50 68 Z" fill="#F6A623" />
    </>
  ),

  koala: () => (
    <>
      <Shoulders />
      <Circle cx={22} cy={40} r={13} fill="#9AA5B1" />
      <Circle cx={22} cy={40} r={7} fill="#EEF1F5" />
      <Circle cx={78} cy={40} r={13} fill="#9AA5B1" />
      <Circle cx={78} cy={40} r={7} fill="#EEF1F5" />
      <Circle cx={50} cy={54} r={28} fill="#B6BFCA" />
      <Eyes y={50} />
      <Blush x={33} y={62} />
      <Ellipse cx={50} cy={59} rx={7} ry={9} fill="#3A4150" />
      <Ellipse cx={48} cy={55.5} rx={2} ry={1.4} fill="#FFFFFF" opacity={0.35} />
      <Path d="M44 70 Q50 74 56 70" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),
};

export function AvatarArt({ id, size }: { id: string; size: number }) {
  const draw = ART[id];
  if (!draw) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {draw()}
    </Svg>
  );
}