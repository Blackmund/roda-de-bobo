import React from 'react';
import { GameRoom, Player } from '../../../types/game';

interface NotaControllerProps {
  room: GameRoom;
  player: Player;
  wrapIfMultiMode: (...args: any[]) => any;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
  setHoldingSecret: React.Dispatch<React.SetStateAction<boolean>>;
  holdingSecret: boolean;
}

export const NotaController: React.FC<NotaControllerProps> = ({
  room,
  player,
  wrapIfMultiMode,
  renderMobileTurnSpotlightBanner,
  setHoldingSecret,
  holdingSecret
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'nota' && room.nota)) return null;

    const nota = room.nota;
    const isSpeaker = player.id === nota.speakerPlayerId;
    const scaleMin = nota.scaleMin ?? 1;
    const scaleMax = nota.scaleMax || 10;
    const isRevealPhase = nota.phase === 'STEP_4_REVEAL' || nota.phase === 'REVEAL';

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {isRevealPhase ? (
            nota.revealSubState === 'SPINNING' ? (
              <div className="border-2 border-cyan-400 bg-[#090b14] p-6 text-center space-y-3">
                <span className="text-4xl animate-spin block">🎰</span>
                <span className="font-anton text-lg text-cyan-300 uppercase block tracking-wider">
                  O PIÃO ESTÁ GIRANDO NO TELÃO!
                </span>
                <p className="text-xs font-mono-code text-slate-300">
                  Olhe para a TV: a nota secreta está sendo sorteada e revelada agora!
                </p>
              </div>
            ) : (
              <div className="border-2 border-[#FFE600] bg-[#0c0a16] p-6 text-center space-y-3 shadow-[0_0_20px_rgba(255,230,0,0.25)]">
                <span className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-wider block">
                  🎰 NOTA OFICIAL REVELADA NA TV
                </span>
                <div className="font-anton text-7xl text-[#FFE600] leading-none">
                  {nota.secretScore}
                </div>
                <p className="text-xs font-mono-code text-slate-300">
                  {isSpeaker
                    ? 'Acompanhe no telão os pontos ganhos por cada jogador que acertou!'
                    : `Quem acertou a nota ${nota.secretScore} na mesa leva +1 ponto!`}
                </p>
              </div>
            )
          ) : isSpeaker ? (
            <div className="border-2 border-purple-500 bg-[#0c0a16] p-6 text-center space-y-4">
              <span className="font-anton text-lg text-purple-300 uppercase">
                VOCÊ É O NARRADOR DA RODADA!
              </span>

              {/* Hold to view secret score */}
              <div
                onMouseDown={() => setHoldingSecret(true)}
                onMouseUp={() => setHoldingSecret(false)}
                onTouchStart={() => setHoldingSecret(true)}
                onTouchEnd={() => setHoldingSecret(false)}
                className="w-32 h-44 mx-auto border-2 border-purple-400 bg-purple-950 flex flex-col items-center justify-center cursor-pointer select-none shadow-md"
              >
                {holdingSecret ? (
                  <span className="font-anton text-7xl text-amber-300">{nota.secretScore}</span>
                ) : (
                  <div className="space-y-2 p-2">
                    <span className="text-3xl">👁️</span>
                    <p className="text-[11px] font-mono-code text-purple-200">
                      SEGURE PARA VER SUA NOTA ({scaleMin} A {scaleMax})
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs font-mono-code text-slate-300">
                Responda às perguntas na conversa ao vivo na intensidade da sua nota secreta!
              </p>
            </div>
          ) : (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-5 text-center space-y-3">
              <span className="text-sm font-anton text-cyan-300 uppercase tracking-wide block">
                JOGO DA NOTA ({scaleMin} A {scaleMax}) • INDIVIDUAL
              </span>
              <div className="text-xs font-mono-code text-amber-300 font-bold">
                SEUS PONTOS INDIVIDUAIS: {player.score} PTS
              </div>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                Acompanhe as etapas na TV, ouça as pistas do Narrador e dê o seu palpite individual em voz alta na roda!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
