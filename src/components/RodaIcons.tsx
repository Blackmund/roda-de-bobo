import React from 'react';
import { CazeScene, CAZE_SCENE_IDS } from './caze/CazeScenes';

/**
 * Custom High-Fidelity SVG Artworks matching CazéTV "Roda de Bobo" Reference Cards
 * (image_2d1880a4.png, image_37ad798a.png, image_1b86558d.png, image_c2a75bfb.png)
 */

// 1. Hands holding the '10' card (exact illustration from bottom-left of image_2d1880a4.png)
export const NotaCardArt: React.FC<{ className?: string; score?: number | string }> = ({
  className = 'w-28 h-24',
  score = '10'
}) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Rectangular card held up */}
    <rect x="25" y="15" width="110" height="85" rx="6" fill="#F5F2EB" stroke="#120A16" strokeWidth="6" />
    {/* Text on the card */}
    <text x="80" y="76" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="56" fontWeight="900" letterSpacing="3">
      {score}
    </text>
    {/* Left Hand Gripping the Card */}
    <g stroke="#0C0D16" strokeWidth="5" strokeLinejoin="round" fill="#F5F2EB">
      {/* Fingers */}
      <rect x="10" y="55" width="22" height="13" rx="6.5" />
      <rect x="8" y="68" width="24" height="13" rx="6.5" />
      <rect x="10" y="81" width="22" height="13" rx="6.5" />
      <rect x="14" y="94" width="18" height="13" rx="6.5" />
      {/* Palm / wrist contour */}
      <path d="M12 107 C12 135 30 138 38 138 L38 107 Z" fill="#F5F2EB" />
    </g>
    {/* Right Hand Gripping the Card */}
    <g stroke="#0C0D16" strokeWidth="5" strokeLinejoin="round" fill="#F5F2EB">
      {/* Fingers */}
      <rect x="128" y="55" width="22" height="13" rx="6.5" />
      <rect x="128" y="68" width="24" height="13" rx="6.5" />
      <rect x="128" y="81" width="22" height="13" rx="6.5" />
      <rect x="128" y="94" width="18" height="13" rx="6.5" />
      {/* Palm / wrist contour */}
      <path d="M148 107 C148 135 130 138 122 138 L122 107 Z" fill="#F5F2EB" />
    </g>
  </svg>
);

// 2. Telefone sem Fio / Cartoon Boys with Cans & Roda de Bobo shirts (exact match to image_2d1880a4.png top-center)
export const TelefoneSemFioBoyArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 170 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Connecting string between cans */}
    <line x1="72" y1="62" x2="98" y2="62" stroke="#FF1E56" strokeWidth="3" strokeDasharray="3 2" />

    {/* BOY 1 (Left) */}
    <g>
      {/* Hair */}
      <path d="M30 45 C30 25 55 25 60 45 Z" fill="#0C0D16" />
      {/* Head */}
      <circle cx="45" cy="48" r="16" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3.5" />
      {/* Eye & Smile */}
      <circle cx="48" cy="46" r="2.5" fill="#0C0D16" />
      <path d="M47 54 Q50 57 53 54" stroke="#0C0D16" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Body / Black T-shirt */}
      <path d="M32 70 L30 100 L60 100 L58 70 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="3" />
      <text x="45" y="84" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        RODA
      </text>
      <text x="45" y="93" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        BOBO
      </text>
      {/* Shorts & Legs */}
      <rect x="33" y="100" width="11" height="12" fill="#0C0D16" />
      <rect x="46" y="100" width="11" height="12" fill="#0C0D16" />
      <rect x="35" y="112" width="7" height="12" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
      <rect x="48" y="112" width="7" height="12" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
      {/* Shoes */}
      <rect x="32" y="124" width="13" height="6" rx="2" fill="#0C0D16" />
      <rect x="48" y="124" width="13" height="6" rx="2" fill="#0C0D16" />
      {/* Left arm holding red can to ear/mouth */}
      <rect x="58" y="54" width="14" height="16" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2.5" />
    </g>

    {/* BOY 2 (Right - with glasses) */}
    <g>
      {/* Hair */}
      <path d="M110 45 C110 25 135 25 140 45 Z" fill="#0C0D16" />
      {/* Head */}
      <circle cx="125" cy="48" r="16" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3.5" />
      {/* Glasses */}
      <circle cx="118" cy="48" r="6" stroke="#0C0D16" strokeWidth="2.5" fill="none" />
      <circle cx="132" cy="48" r="6" stroke="#0C0D16" strokeWidth="2.5" fill="none" />
      <line x1="124" y1="48" x2="126" y2="48" stroke="#0C0D16" strokeWidth="2.5" />
      <circle cx="118" cy="48" r="2" fill="#0C0D16" />
      <circle cx="132" cy="48" r="2" fill="#0C0D16" />
      {/* Body / Black T-shirt */}
      <path d="M112 70 L110 100 L140 100 L138 70 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="3" />
      <text x="125" y="84" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        RODA
      </text>
      <text x="125" y="93" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        BOBO
      </text>
      {/* Shorts & Legs */}
      <rect x="113" y="100" width="11" height="12" fill="#0C0D16" />
      <rect x="126" y="100" width="11" height="12" fill="#0C0D16" />
      <rect x="115" y="112" width="7" height="12" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
      <rect x="128" y="112" width="7" height="12" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
      {/* Shoes */}
      <rect x="112" y="124" width="13" height="6" rx="2" fill="#0C0D16" />
      <rect x="128" y="124" width="13" height="6" rx="2" fill="#0C0D16" />
      {/* Right arm holding red can */}
      <rect x="98" y="54" width="14" height="16" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2.5" />
    </g>
  </svg>
);

// 3. Gartic Neon Bicycle Art (exact match to image_2d1880a4.png top-right)
export const GarticBicycleArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Monitor Frame */}
    <rect x="15" y="20" width="130" height="95" rx="8" stroke="#FF1E56" strokeWidth="3" fill="#090B14" />
    {/* Tip header pill: [ DICA | BICICLETA | PULAR ] */}
    <rect x="30" y="13" width="100" height="16" rx="2" fill="#0C0D16" stroke="#FFFFFF" strokeWidth="1.5" />
    <text x="36" y="24" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7.5" fontWeight="bold">
      DICA
    </text>
    <line x1="55" y1="15" x2="55" y2="27" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
    <text x="80" y="24" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="7.5" fontWeight="bold">
      BICICLETA
    </text>
    <line x1="104" y1="15" x2="104" y2="27" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />
    <text x="117" y="23.5" textAnchor="middle" fill="#17B8B8" fontFamily="sans-serif" fontSize="5.5" fontWeight="bold">
      PULAR
    </text>
    {/* Neon Pink Bicycle Outline */}
    <g stroke="#FF1E56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Back wheel */}
      <circle cx="48" cy="74" r="15" />
      {/* Front wheel */}
      <circle cx="112" cy="74" r="15" />
      {/* Frame triangles */}
      <polygon points="48,74 72,74 88,54 62,54" />
      <line x1="72" y1="74" x2="86" y2="46" />
      {/* Seat */}
      <line x1="56" y1="52" x2="68" y2="52" strokeWidth="4" />
      {/* Handlebars */}
      <line x1="112" y1="74" x2="104" y2="44" />
      <line x1="98" y1="44" x2="108" y2="44" strokeWidth="4" />
    </g>
    {/* Cursor Crosshair on Handlebar */}
    <g stroke="#00E5FF" strokeWidth="1.5">
      <line x1="104" y1="38" x2="104" y2="44" />
      <line x1="101" y1="41" x2="107" y2="41" />
    </g>
    {/* Bottom Progress Bar */}
    <rect x="25" y="98" width="110" height="6" rx="3" stroke="#17B8B8" strokeWidth="1.5" fill="#0C0D16" />
    <rect x="26.5" y="99.5" width="24" height="3" rx="1.5" fill="#00E5FF" />
  </svg>
);

// 4. Megaresenha Art (exact match to image_2d1880a4.png top-left)
export const MegaresenhaArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* MEGA */}
    <text x="30" y="55" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="34" fontWeight="bold" letterSpacing="2">
      MEGA
    </text>
    {/* 5 Teal Dots */}
    <circle cx="34" cy="74" r="3.5" fill="#17B8B8" />
    <circle cx="44" cy="74" r="3.5" fill="#17B8B8" />
    <circle cx="54" cy="74" r="3.5" fill="#17B8B8" />
    <circle cx="64" cy="74" r="3.5" fill="#17B8B8" />
    <circle cx="74" cy="74" r="3.5" fill="#17B8B8" />
    {/* RE$ENHA */}
    <text x="75" y="102" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="34" fontWeight="bold" letterSpacing="2">
      RE
    </text>
    {/* Dollar Sign with Neon Teal/Green glow */}
    <rect x="108" y="74" width="18" height="32" fill="#17B8B8" opacity="0.3" rx="2" />
    <text x="117" y="102" textAnchor="middle" fill="#00E5FF" fontFamily="Anton, sans-serif" fontSize="36" fontWeight="900">
      $
    </text>
    <text x="126" y="102" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="34" fontWeight="bold" letterSpacing="2">
      ENHA
    </text>
  </svg>
);

// 5. Desafio Fold Typography (exact match to image_37ad798a.png & image_2d1880a4.png bottom-center)
export const DesafioFoldArt: React.FC<{ className?: string; subtitle?: string }> = ({
  className = 'w-32 h-24',
  subtitle = 'RODA DE BOBO'
}) => (
  <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* DESAFIO in Cream */}
    <text x="10" y="50" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="42" fontWeight="900" letterSpacing="1">
      DESAFI
    </text>
    {/* Folded 'O' corner / flap in Neon Rose */}
    <path d="M150 20 L185 20 L160 50 L135 50 Z" fill="#F5F2EB" />
    <polygon points="160,20 185,20 185,45" fill="#FF1E56" />
    {/* Subtitle / Partner Logo in bold red */}
    <text x="10" y="98" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="48" fontWeight="900" letterSpacing="2">
      {subtitle}
    </text>
  </svg>
);

// 6. Arcade Joystick & Screen for Jogo do Limite
export const LimiteArcadeArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Arcade Cabinet Outer Outline */}
    <rect x="25" y="10" width="110" height="90" rx="8" fill="#12131C" stroke="#FF6B00" strokeWidth="6" />
    {/* Screen glowing orange with '?' */}
    <rect x="35" y="20" width="90" height="70" rx="4" fill="#07080D" stroke="#FF1E56" strokeWidth="2" />
    <text x="80" y="70" textAnchor="middle" fill="#FF6B00" fontFamily="Anton, sans-serif" fontSize="48" fontWeight="bold">
      ?
    </text>
    {/* Joystick Base */}
    <rect x="20" y="100" width="120" height="28" rx="4" fill="#1A1C28" stroke="#FF6B00" strokeWidth="4" />
    {/* Joystick Stick & Red Ball */}
    <line x1="50" y1="104" x2="45" y2="85" stroke="#F5F2EB" strokeWidth="6" strokeLinecap="round" />
    <circle cx="43" cy="80" r="12" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
    {/* Arcade buttons */}
    <circle cx="85" cy="114" r="6" fill="#17B8B8" stroke="#FFFFFF" strokeWidth="2" />
    <circle cx="102" cy="114" r="6" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
    <circle cx="119" cy="114" r="6" fill="#F5F2EB" stroke="#000000" strokeWidth="2" />
  </svg>
);

// 7. Taboo Red Card & Siren for Jogo do Proibido
export const ProibidoSirenArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Taboo card in background */}
    <rect x="30" y="15" width="100" height="110" rx="6" fill="#120A16" stroke="#FF1E56" strokeWidth="5" />
    {/* Red Target Header with Ticket cutouts */}
    <rect x="30" y="15" width="100" height="30" rx="4" fill="#FF1E56" />
    <text x="80" y="36" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="16" letterSpacing="2">
      PROIBIDO
    </text>
    {/* Siren Base */}
    <path d="M55 95 L105 95 L112 112 L48 112 Z" fill="#202230" stroke="#FF1E56" strokeWidth="4" />
    {/* Siren Dome with Light Ray Glow */}
    <path d="M56 95 C56 65 104 65 104 95 Z" fill="#FF1E56" stroke="#F5F2EB" strokeWidth="3" />
    {/* Glow Lines */}
    <line x1="80" y1="50" x2="80" y2="60" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
    <line x1="50" y1="60" x2="60" y2="68" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
    <line x1="110" y1="60" x2="100" y2="68" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// 8. Two Characters with Blindfolds & Cans for Jogo do Duvido
export const DuvidoTinCansArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Player 1 (Left) with glasses / blindfold */}
    <circle cx="50" cy="50" r="22" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
    {/* Blindfold black band */}
    <rect x="30" y="44" width="40" height="12" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3" />
    {/* Body */}
    <path d="M30 110 L30 80 C30 72 70 72 70 80 L70 110 Z" fill="#120A16" stroke="#0C0D16" strokeWidth="4" />
    {/* Player 2 (Right) */}
    <circle cx="110" cy="50" r="22" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
    <rect x="90" y="44" width="40" height="12" rx="3" fill="#17B8B8" stroke="#0C0D16" strokeWidth="3" />
    <path d="M90 110 L90 80 C90 72 130 72 130 80 L130 110 Z" fill="#120A16" stroke="#0C0D16" strokeWidth="4" />
    {/* Tin Cans and String */}
    <line x1="68" y1="75" x2="92" y2="75" stroke="#FF1E56" strokeWidth="4" strokeDasharray="3 3" />
    <rect x="62" y="68" width="12" height="14" rx="2" fill="#FF6B00" stroke="#0C0D16" strokeWidth="2" />
    <rect x="86" y="68" width="12" height="14" rx="2" fill="#FF6B00" stroke="#0C0D16" strokeWidth="2" />
  </svg>
);

// 9. Top 5 Family Feud Ranking Board for Tem ou Não Tem
export const TemOuNaoTemBoardArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Board Outer Frame */}
    <rect x="25" y="15" width="110" height="110" rx="6" fill="#0C0D16" stroke="#17B8B8" strokeWidth="5" />
    {/* Position 1 (Cyan Banner) */}
    <rect x="35" y="25" width="90" height="20" rx="2" fill="#17B8B8" />
    <text x="80" y="39" textAnchor="middle" fill="#000000" fontFamily="Anton, sans-serif" fontSize="13" fontWeight="bold">
      TOP 1 (70 PTS)
    </text>
    {/* Position 2 (Red Banner) */}
    <rect x="35" y="50" width="42" height="18" rx="2" fill="#FF1E56" />
    <text x="56" y="63" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="11">
      #2 (15)
    </text>
    {/* Position 3 (Red Banner) */}
    <rect x="83" y="50" width="42" height="18" rx="2" fill="#FF1E56" />
    <text x="104" y="63" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="11">
      #3 (9)
    </text>
    {/* Position 4 (Red Banner) */}
    <rect x="35" y="73" width="42" height="18" rx="2" fill="#FF1E56" />
    <text x="56" y="86" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="11">
      #4 (4)
    </text>
    {/* Position 5 (Red Banner) */}
    <rect x="83" y="73" width="42" height="18" rx="2" fill="#FF1E56" />
    <text x="104" y="86" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="11">
      #5 (2)
    </text>
    {/* Strikes at bottom */}
    <text x="80" y="112" textAnchor="middle" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="16" letterSpacing="4">
      [ X ] [ X ]
    </text>
  </svg>
);

// 10. Illustrated 3 Jester Playing Cards for Rules Header (matching image_1b86558d.png)
export const JesterCardsHeaderArt: React.FC<{ className?: string }> = ({ className = 'w-24 h-20' }) => (
  <svg viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Card 1 (Left - Blue/Dark) */}
    <g transform="rotate(-15 40 60)">
      <rect x="20" y="15" width="45" height="65" rx="4" fill="#0C0D16" stroke="#00E5FF" strokeWidth="3" />
      <circle cx="42" cy="45" r="10" fill="#FF1E56" />
    </g>
    {/* Card 2 (Middle - Orange) */}
    <g transform="rotate(5 65 60)">
      <rect x="45" y="10" width="45" height="65" rx="4" fill="#FF6B00" stroke="#F5F2EB" strokeWidth="3" />
      <circle cx="67" cy="40" r="10" fill="#120A16" />
    </g>
    {/* Card 3 (Right - Jester Bobo in Green/Teal) */}
    <g transform="rotate(22 95 60)">
      <rect x="75" y="12" width="45" height="65" rx="4" fill="#0E1626" stroke="#FF1E56" strokeWidth="3" />
      {/* Jester hat representation */}
      <path d="M85 52 L97 32 L110 52 Z" fill="#00E5FF" />
      <circle cx="85" cy="52" r="3" fill="#FFD600" />
      <circle cx="97" cy="32" r="3" fill="#FFD600" />
      <circle cx="110" cy="52" r="3" fill="#FFD600" />
      <circle cx="97" cy="54" r="7" fill="#F5F2EB" />
    </g>
  </svg>
);

// 11. Official Retro Cursor Pointer (matching image_2d1880a4.png & image_37ad798a.png)
export const RetroPointerCursor: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <polygon
      points="4,4 12,28 17,17 28,12"
      fill="#FF1E56"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);

// 12. Official "RODA DE BOBO" Badge (exact match to image_c2a75bfb.png top-center)
export const RodaDeBoboOfficialBadge: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  className = '',
  size = 'md'
}) => {
  const textClasses =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-xs' : 'text-base';
  const badgeClasses =
    size === 'lg' ? 'text-xs px-1.5 py-0.5' : size === 'sm' ? 'text-[8px] px-0.5 py-0' : 'text-[10px] px-1 py-0.5';

  return (
    <div className={`rdb-logo inline-flex items-center gap-1.5 select-none ${className}`}>
      <span className={`font-anton ${textClasses} text-[#F5F2EB] tracking-wider uppercase drop-shadow-sm`}>
        RODA
      </span>
      <span className={`rdb-de font-mono-code font-black bg-[#FF1E56] text-white ${badgeClasses} rounded-[2px] leading-tight shadow-sm`}>
        DE
      </span>
      <span className={`font-anton ${textClasses} text-[#F5F2EB] tracking-wider uppercase drop-shadow-sm`}>
        BOBO
      </span>
    </div>
  );
};

// 13. Playing Cards (1 to 13) + Secret Tokens Stack for PERGUNTAS E VERDADES (O Jogo do Diabo)
export const PerguntasEVerdadesArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left Card: Ace of Spades (1) */}
    <g transform="rotate(-12 52 65)">
      <rect x="24" y="18" width="54" height="78" rx="5" fill="#0C0D16" stroke="#00E5FF" strokeWidth="3.5" />
      <text x="32" y="36" fill="#00E5FF" fontFamily="Anton, sans-serif" fontSize="14" fontWeight="bold">
        A
      </text>
      <text x="51" y="66" textAnchor="middle" fill="#00E5FF" fontFamily="sans-serif" fontSize="26">
        ♠
      </text>
      <text x="69" y="88" textAnchor="end" fill="#00E5FF" fontFamily="Anton, sans-serif" fontSize="11">
        01
      </text>
    </g>

    {/* Right Card: King of Hearts (13) */}
    <g transform="rotate(10 102 65)">
      <rect x="74" y="18" width="54" height="78" rx="5" fill="#120A16" stroke="#FF1E56" strokeWidth="3.5" />
      <text x="82" y="36" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="14" fontWeight="bold">
        K
      </text>
      <text x="101" y="66" textAnchor="middle" fill="#FF1E56" fontFamily="sans-serif" fontSize="26">
        ♥
      </text>
      <text x="119" y="88" textAnchor="end" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="11">
        13
      </text>
    </g>

    {/* Foreground Casino / Auction Tokens Stack */}
    <g>
      <ellipse cx="80" cy="116" rx="26" ry="8" fill="#161104" stroke="#FBBF24" strokeWidth="3" />
      <ellipse cx="80" cy="109" rx="26" ry="8" fill="#161104" stroke="#FBBF24" strokeWidth="3" />
      <ellipse cx="80" cy="102" rx="26" ry="8" fill="#FBBF24" stroke="#0C0D16" strokeWidth="2.5" />
      <text x="80" y="105" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="8.5" fontWeight="bold" letterSpacing="1">
        10 TOKENS
      </text>
    </g>

    {/* Red Alert LED indicator in top right */}
    <circle cx="136" cy="26" r="7" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
    <circle cx="136" cy="26" r="12" stroke="#FF1E56" strokeWidth="1.5" strokeDasharray="3 2" />
  </svg>
);



// 14. Ilustração oficial vetorial animada no estilo CazéTV (Modo 2 / Modo 3).
// Renderiza duas composições responsivas (compact e wide via container query .rdb-art-box)
// com escala padronizada de personagem e animações criativas no hover (.group:hover).
export const CazeArt: React.FC<{
  gameId: string;
  className?: string;
  mode?: 'card' | 'icon';
  fallback: React.ReactNode;
}> = ({ gameId, className = '', mode = 'card', fallback }) => {
  if (!CAZE_SCENE_IDS.includes(gameId)) {
    return <>{fallback}</>;
  }
  if (mode === 'icon') {
    return <CazeScene gameId={gameId} layout="icon" className={className} />;
  }
  return (
    <div className={`rdb-art-box ${className}`}>
      <CazeScene gameId={gameId} layout="compact" className="rdb-art-compact" />
      <CazeScene gameId={gameId} layout="wide" className="rdb-art-wide" />
    </div>
  );
};

// 15. Logo oficial "RODA DE BOBO" do programa (anel crimson com "DE") para o Modo 3.
export const RodaDeBoboOriginalLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`inline-flex items-center gap-1 select-none font-anton uppercase tracking-wide text-[#F5F2EB] ${className}`}>
    <span>RODA</span>
    <span className="relative inline-flex items-center justify-center w-[1.15em] h-[1.15em] rounded-full border-2 border-[#E6194B] bg-[#0a0b1e] text-[#E6194B] text-[0.55em] leading-none">
      DE
      <span className="absolute inset-[2px] rounded-full border border-[#F5F2EB]/70" />
    </span>
    <span>BOBO</span>
  </div>
);

// 16. Mímica: duas máscaras de teatro (feliz e triste) no mesmo traço grosso das outras artes.
export const MimicaMasksArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* máscara de trás: triste (teal) */}
    <g transform="translate(58 22) rotate(10 40 50)" stroke="#120A16" strokeWidth="6" strokeLinejoin="round">
      <path d="M2 4 H78 V52 C78 86 58 106 40 106 C22 106 2 86 2 52 Z" fill="#17B8B8" />
      <path d="M14 36 Q26 28 34 40 Q24 46 14 36 Z" fill="#F5F2EB" />
      <path d="M46 40 Q54 28 66 36 Q56 46 46 40 Z" fill="#F5F2EB" />
      <path d="M24 82 Q40 66 56 82" fill="none" strokeLinecap="round" />
    </g>
    {/* máscara da frente: feliz (crimson) */}
    <g transform="translate(8 12) rotate(-8 40 50)" stroke="#120A16" strokeWidth="6" strokeLinejoin="round">
      <path d="M2 4 H78 V52 C78 86 58 106 40 106 C22 106 2 86 2 52 Z" fill="#E6194B" />
      <path d="M14 40 Q24 28 36 38 Q26 48 14 40 Z" fill="#F5F2EB" />
      <path d="M44 38 Q56 28 66 40 Q54 48 44 38 Z" fill="#F5F2EB" />
      <path d="M20 66 Q40 92 60 66" fill="#F5F2EB" strokeLinecap="round" />
    </g>
  </svg>
);


// 17. Quem sou eu: rosto com a plaquinha de identidade "?" presa na testa.
export const QuemSouEuArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <g stroke="#120A16" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M34 52 H126" stroke="#E6194B" strokeWidth="10" />
      <path d="M40 54 C40 30 58 18 80 18 C102 18 120 30 120 54 L120 84 C120 112 102 128 80 128 C58 128 40 112 40 84 Z" fill="#F5F2EB" />
      <rect x="54" y="26" width="52" height="34" rx="4" fill="#E6194B" />
      <text x="80" y="53" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="30" stroke="none">?</text>
      <circle cx="64" cy="82" r="6" fill="#120A16" stroke="none" />
      <circle cx="96" cy="82" r="6" fill="#120A16" stroke="none" />
      <path d="M62 106 Q80 98 98 106" fill="none" />
    </g>
  </svg>
);


// 18. Mega Resenha: dois balões de fala (uma palavra por dica).
export const MegaResenhaArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <g stroke="#120A16" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M14 18 H92 a10 10 0 0 1 10 10 V62 a10 10 0 0 1 -10 10 H48 L28 90 V72 H14 a10 10 0 0 1 -10 -10 V28 a10 10 0 0 1 10 -10 Z" fill="#17B8B8" />
      <path d="M68 62 H146 a10 10 0 0 1 10 10 V104 a10 10 0 0 1 -10 10 H132 V132 L112 114 H68 a10 10 0 0 1 -10 -10 V72 a10 10 0 0 1 10 -10 Z" fill="#E6194B" transform="translate(-4 0)" />
    </g>
    <text x="53" y="52" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="26">GOL</text>
    <text x="100" y="100" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="26">???</text>
  </svg>
);


// 19. Repetente: duas lousinhas com a mesma palavra.
export const RepetenteArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <g stroke="#120A16" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
      <rect x="6" y="28" width="68" height="62" rx="6" fill="#0C0D16" />
      <rect x="86" y="28" width="68" height="62" rx="6" fill="#0C0D16" />
      <path d="M40 90 v20 M120 90 v20 M26 112 h28 M106 112 h28" />
    </g>
    <text x="40" y="68" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="22">MAR</text>
    <text x="120" y="68" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="22">MAR</text>
    <path d="M70 12 l8 8 l12 -14" stroke="#17B8B8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(-2 6)" />
  </svg>
);


// 20. Respostas sem perguntas: casinhas numeradas e uma interrogação.
export const RespostasSemPerguntasArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <g stroke="#120A16" strokeWidth="5" strokeLinejoin="round">
      <rect x="6" y="14" width="30" height="30" rx="4" fill="#17B8B8" />
      <rect x="42" y="14" width="30" height="30" rx="4" fill="#F5F2EB" />
      <rect x="78" y="14" width="30" height="30" rx="4" fill="#F5F2EB" />
      <rect x="114" y="14" width="30" height="30" rx="4" fill="#F5F2EB" />
      <circle cx="80" cy="96" r="34" fill="#E6194B" />
    </g>
    <text x="21" y="36" textAnchor="middle" fill="#120A16" fontFamily="Anton, sans-serif" fontSize="20">1</text>
    <text x="57" y="36" textAnchor="middle" fill="#120A16" fontFamily="Anton, sans-serif" fontSize="20">2</text>
    <text x="93" y="36" textAnchor="middle" fill="#120A16" fontFamily="Anton, sans-serif" fontSize="20">3</text>
    <text x="129" y="36" textAnchor="middle" fill="#120A16" fontFamily="Anton, sans-serif" fontSize="20">4</text>
    <text x="80" y="112" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="52">?</text>
  </svg>
);


// 21. Estádios: campo visto de cima dentro de um anel de arquibancada.
export const EstadiosArt: React.FC<{ className?: string }> = ({ className = 'w-28 h-24' }) => (
  <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <g stroke="#120A16" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="80" cy="72" rx="68" ry="50" fill="#E6194B" />
      <ellipse cx="80" cy="72" rx="52" ry="35" fill="#F5F2EB" />
      <rect x="40" y="52" width="80" height="40" rx="3" fill="#17B8B8" />
      <path d="M80 52 V92" />
      <circle cx="80" cy="72" r="8" fill="none" />
      <rect x="40" y="62" width="10" height="20" fill="none" />
      <rect x="110" y="62" width="10" height="20" fill="none" />
    </g>
  </svg>
);
