
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';

const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`;

export function LoginIllustration() {
  return (
    <Svg
      width="100%"
      viewBox="0 0 360 250"
      style={{ aspectRatio: 360 / 250 }}
    >
      {/* Lingkaran latar */}
      <Circle
        cx={180}
        cy={128}
        r={112}
        fill="rgba(255,255,255,0.06)"
      />
      <Circle
        cx={180}
        cy={128}
        r={80}
        fill="rgba(255,255,255,0.08)"
      />

      {/* Daun di bawah */}
      <Path
        d="M18 250 Q6 205 40 182 Q52 222 18 250 Z"
        fill="#2B4A8B"
      />
      <Path
        d="M44 250 Q40 214 70 200 Q76 232 44 250 Z"
        fill="#3A63B5"
      />
      <Path
        d="M342 250 Q354 205 320 182 Q308 222 342 250 Z"
        fill="#2B4A8B"
      />
      <Path
        d="M316 250 Q320 214 290 200 Q284 232 316 250 Z"
        fill="#3A63B5"
      />

      {/* Pin lokasi + radius presensi */}
      <Ellipse
        cx={75}
        cy={178}
        rx={46}
        ry={13}
        fill="rgba(252,217,197,0.12)"
        stroke="#FCD9C5"
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />

      <Path
        d="M75 96 C60 96 51 107 51 120 C51 138 75 166 75 166 C75 166 99 138 99 120 C99 107 90 96 75 96 Z"
        fill="#FCD9C5"
      />

      <Circle cx={75} cy={120} r={9} fill="#1B2A4E" />

      {/* Kartu centang kiri atas */}
      <G transform="rotate(-8 72 58)">
        <Rect
          x={38}
          y={40}
          width={68}
          height={38}
          rx={10}
          fill="#FFFFFF"
        />
        <Circle cx={56} cy={59} r={10} fill="#22C55E" />
        <Path
          d="M51 59 L55 63 L62 55"
          stroke="#FFFFFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Rect
          x={72}
          y={53}
          width={26}
          height={5}
          rx={2.5}
          fill="#CBD5E1"
        />
        <Rect
          x={72}
          y={62}
          width={18}
          height={5}
          rx={2.5}
          fill="#E2E8F0"
        />
      </G>

      {/* Jam kanan atas */}
      <Circle cx={304} cy={50} r={19} fill="#FCD9C5" />
      <Path
        d="M304 39 V50 L312 55"
        stroke="#1B2A4E"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* HP */}
      <Rect
        x={133}
        y={36}
        width={94}
        height={168}
        rx={18}
        fill="#FFFFFF"
      />
      <Rect
        x={142}
        y={54}
        width={76}
        height={132}
        rx={9}
        fill="#EEF3FB"
      />
      <Rect
        x={165}
        y={43}
        width={30}
        height={5}
        rx={2.5}
        fill="#CBD5E1"
      />
      <Circle cx={180} cy={98} r={25} fill="#22C55E" />
      <Path
        d="M168 98 L176 106 L193 89"
        stroke="#FFFFFF"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect
        x={155}
        y={138}
        width={50}
        height={6}
        rx={3}
        fill="#CBD5E1"
      />
      <Rect
        x={163}
        y={150}
        width={34}
        height={6}
        rx={3}
        fill="#E2E8F0"
      />
      <Rect
        x={153}
        y={166}
        width={54}
        height={12}
        rx={6}
        fill="#1B2A4E"
      />

      {/* Kartu QR kanan */}
      <Rect
        x={252}
        y={84}
        width={78}
        height={78}
        rx={12}
        fill="#FFFFFF"
      />

      {/* Tiga penanda sudut QR */}
      <Rect x={262} y={94} width={20} height={20} rx={3} fill="#1B2A4E" />
      <Rect x={266} y={98} width={12} height={12} rx={1.5} fill="#FFFFFF" />
      <Rect x={269} y={101} width={6} height={6} fill="#1B2A4E" />

      <Rect x={300} y={94} width={20} height={20} rx={3} fill="#1B2A4E" />
      <Rect x={304} y={98} width={12} height={12} rx={1.5} fill="#FFFFFF" />
      <Rect x={307} y={101} width={6} height={6} fill="#1B2A4E" />

      <Rect x={262} y={132} width={20} height={20} rx={3} fill="#1B2A4E" />
      <Rect x={266} y={136} width={12} height={12} rx={1.5} fill="#FFFFFF" />
      <Rect x={269} y={139} width={6} height={6} fill="#1B2A4E" />

      {/* Titik-titik data QR */}
      <Rect x={300} y={132} width={6} height={6} fill="#1B2A4E" />
      <Rect x={310} y={132} width={6} height={6} fill="#1B2A4E" />
      <Rect x={300} y={142} width={6} height={6} fill="#1B2A4E" />
      <Rect x={314} y={144} width={6} height={6} fill="#1B2A4E" />
      <Rect x={288} y={120} width={6} height={6} fill="#1B2A4E" />
      <Rect x={288} y={140} width={6} height={6} fill="#1B2A4E" />

      {/* Labu laboratorium */}
      <Path
        d="M290 178 H304 V194 L320 220 Q322 226 316 226 H278 Q272 226 274 220 L290 194 Z"
        fill="#FFFFFF"
        opacity={0.95}
      />
      <Path
        d="M281 208 H313 L320 220 Q322 226 316 226 H278 Q272 226 274 220 Z"
        fill="#38BDF8"
      />
      <Rect
        x={287}
        y={174}
        width={20}
        height={5}
        rx={2.5}
        fill="#FFFFFF"
      />
      <Circle cx={292} cy={216} r={2.5} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={301} cy={212} r={2} fill="#FFFFFF" opacity={0.8} />

      {/* Kilau dan titik dekoratif */}
      <Path d={sparkle(26, 104, 9)} fill="#FFFFFF" opacity={0.9} />
      <Path d={sparkle(340, 122, 7)} fill="#FFFFFF" opacity={0.8} />
      <Path d={sparkle(122, 22, 6)} fill="#FCD9C5" />
      <Path d={sparkle(246, 28, 5)} fill="#FFFFFF" opacity={0.8} />

      <Circle cx={112} cy={210} r={3} fill="#FCD9C5" />
      <Circle cx={248} cy={196} r={2.5} fill="#FFFFFF" opacity={0.7} />
      <Circle cx={20} cy={150} r={2.5} fill="#FFFFFF" opacity={0.6} />
      <Circle cx={198} cy={18} r={2.5} fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}
