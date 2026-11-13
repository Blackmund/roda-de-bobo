import type { GenerateRoundResponse } from '../utils/aiGameGenerator';
import type { GameRoom } from '../types/game';
import { GameId, GameCustomConfig, DEFAULT_GAME_CUSTOM_CONFIG, LimiteGameState, DuvidoGameState, ProibidoGameState, MimicaGameState, QuemSouEuGameState, MegaResenhaGameState, RepetenteGameState, RespostasSemPerguntasState, EstadiosGameState, ComTerraState, ComoEuPintoState, NotaGameState, TemOuNaoTemGameState, PerguntasEVerdadesGameState, TeamId, Player } from '../types/game';
import { getActiveTeamIds, getTeamCount, getNextTeamId, normalizePlayersToTeamCount } from '../utils/teamUtils';
import { normalizeTemVotesTo100 } from '../utils/aiGameGenerator';
import { buildMimicaState, pickMimicaPair } from '../utils/mimicaEngine';
import { buildQuemSouEuState, drawIdentities } from '../utils/quemSouEuEngine';
import { drawMoments, normalizeMomentKey } from '../data/ondeEstouMoments';
import { buildMegaResenhaState } from '../utils/megaResenhaEngine';
import { buildRepetenteGroups, buildRepetenteState } from '../utils/repetenteEngine';
import { buildRespostasState } from '../utils/respostasEngine';
import { buildEstadiosState } from '../utils/estadiosEngine';
import { buildComTerraState } from '../utils/comTerraEngine';
import { buildComoEuPintoState, pickPintoPair } from '../utils/comoEuPintoEngine';
import { drawEstadio, normalizeEstadioKey } from '../data/estadiosBank';
import { drawRespostaQuestion, normalizeRespostaKey } from '../data/respostasSemPerguntas';
import { drawRepetenteTheme, normalizeThemeKey } from '../data/repetenteThemes';
import { normalizeIdentity, type QuemSouEuIdentity } from '../data/quemSouEuIdentities';
import { drawLimitePowerCardsForPlayers } from '../components/host/ScreenLimite';
import { drawRandomScoreCSPRNG } from '../components/SpinningNumberWheel';
import { limiteExactBonusFor } from '../config/rulesets';

interface buildStartedRoundUpdaterDeps {
  customTimer: number | undefined;
  customMaxRounds: number | undefined;
  customConfigOverride: GameCustomConfig | undefined;
  gameId: GameId;
  data: any;
  currentUserId: string;
  effectiveTheme: string;
  generated: GenerateRoundResponse<unknown>;
  customTheme: string;
}

export const buildStartedRoundUpdater = ({
  customTimer,
  customMaxRounds,
  customConfigOverride,
  gameId,
  data,
  currentUserId,
  effectiveTheme,
  generated,
  customTheme
}: buildStartedRoundUpdaterDeps): ((prev: GameRoom) => GameRoom) =>
(prev) => {
        const effectiveTimer = customTimer ?? prev.timerConfig;
        const effectiveMaxRounds = customMaxRounds ?? prev.maxRounds;
        const mergedCustomConfig: GameCustomConfig = {
          ...DEFAULT_GAME_CUSTOM_CONFIG,
          ...(prev.customConfig || {}),
          ...(customConfigOverride || {})
        };

        let limiteState: LimiteGameState | undefined = undefined;
        let duvidoState: DuvidoGameState | undefined = undefined;
        let proibidoState: ProibidoGameState | undefined = undefined;
        let mimicaState: MimicaGameState | undefined = undefined;
        let quemSouEuState: QuemSouEuGameState | undefined = undefined;
        let megaResenhaState: MegaResenhaGameState | undefined = undefined;
        let repetenteState: RepetenteGameState | undefined = undefined;
        let respostasState: RespostasSemPerguntasState | undefined = undefined;
        let estadiosState: EstadiosGameState | undefined = undefined;
        let comTerraState: ComTerraState | undefined = undefined;
        let pintoState: ComoEuPintoState | undefined = undefined;
        let extraSignature = '';
        let notaState: NotaGameState | undefined = undefined;
        let temOuNaoTemState: TemOuNaoTemGameState | undefined = undefined;
        let perguntasEVerdadesState: PerguntasEVerdadesGameState | undefined = undefined;

        const effectiveTeamCount = getTeamCount(prev, mergedCustomConfig.teamCount);
        const activeTeamIds = getActiveTeamIds(prev, effectiveTeamCount);
        const startingTeam: TeamId =
          activeTeamIds[(Math.max(1, prev.roundNumber) - 1) % activeTeamIds.length] || 'A';
        const opposingTeam: TeamId = getNextTeamId(startingTeam, activeTeamIds);

        let nextMatchPlayers =
          prev.roundNumber === 1
            ? prev.players.map((p) => ({
                ...p,
                score: 0,
                roundsPlayed: 0,
                roundsWon: 0,
                accuracy: 0
              }))
            : prev.players;

        // Ensure player team assignments respect the clamped team count (2 players = Team A vs Team B)
        if (nextMatchPlayers.length <= 2) {
          if (nextMatchPlayers[0] && nextMatchPlayers[0].team !== 'A') {
            nextMatchPlayers[0] = { ...nextMatchPlayers[0], team: 'A' };
          }
          if (nextMatchPlayers[1] && nextMatchPlayers[1].team !== 'B') {
            nextMatchPlayers[1] = { ...nextMatchPlayers[1], team: 'B' };
          }
        } else {
          nextMatchPlayers = normalizePlayersToTeamCount(nextMatchPlayers, effectiveTeamCount);
        }

        if (gameId === 'limite') {
          const shouldDrawNewPowerCards =
            prev.roundNumber === 1 ||
            !prev.limite?.assignedPowerCards ||
            Object.keys(prev.limite.assignedPowerCards).length === 0;
          const drawnCards = shouldDrawNewPowerCards
            ? drawLimitePowerCardsForPlayers(nextMatchPlayers)
            : null;
          if (drawnCards) {
            nextMatchPlayers = drawnCards.updatedPlayers;
          }
          const defaultPlayMode =
            prev.connectionMode === 'host' || prev.connectionMode === 'multi' ? 'digital' : 'mesa';

          limiteState = {
            phase: 'SECRET_GUESS',
            playMode: prev.limite?.playMode || mergedCustomConfig.limitePlayMode || defaultPlayMode,
            assignedPowerCards:
              drawnCards?.assignedPowerCards || prev.limite?.assignedPowerCards || {},
            usedPowerCardsByPlayer:
              drawnCards?.usedPowerCardsByPlayer || prev.limite?.usedPowerCardsByPlayer || {},
            roundData: data,
            guesses: {},
            submittedPlayers: [],
            powerCardsPlayed: {},
            callTimerRemaining: 0,
            timerActive: effectiveTimer > 0,
            timerSeconds: effectiveTimer,
            revealedOrder: false,
            winners: [],
            bustedPlayers: [],
            closestDifference: 0,
            pointsAwarded: {},
            revealCountdown: null,
            exactBonus: limiteExactBonusFor(mergedCustomConfig)
          };
        } else if (gameId === 'duvido') {
          const teamAPlayers = prev.players.filter((p) => p.team === 'A');
          const teamBPlayers = prev.players.filter((p) => p.team === 'B');
          const teamCPlayers = prev.players.filter((p) => p.team === 'C');
          const teamDPlayers = prev.players.filter((p) => p.team === 'D');
          const maxExamples = mergedCustomConfig.duvidoExamplesCount || 16;

          duvidoState = {
            phase: 'AUCTION',
            roundData: {
              ...data,
              exemplos_validos: Array.isArray(data?.exemplos_validos)
                ? data.exemplos_validos.slice(0, maxExamples)
                : []
            },
            blindfoldedPlayers: {
              A: teamAPlayers[1]?.id || teamAPlayers[0]?.id || 'p-blind-a',
              B: teamBPlayers[1]?.id || teamBPlayers[0]?.id || 'p-blind-b',
              C: teamCPlayers[1]?.id || teamCPlayers[0]?.id || 'p-blind-c',
              D: teamDPlayers[1]?.id || teamDPlayers[0]?.id || 'p-blind-d'
            },
            negotiators: {
              A: teamAPlayers[0]?.id || 'p-neg-a',
              B: teamBPlayers[0]?.id || 'p-neg-b',
              C: teamCPlayers[0]?.id || 'p-neg-c',
              D: teamDPlayers[0]?.id || 'p-neg-d'
            },
            blindfoldConfirmed: { A: true, B: true, C: true, D: true },
            currentBid: 0,
            currentBidTeam: null,
            activeTurnTeam: startingTeam,
            timerSeconds: effectiveTimer,
            timerActive: false,
            validCount: 0,
            challengedTeam: null,
            challengedPlayerId: null,
            resultWinnerTeam: null,
            resultReason: ''
          };
        } else if (gameId === 'proibido') {
          const rawCards = Array.isArray(data) ? data : [data];
          const targetCardsCount = mergedCustomConfig.proibidoCardsCount || 5;
          const targetForbiddenCount = mergedCustomConfig.proibidoForbiddenCount || 5;
          const cards = rawCards.slice(0, targetCardsCount).map((c: any) => ({
            ...c,
            palavras_proibidas: Array.isArray(c.palavras_proibidas)
              ? c.palavras_proibidas.slice(0, targetForbiddenCount)
              : []
          }));

          const is2PlayerMode = prev.players.length === 2;
          let speakerMember: Player | undefined;
          let guesserMember: Player | undefined;
          let refereeMember: Player | undefined;
          let resolvedSpeakerTeam = startingTeam;
          let resolvedRefereeTeam = opposingTeam;

          if (is2PlayerMode) {
            // 2-player cooperative mode: alternate speaker and guesser roles each round
            const roundIdx = Math.max(1, prev.roundNumber) - 1;
            const spkIdx = roundIdx % 2;
            const gsrIdx = (roundIdx + 1) % 2;
            speakerMember = prev.players[spkIdx];
            guesserMember = prev.players[gsrIdx];
            resolvedSpeakerTeam = speakerMember?.team || 'A';
            resolvedRefereeTeam = guesserMember?.team || 'B';
            refereeMember = undefined;
          } else {
            const speakerTeamPlayers = prev.players.filter((p) => p.team === startingTeam);
            const teamRoundTurn = Math.floor((Math.max(1, prev.roundNumber) - 1) / activeTeamIds.length);
            speakerMember =
              speakerTeamPlayers.length > 0
                ? speakerTeamPlayers[teamRoundTurn % speakerTeamPlayers.length]
                : prev.players[0];
            const otherTeamPlayers = speakerTeamPlayers.filter((p) => p.id !== speakerMember?.id);
            guesserMember =
              otherTeamPlayers.length > 0
                ? otherTeamPlayers[0]
                : prev.players.find((p) => p.id !== speakerMember?.id);
            const refereeTeamPlayers = prev.players.filter((p) => p.team === opposingTeam);
            refereeMember = refereeTeamPlayers[0];
          }

          proibidoState = {
            phase: 'READY',
            cards,
            currentCardIndex: 0,
            pendingQueue: cards.map((_: any, idx: number) => idx),
            speakerTeam: resolvedSpeakerTeam,
            speakerPlayerId: speakerMember?.id || prev.players[0]?.id || '',
            guesserPlayerId: guesserMember?.id || prev.players[1]?.id || '',
            refereeTeam: resolvedRefereeTeam,
            refereePlayerId: refereeMember?.id,
            timerSeconds: effectiveTimer,
            timerActive: false,
            roundScore: 0,
            cardOutcomes: new Array(cards.length).fill('pending'),
            antiSpoilerMode: 'guesser-back-to-tv',
            tvWordsHidden: false,
            is2PlayerMode
          };
        } else if (gameId === 'nota') {
          const speakerIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, prev.players.length);
          const speaker = prev.players[speakerIdx] || prev.players[0];
          const scaleMin = mergedCustomConfig.notaScaleMin ?? 1;
          const scaleMax = Math.max(scaleMin + 1, mergedCustomConfig.notaScaleMax || 10);
          notaState = {
            phase: 'STEP_1_DRAW',
            drawSubState: 'BLINDFOLD_WARNING',
            revealSubState: 'SPINNING',
            roundData: data,
            speakerPlayerId: speaker?.id || currentUserId,
            secretScore: drawRandomScoreCSPRNG(scaleMin, scaleMax),
            scaleMin,
            scaleMax,
            selectedCorrectPlayerIds: [],
            allowCloseVote: Boolean(mergedCustomConfig.notaAllowCloseVote),
            votes: {},
            pointsAwarded: {},
            correctVoters: []
          };
        } else if (gameId === 'tem-ou-nao-tem') {
          const targetTemCount = Math.min(
            10,
            Math.max(3, Number(mergedCustomConfig.temItemsCount) || 5)
          );
          const rawSource =
            Array.isArray(data?.rawRespostas) &&
            data.rawRespostas.length >= (data?.respostas?.length || 0)
              ? data.rawRespostas
              : data?.respostas || [];
          const normalizedRespostas = normalizeTemVotesTo100(
            rawSource,
            targetTemCount,
            undefined,
            effectiveTheme
          );
          const items = normalizedRespostas.map((r: any) => ({
            texto: r.texto,
            sinonimos_aceitos: r.sinonimos_aceitos || [],
            votos: r.votos,
            revealed: false
          }));

          temOuNaoTemState = {
            phase: 'GUESSING',
            roundData: {
              ...data,
              respostas: normalizedRespostas
            },
            items,
            activeTeam: startingTeam,
            turnStepIndex: 0,
            strikes: { A: 0, B: 0, C: 0, D: 0 },
            maxStrikes: mergedCustomConfig.temMaxStrikes || 2,
            eliminatedTeams: [],
            freeDomainTeam: null,
            roundScore: { A: 0, B: 0, C: 0, D: 0 }
          };
        } else if (gameId === 'perguntas-e-verdades') {
          const maxTablePlayers = Math.min(6, Math.max(2, mergedCustomConfig.pvMaxPlayers || 6));
          const activePlayers = prev.players.slice(0, maxTablePlayers);
          const deckMode = mergedCustomConfig.pvDeckMode || 'assisted';
          const deckStyle = mergedCustomConfig.pvDeckStyle || 'padrao';
          const tokens: Record<string, number> = {};
          const tokenAlertLight: Record<string, boolean> = {};
          const playerHands: PerguntasEVerdadesGameState['playerHands'] = {};
          const handReady: Record<string, boolean> = {};
          const revealedCards: Record<string, boolean[]> = {};
          const roundWinsByPlayer: Record<string, number> = {};

          activePlayers.forEach((p) => {
            tokens[p.id] = 10;
            tokenAlertLight[p.id] = false;
            playerHands[p.id] = [];
            handReady[p.id] = deckMode === 'physical';
            revealedCards[p.id] = new Array(8).fill(false);
            roundWinsByPlayer[p.id] = 0;
          });

          const firstPlayerId = activePlayers[0]?.id || null;
          const secondPlayerId = activePlayers[1]?.id || activePlayers[0]?.id || null;
          const turnTimerCfg = mergedCustomConfig.pvTurnTimerSeconds ?? 300;
          const tokenTimerCfg = mergedCustomConfig.pvTokenTimerSeconds ?? 30;
          const initialPhase = deckMode === 'assisted' ? 'DECK_SETUP' : 'TOKEN_AUCTION';
          const initialTimer = initialPhase === 'TOKEN_AUCTION' ? tokenTimerCfg : turnTimerCfg;

          perguntasEVerdadesState = {
            phase: initialPhase,
            deckMode,
            deckStyle,
            auctionRound: 1,
            activeTurnPlayerId: firstPlayerId,
            targetOpponentId: secondPlayerId,
            auctionWinnerId: firstPlayerId,
            auctionWinningBid: 0,
            auctionTieMessage: null,
            tokens,
            tokenAlertLight,
            currentBids: {},
            bidSubmitted: {},
            playerHands,
            handReady,
            revealedCards,
            selectedQuestionNumber: 1,
            selectedPositionsQ1: [1, 3, 6],
            selectedValueQ7: 7,
            selectedSuitQ8: 'spades',
            questionHistory: [],
            truthGuessValues: [0, 0, 0, 0, 0, 0, 0, 0],
            savedTruthSlotsByTarget: {},
            lastTruthAttemptMessage: null,
            tokenTimerConfig: tokenTimerCfg,
            turnTimerConfig: turnTimerCfg,
            timerSeconds: initialTimer,
            timerActive: initialPhase !== 'DECK_SETUP' && initialTimer > 0,
            winnerPlayerId: null,
            winReason: null,
            setupPlayerIndex: 0,
            matchRoundNumber: 1,
            totalMatchRounds: effectiveMaxRounds || 1,
            roundWinsByPlayer,
            roundWinBannerMessage: null
          };
        }

        if (gameId === 'mimica') {
          // NOV-01: mimico e parceiro revezam dentro da equipe que joga a rodada.
          const words = (Array.isArray(data) ? data : []).map((x: unknown) => String(x));
          const pair = pickMimicaPair(nextMatchPlayers, startingTeam, prev.roundNumber, activeTeamIds.length);
          mimicaState = buildMimicaState({
            words,
            mimeTeam: startingTeam,
            mimePlayerId: pair.mimePlayerId,
            guesserPlayerId: pair.guesserPlayerId,
            timerSeconds: effectiveTimer,
            roundNumber: prev.roundNumber,
            config: mergedCustomConfig
          });
        }

        if (gameId === 'como-eu-pinto') {
          // NOV-07: quem desenha e quem adivinha revezam dentro da equipe; a rival (so com 3+ jogadores) rouba no fim.
          const words = (Array.isArray(data) ? data : []).map((x: unknown) => String(x));
          const pair = pickPintoPair(nextMatchPlayers, startingTeam, prev.roundNumber, activeTeamIds.length);
          pintoState = buildComoEuPintoState({
            words,
            drawTeam: startingTeam,
            rivalTeam: nextMatchPlayers.length > 2 ? opposingTeam : undefined,
            drawerPlayerId: pair.drawerPlayerId,
            guesserPlayerId: pair.guesserPlayerId,
            timerSeconds: effectiveTimer
          });
        }

        if (gameId === 'com-terra') {
          // A partida inteira corre dentro do estado do jogo; "Rodadas" do setup vira o numero de rodadas internas.
          comTerraState = buildComTerraState(mergedCustomConfig.ctMode || 'arquiteto', nextMatchPlayers, effectiveMaxRounds);
        }

        if (gameId === 'estadios') {
          // NOV-06: um estadio por rodada (sem repetir na sessao); quem comeca roda a cada rodada.
          const usedStadiums = new Set<string>();
          (prev.usedRoundSignatures || []).forEach((sig) => {
            if (typeof sig === 'string' && sig.startsWith('est:')) usedStadiums.add(normalizeEstadioKey(sig.slice(4)));
          });
          const picked = drawEstadio(usedStadiums);
          const firstIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, nextMatchPlayers.length);
          estadiosState = buildEstadiosState(picked, nextMatchPlayers, firstIdx);
          extraSignature = 'est:' + picked.nome;
        }

        if (gameId === 'respostas-sem-perguntas') {
          // NOV-08: uma pergunta oculta por rodada (sem repetir na sessao); quem comeca roda a cada rodada.
          const usedQuestions = new Set<string>();
          (prev.usedRoundSignatures || []).forEach((sig) => {
            if (typeof sig === 'string' && sig.startsWith('rsp:')) usedQuestions.add(normalizeRespostaKey(sig.slice(4)));
          });
          const picked = drawRespostaQuestion(usedQuestions);
          const firstIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, nextMatchPlayers.length);
          respostasState = buildRespostasState(picked, nextMatchPlayers, firstIdx);
          extraSignature = 'rsp:' + picked.pergunta;
        }

        if (gameId === 'repetente') {
          // NOV-05: um tema por rodada (sem repetir na sessao); as duplas saem das equipes.
          const usedThemes = new Set<string>();
          (prev.usedRoundSignatures || []).forEach((sig) => {
            if (typeof sig === 'string' && sig.startsWith('rep:')) usedThemes.add(normalizeThemeKey(sig.slice(4)));
          });
          const picked = drawRepetenteTheme(usedThemes);
          repetenteState = buildRepetenteState({
            theme: picked.tema,
            category: picked.categoria,
            groups: buildRepetenteGroups(nextMatchPlayers, activeTeamIds),
            timerSeconds: effectiveTimer
          });
          extraSignature = 'rep:' + picked.tema;
        }

        if (gameId === 'mega-resenha') {
          // NOV-03: quem da as dicas e quem chuta revezam dentro da equipe que joga a rodada.
          const words = (Array.isArray(data) ? data : []).map((x: unknown) => String(x));
          const pair = pickMimicaPair(nextMatchPlayers, startingTeam, prev.roundNumber, activeTeamIds.length);
          megaResenhaState = buildMegaResenhaState({
            words,
            team: startingTeam,
            giverPlayerId: pair.mimePlayerId,
            guesserPlayerId: pair.guesserPlayerId,
            timerSeconds: effectiveTimer
          });
        }

        if (gameId === 'onde-estou') {
          // NOV-06: um grande momento por jogador, sem repetir os ja usados na sessao (mesma dinamica do Quem sou eu).
          const usedMoments = new Set<string>();
          (prev.usedRoundSignatures || []).forEach((sig) => {
            if (typeof sig === 'string' && sig.startsWith('oe:')) {
              sig.slice(3).split('|').forEach((n) => usedMoments.add(normalizeMomentKey(n)));
            }
          });
          // Momentos da IA (com foto) entram primeiro; o banco completa o que faltar.
          const aiMoments: QuemSouEuIdentity[] = (Array.isArray(data?.moments) ? data.moments : [])
            .filter((x: any) => x && typeof x.nome === 'string' && !usedMoments.has(normalizeMomentKey(x.nome)))
            .map((x: any) => ({ nome: x.nome, categoria: x.categoria || 'Momentos', imagem: x.imagem || undefined }));
          const need = nextMatchPlayers.length;
          const fromAi = aiMoments.slice(0, need);
          const moments = fromAi.length >= need
            ? fromAi
            : [...fromAi, ...drawMoments(need - fromAi.length, new Set([...usedMoments, ...fromAi.map((x) => normalizeMomentKey(x.nome))]))];
          const firstIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, nextMatchPlayers.length);
          quemSouEuState = buildQuemSouEuState(nextMatchPlayers, moments, firstIdx);
          extraSignature = 'oe:' + moments.map((i) => i.nome).join('|');
        }

        if (gameId === 'quem-sou-eu') {
          // NOV-02: uma identidade por jogador, sem repetir as ja usadas na sessao; quem comeca roda a cada rodada.
          const usedIdentities = new Set<string>();
          (prev.usedRoundSignatures || []).forEach((sig) => {
            if (typeof sig === 'string' && sig.startsWith('qse:')) {
              sig.slice(4).split('|').forEach((n) => usedIdentities.add(normalizeIdentity(n)));
            }
          });
          const identities = drawIdentities(nextMatchPlayers.length, usedIdentities);
          const firstIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, nextMatchPlayers.length);
          quemSouEuState = buildQuemSouEuState(nextMatchPlayers, identities, firstIdx);
          extraSignature = 'qse:' + identities.map((i) => i.nome).join('|');
        }

        const updatedSignatures = generated.signature
          ? Array.from(new Set([...(prev.usedRoundSignatures || []), generated.signature]))
          : prev.usedRoundSignatures || [];

        return {
          ...prev,
          screen: 'playing',
          activeGame: gameId,
          players: nextMatchPlayers,
          theme: customTheme || prev.theme,
          themeByGame: customTheme ? { ...(prev.themeByGame || {}), [gameId]: customTheme } : prev.themeByGame,
          activeSubtheme: generated.subthemeUsed || prev.activeSubtheme || '',
          usedRoundSignatures: extraSignature ? [...updatedSignatures, extraSignature] : updatedSignatures,
          roundSource: generated.source,
          customConfig: {
            ...mergedCustomConfig,
            teamCount: effectiveTeamCount
          },
          teamCount: effectiveTeamCount,
          timerConfig: effectiveTimer,
          maxRounds: effectiveMaxRounds,
          roundLog: prev.roundNumber === 1 ? [] : prev.roundLog || [],
          limite: limiteState,
          duvido: duvidoState,
          proibido: proibidoState,
          mimica: mimicaState,
          quemSouEu: quemSouEuState,
          megaResenha: megaResenhaState,
          repetente: repetenteState,
          respostasSemPerguntas: respostasState,
          estadios: estadiosState,
          comTerra: comTerraState,
          comoEuPinto: pintoState,
          nota: notaState,
          temOuNaoTem: temOuNaoTemState,
          perguntasEVerdades: perguntasEVerdadesState
        };
      };
