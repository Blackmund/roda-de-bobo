import React, { useState, useEffect } from 'react';
import {
  GameRoom,
  ConnectionMode,
  TeamId
} from '../../types/game';
import { PlayerRosterSelector } from '../PlayerRosterSelector';
import { DynamicQRCode } from '../DynamicQRCode';
import { FIXED_PLAYERS, FixedPlayerDefinition } from '../../utils/fixedPlayers';
import { resolvePlayerAvatar } from '../../utils/retroAvatars';
import {
  resolvePublicShareOrigin,
  fetchAndCacheLanOrigin,
  getAvailableShareOrigins,
  setCustomShareOrigin
} from '../../utils/multiplayerRoomEngine';
import {
  TEAM_META,
  getTeamCount,
  getActiveTeamIds,
  cyclePlayerTeamId
} from '../../utils/teamUtils';
import { sounds } from '../../utils/soundEffects';
import {
  Monitor,
  Tv,
  Smartphone,
  QrCode,
  Users,
  Crown,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Shuffle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  UserPlus,
  Trash2,
  Star
} from 'lucide-react';

export interface ScreenModeSelectProps {
  room: GameRoom;
  isTvMode?: boolean;
  onSelectMode: (mode: ConnectionMode) => void;
  onAddPlayer: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer: (playerId: string) => void;
  onSwitchPlayerTeam: (playerId: string, explicitTeam?: TeamId) => void;
  onChangeTeamCount?: (count: 2 | 3 | 4) => void;
  onUpdatePlayerAvatar?: (playerId: string, avatar: string) => void;
  onShuffleTeams?: () => void;
  onSetStartingPlayer?: (playerId: string) => void;
  onRegenerateRoomCode?: () => void;
  onProceedToLobby: () => void;
  onSwitchToControllerMode?: () => void;
  transportStatus?: string;
  onForceSync?: () => void;
}

const MODE_OPTIONS: Array<{
  mode: ConnectionMode;
  badge: string;
  title: string;
  subtitle: string;
  headline: string;
  description: string;
  accentBorder: string;
  accentGlow: string;
  accentBg: string;
  accentText: string;
  ctaLabel: string;
}> = [
  {
    mode: 'local',
    badge: 'MODO 1 · PASS & PLAY',
    title: '🖥️ MODO LOCAL',
    subtitle: 'MESMA TELA / SEM CELULARES EXTRAS',
    headline: '“A TV/PC é a tela principal e única.”',
    description:
      'Todos jogam juntos olhando e interagindo na mesma tela (ou passando o dispositivo de mão em mão). Adicione e selecione os jogadores diretamente aqui, sem precisar de celulares extras.',
    accentBorder: 'border-cyan-400',
    accentGlow: 'shadow-[0_0_25px_rgba(0,229,255,0.4)]',
    accentBg: 'bg-cyan-500/20',
    accentText: 'text-cyan-300',
    ctaLabel: 'ESCOLHER MODO LOCAL ➔'
  },
  {
    mode: 'host',
    badge: 'MODO 2 · TV PALCO & CONTROLES INDIVIDUAIS',
    title: '📺 MODO HOST',
    subtitle: 'TV COMO PALCO + CELULARES COMO CONTROLE',
    headline: '“A TV é o Host visual e os celulares são os controles.”',
    description:
      'A TV exibe o palco da partida e gera um QR Code único. Cada jogador escaneia o QR Code no seu celular para digitar palpites secretos, ver cartas ocultas e apertar botões na palma da mão.',
    accentBorder: 'border-rose-500',
    accentGlow: 'shadow-[0_0_25px_rgba(230,25,75,0.4)]',
    accentBg: 'bg-rose-500/20',
    accentText: 'text-rose-300',
    ctaLabel: 'GERAR SALA TV • CELULARES ➔'
  },
  {
    mode: 'multi',
    badge: 'MODO 3 · MULTIPLAYER MOBILE',
    title: '📱 MODO MULTI',
    subtitle: 'CADA JOGADOR 100% NO SEU CELULAR',
    headline: '“Sem tela de TV. Cada jogador joga unicamente pelo próprio celular.”',
    description:
      'Cria uma sala com código/QR Code único onde tudo (perguntas, roleta, cartas, tabuleiro e botões de resposta) aparece diretamente na tela do celular de cada participante em tempo real!',
    accentBorder: 'border-amber-400',
    accentGlow: 'shadow-[0_0_25px_rgba(251,191,36,0.4)]',
    accentBg: 'bg-amber-500/20',
    accentText: 'text-amber-300',
    ctaLabel: 'CRIAR SALA 100% MOBILE ➔'
  }
];

export const ScreenModeSelect: React.FC<ScreenModeSelectProps> = ({
  room,
  onSelectMode,
  onAddPlayer,
  onRemovePlayer,
  onSwitchPlayerTeam,
  onChangeTeamCount,
  onUpdatePlayerAvatar,
  onShuffleTeams,
  onRegenerateRoomCode,
  onProceedToLobby,
  onSwitchToControllerMode,
  transportStatus
}) => {
  const activeMode: ConnectionMode = room.connectionMode || 'local';
  const activeTeamCount = getTeamCount(room);
  const activeTeamIds = getActiveTeamIds(room);
  const hasMinPlayers = room.players.length >= 2;

  // Fluxo em 2 abas: 1) escolher o modo, 2) montar os jogadores da sala.
  // Ao escolher um modo avancamos automaticamente para a aba de jogadores.
  const [step, setStep] = useState<'mode' | 'players'>(() =>
    room.players.length >= 2 ? 'players' : 'mode'
  );
  const activeModeOption = MODE_OPTIONS.find((o) => o.mode === activeMode) || MODE_OPTIONS[0];
  const activeModeName = activeModeOption.title.replace(/^\S+\s/, '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [remoteGuestName, setRemoteGuestName] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [baseOrigin, setBaseOrigin] = useState<string>(() => resolvePublicShareOrigin());
  const [availableOrigins, setAvailableOrigins] = useState<string[]>(
    () => getAvailableShareOrigins().allLanOrigins
  );

  useEffect(() => {
    fetchAndCacheLanOrigin().then(() => {
      setBaseOrigin(resolvePublicShareOrigin());
      setAvailableOrigins(getAvailableShareOrigins().allLanOrigins);
    });
    const handleLanUpdated = () => {
      setBaseOrigin(resolvePublicShareOrigin());
      setAvailableOrigins(getAvailableShareOrigins().allLanOrigins);
    };
    window.addEventListener('rb:lan-origin-updated', handleLanUpdated);
    return () => window.removeEventListener('rb:lan-origin-updated', handleLanUpdated);
  }, []);

  const joinUrl = `${baseOrigin}/?join=${room.roomId}&role=client`;
  const whatsappText = encodeURIComponent(
    `🎉 Entre na nossa sala do Roda de Bobo!\n🔑 Código da Sala: *${room.roomId}*\n👉 Clique para entrar: ${joinUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      sounds.playSuccess();
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSelectModeClick = (mode: ConnectionMode) => {
    sounds.playPowerup();
    onSelectMode(mode);
    setStep('players');
  };

  const handleToggleFixedPlayer = (fp: FixedPlayerDefinition) => {
    setDuplicateWarning(null);
    const existing = room.players.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
    );
    if (existing) {
      sounds.playFlip();
      onRemovePlayer(existing.id);
    } else {
      sounds.playSuccess();
      const avatar = resolvePlayerAvatar({
        playerId: `fix-${fp.id}`,
        fixedPlayerId: fp.id,
        name: fp.name,
        fixedDefaultAvatar: fp.avatar
      });
      onAddPlayer({
        id: `fix-${fp.id}`,
        name: fp.name,
        avatar,
        color: fp.color,
        team: fp.defaultTeam,
        isFixedPlayer: true,
        fixedPlayerId: fp.id
      });
    }
  };

  const handleAddRemoteGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = remoteGuestName.trim();
    if (!clean) return;
    const exists = room.players.some(
      (p) => p.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (exists) {
      sounds.playBuzzer();
      setDuplicateWarning('Já existe um jogador com este nome na sala');
      return;
    }
    setDuplicateWarning(null);
    sounds.playSuccess();
    onAddPlayer({
      name: clean,
      avatar: '👾',
      isFixedPlayer: false
    });
    setRemoteGuestName('');
  };

  const handleAdvance = () => {
    if (!hasMinPlayers) {
      sounds.playBuzzer();
      return;
    }
    sounds.playPowerup();
    onProceedToLobby();
  };

  return (
    <div
      data-testid="screen-mode-select"
      className="max-w-6xl mx-auto w-full h-full flex flex-col justify-between overflow-hidden p-2 md:p-3 gap-2 text-[#F5F2EB] select-none"
    >
      {/* 1. CABEÇALHO RETRÔ OS */}
      <div className="shrink-0 bg-[#07080d] border border-cyan-500/40 p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-950/80 border border-cyan-400/60 text-cyan-300 font-mono-code text-[10px] font-bold uppercase tracking-widest">
            <Sparkles size={11} className="text-cyan-300" />
            <span>CONFIGURAÇÃO DA SALA</span>
          </div>
          <h1 className="font-anton text-lg md:text-2xl text-white uppercase tracking-wider leading-tight">
            ESCOLHA O MODO DE JOGO & JOGADORES
          </h1>
          <p className="text-[11px] font-mono-code text-slate-300">
            Defina como o grupo vai jogar e adicione os participantes da partida.
          </p>
        </div>

        {transportStatus && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-slate-700 font-mono-code text-[10px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase">CONEXÃO: {transportStatus}</span>
          </div>
        )}
      </div>

      {/* 1b. ABAS: MODO ESCOLHIDO / JOGADORES NA SALA */}
      <div data-testid="mode-select-tabs" className="shrink-0 flex items-stretch gap-1.5">
        <button
          type="button"
          data-testid="mode-tab-mode"
          onClick={() => { sounds.playTick(); setStep('mode'); }}
          className={`flex-1 sm:flex-none px-3 py-2 border-2 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            step === 'mode'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : `${activeModeOption.accentBorder} bg-black/60 ${activeModeOption.accentText} hover:bg-white/5`
          }`}
          title="Voltar para a escolha do modo de jogo"
        >
          <span className="w-5 h-5 inline-flex items-center justify-center bg-black/60 border border-current text-[10px]">1</span>
          <span>{step === 'mode' ? 'ESCOLHER MODO' : activeModeName}</span>
          {step !== 'mode' && <span className="text-[9px] font-mono-code normal-case opacity-80">(trocar)</span>}
        </button>
        <button
          type="button"
          data-testid="mode-tab-players"
          onClick={() => { sounds.playTick(); setStep('players'); }}
          className={`flex-1 sm:flex-none px-3 py-2 border-2 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
            step === 'players'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : 'border-slate-700 bg-black/60 text-slate-300 hover:border-slate-500'
          }`}
        >
          <span className="w-5 h-5 inline-flex items-center justify-center bg-black/60 border border-current text-[10px]">2</span>
          <Users size={14} />
          <span>JOGADORES NA SALA ({room.players.length})</span>
          <span className={`text-[10px] font-mono-code ${hasMinPlayers ? 'text-emerald-400' : 'text-rose-400'}`}>
            {hasMinPlayers ? 'OK' : '!'}
          </span>
        </button>
      </div>
      {/* 2. OS 3 CARDS DE SELEÇÃO DE MODO COM ILUSTRAÇÕES RETRÔ CLÁSSICAS */}
      {step === 'mode' && (<div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-2.5 content-start">
        {MODE_OPTIONS.map((opt) => {
          const isSelected = activeMode === opt.mode;
          return (
            <div
              key={opt.mode}
              data-testid={`mode-select-card-${opt.mode}`}
              onClick={() => handleSelectModeClick(opt.mode)}
              className={`p-3 border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden gap-2.5 ${
                isSelected
                  ? `${opt.accentBorder} bg-gradient-to-b from-black/90 to-[#0e1220] ${opt.accentGlow}`
                  : 'border-slate-800 bg-[#090b14]/80 hover:border-slate-600 hover:bg-[#0c0f1d]'
              }`}
            >
              <div className="space-y-2">
                {/* Linha Superior: Badge do Modo + Status Ativo */}
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono-code font-bold uppercase border ${
                      isSelected
                        ? `${opt.accentBorder} ${opt.accentBg} ${opt.accentText}`
                        : 'border-slate-700 bg-black/60 text-slate-400'
                    }`}
                  >
                    {opt.badge}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-code text-emerald-400 font-bold">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <span>ATIVO</span>
                    </span>
                  )}
                </div>

                {/* Caixa de Ilustração Retrô Clássica (Ícones Antigos da Imagem) */}
                <div className="h-16 rounded-xl bg-black/80 border border-white/10 flex items-center justify-center gap-3 px-3 overflow-hidden shadow-inner">
                  {opt.mode === 'local' && (
                    <div className="flex items-center gap-2.5 text-cyan-300">
                      <Monitor size={28} className="shrink-0" />
                      <span className="font-mono-code text-xs text-slate-500 font-bold">+</span>
                      <div className="flex items-center gap-1 bg-cyan-950/70 border border-cyan-400/50 px-2 py-1 rounded-md">
                        <Users size={16} />
                        <span className="font-mono-code text-[10px] font-black tracking-wider">SOFÁ</span>
                      </div>
                    </div>
                  )}

                  {opt.mode === 'host' && (
                    <div className="flex items-center gap-2 text-rose-300">
                      <Tv size={28} className="shrink-0" />
                      <QrCode size={18} className="text-cyan-300 animate-pulse shrink-0" />
                      <div className="flex items-center gap-1">
                        <Smartphone size={18} className="text-cyan-300" />
                        <Smartphone size={18} className="text-amber-300" />
                      </div>
                    </div>
                  )}

                  {opt.mode === 'multi' && (
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <div className="relative p-1 rounded-md bg-amber-500/20 border border-amber-400">
                        <Smartphone size={18} />
                        <Crown
                          size={9}
                          className="absolute -top-1.5 -right-1.5 text-amber-300 fill-amber-300"
                        />
                      </div>
                      <Smartphone size={16} className="text-cyan-300" />
                      <Smartphone size={16} className="text-rose-300" />
                      <Smartphone size={16} className="text-emerald-300" />
                    </div>
                  )}
                </div>

                {/* Título e Subtítulo */}
                <div>
                  <h3 className="font-anton text-base md:text-lg uppercase text-white tracking-wide">
                    {opt.title}
                  </h3>
                  <div className={`text-[10px] font-mono-code font-bold uppercase tracking-wider ${opt.accentText}`}>
                    {opt.subtitle}
                  </div>
                </div>

                {/* Frase de Efeito em Bloco Destaque */}
                <div className="px-2 py-1 border-l-2 border-cyan-400 bg-black/60 text-[10px] font-mono-code text-cyan-200 italic leading-snug">
                  {opt.headline}
                </div>

                {/* Descrição */}
                <p className="text-[10px] font-mono-code text-slate-300 leading-relaxed line-clamp-3">
                  {opt.description}
                </p>
              </div>

              {/* Botão de Ação Estilizado */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  className={`w-full py-1.5 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? `${opt.accentBg} ${opt.accentText} border ${opt.accentBorder} shadow-sm font-black`
                      : 'border border-slate-700 bg-black/50 text-slate-300 hover:border-cyan-400 hover:text-white'
                  }`}
                >
                  <span>{opt.ctaLabel}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>)}

      {/* 3. GERENCIAMENTO DE JOGADORES (ADAPTADO AO MODO ESCOLHIDO) */}
      {step === 'players' && (<div className="flex-1 min-h-0 bg-[#090b14] border border-cyan-500/30 p-2.5 overflow-hidden flex flex-col justify-between">
        {/* MODO LOCAL: EXIBE ROSTER LOCAL COMPLETO */}
        {activeMode === 'local' && (
          <div className="h-full flex flex-col justify-between overflow-hidden">
            <PlayerRosterSelector
              players={room.players}
              onAddPlayer={onAddPlayer}
              onRemovePlayer={onRemovePlayer}
              onSwitchPlayerTeam={onSwitchPlayerTeam}
              onUpdatePlayerAvatar={onUpdatePlayerAvatar}
              hideTeamControls={true}
              showMissingPlayersWarning={!hasMinPlayers}
            />
          </div>
        )}

        {/* MODO TV + CELULARES OU MODO 100% MOBILE: EXIBE QR CODE + CONECTADOS */}
        {activeMode !== 'local' && (
          <div className="h-full flex flex-col md:flex-row gap-3 overflow-y-auto md:overflow-hidden">
            {/* Coluna Esquerda: QR Code + Código da Sala + Links (Sem barra de rolagem, compacto e 100% legível) */}
            <div className="w-full md:w-72 lg:w-80 shrink-0 bg-black/75 border border-rose-500/40 p-2.5 flex flex-col justify-between items-center text-center overflow-hidden gap-1.5">
              <div className="space-y-0.5 shrink-0">
                <div className="text-[10px] font-mono-code text-rose-300 font-bold uppercase tracking-wider">
                  ENTRE PELO CELULAR
                </div>
                <div
                  data-testid="mode-select-room-code"
                  className="font-anton text-2xl sm:text-3xl text-white tracking-widest uppercase leading-none"
                >
                  #{room.roomId}
                </div>
              </div>

              {/* QR Code Container */}
              <div
                data-testid="mode-select-qr-container"
                className="p-2 bg-white rounded shadow-[0_0_20px_rgba(255,255,255,0.18)] shrink-0 flex items-center justify-center"
              >
                <DynamicQRCode url={joinUrl} size={145} />
              </div>

              {/* Endereço URL da Sala (Perfeitamente visível e fixado sem cortes) */}
              <div
                className="w-full shrink-0 px-2 py-1 bg-slate-900/90 border border-cyan-500/40 rounded flex items-center justify-center gap-1.5 text-center"
                title={baseOrigin}
              >
                <span className="text-cyan-400 text-xs shrink-0">🌐</span>
                <span className="text-[10px] font-mono-code font-bold text-cyan-200 tracking-normal truncate">
                  {baseOrigin}
                </span>
              </div>

              {availableOrigins.length > 1 && (
                <div className="w-full shrink-0 flex flex-wrap items-center justify-center gap-1">
                  {availableOrigins.map((orig) => (
                    <button
                      key={orig}
                      type="button"
                      onClick={() => {
                        setCustomShareOrigin(orig);
                        setBaseOrigin(resolvePublicShareOrigin());
                      }}
                      className={`px-1.5 py-0.5 text-[9px] font-mono-code border cursor-pointer transition-colors ${
                        baseOrigin === orig
                          ? 'border-cyan-400 bg-cyan-400 text-black font-bold'
                          : 'border-slate-700 bg-black text-slate-400 hover:text-white'
                      }`}
                    >
                      {orig.replace(/^https?:\/\//, '')}
                    </button>
                  ))}
                </div>
              )}

              {/* Botões de Ação Rápida em Ícones Lado a Lado (Sem texto, 100% compactos) */}
              <div
                className={`w-full shrink-0 grid ${
                  onRegenerateRoomCode ? 'grid-cols-3' : 'grid-cols-2'
                } gap-2`}
              >
                <button
                  type="button"
                  data-testid="mode-select-copy-link-btn"
                  onClick={handleCopyLink}
                  title={copiedLink ? 'Link copiado!' : 'Copiar link do celular'}
                  aria-label="Copiar link do celular"
                  className={`h-9 flex items-center justify-center transition-all cursor-pointer border shadow-sm ${
                    copiedLink
                      ? 'bg-emerald-400 text-black border-emerald-300'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400/50'
                  }`}
                >
                  {copiedLink ? (
                    <Check size={18} strokeWidth={2.5} />
                  ) : (
                    <Copy size={18} strokeWidth={2.2} />
                  )}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Compartilhar no WhatsApp"
                  aria-label="Compartilhar no WhatsApp"
                  className="h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 transition-colors cursor-pointer shadow-sm"
                >
                  <Share2 size={18} strokeWidth={2.2} />
                </a>

                {onRegenerateRoomCode && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playFlip();
                      onRegenerateRoomCode();
                    }}
                    title="Gerar novo código da sala"
                    aria-label="Gerar novo código da sala"
                    className="h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={17} strokeWidth={2.2} />
                  </button>
                )}
              </div>
            </div>

            {/* Coluna Direita: Jogadores Conectados no Celular + Adição Rápida */}
            <div className="flex-1 min-w-0 flex flex-col justify-between overflow-hidden bg-black/40 border border-slate-800 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-cyan-300" />
                  <h3 className="font-anton text-base uppercase text-white tracking-wider">
                    JOGADORES CONECTADOS ({room.players.length})
                  </h3>
                </div>

                <div className="text-[11px] font-mono-code text-cyan-300 font-bold uppercase">
                  {room.players.length >= 2 ? '✓ Sala Pronta' : 'Aguardando Jogadores'}
                </div>
              </div>

              {/* Lista dos Jogadores Conectados */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                {room.players.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                    <Smartphone size={32} className="text-rose-400 animate-pulse" />
                    <p className="font-anton text-base uppercase text-white">
                      NENHUM JOGADOR CONECTOU AINDA
                    </p>
                    <p className="text-xs font-mono-code text-slate-300 max-w-sm">
                      Abra a câmera do celular e aponte para o QR Code ao lado, ou adicione convidados diretamente nos botões abaixo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {room.players.map((p) => {
                      return (
                        <div
                          key={p.id}
                          data-testid={`mode-select-player-card-${p.id}`}
                          className="p-2 border border-white/15 bg-black/80 flex items-center justify-between gap-2 shadow-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl shrink-0">{p.avatar || '👾'}</span>
                            <div className="min-w-0">
                              <div className="font-anton text-sm text-white uppercase truncate flex items-center gap-1">
                                <span>{p.name}</span>
                                {p.isVip && <Crown size={12} className="text-amber-300 shrink-0" />}
                              </div>
                              <span className="text-[10px] font-mono-code text-cyan-300">
                                ● Conectado
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              sounds.playFlip();
                              onRemovePlayer(p.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remover jogador"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ações Rápidas: Jogadores da Casa + Adicionar Convidado Local */}
              <div className="border-t border-white/10 pt-2 shrink-0 space-y-2">
                {/* Jogadores da Casa */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono-code text-amber-300 uppercase font-bold flex items-center gap-1 mr-1">
                    <Star size={11} />
                    <span>Amigos da Casa:</span>
                  </span>
                  {FIXED_PLAYERS.map((fp) => {
                    const isConnected = room.players.some(
                      (p) =>
                        p.fixedPlayerId === fp.id ||
                        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
                    );
                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => handleToggleFixedPlayer(fp)}
                        className={`px-2 py-0.5 text-[10px] font-mono-code font-bold border flex items-center gap-1 cursor-pointer transition-colors ${
                          isConnected
                            ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200'
                            : 'border-slate-800 bg-black text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span>{fp.avatar}</span>
                        <span>{fp.name}</span>
                        <span>{isConnected ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input de Convidado Local */}
                <form onSubmit={handleAddRemoteGuest} className="flex gap-2">
                  <input
                    type="text"
                    value={remoteGuestName}
                    onChange={(e) => setRemoteGuestName(e.target.value)}
                    placeholder="Adicionar jogador sem celular (ex: Roberto)..."
                    maxLength={20}
                    className="flex-1 bg-black border border-slate-700 px-2.5 py-1 text-xs font-mono-code text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <UserPlus size={13} />
                    <span>Adicionar</span>
                  </button>
                </form>
                {duplicateWarning && (
                  <p className="text-[10px] font-mono-code text-rose-400">{duplicateWarning}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>)}

      {/* 4. BARRA INFERIOR DE VALIDAÇÃO E AVANÇO */}
      <div className="shrink-0 bg-[#07080d] border border-cyan-500/40 p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        {/* Status de Validação */}
        <div className="flex items-center gap-2">
          {hasMinPlayers ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={18} />
              <div className="space-y-0.5">
                <div className="font-anton text-sm uppercase tracking-wide text-white">
                  {room.players.length} JOGADORES PRONTOS PARA A PARTIDA!
                </div>
                <div className="text-[10px] font-mono-code text-emerald-300">
                  Modo ativo: [{activeMode.toUpperCase()}] · Tudo pronto para escolher os jogos
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400 animate-pulse">
              <AlertTriangle size={18} />
              <div className="space-y-0.5">
                <div className="font-anton text-sm uppercase tracking-wide text-rose-300">
                  MÍNIMO DE 2 JOGADORES NECESSÁRIOS
                </div>
                <div className="text-[10px] font-mono-code text-rose-400">
                  Adicione pelo menos mais {2 - room.players.length} jogador(es) para avançar
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão Gigante de Avanço */}
        {step === 'mode' ? (<button type="button" data-testid="mode-continue-btn" onClick={() => { sounds.playTick(); setStep('players'); }} className="px-6 py-3 font-anton text-base md:text-lg uppercase tracking-wider flex items-center justify-center gap-2 bg-[#17B8B8] hover:bg-cyan-300 text-black cursor-pointer shadow-lg"><span>CONTINUAR COM {activeModeName}</span><ArrowRight size={20} /></button>) : (<button
          type="button"
          data-testid="advance-to-lobby-btn"
          disabled={!hasMinPlayers}
          onClick={handleAdvance}
          className={`px-6 py-3 font-anton text-base md:text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
            hasMinPlayers
              ? 'bg-[#17B8B8] hover:bg-cyan-300 text-black shadow-neon-cyan hover:scale-[1.02]'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
          }`}
        >
          <span>AVANÇAR PARA OS JOGOS</span>
          <ArrowRight size={20} />
        </button>)}
      </div>
    </div>
  );
};
