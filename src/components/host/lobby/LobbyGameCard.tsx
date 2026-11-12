import React from 'react';
import { GameId, VisualTheme } from '../../../types/game';
import { isCazeFamily } from '../../../utils/themeUtils';
import { CazeArt } from '../../RodaIcons';
import { GAME_LIMITS } from '../../../config/gameLimits';
import { sounds } from '../../../utils/soundEffects';
import { Play } from 'lucide-react';

interface LobbyGameCardProps {
  game: { id: GameId; name: string; tagline: string; badge: string; color: string; renderArt: (className?: string) => React.ReactNode; };
  handleGameClick: (gameId: GameId) => void;
  setHoveredGame: React.Dispatch<React.SetStateAction<GameId | null>>;
  visualTheme: VisualTheme;
}

export const LobbyGameCard: React.FC<LobbyGameCardProps> = ({
  game,
  handleGameClick,
  setHoveredGame,
  visualTheme
}) => {
  return (
              <div
                key={game.id}
                data-testid={`lobby-game-card-${game.id}`}
                onClick={() => handleGameClick(game.id)}
                onMouseEnter={() => {
                  setHoveredGame(game.id);
                  sounds.playTick();
                }}
                onMouseLeave={() => setHoveredGame(null)}
                className={`group relative cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isCazeFamily(visualTheme) ? '' : '[@media(max-height:700px)]:flex-row [@media(max-height:700px)]:items-center [@media(max-height:700px)]:justify-between [@media(max-height:700px)]:px-4'
                } min-h-0 ${
                  visualTheme === 'original'
                  ? 'bg-[#0a0b1e] border-2 border-[#17B8B8] hover:border-[#E6194B] shadow-none rounded-none'
                  : visualTheme === 'cazetv'
                    ? 'bg-[#080b16] border-2 border-[#17B8B8] hover:border-[#E6194B] shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                    : visualTheme === 'neon'
                    ? 'bg-slate-950/90 border-2 border-cyan-500/40 hover:border-[#E6194B] hover:shadow-[0_0_24px_rgba(230,25,75,0.45)] shadow-lg'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#E6194B]'
                }`}
              >
                {/* Priority #3: Discrete Category Tag in Top-Right Corner */}
                <div
                  className="absolute top-2 right-2 text-[10px] [@media(max-height:700px)]:text-[9px] [@media(max-height:700px)]:top-1.5 [@media(max-height:700px)]:right-2 px-2.5 py-0.5 font-mono-code font-bold uppercase tracking-wider z-10 pointer-events-none bg-[#E6194B] text-white border border-rose-400/40 shadow-sm"
                >
                  {game.badge}
                </div>

                {/* Vertical Layout (Default when viewport height > 700px) */}
                <div className={`flex flex-col justify-between w-full h-full min-h-0 ${isCazeFamily(visualTheme) ? '' : '[@media(max-height:700px)]:hidden'}`}>
                  {/* Priority #2: Illustration / Icon Area */}
                  {isCazeFamily(visualTheme) ? (
                    /* Modo CazéTV / Original: Ilustração em SVG vetorial animado com 2 layouts responsivos (compact / wide) */
                    <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-end relative overflow-hidden pt-1 px-1 pb-0">
                      <div className="flex-1 w-full min-h-0 flex items-end justify-center overflow-hidden">
                        <CazeArt
                          gameId={game.id}
                          mode="card"
                          className="w-full h-full max-h-full max-w-full select-none pointer-events-none"
                          fallback={game.renderArt('w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain')}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Outros Modos (Neon, Clean, etc.): Ícone centralizado na área disponível */
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      <div className="flex-1 min-h-0 flex items-center justify-center max-h-full max-w-full overflow-hidden">
                        {game.renderArt(
                          'w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 max-h-full max-w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow'
                        )}
                      </div>
                    </div>
                  )}

                  {/* Priority #1: Bottom Title Bar com animação de troca no Hover pelo Subtítulo/Legenda */}
                  <div
                    className={`shrink-0 w-full py-2.5 [@media(max-height:700px)]:py-1.5 px-3 border-t-2 transition-colors duration-200 z-10 flex items-center justify-between gap-2 overflow-hidden ${
                      visualTheme === 'original'
                      ? 'bg-[#0a0b1e] border-[#17B8B8] group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                      : visualTheme === 'cazetv'
                        ? 'bg-[#0c1020] border-[#17B8B8] group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                        : 'bg-slate-950/95 border-cyan-400 group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                    }`}
                  >
                    <div className="relative flex-1 h-7 overflow-hidden flex items-center justify-center">
                      {/* Nome do Jogo (sobe e sai no hover) */}
                      <span
                        className={`absolute inset-0 flex items-center justify-center font-anton font-black uppercase tracking-wider text-sm md:text-base lg:text-lg text-center truncate transition-all duration-300 transform group-hover:-translate-y-full group-hover:opacity-0 ${
                          visualTheme === 'original' ? 'text-[#17B8B8]' : 'text-[#F5F2EB]'
                        }`}
                      >
                        {game.name}
                      </span>
                      {/* Legenda do Jogo (sobe e entra no hover substituindo o nome) */}
                      <span
                        className="absolute inset-0 flex items-center justify-center font-anton font-bold uppercase tracking-wide text-xs md:text-sm text-white text-center px-1 line-clamp-1 transition-all duration-300 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                        title={game.tagline}
                      >
                        {game.tagline}
                      </span>
                    </div>
                    {/* UX-03: intervalo de jogadores do jogo (GAME_LIMITS) */}
                    {!game.badge.toUpperCase().includes('JOGADORES') && GAME_LIMITS[game.id as keyof typeof GAME_LIMITS] && (
                      <span
                        data-testid={`game-players-range-${game.id}`}
                        className="shrink-0 text-[10px] font-mono-code font-bold text-slate-300 group-hover:text-white/90 whitespace-nowrap"
                        title="Quantidade de jogadores"
                      >
                        👥 {GAME_LIMITS[game.id as keyof typeof GAME_LIMITS].min}–{GAME_LIMITS[game.id as keyof typeof GAME_LIMITS].max}
                      </span>
                    )}
                    <Play
                      size={14}
                      className="text-cyan-300 fill-cyan-300 group-hover:text-white group-hover:fill-white shrink-0 transition-colors"
                    />
                  </div>
                </div>

                {/* Automatic Horizontal Compact Layout for Short Screens (@media (max-height: 700px)) */}
                <div className={`hidden ${isCazeFamily(visualTheme) ? '' : '[@media(max-height:700px)]:flex'} flex-row items-center justify-between w-full h-full py-2 gap-3 min-h-0`}>
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden">
                    {isCazeFamily(visualTheme) ? (
                      <CazeArt
                        gameId={game.id}
                        mode="icon"
                        className="w-14 h-14 max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        fallback={game.renderArt('w-12 h-12 object-contain')}
                      />
                    ) : (
                      game.renderArt(
                        'w-12 h-12 max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
                      )
                    )}
                  </div>
                  <div className="relative text-left flex-1 min-w-0 ml-2 pr-2 h-10 overflow-hidden flex flex-col justify-center">
                    {/* Nome (sobe no hover) */}
                    <div className="font-anton font-black uppercase tracking-wider text-sm md:text-base text-cyan-300 group-hover:text-white truncate transition-all duration-300 group-hover:-translate-y-6 group-hover:opacity-0">
                      {game.name}
                    </div>
                    {/* Legenda (sobe para o lugar do nome no hover) */}
                    <div className="absolute inset-0 flex items-center font-anton font-bold text-xs uppercase text-white truncate transition-all duration-300 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                      {game.tagline}
                    </div>
                  </div>
                  <Play
                    size={16}
                    className="text-cyan-300 fill-cyan-300 group-hover:text-[#E6194B] group-hover:fill-[#E6194B] group-hover:scale-110 shrink-0 transition-all"
                  />
                </div>
              </div>
            );
};
