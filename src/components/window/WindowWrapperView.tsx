import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, RotateCcw, X, ChevronDown, Volume2, VolumeX, QrCode, History, Trophy, Settings, Copy, Check, Sparkles, Tv, Smartphone, KeyRound, Users, Menu } from '../rdb/rdbIcons';
import { RdbLogo } from '../rdb/RdbLogo';
import { isCazeFamily, nextTheme as nextThemeOf, themeBadge, cazeArtSrc } from '../../utils/themeUtils';
import { GameRoom, VisualTheme, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { DynamicQRCode } from '../DynamicQRCode';
import { GlobalStats } from '../GlobalStats';
import { LeaderboardRanking } from '../LeaderboardRanking';
import { PlayersManagerModal } from '../PlayersManagerModal';
import { clearUsedRoundSignatures } from '../../utils/aiGameGenerator';
import { WindowMenuPanel } from './WindowMenuPanel';

interface WindowWrapperViewProps {
  windowContainerRef: React.RefObject<HTMLDivElement | null>;
  varActiveFlash: boolean;
  visualTheme: VisualTheme;
  className: string;
  showBackButton: boolean;
  onBack: (() => void) | undefined;
  handleRequestBack: () => void;
  room: GameRoom | undefined;
  title: string;
  onOpenJoinRoomModal: (() => void) | undefined;
  setActiveDockModal: React.Dispatch<React.SetStateAction<"qr" | "players" | "history" | "ranking" | "config" | null>>;
  activeDockModal: "qr" | "players" | "history" | "ranking" | "config" | null;
  onUndoVar: (() => void) | undefined;
  canUndoVar: boolean;
  resumableRoom: GameRoom | null | undefined;
  onResumeGame: (() => void) | undefined;
  openResumeOverlay: () => void;
  scheduleCloseResumeOverlay: () => void;
  isResumeHoverOpen: boolean;
  handleToggleMute: () => void;
  muted: boolean;
  onSetVisualTheme: ((theme: VisualTheme) => void) | undefined;
  onToggleTvMode: (() => void) | undefined;
  isTvMode: boolean;
  onSwitchToControllerMode: (() => void) | undefined;
  canCloseScreen: boolean;
  handleRequestClose: () => void;
  resumableGameTitle: string;
  resumableRoundText: string;
  resumableScores: { scoreA: number; scoreB: number; };
  setIsResumeHoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onDismissResume: (() => void) | undefined;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  playUrl: string;
  handleCopyPlayUrl: () => void;
  copiedUrl: boolean;
  onAddPlayer: ((options: { id?: string; name: string; avatar?: string; color?: string; team?: TeamId; isFixedPlayer?: boolean; fixedPlayerId?: string; }) => void) | undefined;
  onRemovePlayer: ((playerId: string) => void) | undefined;
  onResetStats: (() => void) | undefined;
  setClearedMemoryNotice: React.Dispatch<React.SetStateAction<boolean>>;
  clearedMemoryNotice: boolean;
  isExitConfirmOpen: boolean;
  setIsExitConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleConfirmExit: () => void;
}

export const WindowWrapperView: React.FC<WindowWrapperViewProps> = ({
  windowContainerRef,
  varActiveFlash,
  visualTheme,
  className,
  showBackButton,
  onBack,
  handleRequestBack,
  room,
  title,
  onOpenJoinRoomModal,
  setActiveDockModal,
  activeDockModal,
  onUndoVar,
  canUndoVar,
  resumableRoom,
  onResumeGame,
  openResumeOverlay,
  scheduleCloseResumeOverlay,
  isResumeHoverOpen,
  handleToggleMute,
  muted,
  onSetVisualTheme,
  onToggleTvMode,
  isTvMode,
  onSwitchToControllerMode,
  canCloseScreen,
  handleRequestClose,
  resumableGameTitle,
  resumableRoundText,
  resumableScores,
  setIsResumeHoverOpen,
  onDismissResume,
  contentScrollRef,
  children,
  playUrl,
  handleCopyPlayUrl,
  copiedUrl,
  onAddPlayer,
  onRemovePlayer,
  onResetStats,
  setClearedMemoryNotice,
  clearedMemoryNotice,
  isExitConfirmOpen,
  setIsExitConfirmOpen,
  handleConfirmExit
}) => {
  return (
    <div
      ref={windowContainerRef}
      className={`relative border ${
        varActiveFlash
          ? 'border-amber-400 border-dashed shadow-[0_0_32px_rgba(251,191,36,0.75)]'
          : visualTheme === 'neon'
          ? 'border-2 border-[#17B8B8] shadow-neon-cyan'
          : visualTheme === 'original' ? 'border-2 border-[#E6194B]' : 'border-[#E6194B]/70'
      } bg-[#07080d] shadow-2xl flex flex-col justify-between retro-window-container transition-all duration-200 flex-1 min-h-0 h-full max-h-full overflow-hidden select-none ${className}`}
    >
      {/* VAR Review Flash Banner */}
      {varActiveFlash && (
        <div
          data-testid="var-review-flash-banner"
          className="absolute inset-x-0 top-10 z-50 flex justify-center pointer-events-none"
        >
          <div className="px-6 py-2 border border-dashed border-amber-300 bg-amber-950/95 text-amber-300 font-anton text-base md:text-lg uppercase tracking-widest shadow-[0_0_28px_rgba(251,191,36,0.8)] animate-pulse">
            📺 REVISÃO DO VAR — ÚLTIMA AÇÃO RESTAURADA!
          </div>
        </div>
      )}

      {/* Barra de janela, como a do programa: marca, sala e jogadores a esquerda; som, menu e os 3 botoes de janela a direita */}
      <div className="rdb-bar">
        <div className="rdb-bar-group">
          {showBackButton && onBack ? (
            <button
              type="button"
              data-testid="window-back-btn"
              onClick={handleRequestBack}
              className="rdb-btn rdb-btn--icon cursor-pointer"
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft />
            </button>
          ) : null}

          <RdbLogo variant="inline" className="rdb-bar-logo" />

          {room?.activeGame && room.screen !== 'lobby' && room.screen !== 'mode-select' && (
            <span className="rdb-bar-title rdb-hide-md">{title.replace(/^RODA DE BOBO\s*[—-]\s*/i, '')}</span>
          )}

          {/* No catalogo: entrar numa sala pelo codigo. Em jogo: conectar celulares (QR) */}
          {room?.screen === 'lobby' || room?.screen === 'mode-select' ? (
            <button
              type="button"
              data-testid="dock-qr-btn"
              onClick={() => {
                sounds.playTick();
                if (onOpenJoinRoomModal) {
                  onOpenJoinRoomModal();
                } else {
                  window.dispatchEvent(new CustomEvent('rb:open-lobby-modal', { detail: 'qr' }));
                }
              }}
              className="rdb-btn cursor-pointer"
              title="Entrar em uma sala existente digitando o código de 6 dígitos"
              aria-label="Entrar em uma sala (código)"
            >
              <KeyRound />
              <span className="rdb-hide-md">Entrar na sala</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="dock-qr-btn"
              aria-pressed={activeDockModal === 'qr'}
              onClick={() => {
                sounds.playTick();
                setActiveDockModal((prev) => (prev === 'qr' ? null : 'qr'));
              }}
              className="rdb-btn cursor-pointer"
              title="Conectar celulares pelo QR Code"
              aria-label="Conectar celulares"
            >
              <QrCode />
              <span className="rdb-hide-md">
                {room?.connectionMode && room.connectionMode !== 'local'
                  ? `Sala ${room.roomId} · ${room.players.filter((p) => p.connected !== false).length || 0} on`
                  : 'Celulares'}
              </span>
            </button>
          )}

          {room && (
            <button
              type="button"
              data-testid="header-players-badge-btn"
              aria-pressed={activeDockModal === 'players'}
              onClick={() => {
                sounds.playTick();
                setActiveDockModal((prev) => (prev === 'players' ? null : 'players'));
              }}
              className="rdb-btn rdb-btn--cream cursor-pointer"
              title="Gerenciar jogadores da sala"
              aria-label={`Jogadores: ${room.players.length}`}
            >
              <Users />
              <span>{room.players.length}</span>
              <span className="rdb-hide-md">{room.players.length === 1 ? 'jogador' : 'jogadores'}</span>
            </button>
          )}

          {onUndoVar && (
            <button
              type="button"
              data-testid="var-undo-btn"
              disabled={!canUndoVar}
              onClick={onUndoVar}
              className="rdb-btn rdb-btn--amber cursor-pointer"
              title="VAR: desfazer a última ação"
              aria-label="VAR: desfazer a última ação"
            >
              <RotateCcw />
              <span className="rdb-hide-md">VAR</span>
            </button>
          )}

          {resumableRoom && onResumeGame && (
            <div className="relative shrink-0" onMouseEnter={openResumeOverlay} onMouseLeave={scheduleCloseResumeOverlay}>
              <button
                type="button"
                data-testid="resume-game-menu-item"
                aria-expanded={isResumeHoverOpen}
                onClick={openResumeOverlay}
                onFocus={openResumeOverlay}
                className="rdb-btn rdb-btn--amber cursor-pointer"
                title="Ver a partida salva e retomar"
              >
                <RotateCcw />
                <span className="rdb-hide-lg">Partida salva</span>
                <ChevronDown className={`transition-transform duration-200 ${isResumeHoverOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>

        <div className="rdb-bar-group shrink-0">
          <button
            type="button"
            data-testid="window-mute-btn"
            onClick={handleToggleMute}
            className={`rdb-btn rdb-btn--icon cursor-pointer ${muted ? 'rdb-btn--crimson' : ''}`}
            title={muted ? 'Ativar efeitos sonoros' : 'Silenciar efeitos sonoros'}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>

          {onToggleTvMode && (
            <button
              type="button"
              data-testid="toggle-tv-mode-btn"
              aria-pressed={isTvMode}
              onClick={() => {
                sounds.playTick();
                onToggleTvMode();
              }}
              className="rdb-btn rdb-btn--icon rdb-hide-sm cursor-pointer"
              title="Modo TV (texto maior para ler de longe)"
              aria-label="Modo TV"
            >
              <Tv />
            </button>
          )}

          {onSwitchToControllerMode && (
            <button
              type="button"
              onClick={() => {
                sounds.playTick();
                onSwitchToControllerMode();
              }}
              className="rdb-btn rdb-btn--icon rdb-hide-sm cursor-pointer"
              title="Ver como controle no celular"
              aria-label="Ver como controle no celular"
            >
              <Smartphone />
            </button>
          )}

          {/* Um menu so: jogadores, historico, ranking, tema e configuracoes moram nas abas dele */}
          <button
            type="button"
            data-testid="dock-config-btn"
            aria-pressed={activeDockModal === 'config' || activeDockModal === 'history' || activeDockModal === 'ranking'}
            onClick={() => {
              sounds.playTick();
              setActiveDockModal((prev) => (prev === 'config' ? null : 'config'));
            }}
            className="rdb-btn rdb-btn--cream cursor-pointer"
            title="Menu: histórico, ranking, tema e configurações"
            aria-label="Menu"
          >
            <Menu />
            <span className="rdb-hide-md">Menu</span>
          </button>

          <div data-testid="window-decorative-controls" className="rdb-winctl">
            <span data-testid="window-minimize-btn" aria-hidden="true" className="rdb-hide-sm">
              <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="1" y="8" width="10" height="2.4" fill="currentColor" />
              </svg>
            </span>
            <span data-testid="window-recenter-btn" aria-hidden="true" className="rdb-hide-sm">
              <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 2.5H11.5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <rect x="2.5" y="5" width="6.5" height="6.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            {canCloseScreen ? (
              <button
                type="button"
                data-testid="window-close-btn"
                onClick={handleRequestClose}
                title="Fechar tela atual"
                aria-label="Fechar tela atual"
                className="rdb-winctl-close cursor-pointer"
              >
                <X strokeWidth={4} />
              </button>
            ) : (
              <span data-testid="window-close-btn" aria-hidden="true" className="rdb-winctl-close rdb-hide-sm">
                <X strokeWidth={4} />
              </span>
            )}
          </div>
        </div>

        {/* Hover Overlay Panel for Resume Game */}
        {resumableRoom && onResumeGame && (
          <div
            onMouseEnter={openResumeOverlay}
            onMouseLeave={scheduleCloseResumeOverlay}
            className={`absolute left-2 right-2 lg:left-3 lg:right-auto lg:w-[860px] top-full pt-1.5 z-50 transition-all duration-200 origin-top-left ${
              isResumeHoverOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                : 'opacity-0 -translate-y-1.5 pointer-events-none invisible'
            }`}
          >
            <div
              data-testid="resume-game-prompt"
              className="border border-amber-400/80 bg-[#07080d]/95 backdrop-blur-md p-4 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-black font-mono-code text-[10px] font-bold uppercase tracking-wider shrink-0">
                    ESTADO SALVO NO NAVEGADOR // LOCALSTORAGE
                  </span>
                  <span className="text-xs font-mono-code text-amber-300 font-bold uppercase shrink-0">
                    {resumableGameTitle}
                  </span>
                  <span className="px-2 py-0.5 bg-[#17B8B8]/15 text-[11px] font-mono-code text-[#17B8B8] font-semibold shrink-0">
                    {resumableRoundText}
                  </span>
                </div>

                <div className="font-anton text-lg md:text-xl text-white uppercase tracking-wide">
                  Deseja retomar a partida interrompida?
                </div>

                <div className="text-xs font-mono-code text-slate-300 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Placar:{' '}
                      <strong className="text-rose-400">
                        {resumableRoom.teams.A.name} ({resumableScores.scoreA} PTS)
                      </strong>{' '}
                      x{' '}
                      <strong className="text-cyan-300">
                        {resumableRoom.teams.B.name} ({resumableScores.scoreB} PTS)
                      </strong>
                    </span>
                  </div>
                  <div className="text-amber-200/90 truncate max-w-xl">
                    Tema: "{resumableRoom.theme}"
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 w-full md:w-auto md:self-center shrink-0">
                <button
                  type="button"
                  data-testid="resume-game-button"
                  onClick={() => {
                    sounds.playPowerup();
                    setIsResumeHoverOpen(false);
                    onResumeGame();
                  }}
                  className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-anton text-sm md:text-base uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw size={16} className="shrink-0" />
                  <span>RESUME GAME // RETOMAR PARTIDA</span>
                </button>
                {onDismissResume && (
                  <button
                    type="button"
                    data-testid="dismiss-resume-button"
                    onClick={() => {
                      sounds.playFlip();
                      setIsResumeHoverOpen(false);
                      onDismissResume();
                    }}
                    title="Descartar estado salvo"
                    className="w-full sm:w-auto justify-center px-3 py-2.5 border border-white/15 bg-white/[0.03] hover:border-[#E6194B] hover:text-rose-300 text-slate-300 font-mono-code text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <X size={14} className="shrink-0" />
                    <span>Descartar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area — Strictly Zero Vertical Scroll on Desktop/TV */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        <div
          ref={contentScrollRef}
          className={`relative flex-1 min-h-0 overflow-hidden flex flex-col justify-between ${
            isTvMode ? 'p-2 md:p-3' : 'p-2.5 md:p-4'
          }`}
        >
          {children}
        </div>
      </div>

      {/* GLOBAL UTILITY DOCK MODAL (z-[999], backdrop click, ESC, 44x44px X button) */}
      {activeDockModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="dock-modal-backdrop"
            onClick={() => setActiveDockModal(null)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              data-testid={`dock-modal-${activeDockModal}`}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto bg-[#07080d] border border-[#17B8B8]/60 p-3 sm:p-6 relative shadow-2xl space-y-3 sm:space-y-4 text-[#F5F2EB] transition-all duration-200 ${
                activeDockModal === 'config' || activeDockModal === 'ranking' || activeDockModal === 'players' || activeDockModal === 'history'
                  ? 'max-w-4xl xl:max-w-5xl'
                  : 'max-w-xl'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveDockModal('qr')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'qr'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    📱 QR Code (Celular)
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-players-btn"
                    onClick={() => setActiveDockModal('players')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'players'
                        ? 'bg-[#E6194B] text-white font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    👥 Jogadores ({room?.players.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockModal('history')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'history'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    📜 Histórico
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-ranking-btn"
                    onClick={() => setActiveDockModal('ranking')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'ranking'
                        ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-white/[0.04] text-amber-300 hover:text-white'
                    }`}
                  >
                    🏆 Ranking
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-config-btn"
                    onClick={() => setActiveDockModal('config')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'config'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    ⚙️ Configuração
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="dock-modal-close-btn"
                  aria-label="Fechar modal"
                  onClick={() => setActiveDockModal(null)}
                  className="w-9 h-9 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {activeDockModal === 'qr' && (
                <div className="space-y-4 text-center py-2">
                  <div className="flex justify-center">
                    <DynamicQRCode url={playUrl} size={210} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Aponte a câmera do smartphone para entrar na{' '}
                      <strong className="text-[#17B8B8]">SALA {room?.roomId || 'RODA'}</strong> (Modo
                      Controle Mestre ou Controle Individual):
                    </p>
                    <p className="font-mono-code text-xs text-[#17B8B8] font-bold break-all bg-white/[0.03] p-2.5 border border-white/10 select-all">
                      {playUrl}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyPlayUrl}
                      className="w-full py-2.5 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedUrl ? 'LINK COPIADO!' : 'COPIAR LINK DA SALA'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeDockModal === 'players' && (
                <PlayersManagerModal
                  room={room}
                  onAddPlayer={onAddPlayer}
                  onRemovePlayer={onRemovePlayer}
                  onOpenQrCode={() => setActiveDockModal('qr')}
                />
              )}

              {activeDockModal === 'history' && room && (
                <GlobalStats
                  stats={room.sessionStats}
                  teamAName={room.teams.A.name}
                  teamBName={room.teams.B.name}
                  players={room.players}
                  onResetStats={onResetStats}
                  defaultExpanded={true}
                />
              )}

              {activeDockModal === 'ranking' && (
                <LeaderboardRanking
                  stats={room?.sessionStats}
                  players={room?.players || []}
                />
              )}

              {activeDockModal === 'config' && <WindowMenuPanel visualTheme={visualTheme} onSetVisualTheme={onSetVisualTheme} muted={muted} handleToggleMute={handleToggleMute} setClearedMemoryNotice={setClearedMemoryNotice} clearedMemoryNotice={clearedMemoryNotice} />}
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRMATION MODAL WHEN EXITING AN ACTIVE RUNNING GAME */}
      {isExitConfirmOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="confirm-exit-game-backdrop"
            onClick={() => setIsExitConfirmOpen(false)}
            className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              data-testid="confirm-exit-game-modal"
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-[#07080d] border-2 border-[#E6194B] p-6 shadow-[0_0_40px_rgba(230,25,75,0.4)] space-y-5 text-[#F5F2EB]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-[#E6194B]/20 border border-[#E6194B]/60 text-rose-300 font-mono-code text-[10px] font-bold uppercase tracking-widest">
                    PARTIDA EM ANDAMENTO
                  </span>
                  <h2 className="font-anton text-2xl text-white uppercase tracking-wide">
                    DESEJA SAIR DESTA TELA?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExitConfirmOpen(false)}
                  aria-label="Cancelar saída"
                  className="w-8 h-8 flex items-center justify-center border border-white/15 bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm font-mono-code text-slate-300 leading-relaxed">
                Tem certeza que deseja sair da partida em andamento e voltar ao menu principal?
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  data-testid="cancel-exit-game-btn"
                  onClick={() => {
                    sounds.playTick();
                    setIsExitConfirmOpen(false);
                  }}
                  className="py-2.5 px-4 border border-[#17B8B8] bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-[#17B8B8] hover:text-black font-anton text-sm uppercase tracking-wider transition-colors cursor-pointer"
                >
                  NÃO, FICAR
                </button>
                <button
                  type="button"
                  data-testid="confirm-exit-game-btn"
                  onClick={handleConfirmExit}
                  className="py-2.5 px-4 border border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider transition-colors cursor-pointer"
                >
                  SIM, SAIR
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
