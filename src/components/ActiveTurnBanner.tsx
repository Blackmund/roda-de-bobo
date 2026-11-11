import React from 'react';
import { GameRoom, TeamId } from '../types/game';
import {
  resolveCurrentTurnSpotlight,
  TEAM_META,
  getActiveTeamIds,
  getTeamDisplayName
} from '../utils/teamUtils';
import { sounds } from '../utils/soundEffects';
import { RefreshCw, Sparkles, Users, ArrowRight } from 'lucide-react';

interface ActiveTurnBannerProps {
  room: GameRoom;
  onRotateActivePlayer?: () => void;
  onSelectActiveTeam?: (teamId: TeamId) => void;
  compact?: boolean;
  className?: string;
}

export const ActiveTurnBanner: React.FC<ActiveTurnBannerProps> = ({
  room,
  onRotateActivePlayer,
  onSelectActiveTeam,
  compact = false,
  className = ''
}) => {
  const spotlight = resolveCurrentTurnSpotlight(room);
  if (!spotlight) return null;

  const {
    isTeamGame,
    activeTeamId,
    activeTeamName,
    activeTeamMeta,
    activePlayer,
    secondaryPlayer,
    secondaryRoleLabel,
    roleBadge,
    actionInstruction,
    teammates,
    nextInQueueLabel,
    canRotatePlayer
  } = spotlight;

  const activeTeamIds = getActiveTeamIds(room);
  const borderColorClass = activeTeamMeta
    ? activeTeamMeta.borderClass
    : 'border-[#17B8B8]';
  const glowClass = activeTeamMeta
    ? activeTeamMeta.glowClass
    : 'shadow-[0_0_22px_rgba(23,184,184,0.35)] ring-1 ring-[#17B8B8]';
  const badgeClass = activeTeamMeta
    ? activeTeamMeta.badgeClass
    : 'bg-[#17B8B8] text-black border-[#17B8B8]';
  const textHighlightClass = activeTeamMeta
    ? activeTeamMeta.textClass
    : 'text-[#17B8B8]';

  return (
    <div
      data-testid="active-turn-spotlight-banner"
      data-active-team={activeTeamId || 'INDIVIDUAL'}
      data-active-player={activePlayer?.name || ''}
      className={`relative border-2 ${borderColorClass} ${glowClass} bg-gradient-to-r from-[#07080d] via-[#0d111d] to-[#07080d] ${
        compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
      } flex flex-wrap items-center justify-between gap-2.5 shrink-0 transition-all duration-300 ${className}`}
    >
      {/* Left: Glowing Avatar + Player Name + Team & Role Badges */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`relative ${
            compact ? 'w-9 h-9 text-xl' : 'w-11 h-11 text-2xl'
          } border-2 ${borderColorClass} bg-black flex items-center justify-center shrink-0 shadow-lg`}
        >
          <span>{activePlayer?.avatar || '🎯'}</span>
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FFE600] border border-black animate-ping"
            aria-hidden="true"
          />
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FFE600] border border-black"
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 text-[10px] font-mono-code font-black uppercase tracking-wider border ${badgeClass} flex items-center gap-1 shrink-0`}
            >
              <Sparkles size={10} className="shrink-0" />
              <span>JOGADOR DA VEZ</span>
            </span>

            {isTeamGame && activeTeamId && (
              <span
                data-testid="active-turn-team-pill"
                className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase border ${borderColorClass} bg-black/80 ${textHighlightClass} shrink-0`}
              >
                {activeTeamMeta?.equipeLabel} • {activeTeamName}
              </span>
            )}

            <span className="px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase border border-white/15 bg-white/[0.04] text-[#FFE600] shrink-0">
              {roleBadge}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 mt-0.5">
            <span
              data-testid="active-turn-player-name"
              className={`font-anton ${
                compact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'
              } text-white uppercase tracking-wide leading-none truncate`}
            >
              {activePlayer ? activePlayer.name : activeTeamName || 'Mesa Pronta'}
            </span>
            <span className="text-[11px] font-mono-code text-slate-200 sm:truncate">
              — {actionInstruction}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Teammates / Secondary Player / Multi-Team Switcher / Rotate Player Button */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {isTeamGame && teammates.length > 0 && (
          <div
            data-testid="active-turn-teammates"
            className="hidden lg:flex items-center gap-1 px-2 py-1 border border-white/10 bg-black/50 text-[10px] font-mono-code text-slate-300"
          >
            <Users size={11} className={textHighlightClass} />
            <span className="text-slate-400 uppercase">Parceiros:</span>
            <span className="font-bold text-white truncate max-w-[180px]">
              {teammates.map((t) => `${t.avatar} ${t.name}`).join(', ')}
            </span>
          </div>
        )}

        {secondaryPlayer && secondaryRoleLabel && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 border border-rose-500/40 bg-rose-950/40 text-[10px] font-mono-code text-rose-200">
            <span className="font-bold uppercase">{secondaryRoleLabel}:</span>
            <span className="text-white font-bold">
              {secondaryPlayer.avatar} {secondaryPlayer.name}
            </span>
          </div>
        )}

        {nextInQueueLabel && !secondaryPlayer && (
          <div className="hidden xl:flex items-center gap-1 px-2 py-1 border border-white/10 bg-white/[0.02] text-[10px] font-mono-code text-slate-400">
            <ArrowRight size={11} className="text-slate-500" />
            <span>{nextInQueueLabel}</span>
          </div>
        )}

        {/* Quick Team Selector Pills when 3 or 4 teams are active and host wants to switch active team */}
        {isTeamGame && onSelectActiveTeam && activeTeamIds.length > 2 && (
          <div
            data-testid="active-turn-team-switcher"
            className="flex items-center gap-1 bg-black/60 p-0.5 border border-white/10"
          >
            {activeTeamIds.map((tid) => {
              const tMeta = TEAM_META[tid];
              const isCurrent = tid === activeTeamId;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    onSelectActiveTeam(tid);
                  }}
                  title={`Mudar vez para ${getTeamDisplayName(room, tid)}`}
                  className={`px-2 py-0.5 font-anton text-[10px] uppercase tracking-wider transition-all cursor-pointer border ${
                    isCurrent
                      ? tMeta.badgeClass
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tid} ({room.teams?.[tid]?.score ?? 0}pt)
                </button>
              );
            })}
          </div>
        )}

        {canRotatePlayer && onRotateActivePlayer && (
          <button
            type="button"
            data-testid="active-turn-rotate-player-btn"
            onClick={() => {
              sounds.playTick();
              onRotateActivePlayer();
            }}
            title="Passar a vez para o próximo jogador da equipe/mesa"
            className="px-2.5 py-1 border border-amber-400/70 bg-amber-950/60 hover:bg-amber-400 text-amber-200 hover:text-black font-mono-code text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Revezar Jogador</span>
          </button>
        )}
      </div>
    </div>
  );
};
