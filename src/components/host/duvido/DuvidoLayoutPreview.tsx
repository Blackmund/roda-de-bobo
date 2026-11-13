import React, { useState } from 'react';
import { WindowWrapper } from '../../WindowWrapper';
import { ScreenDuvido, type DuvidoLayoutVariant } from '../ScreenDuvido';
import { DEFAULT_GAME_CUSTOM_CONFIG, type DuvidoGameState, type GameRoom } from '../../../types/game';
import { generateThemeStrictFallbackRound } from '../../../utils/aiGameGenerator';

const INITIAL_PREVIEW_ROUND = {
  categoria_secreta: 'Sistemas operacionais de computadores lançados pela Microsoft',
  dica_arbitro:
    'Apenas versões principais do sistema operacional Windows ou seus predecessores diretos, ignorando edições de servidor como Windows Server ou atualizações incrementais.',
  exemplos_validos: [
    'MS-DOS',
    'Windows 1.0',
    'Windows 2.0',
    'Windows 3.0',
    'Windows 3.1',
    'Windows NT',
    'Windows 95',
    'Windows 98',
    'Windows ME',
    'Windows 2000',
    'Windows XP',
    'Windows Vista',
    'Windows 7',
    'Windows 8',
    'Windows 8.1',
    'Windows 10',
    'Windows 11',
    'Xenix'
  ],
  total_itens_possiveis: 22
};

function createInitialPreviewRoom(): GameRoom {
  const defaultPowerCards = { ligacao: true, troca: true, x2: true, menos1: true };
  const now = Date.now();
  const players = [
    { id: 'p1', name: 'Marcos Andre', avatar: '', color: '#E6194B', team: 'A' as const, isVip: true, score: 0, powerCards: defaultPowerCards, connected: true, lastActive: now },
    { id: 'p2', name: 'João Gabriel', avatar: '', color: '#E6194B', team: 'A' as const, isVip: false, score: 0, powerCards: defaultPowerCards, connected: true, lastActive: now },
    { id: 'p3', name: 'Débora', avatar: '', color: '#17B8B8', team: 'B' as const, isVip: false, score: 0, powerCards: defaultPowerCards, connected: true, lastActive: now },
    { id: 'p4', name: 'Lucas', avatar: '', color: '#17B8B8', team: 'B' as const, isVip: false, score: 0, powerCards: defaultPowerCards, connected: true, lastActive: now }
  ];

  return {
    roomId: 'TESTE',
    hostId: 'p1',
    connectionMode: 'local',
    screen: 'playing',
    activeGame: 'duvido',
    roundNumber: 1,
    maxRounds: 9,
    theme: 'Geral',
    difficulty: 'medio',
    timerConfig: 60,
    teams: {
      A: { id: 'A', name: 'Equipe Alfa', score: 0, members: ['p1', 'p2'] },
      B: { id: 'B', name: 'Equipe Bravo', score: 0, members: ['p3', 'p4'] }
    },
    players,
    sessionStats: {
      totalMatches: 0,
      victoriesA: 0,
      victoriesB: 0,
      totalPointsA: 0,
      totalPointsB: 0,
      history: []
    },
    lastUpdated: now,
    usedRoundSignatures: [INITIAL_PREVIEW_ROUND.categoria_secreta],
    customConfig: { ...DEFAULT_GAME_CUSTOM_CONFIG, ruleset: 'show' },
    duvido: {
      phase: 'AUCTION',
      roundData: INITIAL_PREVIEW_ROUND,
      blindfoldedPlayers: { A: 'p1', B: 'p3' },
      negotiators: { A: 'p1', B: 'p3' },
      blindfoldConfirmed: { A: true, B: true },
      currentBid: 0,
      currentBidTeam: null,
      teamBids: {},
      activeTurnTeam: 'A',
      timerSeconds: 60,
      timerActive: false,
      validCount: 0,
      challengedTeam: null,
      challengedPlayerId: null,
      resultWinnerTeam: null,
      resultReason: ''
    }
  };
}

export const DuvidoLayoutPreview: React.FC<{ initialVariant: DuvidoLayoutVariant }> = ({ initialVariant }) => {
  const [variant, setVariant] = useState<DuvidoLayoutVariant>(initialVariant);
  const [room, setRoom] = useState<GameRoom>(() => createInitialPreviewRoom());

  const handleUpdateDuvido = (updater: (prev: DuvidoGameState) => DuvidoGameState) => {
    setRoom((prev) => {
      if (!prev.duvido) return prev;
      return { ...prev, duvido: updater(prev.duvido) };
    });
  };

  const loadAnotherTheme = (awardWinner: boolean) => {
    setRoom((prev) => {
      const winner = awardWinner ? prev.duvido?.resultWinnerTeam : null;
      const nextTeams = { ...prev.teams };
      if (winner && nextTeams[winner]) {
        nextTeams[winner] = { ...nextTeams[winner], score: nextTeams[winner].score + 1 };
      }
      const exclude = [...(prev.usedRoundSignatures || [])];
      const fb = generateThemeStrictFallbackRound('duvido', 'Geral', 'Geral', prev.customConfig, exclude);
      const data = (fb.data as any) || INITIAL_PREVIEW_ROUND;
      const nextCategory = String(data.categoria_secreta || INITIAL_PREVIEW_ROUND.categoria_secreta);

      return {
        ...prev,
        roundNumber: awardWinner ? prev.roundNumber + 1 : prev.roundNumber,
        teams: nextTeams,
        usedRoundSignatures: [...exclude, nextCategory],
        duvido: {
          ...(prev.duvido as DuvidoGameState),
          phase: 'AUCTION',
          roundData: data,
          currentBid: 0,
          currentBidTeam: null,
          teamBids: {},
          lastBidDelta: undefined,
          activeTurnTeam: awardWinner ? (prev.roundNumber % 2 === 0 ? 'A' : 'B') : (prev.duvido?.activeTurnTeam || 'A'),
          validCount: 0,
          timerActive: false,
          timerSeconds: prev.timerConfig,
          challengedTeam: null,
          resultWinnerTeam: null,
          resultReason: ''
        }
      };
    });
  };

  return (
    <div className="h-[100dvh] w-full max-h-[100dvh] overflow-hidden flex flex-col justify-between select-none p-1 md:p-2 bg-retro-grid text-[#F5F2EB] theme-original theme-cazetv">
      <WindowWrapper
        title={`RODA DE BOBO — DUVIDO (VERSÃO ${variant.toUpperCase()})`}
        badge={`VERSÃO ${variant.toUpperCase()}`}
        className="flex-1 min-h-0"
        isTvMode={true}
        showBackButton={true}
        onBack={() => {
          window.location.href = '/';
        }}
        onClose={() => {
          window.location.href = '/';
        }}
        room={room}
        visualTheme="original"
      >
        <ScreenDuvido
          room={room}
          isTvMode={true}
          layoutVariant={variant}
          onSwitchPreviewLayout={(next) => {
            setVariant(next);
            window.history.replaceState(null, '', `/duvido-${next}`);
          }}
          onUpdateDuvidoState={handleUpdateDuvido}
          onRerollTheme={() => loadAnotherTheme(false)}
          onNextRound={() => loadAnotherTheme(true)}
        />
      </WindowWrapper>
    </div>
  );
};
