import React from 'react';

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



// 14. Ilustrações Oficiais Animadas no Estilo CazéTV (Vetor SVG Interativo)

// 14.1 JOGO DO LIMITE (Manômetro / Velocímetro no limiar da zona vermelha + personagem na tensão com a alavanca)
export const CazeAnimatedLimiteArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Base glow under pressure dial */}
    <ellipse cx="95" cy="115" rx="60" ry="12" fill="#FF1E56" opacity="0.15" />

    {/* Big Pressure / Speedometer Gauge Dial (Left side) */}
    <g>
      {/* Outer rim */}
      <circle cx="95" cy="95" r="64" fill="#090B14" stroke="#0C0D16" strokeWidth="6" />
      <circle cx="95" cy="95" r="58" fill="#120A16" stroke="#17B8B8" strokeWidth="2.5" />
      
      {/* Safe zone arc (Green/Teal to Yellow) */}
      <path d="M 45 105 A 50 50 0 0 1 110 47" stroke="#17B8B8" strokeWidth="8" strokeLinecap="round" fill="none" />
      
      {/* Red Danger Zone: "LIMITE" / "ESTOURO" */}
      <path d="M 116 49 A 50 50 0 0 1 144 100" stroke="#FF1E56" strokeWidth="9" strokeLinecap="round" fill="none" className="transition-all duration-300 group-hover:stroke-rose-400" />
      
      {/* Gauge ticks */}
      <line x1="50" y1="95" x2="57" y2="95" stroke="#F5F2EB" strokeWidth="2" />
      <line x1="62" y1="68" x2="68" y2="72" stroke="#F5F2EB" strokeWidth="2" />
      <line x1="95" y1="50" x2="95" y2="58" stroke="#F5F2EB" strokeWidth="2" />
      <line x1="126" y1="66" x2="120" y2="72" stroke="#FF1E56" strokeWidth="3" />
      
      {/* Danger Zone Hazard Stripes Label */}
      <rect x="105" y="70" width="36" height="15" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
      <text x="123" y="81" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
        LIMITE
      </text>

      {/* Target Needle (Vibrates and pushes into red zone on hover!) */}
      <g style={{ transformOrigin: '95px 95px' }} className="animate-rdb-needle transition-transform duration-300">
        <line x1="95" y1="95" x2="122" y2="60" stroke="#FF1E56" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="95" y1="95" x2="120" y2="62" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="95" cy="95" r="9" fill="#0C0D16" stroke="#F5F2EB" strokeWidth="2.5" />
        <circle cx="95" cy="95" r="4" fill="#FF1E56" />
      </g>
    </g>

    {/* Comic Warning Flash / Sparks above gauge */}
    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <path d="M125 35 L132 20 L135 28 L144 15 L140 32 Z" fill="#FFB800" stroke="#0C0D16" strokeWidth="1.5" />
      <text x="146" y="22" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="9" fontWeight="bold">
        PERIGO!
      </text>
    </g>

    {/* Sweating Cartoon Character Gripping Throttle Lever (Right side) */}
    <g>
      {/* Body / Teal CazéTV Shirt */}
      <path d="M180 120 L168 170 L238 170 L226 120 Z" fill="#17B8B8" stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" />
      <text x="203" y="148" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        RODA
      </text>
      <text x="203" y="157" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        BOBO
      </text>

      {/* Head */}
      <circle cx="203" cy="92" r="26" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair */}
      <path d="M178 88 C178 60 215 58 226 78 C226 74 233 80 230 90 C223 88 221 82 215 82 C210 82 208 86 195 86 C186 86 181 88 178 88 Z" fill="#0C0D16" />

      {/* Intense Comic Eyes staring wide at the needle */}
      <circle cx="193" cy="92" r="5" fill="#0C0D16" />
      <circle cx="191" cy="90" r="1.5" fill="#FFFFFF" />
      <circle cx="209" cy="92" r="5" fill="#0C0D16" />
      <circle cx="207" cy="90" r="1.5" fill="#FFFFFF" />

      {/* Nervous teeth / grimace */}
      <rect x="194" y="103" width="16" height="5" rx="2" fill="#FFFFFF" stroke="#0C0D16" strokeWidth="2" />
      <line x1="202" y1="103" x2="202" y2="108" stroke="#0C0D16" strokeWidth="1.5" />

      {/* Eyebrows angled in tension */}
      <line x1="188" y1="83" x2="198" y2="86" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" />
      <line x1="214" y1="86" x2="204" y2="83" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" />

      {/* Sweat drop jumping off forehead (vibrates on hover) */}
      <path d="M174 76 C171 73 170 70 172 68 C174 66 177 67 179 70 C180 73 176 77 174 76 Z" fill="#00E5FF" stroke="#0C0D16" strokeWidth="1.5" className="animate-rdb-duvido origin-center" />

      {/* Left arm reaching and gripping the lever */}
      <path d="M175 130 Q150 120 152 105" stroke="#0C0D16" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M175 130 Q150 120 152 105" stroke="#F5F2EB" strokeWidth="4.5" strokeLinecap="round" fill="none" />

      {/* Lever Knob & Handle */}
      <rect x="145" y="105" width="18" height="25" rx="3" fill="#0C0D16" stroke="#FF6B00" strokeWidth="2" />
      <circle cx="154" cy="100" r="8" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2.5" />
    </g>
  </svg>
);

// 14.2 JOGO DO DUVIDO (Duelo de blefe, desafiante erguendo a placa "EU DUVIDO!" e oponente na saia justa)
export const CazeAnimatedDuvidoArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Background Comic Tension Clash Rays */}
    <g opacity="0.12">
      <polygon points="130,85 10,10 40,0" fill="#FF1E56" />
      <polygon points="130,85 240,10 210,0" fill="#00E5FF" />
      <polygon points="130,85 130,0 145,0" fill="#FFB800" />
    </g>

    {/* Central Challenge Clash Sparks / Lightning (flickers brightly on hover) */}
    <g className="animate-rdb-lightning">
      <path d="M126 40 L132 58 L122 64 L136 85 L128 66 L138 60 Z" fill="#FFB800" stroke="#0C0D16" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="130" cy="62" r="3" fill="#FFFFFF" />
    </g>

    {/* CHALLENGER (Left) - Confident Smirk, Pointing Accusingly */}
    <g>
      {/* Body / Teal Shirt */}
      <path d="M25 130 L10 170 L95 170 L80 130 Z" fill="#17B8B8" stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" />
      <text x="50" y="155" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        RODA
      </text>

      {/* Head */}
      <circle cx="58" cy="85" r="24" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair (Slick retro style) */}
      <path d="M36 82 C36 55 72 55 82 72 C80 66 84 72 82 82 C75 80 73 74 68 74 C62 74 60 78 50 78 C42 78 38 82 36 82 Z" fill="#0C0D16" />

      {/* Smug Raised Eyebrow + Winking/Squinting eye */}
      <path d="M46 72 Q54 68 60 73" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="53" cy="84" r="4.5" fill="#0C0D16" />
      <circle cx="51.5" cy="82.5" r="1.5" fill="#FFFFFF" />
      <path d="M64 84 Q70 82 73 86" stroke="#0C0D16" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Smirking Cocky Smile */}
      <path d="M52 95 Q62 101 70 94" stroke="#0C0D16" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Accusatory Pointing Arm (thrusts forward on hover) */}
      <path d="M75 130 Q105 125 118 108" stroke="#0C0D16" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M75 130 Q105 125 118 108" stroke="#F5F2EB" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Hand & Finger pointing at opponent */}
      <circle cx="118" cy="108" r="6" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
      <line x1="118" y1="108" x2="132" y2="104" stroke="#0C0D16" strokeWidth="4" strokeLinecap="round" />
      <line x1="118" y1="108" x2="132" y2="104" stroke="#F5F2EB" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* OPPONENT / BLUFFER (Right) - Sweating, Nervous, Holding Bluff */}
    <g>
      {/* Body / Crimson Shirt */}
      <path d="M175 130 L160 170 L245 170 L230 130 Z" fill="#FF1E56" stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" />
      <text x="205" y="155" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        BOBO
      </text>

      {/* Head */}
      <circle cx="202" cy="85" r="24" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair (Short spiky) */}
      <path d="M180 80 C180 58 215 56 226 72 C228 80 220 80 216 80 C210 74 204 76 195 76 C186 76 182 80 180 80 Z" fill="#0C0D16" />

      {/* Nervous Sweating Eyes (darting sideways) */}
      <circle cx="193" cy="85" r="4.5" fill="#0C0D16" />
      <circle cx="191" cy="84" r="1.5" fill="#FFFFFF" />
      <circle cx="211" cy="85" r="4.5" fill="#0C0D16" />
      <circle cx="209" cy="84" r="1.5" fill="#FFFFFF" />

      {/* Clenched Teeth */}
      <rect x="194" y="96" width="16" height="5" rx="1.5" fill="#FFFFFF" stroke="#0C0D16" strokeWidth="2" />
      <line x1="199" y1="96" x2="199" y2="101" stroke="#0C0D16" strokeWidth="1.2" />
      <line x1="205" y1="96" x2="205" y2="101" stroke="#0C0D16" strokeWidth="1.2" />

      {/* Beads of nervous sweat drops */}
      <circle cx="182" cy="74" r="3" fill="#00E5FF" stroke="#0C0D16" strokeWidth="1.5" />
      <path d="M228 78 Q232 85 228 88 Q224 85 228 78 Z" fill="#00E5FF" stroke="#0C0D16" strokeWidth="1.5" />
    </g>

    {/* GIANT "EU DUVIDO!" Comic Badge (Pops up and jiggles on hover!) */}
    <g className="animate-rdb-duvido transition-transform duration-300 origin-center cursor-pointer">
      {/* Shadow */}
      <rect x="67" y="22" width="126" height="34" rx="6" fill="#0C0D16" />
      {/* Crimson Banner */}
      <rect x="64" y="19" width="126" height="34" rx="6" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3.5" />
      <rect x="68" y="23" width="118" height="26" rx="4" fill="#090B14" stroke="#17B8B8" strokeWidth="1.5" />
      {/* Bold Typography */}
      <text x="127" y="42" textAnchor="middle" fill="#F5F2EB" fontFamily="Anton, sans-serif" fontSize="18" fontWeight="bold" letterSpacing="2">
        EU DUVIDO!
      </text>
      {/* Mini auction gavel icon */}
      <g transform="translate(73, 26) scale(0.65)">
        <rect x="4" y="0" width="14" height="8" rx="2" fill="#FFB800" stroke="#0C0D16" strokeWidth="2" />
        <line x1="11" y1="8" x2="11" y2="18" stroke="#F5F2EB" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  </svg>
);

// 14.3 JOGO DO PROIBIDO (Cartão Taboo gigante em tela cheia, sirene de alerta piscante e personagem em pânico)
export const CazeAnimatedProibidoArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Giant Taboo Card Frame in Background (Fills width and height) */}
    <rect x="20" y="24" width="220" height="146" rx="8" fill="#120A16" stroke="#0C0D16" strokeWidth="5" />
    <rect x="25" y="29" width="210" height="136" rx="6" fill="#090B14" stroke="#FF1E56" strokeWidth="2" />

    {/* Top Header Ticket of the Card */}
    <rect x="25" y="29" width="210" height="26" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
    <text x="130" y="47" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="14" fontWeight="bold" letterSpacing="3">
      PALAVRAS PROIBIDAS
    </text>

    {/* 5 Crossed-out Forbidden Slots behind the character */}
    <g opacity="0.35">
      <rect x="40" y="65" width="80" height="12" rx="2" fill="#201124" stroke="#FF1E56" strokeWidth="1" />
      <line x1="40" y1="71" x2="120" y2="71" stroke="#FF1E56" strokeWidth="2" />
      <rect x="40" y="83" width="80" height="12" rx="2" fill="#201124" stroke="#FF1E56" strokeWidth="1" />
      <line x1="40" y1="89" x2="120" y2="89" stroke="#FF1E56" strokeWidth="2" />
      <rect x="40" y="101" width="80" height="12" rx="2" fill="#201124" stroke="#FF1E56" strokeWidth="1" />
      <line x1="40" y1="107" x2="120" y2="107" stroke="#FF1E56" strokeWidth="2" />
      <rect x="140" y="65" width="80" height="12" rx="2" fill="#201124" stroke="#FF1E56" strokeWidth="1" />
      <line x1="140" y1="71" x2="220" y2="71" stroke="#FF1E56" strokeWidth="2" />
      <rect x="140" y="83" width="80" height="12" rx="2" fill="#201124" stroke="#FF1E56" strokeWidth="1" />
      <line x1="140" y1="89" x2="220" y2="89" stroke="#FF1E56" strokeWidth="2" />
    </g>

    {/* Giant Red Forbidden Symbol (Right Side) */}
    <g transform="translate(185, 95)">
      <circle cx="0" cy="0" r="26" fill="#120A16" stroke="#FF1E56" strokeWidth="6" />
      <line x1="-18" y1="-18" x2="18" y2="18" stroke="#FF1E56" strokeWidth="6" strokeLinecap="round" />
    </g>

    {/* Flashing Emergency Siren Dome on Top (Sweeps and flashes on hover!) */}
    <g transform="translate(130, 24)">
      {/* Light ray sweep */}
      <g className="animate-rdb-siren origin-center">
        <line x1="0" y1="-8" x2="0" y2="-22" stroke="#FFB800" strokeWidth="4" strokeLinecap="round" />
        <line x1="-14" y1="-6" x2="-26" y2="-16" stroke="#FF1E56" strokeWidth="3" strokeLinecap="round" />
        <line x1="14" y1="-6" x2="26" y2="-16" stroke="#FF1E56" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* Siren Base */}
      <path d="M-18 4 L18 4 L14 10 L-14 10 Z" fill="#0C0D16" stroke="#FF1E56" strokeWidth="2" />
      {/* Siren Dome */}
      <path d="M-14 4 C-14 -12 14 -12 14 4 Z" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" className="animate-pulse" />
      <path d="M-6 0 C-6 -8 0 -8 0 0 Z" fill="#FFFFFF" opacity="0.6" />
    </g>

    {/* Panicking Character Clamping Hands Over Mouth (Center) */}
    <g>
      {/* Body / Teal Shirt */}
      <path d="M90 125 L75 170 L165 170 L150 125 Z" fill="#17B8B8" stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" />
      <text x="120" y="156" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="8" fontWeight="bold">
        RODA DE BOBO
      </text>

      {/* Head */}
      <circle cx="120" cy="92" r="26" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair (wild comic hair) */}
      <path d="M96 85 C96 60 144 58 144 85 C140 76 132 78 126 78 C120 74 114 74 108 78 C102 78 98 82 96 85 Z" fill="#0C0D16" />

      {/* Wide Panicked Cartoon Eyes */}
      <circle cx="109" cy="88" r="6" fill="#0C0D16" />
      <circle cx="107" cy="86" r="2" fill="#FFFFFF" />
      <circle cx="131" cy="88" r="6" fill="#0C0D16" />
      <circle cx="129" cy="86" r="2" fill="#FFFFFF" />

      {/* Eyebrows raised in shock */}
      <path d="M102 76 Q110 72 116 77" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M124 77 Q130 72 138 76" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Both cartoon hands clamped over mouth (Oops! Almost said it!) */}
      <g stroke="#0C0D16" strokeWidth="3" strokeLinejoin="round" fill="#F5F2EB">
        {/* Left hand fingers */}
        <rect x="100" y="98" width="18" height="12" rx="5" />
        {/* Right hand fingers covering */}
        <rect x="114" y="99" width="18" height="12" rx="5" />
        {/* Palms */}
        <ellipse cx="98" cy="106" rx="8" ry="7" />
        <ellipse cx="134" cy="106" rx="8" ry="7" />
      </g>
    </g>
  </svg>
);

// 14.4 JOGO DA NOTA (Mãos erguendo a placa oficial "10", apresentador sorrindo e estrelas comemorativas)
export const CazeAnimatedNotaArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Spotlight / Starburst rays in background */}
    <g opacity="0.12">
      <polygon points="130,120 40,0 70,0" fill="#FBBF24" />
      <polygon points="130,120 115,0 145,0" fill="#FBBF24" />
      <polygon points="130,120 190,0 220,0" fill="#FBBF24" />
    </g>

    {/* Sparkle 4-point comic stars (Twinkle & spin on hover!) */}
    <g className="animate-rdb-star origin-center" style={{ transformOrigin: '45px 45px' }}>
      <path d="M45 35 Q45 45 35 45 Q45 45 45 55 Q45 45 55 45 Q45 45 45 35 Z" fill="#FBBF24" stroke="#0C0D16" strokeWidth="1.5" />
    </g>
    <g className="animate-rdb-star origin-center" style={{ transformOrigin: '215px 40px' }}>
      <path d="M215 32 Q215 40 207 40 Q215 40 215 48 Q215 40 223 40 Q215 40 215 32 Z" fill="#00E5FF" stroke="#0C0D16" strokeWidth="1.5" />
    </g>

    {/* Presenter Peeking Smiling behind the Scorecard */}
    <g>
      {/* Head */}
      <circle cx="130" cy="62" r="26" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair */}
      <path d="M106 58 C106 32 154 30 154 58 C148 50 140 52 134 52 C128 48 122 48 116 52 C110 52 108 56 106 58 Z" fill="#0C0D16" />

      {/* Happy Eyes */}
      <circle cx="119" cy="58" r="4.5" fill="#0C0D16" />
      <circle cx="117.5" cy="56.5" r="1.5" fill="#FFFFFF" />
      <circle cx="141" cy="58" r="4.5" fill="#0C0D16" />
      <circle cx="139.5" cy="56.5" r="1.5" fill="#FFFFFF" />

      {/* Broad Cheerful Smile */}
      <path d="M118 70 Q130 80 142 70" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="#0C0D16" />
      <path d="M121 72 Q130 76 139 72" fill="#FFFFFF" />

      {/* Cheerful Eyebrows */}
      <path d="M113 50 Q119 46 125 50" stroke="#0C0D16" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M135 50 Q141 46 147 50" stroke="#0C0D16" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>

    {/* THE ICONIC "10" SCOREBOARD PADDLE (Lifts and pops on hover!) */}
    <g className="animate-rdb-score origin-bottom transition-transform duration-300">
      {/* Shadow */}
      <rect x="68" y="74" width="124" height="92" rx="8" fill="#0C0D16" />
      {/* Scoreboard Card */}
      <rect x="64" y="70" width="124" height="92" rx="8" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="5" />
      <rect x="70" y="76" width="112" height="80" rx="5" fill="#FFFFFF" stroke="#FF1E56" strokeWidth="2" />

      {/* Giant "10" */}
      <text x="126" y="136" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="64" fontWeight="900" letterSpacing="4">
        10
      </text>

      {/* Mini top badge on paddle: "NOTA" */}
      <rect x="105" y="66" width="42" height="12" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
      <text x="126" y="75" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="7.5" fontWeight="bold" letterSpacing="1">
        NOTA
      </text>

      {/* Left Cartoon Glove Hand Gripping the Card */}
      <g stroke="#0C0D16" strokeWidth="3.5" strokeLinejoin="round" fill="#F5F2EB">
        <rect x="52" y="100" width="18" height="10" rx="5" />
        <rect x="50" y="111" width="20" height="10" rx="5" />
        <rect x="52" y="122" width="18" height="10" rx="5" />
        <rect x="55" y="133" width="15" height="10" rx="5" />
        <path d="M52 144 C52 165 65 168 70 168 L70 144 Z" fill="#F5F2EB" />
      </g>

      {/* Right Cartoon Glove Hand Gripping the Card */}
      <g stroke="#0C0D16" strokeWidth="3.5" strokeLinejoin="round" fill="#F5F2EB">
        <rect x="182" y="100" width="18" height="10" rx="5" />
        <rect x="182" y="111" width="20" height="10" rx="5" />
        <rect x="182" y="122" width="18" height="10" rx="5" />
        <rect x="182" y="133" width="15" height="10" rx="5" />
        <path d="M200 144 C200 165 187 168 182 168 L182 144 Z" fill="#F5F2EB" />
      </g>
    </g>
  </svg>
);

// 14.5 TEM OU NÃO TEM (Painel digital com TOP 1 cyan e apresentador apontando)
export const CazeAnimatedTemOuNaoTemArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Family Feud Digital Board (Left) */}
    <g transform="translate(18, 18)">
      {/* Board Outer Casing */}
      <rect x="0" y="0" width="130" height="142" rx="8" fill="#0C0D16" stroke="#17B8B8" strokeWidth="5" />
      <rect x="6" y="6" width="118" height="130" rx="5" fill="#090B14" stroke="#00E5FF" strokeWidth="1.5" />

      {/* Position 1 (Top 1 - Glowing Cyan Banner, animates on hover) */}
      <g className="transition-transform duration-300 group-hover:translate-x-1">
        <rect x="12" y="14" width="106" height="24" rx="3" fill="#17B8B8" stroke="#0C0D16" strokeWidth="2" />
        <text x="65" y="30" textAnchor="middle" fill="#000000" fontFamily="Anton, sans-serif" fontSize="13" fontWeight="bold" letterSpacing="1">
          TOP 1 (70 PTS)
        </text>
      </g>

      {/* Position 2 (Crimson Banner) */}
      <g className="transition-transform duration-300 delay-75 group-hover:translate-x-1">
        <rect x="12" y="44" width="50" height="18" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
        <text x="37" y="57" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="10">
          #2 (15)
        </text>
      </g>

      {/* Position 3 (Crimson Banner) */}
      <g className="transition-transform duration-300 delay-100 group-hover:translate-x-1">
        <rect x="68" y="44" width="50" height="18" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
        <text x="93" y="57" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="10">
          #3 (9)
        </text>
      </g>

      {/* Position 4 (Crimson Banner) */}
      <g className="transition-transform duration-300 delay-150 group-hover:translate-x-1">
        <rect x="12" y="68" width="50" height="18" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
        <text x="37" y="81" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="10">
          #4 (4)
        </text>
      </g>

      {/* Position 5 (Crimson Banner) */}
      <g className="transition-transform duration-300 delay-200 group-hover:translate-x-1">
        <rect x="68" y="68" width="50" height="18" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
        <text x="93" y="81" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="10">
          #5 (2)
        </text>
      </g>

      {/* Strikes Bar at Bottom */}
      <rect x="12" y="96" width="106" height="28" rx="3" fill="#120A16" stroke="#FF1E56" strokeWidth="2" />
      <text x="65" y="116" textAnchor="middle" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="15" fontWeight="bold" letterSpacing="4" className="animate-rdb-lightning">
        [ X ] [ X ] [ X ]
      </text>
    </g>

    {/* CazéTV Host Character (Right) - Pointing at Board, Bounces on Hover */}
    <g className="animate-rdb-host transition-transform duration-300">
      {/* Body / Teal Shirt */}
      <path d="M175 118 L160 170 L242 170 L230 118 Z" fill="#17B8B8" stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" />
      <text x="202" y="146" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        RODA
      </text>
      <text x="202" y="155" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="7" fontWeight="bold">
        BOBO
      </text>

      {/* Head */}
      <circle cx="202" cy="84" r="25" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
      {/* Hair */}
      <path d="M178 78 C178 52 225 50 226 78 C222 70 216 72 210 72 C204 68 198 68 192 72 C184 72 180 76 178 78 Z" fill="#0C0D16" />

      {/* Energetic Host Eyes */}
      <circle cx="193" cy="82" r="5" fill="#0C0D16" />
      <circle cx="191.5" cy="80.5" r="1.5" fill="#FFFFFF" />
      <circle cx="211" cy="82" r="5" fill="#0C0D16" />
      <circle cx="209.5" cy="80.5" r="1.5" fill="#FFFFFF" />

      {/* Big Host Smile with Tongue */}
      <path d="M190 92 Q202 106 214 92" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="#0C0D16" />
      <path d="M196 99 Q202 105 208 99" fill="#FF1E56" />

      {/* Arm Pointing Excitedly across to the board */}
      <path d="M175 125 Q145 110 135 90" stroke="#0C0D16" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M175 125 Q145 110 135 90" stroke="#F5F2EB" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      {/* Pointing Hand */}
      <circle cx="135" cy="90" r="6" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
      <line x1="135" y1="90" x2="120" y2="82" stroke="#0C0D16" strokeWidth="4" strokeLinecap="round" />
      <line x1="135" y1="90" x2="120" y2="82" stroke="#F5F2EB" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

// 14.6 PERGUNTAS E VERDADES (Bobo da corte com cartas A♠, K♥, ?, e pilha de tokens dourados)
export const CazeAnimatedPerguntasEVerdadesArt: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} preserveAspectRatio="xMidYBottom meet">
    {/* Jester Character Head & Cap */}
    <g>
      {/* Jester Hat with Two Horns & Bells (Jingles on hover!) */}
      <g className="animate-rdb-jingle origin-bottom" style={{ transformOrigin: '130px 65px' }}>
        {/* Left Horn */}
        <path d="M110 50 C90 35 70 45 62 60 C75 58 95 62 112 66 Z" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3" />
        <circle cx="60" cy="62" r="5" fill="#FBBF24" stroke="#0C0D16" strokeWidth="2" />

        {/* Right Horn */}
        <path d="M150 50 C170 35 190 45 198 60 C185 58 165 62 148 66 Z" fill="#17B8B8" stroke="#0C0D16" strokeWidth="3" />
        <circle cx="200" cy="62" r="5" fill="#FBBF24" stroke="#0C0D16" strokeWidth="2" />

        {/* Center Cap Crown Band */}
        <path d="M106 50 Q130 42 154 50 L150 68 Q130 62 110 68 Z" fill="#120A16" stroke="#0C0D16" strokeWidth="3" />
      </g>

      {/* Head */}
      <circle cx="130" cy="74" r="24" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />

      {/* Cunning Wink / Smirk Eyes */}
      {/* Left eye winking */}
      <path d="M116 72 Q122 68 126 73" stroke="#0C0D16" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Right eye open and mischievous */}
      <circle cx="139" cy="74" r="4.5" fill="#0C0D16" />
      <circle cx="137.5" cy="72.5" r="1.5" fill="#FFFFFF" />

      {/* Cunning Joker Grin with red lips */}
      <path d="M118 84 Q130 96 142 84" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="#0C0D16" />
      <path d="M121 86 Q130 92 139 86" fill="#FF1E56" />

      {/* Jester collar ruffs */}
      <path d="M104 96 L112 110 L122 98 L130 112 L138 98 L148 110 L156 96 Z" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
    </g>

    {/* Fanned Playing Cards (Left, Center, Right - Fan out dynamically on hover!) */}
    <g transform="translate(130, 118)">
      {/* Left Card: Ace of Spades (fans left) */}
      <g className="animate-rdb-card-left" style={{ transformOrigin: '0 40px' }}>
        <rect x="-60" y="-35" width="42" height="62" rx="4" fill="#090B14" stroke="#17B8B8" strokeWidth="3" />
        <text x="-48" y="-18" fill="#17B8B8" fontFamily="Anton, sans-serif" fontSize="12" fontWeight="bold">A</text>
        <text x="-39" y="3" textAnchor="middle" fill="#17B8B8" fontSize="18">♠</text>
      </g>

      {/* Right Card: King of Hearts (fans right) */}
      <g className="animate-rdb-card-right" style={{ transformOrigin: '0 40px' }}>
        <rect x="18" y="-35" width="42" height="62" rx="4" fill="#120A16" stroke="#FF1E56" strokeWidth="3" />
        <text x="28" y="-18" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="12" fontWeight="bold">K</text>
        <text x="39" y="3" textAnchor="middle" fill="#FF1E56" fontSize="18">♥</text>
      </g>

      {/* Center Mystery Card: "?" */}
      <g transform="translate(0, -6)">
        <rect x="-22" y="-35" width="44" height="64" rx="4" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3.5" />
        <rect x="-18" y="-31" width="36" height="56" rx="3" fill="#0C0D16" />
        <text x="0" y="5" textAnchor="middle" fill="#FBBF24" fontFamily="Anton, sans-serif" fontSize="28" fontWeight="bold">?</text>
      </g>
    </g>

    {/* Foreground Casino / Auction Tokens Stack */}
    <g transform="translate(130, 148)" className="transition-all duration-300 group-hover:scale-105">
      <ellipse cx="0" cy="14" rx="32" ry="8" fill="#161104" stroke="#FBBF24" strokeWidth="3" />
      <ellipse cx="0" cy="7" rx="32" ry="8" fill="#161104" stroke="#FBBF24" strokeWidth="3" />
      <ellipse cx="0" cy="0" rx="32" ry="8" fill="#FBBF24" stroke="#0C0D16" strokeWidth="3" />
      <text x="0" y="4" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="10" fontWeight="bold" letterSpacing="1">
        10 TOKENS
      </text>
    </g>
  </svg>
);

// 14.7 Seletor de Arte CazéTV com animação interativa vetorial SVG
export const CazeArt: React.FC<{
  gameId: string;
  className?: string;
  fallback?: React.ReactNode;
}> = ({ gameId, className = 'w-full h-full' }) => {
  switch (gameId) {
    case 'limite':
      return <CazeAnimatedLimiteArt className={className} />;
    case 'duvido':
      return <CazeAnimatedDuvidoArt className={className} />;
    case 'proibido':
      return <CazeAnimatedProibidoArt className={className} />;
    case 'nota':
      return <CazeAnimatedNotaArt className={className} />;
    case 'tem-ou-nao-tem':
      return <CazeAnimatedTemOuNaoTemArt className={className} />;
    case 'perguntas-e-verdades':
      return <CazeAnimatedPerguntasEVerdadesArt className={className} />;
    default:
      return null;
  }
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