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
import { ModeArt } from '../art/GameCardArt';
import { PlayerMark } from '../rdb/PlayerMark';

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

/** Nome e resumo de cada modo (uma linha: o que muda para quem joga). */
const MODE_COPY: Record<ConnectionMode, { name: string; line: string }> = {
  local: { name: 'Uma tela só', line: 'Todo mundo joga na mesma TV ou computador, sem celulares' },
  host: { name: 'TV + celulares', line: 'A TV mostra o jogo e cada um responde no próprio celular, pelo QR Code' },
  multi: { name: 'Só celulares', line: 'Sem TV: cada jogador vê e joga tudo no próprio celular' }
};

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
      className="rdb-wide mx-auto w-full h-full flex flex-col overflow-hidden gap-3 lg:gap-4 text-[#F5F2EB] select-none"
    >
      {/* Barra da tela: etiqueta, os 2 passos e o estado da conexao */}
      <div className="rdb-toolbar shrink-0">
        <div data-testid="mode-select-tabs" className="flex items-center gap-3 min-w-0 flex-wrap">
          <h1 className="rdb-tag">Sala</h1>
          <button
            type="button"
            data-testid="mode-tab-mode"
            aria-pressed={step === 'mode'}
            onClick={() => {
              sounds.playTick();
              setStep('mode');
            }}
            className="rdb-btn rdb-btn--cream cursor-pointer"
            title="Escolher como o grupo vai jogar"
          >
            <span>1 · {step === 'mode' ? 'Como jogar' : MODE_COPY[activeMode].name}</span>
          </button>
          <button
            type="button"
            data-testid="mode-tab-players"
            aria-pressed={step === 'players'}
            onClick={() => {
              sounds.playTick();
              setStep('players');
            }}
            className="rdb-btn rdb-btn--cream cursor-pointer"
          >
            <span>2 · Jogadores ({room.players.length})</span>
          </button>
        </div>
        {transportStatus && (
          <span className="rdb-toolbar-note rdb-hide-md">Conexão: {String(transportStatus).toLowerCase()}</span>
        )}
      </div>

      {/* Os 3 modos, no mesmo card do catalogo: vinheta animada em cima, nome e resumo embaixo */}
      {step === 'mode' && (
        <div className="rdb-grid rdb-grid--row">
          {MODE_OPTIONS.map((opt) => {
            const isSelected = activeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                data-testid={`mode-select-card-${opt.mode}`}
                aria-pressed={isSelected}
                onClick={() => handleSelectModeClick(opt.mode)}
                className={`rdb-card group cursor-pointer ${isSelected ? 'rdb-card--on' : ''}`}
              >
                {isSelected && <span className="rdb-card-mode">Escolhido</span>}
                <span className="rdb-card-art">
                  <ModeArt mode={opt.mode} />
                </span>
                <span className="rdb-card-foot">
                  <span className="min-w-0">
                    <span className="rdb-card-name block">{MODE_COPY[opt.mode].name}</span>
                    <span className="rdb-card-tagline rdb-card-tagline--wrap block">{MODE_COPY[opt.mode].line}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. GERENCIAMENTO DE JOGADORES (ADAPTADO AO MODO ESCOLHIDO) */}
      {step === 'players' && (<div className="rdb-players flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
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
              showMissingPlayersWarning={false}
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
                            <span className="text-xl shrink-0"><PlayerMark p={p} /></span>
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
                        <span><PlayerMark p={fp} /></span>
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
      <div className="rdb-toolbar shrink-0">
        <p className="rdb-toolbar-note" data-ok={hasMinPlayers}>
          {hasMinPlayers
            ? `${room.players.length} jogadores na sala`
            : `Faltam ${2 - room.players.length} jogador${2 - room.players.length === 1 ? '' : 'es'} para começar (mínimo 2)`}
        </p>
        {step === 'mode' ? (
          <button
            type="button"
            data-testid="mode-continue-btn"
            onClick={() => {
              sounds.playTick();
              setStep('players');
            }}
            className="rdb-btn rdb-btn--solid rdb-btn--lg cursor-pointer"
          >
            <span>Continuar: {MODE_COPY[activeMode].name}</span>
            <ArrowRight size={20} />
          </button>
        ) : (
          <button
            type="button"
            data-testid="advance-to-lobby-btn"
            disabled={!hasMinPlayers}
            onClick={handleAdvance}
            className="rdb-btn rdb-btn--solid rdb-btn--lg cursor-pointer"
          >
            <span>Escolher o jogo</span>
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
