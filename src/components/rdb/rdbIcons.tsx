import React from 'react';

/**
 * ART-04: kit de icones proprio do Roda de Bobo.
 * Traco grosso (3 em grade 24), pontas e cantos retos, 2 cores: a cor do texto (`currentColor`) e um destaque
 * (`--rdb-accent`, crimson por padrao). Os nomes e as props (`size`, `className`...) seguem o lucide-react, entao a
 * troca e so mudar o import.
 */
export interface RdbIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
}

const ACCENT = 'var(--rdb-accent, #FF1E56)';

const Base: React.FC<RdbIconProps & { children: React.ReactNode }> = ({ size = 24, children, strokeWidth = 3, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    {children}
  </svg>
);

const A: React.FC<{ d: string; fill?: boolean }> = ({ d, fill }) => (
  <path d={d} stroke={ACCENT} fill={fill ? ACCENT : 'none'} />
);

export const ArrowLeft: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M20 12H6" />
    <A d="M12 5L5 12L12 19" />
  </Base>
);

export const X: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M5 5L19 19" />
    <path d="M19 5L5 19" />
  </Base>
);

export const Check: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <A d="M4 12L10 18L20 6" />
  </Base>
);

export const ChevronDown: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M5 9L12 16L19 9" />
  </Base>
);

export const RotateCcw: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M5 12A7 7 0 1 0 7.2 6.9" />
    <A d="M4 4V9H9" />
  </Base>
);

export const Volume2: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 9H8L13 5V19L8 15H4Z" />
    <A d="M17 9A4 4 0 0 1 17 15" />
    <A d="M20 6A8 8 0 0 1 20 18" />
  </Base>
);

export const VolumeX: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 9H8L13 5V19L8 15H4Z" />
    <A d="M17 9L22 15" />
    <A d="M22 9L17 15" />
  </Base>
);

export const QrCode: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M3 3H10V10H3Z" />
    <path d="M14 3H21V10H14Z" />
    <path d="M3 14H10V21H3Z" />
    <A d="M14 14H17V17H14Z" />
    <A d="M20 20H21V21H20Z" />
  </Base>
);

export const History: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 12A8 8 0 1 0 6.5 6.2" />
    <A d="M4 4V8H8" />
    <A d="M12 8V12L15 14" />
  </Base>
);

export const Trophy: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M7 4H17V10A5 5 0 0 1 7 10Z" />
    <path d="M7 6H4V8A3 3 0 0 0 7 11" />
    <path d="M17 6H20V8A3 3 0 0 1 17 11" />
    <A d="M12 15V19" />
    <path d="M8 20H16" />
  </Base>
);

export const Settings: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M8 8H16V16H8Z" />
    <A d="M12 2V5" />
    <A d="M12 19V22" />
    <A d="M2 12H5" />
    <A d="M19 12H22" />
  </Base>
);

export const Copy: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M9 9H20V20H9Z" />
    <A d="M5 15V4H16" />
  </Base>
);

export const Sparkles: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M10 4L12 10L18 12L12 14L10 20L8 14L2 12L8 10Z" />
    <A d="M19 3V7" />
    <A d="M17 5H21" />
  </Base>
);

export const Tv: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M3 7H21V19H3Z" />
    <path d="M8 22H16" />
    <A d="M8 2L12 7L16 2" />
  </Base>
);

export const Smartphone: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M7 2H17V22H7Z" />
    <A d="M11 18H13" />
  </Base>
);

export const KeyRound: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 12H10V18H4Z" />
    <A d="M10 15L21 4" />
    <A d="M17 8L20 11" />
    <A d="M14 11L16 13" />
  </Base>
);

export const Swords: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 4L14 14" />
    <path d="M4 4H9M4 4V9" />
    <A d="M20 4L10 14" />
    <A d="M20 4H15M20 4V9" />
    <path d="M6 18L4 20" />
    <A d="M18 18L20 20" />
  </Base>
);

export const Users: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M9 4H13V8H9Z" />
    <path d="M5 20V14H17V20" />
    <A d="M17 6H20V9H17Z" />
    <A d="M20 20V15" />
  </Base>
);

export const Menu: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 6H20" />
    <A d="M4 12H20" />
    <path d="M4 18H20" />
  </Base>
);

export const ChevronLeft: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M15 5L8 12L15 19" />
  </Base>
);

export const ChevronRight: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M9 5L16 12L9 19" />
  </Base>
);

export const Dice: React.FC<RdbIconProps> = (p) => (
  <Base {...p}>
    <path d="M4 4H20V20H4Z" />
    <A d="M8 8H9V9H8Z" />
    <A d="M15 15H16V16H15Z" />
    <A d="M11.5 11.5H12.5V12.5H11.5Z" />
  </Base>
);

/** Todos os icones do kit, por nome (para a pagina de prova e para `<RdbIcon name=...>`). */
export const RDB_ICONS = {
  'arrow-left': ArrowLeft,
  x: X,
  check: Check,
  'chevron-down': ChevronDown,
  'rotate-ccw': RotateCcw,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  'qr-code': QrCode,
  history: History,
  trophy: Trophy,
  settings: Settings,
  copy: Copy,
  sparkles: Sparkles,
  tv: Tv,
  smartphone: Smartphone,
  'key-round': KeyRound,
  swords: Swords,
  users: Users,
  menu: Menu,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  dice: Dice
} as const;

export type RdbIconName = keyof typeof RDB_ICONS;

export const RdbIcon: React.FC<RdbIconProps & { name: RdbIconName }> = ({ name, ...rest }) => {
  const Icon = RDB_ICONS[name];
  return <Icon {...rest} />;
};
