/**
 * Core Game Engine Types & State Machine Models
 * "Roda de Bobo" Party Games Edition
 */

export type GameId =
  | 'limite'
  | 'duvido'
  | 'proibido'
  | 'nota'
  | 'tem-ou-nao-tem'
  | 'perguntas-e-verdades'
  | 'mimica'
  | 'quem-sou-eu'
  | 'mega-resenha'
  | 'repetente'
  | 'respostas-sem-perguntas';

export type TeamId = 'A' | 'B' | 'C' | 'D';

export type ScreenState = 
  | 'mode-select'
  | 'lobby'
  | 'game-setup'
  | 'rules'
  | 'playing'
  | 'round-summary'
  | 'game-over';

export type VisualTheme = 'neon' | 'clean' | 'cazetv' | 'original';

export type ConnectionMode = 'local' | 'host' | 'multi';

export type GameDifficulty = 'facil' | 'medio' | 'dificil' | 'impossivel';

export type LimitePowerCardType = 'ligacao' | 'troca' | 'x2' | 'menos1';

export interface PowerCardsState {
  ligacao: boolean; // 30s call
  troca: boolean;   // Swap guesses with another player
  x2: boolean;      // 2 points if win
  menos1: boolean;  // Worst guess loses 1 pt
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  team: TeamId;
  isVip: boolean;
  score: number;
  roundsPlayed?: number;
  roundsWon?: number;
  accuracy?: number;
  isFixedPlayer?: boolean;
  fixedPlayerId?: string;
  powerCards: PowerCardsState;
  assignedPowerCard?: LimitePowerCardType;
  powerCardUsed?: boolean;
  connected: boolean;
  lastActive: number;
  deviceClientId?: string;
  isMobile?: boolean;
  connectionType?: 'tv-local' | 'mobile' | 'master';
  isMasterControl?: boolean;
  lastPingAt?: number;
  lastBuzzAt?: number;
}

export interface Team {
  id: TeamId;
  name: string;
  color?: string;
  score: number;
  members: string[]; // player ids
}

// 1. JOGO DO LIMITE
export type LimiteCategory =
  | 'Filmes'
  | 'Esportes'
  | 'Cultura Pop'
  | 'Geral'
  | 'Música'
  | 'História';

export interface LimiteRoundData {
  pergunta: string;
  valor_exato: number;
  unidade: string;
  curiosidade_explicacao: string;
  category?: LimiteCategory;
}

export interface LimiteGameState {
  phase: 'QUESTION' | 'SECRET_GUESS' | 'CALL_TIMEOUT' | 'REVEAL' | 'SCORING';
  playMode?: 'mesa' | 'digital';
  activePowerCard?: LimitePowerCardType | null;
  assignedPowerCards?: Record<string, LimitePowerCardType>;
  usedPowerCardsByPlayer?: Record<string, boolean>;
  roundData: LimiteRoundData;
  guesses: Record<string, number>; // playerId -> number
  submittedPlayers: string[];
  powerCardsPlayed: Record<string, LimitePowerCardType>;
  swapTarget?: { player1: string; player2: string };
  callTimerRemaining: number;
  timerActive: boolean;
  timerSeconds: number;
  revealedOrder: boolean;
  winners: string[];
  bustedPlayers: string[];
  closestDifference: number;
  pointsAwarded: Record<string, number>;
  revealCountdown?: number | null;
  /** Pontos de quem crava o número exato (regra da casa = 2; modo programa = 0). */
  exactBonus?: number;
}

// 2. JOGO DO DUVIDO
export interface DuvidoRoundData {
  id?: string;
  tema_macro?: string;
  categoria_secreta: string;
  total_itens_possiveis: number;
  dica_arbitro?: string;
  exemplos_validos: string[];
}

export interface DuvidoGameState {
  phase: 'BLINDFOLD' | 'SECRET_CATEGORY' | 'AUCTION' | 'EXECUTION' | 'RESULT';
  roundData: DuvidoRoundData;
  blindfoldedPlayers: { A: string; B: string; C?: string; D?: string };
  negotiators: { A: string; B: string; C?: string; D?: string };
  blindfoldConfirmed: { A: boolean; B: boolean; C?: boolean; D?: boolean };
  currentBid: number;
  currentBidTeam: TeamId | null;
  activeTurnTeam: TeamId;
  activePlayerId?: string;
  timerSeconds: number;
  timerActive: boolean;
  validCount: number;
  challengedTeam: TeamId | null;
  challengedPlayerId: string | null;
  resultWinnerTeam: TeamId | null;
  resultReason: string;
}

// 3. JOGO DO PROIBIDO
export interface ProibidoCard {
  palavra_alvo: string;
  palavras_proibidas: string[];
}

export interface ProibidoGameState {
  phase: 'READY' | 'PLAYING' | 'SUMMARY';
  cards: ProibidoCard[];
  currentCardIndex: number;
  pendingQueue?: number[];
  speakerTeam: TeamId;
  speakerPlayerId: string;
  guesserPlayerId?: string;
  refereeTeam: TeamId;
  refereePlayerId?: string;
  timerSeconds: number;
  timerActive: boolean;
  roundScore: number;
  cardOutcomes: Array<'pending' | 'correct' | 'foul' | 'skipped'>;
  antiSpoilerMode: 'guesser-back-to-tv' | 'guesser-looking-tv';
  tvWordsHidden?: boolean;
  is2PlayerMode?: boolean;
}

// NOV-01: JOGO DA MIMICA (duplas; o mimico faz 3 palavras em tempo limitado; o parceiro adivinha)
export interface MimicaGameState {
  phase: 'READY' | 'PLAYING' | 'SUMMARY';
  /** palavras da rodada (3 no programa) */
  words: string[];
  currentIndex: number;
  /** resultado de cada palavra */
  outcomes: Array<'pending' | 'correct' | 'skipped'>;
  mimeTeam: TeamId;
  mimePlayerId: string;
  guesserPlayerId?: string;
  timerSeconds: number;
  timerActive: boolean;
  /** pontos por palavra acertada nesta rodada (no programa: 1, 2 e 3 nas rodadas 1 a 3) */
  roundValue: number;
  roundScore: number;
  /** o mimico ve as palavras; esconde na TV quando o parceiro esta olhando */
  wordsHidden?: boolean;
}

// NOV-02: QUEM SOU EU (cada jogador tem uma identidade na testa: todos veem, menos ele)
export interface QuemSouEuEntry {
  playerId: string;
  identity: string;
  category: string;
  status: 'searching' | 'found' | 'out';
  questions: number;
  wrongGuesses: number;
  /** 1 = primeiro a descobrir */
  foundOrder?: number;
}

export interface QuemSouEuGameState {
  phase: 'READY' | 'PLAYING' | 'SUMMARY';
  entries: QuemSouEuEntry[];
  turnPlayerId: string;
  /** perguntas de sim/nao que cada jogador pode fazer antes de ficar de fora */
  maxQuestions: number;
  pointsAwarded: Record<string, number>;
  /** na TV, as identidades so aparecem quando o diretor libera (quem esta jogando nao pode olhar) */
  identitiesVisible: boolean;
  /** ultimo evento, para a tela narrar o que aconteceu */
  lastEvent?: string;
}

// NOV-03: MEGA RESENHA (duplas; quem da as dicas ve a palavra, o parceiro vendado chuta; dica = UMA palavra)
export interface MegaResenhaClue {
  text: string;
  /** false = dica invalida (varias palavras, a propria palavra ou mesmo radical); nao conta */
  valid: boolean;
  reason?: string;
  /** o juiz aceitou mesmo assim */
  overruled?: boolean;
}

export interface MegaResenhaGameState {
  phase: 'READY' | 'PLAYING' | 'SUMMARY';
  words: string[];
  currentIndex: number;
  outcomes: Array<'pending' | 'correct' | 'skipped'>;
  /** dicas dadas em cada palavra */
  clues: MegaResenhaClue[][];
  team: TeamId;
  giverPlayerId: string;
  guesserPlayerId?: string;
  timerSeconds: number;
  timerActive: boolean;
  roundScore: number;
  wordsHidden?: boolean;
  lastEvent?: string;
}

// NOV-05: REPETENTE (duplas escrevem em segredo UMA palavra para o mesmo tema; combinou = ponto)
export interface RepetenteGroup {
  id: string;
  /** equipe da dupla; ausente no modo cooperativo (2 jogadores): os dois somam para as duas equipes */
  team?: TeamId;
  playerIds: string[];
}

export interface RepetenteGroupResult {
  groupId: string;
  matched: boolean;
  /** o juiz aceitou como combinada (palavras quase iguais) */
  overruled?: boolean;
  points: number;
}

export interface RepetenteGameState {
  phase: 'READY' | 'WRITING' | 'REVEAL';
  theme: string;
  category: string;
  groups: RepetenteGroup[];
  /** palavra de cada jogador (so aparece na TV depois da revelacao) */
  answers: Record<string, string>;
  timerSeconds: number;
  timerActive: boolean;
  /** juiz: dupla -> considerar combinada mesmo com palavras diferentes */
  overrides: Record<string, boolean>;
  result?: { groups: RepetenteGroupResult[]; pointsByTeam: Record<TeamId, number> };
}

// NOV-08: RESPOSTAS SEM PERGUNTAS (a pergunta e oculta; so se sabe quantas palavras tem)
export interface RespostasAttempt {
  playerId: string;
  /** posicao (0-based) da palavra revelada nesta tentativa */
  position: number;
  correct: boolean;
}

export interface RespostasSemPerguntasState {
  phase: 'READY' | 'PLAYING' | 'SUMMARY';
  category: string;
  /** a pergunta inteira, palavra por palavra (sem o "?") */
  words: string[];
  /** resposta esperada (so o diretor ve) */
  answer: string;
  revealed: boolean[];
  turnPlayerId: string;
  /** 'pick' = escolhe a palavra a revelar; 'guess' = chuta a resposta */
  step: 'pick' | 'guess';
  attempts: RespostasAttempt[];
  /** posicao revelada na etapa atual, aguardando o palpite */
  pendingPosition?: number;
  winnerPlayerId?: string;
  pointsAwarded: Record<string, number>;
  answerVisible: boolean;
}

// 4. JOGO DA NOTA
export interface NotaRoundData {
  pergunta: string;
  eixo_principal_futebol_ou_tema1?: string;
  eixo_secundario_cultura_pop_ou_tema2?: string;
}

export type NotaPhase =
  | 'STEP_1_DRAW'
  | 'STEP_2_CLUE_1'
  | 'STEP_3_CLUE_2'
  | 'STEP_4_REVEAL'
  | 'DRAW'
  | 'CLUES'
  | 'VOTING'
  | 'REVEAL';

export interface NotaGameState {
  phase: NotaPhase;
  drawSubState?: 'BLINDFOLD_WARNING' | 'SPINNING' | 'MEMORIZED_READY';
  revealSubState?: 'SPINNING' | 'REVEALED_LOCKED' | 'SCORING' | 'REVEALED';
  roundData: NotaRoundData;
  speakerPlayerId: string;
  secretScore: number; // scaleMin to scaleMax
  scaleMin?: number; // default 1
  scaleMax: number; // default 10 (can be 5, 10, 15, 20, or custom)
  allowCloseVote?: boolean;
  selectedCorrectPlayerIds?: string[]; // toggled winners in Step 4
  votes: Record<string, number>;
  pointsAwarded: Record<string, number>;
  correctVoters: string[];
}

// 5. TEM OU NÃO TEM
export interface TemItem {
  texto: string;
  sinonimos_aceitos: string[];
  votos: number;
  revealed: boolean;
  revealedByTeam?: TeamId;
}

export interface TemOuNaoTemRoundData {
  pergunta: string;
  respostas: Array<{
    texto: string;
    sinonimos_aceitos: string[];
    votos: number;
  }>;
}

export interface TemOuNaoTemGameState {
  phase: 'FACEOFF' | 'GUESSING' | 'ROUND_END';
  roundData: TemOuNaoTemRoundData;
  items: TemItem[];
  activeTeam: TeamId;
  activePlayerId?: string;
  turnStepIndex?: number;
  maxStrikes: number; // default 2 (can be 1, 2, 3, 4)
  strikes: { A: number; B: number; C?: number; D?: number };
  eliminatedTeams: TeamId[];
  freeDomainTeam: TeamId | null;
  roundScore: { A: number; B: number; C?: number; D?: number };
  lastGuessFeedback?: {
    text: string;
    hit: boolean;
    itemIndex?: number;
    team: TeamId;
  };
}

// 6. PERGUNTAS E VERDADES (O Jogo do Diabo — Questions and Truth)
export type PVDeckMode = 'assisted' | 'physical';
export type PVDeckStyle = 'compacto' | 'padrao' | 'holografico';
export type PVPhase = 'DECK_SETUP' | 'TOKEN_AUCTION' | 'PLAYER_ACTION' | 'TRUTH_DECLARATION' | 'VICTORY' | 'FINISHED';

export interface PVQuestionLogEntry {
  id: string;
  roundNumber: number;
  askerPlayerId: string;
  askerName: string;
  targetPlayerId: string;
  targetName: string;
  questionNumber: number;
  formattedQuestion: string;
  answerSummary: string;
  timestamp: number;
}

export interface PerguntasEVerdadesGameState {
  phase: PVPhase;
  deckMode: PVDeckMode;
  deckStyle?: PVDeckStyle;
  auctionRound: number;
  activeTurnPlayerId: string | null;
  targetOpponentId: string | null;
  auctionWinnerId: string | null;
  auctionWinningBid: number;
  auctionTieMessage: string | null;
  tokens: Record<string, number>;
  tokenAlertLight: Record<string, boolean>;
  currentBids: Record<string, number>;
  bidSubmitted: Record<string, boolean>;
  playerHands: Record<
    string,
    Array<{
      id: string;
      value: number;
      suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
      label: string;
    }>
  >;
  handReady: Record<string, boolean>;
  revealedCards: Record<string, boolean[]>;
  selectedQuestionNumber: number | null;
  selectedPositionsQ1: [number, number, number];
  selectedValueQ7: number;
  selectedSuitQ8: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  questionHistory: PVQuestionLogEntry[];
  truthGuessValues: number[];
  savedTruthSlotsByTarget?: Record<
    string,
    Array<{
      id: string;
      value: number;
      suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
      label: string;
    } | null>
  >;
  lastTruthAttemptMessage?: string | null;
  tokenTimerConfig: number;
  turnTimerConfig: number;
  timerSeconds: number;
  timerActive: boolean;
  winnerPlayerId: string | null;
  winReason: string | null;
  setupPlayerIndex?: number;
  bettingPlayerIndex?: number;
  matchRoundNumber?: number;
  totalMatchRounds?: number;
  roundWinsByPlayer?: Record<string, number>;
  roundWinBannerMessage?: string | null;
}

export interface GameCustomConfig {
  // Conjunto de regras da sala: 'home' (casa, padrão) ou 'show' (fiel ao programa)
  ruleset?: 'home' | 'show';
  // Tem ou Não Tem
  temItemsCount: number; // default 5 (range 3..10)
  temMaxStrikes: number; // default 2 (range 1..4)
  // Jogo do Proibido
  proibidoCardsCount: number; // default 5 (range 3..10)
  proibidoForbiddenCount: number; // default 5 (range 3..7)
  // Jogo da Nota
  notaScaleMin?: number; // default 1
  notaScaleMax: number; // default 10 (5, 10, 15, 20)
  notaAllowCloseVote: boolean; // default false
  // Jogo do Duvido
  duvidoStartingBid: number; // default 1 (1, 2, 3, 5)
  duvidoExamplesCount: number; // default 12 (8, 12, 16, 20)
  // Jogo do Limite
  limitePlayMode?: 'mesa' | 'digital'; // default 'mesa'
  limiteEnablePowerCards: boolean; // default true
  limiteCallTimeoutSeconds: number; // default 30 (15, 30, 45, 60)
  limiteExactBonus: number; // default 2 (1, 2, 3)
  // Perguntas e Verdades (O Jogo do Diabo)
  pvDeckMode: PVDeckMode; // 'assisted' (default) | 'physical'
  pvDeckStyle?: PVDeckStyle; // 'padrao' (CazéTV Ilustrado) | 'compacto' | 'holografico'
  pvTokenTimerSeconds: number; // 30 (default), 60, or 0 (unlimited)
  pvTurnTimerSeconds: number; // 180 (3m), 300 (5m default), 600 (10m), or 0 (unlimited)
  pvMaxPlayers: number; // 2 to 6 players (default 2)
  pvHybridDigitalTokens?: boolean; // default true
  pvHybridDigitalCards?: boolean; // default true
  pvHybridAutoAnswers?: boolean; // default true
  // AI Random Sub-Theme Expansion
  autoRandomSubtheme: boolean; // default true
  difficulty?: GameDifficulty; // default 'dificil'
  connectionMode?: ConnectionMode; // default 'local'
  teamCount?: 2 | 3 | 4; // default 2 (allows 2, 3, or 4 teams in team games)
  startingPlayerId?: string | null;
}

export const DEFAULT_GAME_CUSTOM_CONFIG: GameCustomConfig = {
  ruleset: 'home',
  temItemsCount: 5,
  temMaxStrikes: 2,
  proibidoCardsCount: 5,
  proibidoForbiddenCount: 5,
  notaScaleMin: 1,
  notaScaleMax: 10,
  notaAllowCloseVote: false,
  duvidoStartingBid: 1,
  duvidoExamplesCount: 12,
  limitePlayMode: 'mesa',
  limiteEnablePowerCards: true,
  limiteCallTimeoutSeconds: 30,
  limiteExactBonus: 2,
  pvDeckMode: 'assisted',
  pvDeckStyle: 'padrao',
  pvTokenTimerSeconds: 30,
  pvTurnTimerSeconds: 300,
  pvMaxPlayers: 2,
  pvHybridDigitalTokens: true,
  pvHybridDigitalCards: true,
  pvHybridAutoAnswers: true,
  autoRandomSubtheme: true,
  difficulty: 'dificil',
  connectionMode: 'local',
  teamCount: 2
};

// Session Historical Stats across games
export interface PlayerScoreSnapshot {
  id: string;
  name: string;
  avatar: string;
  team: TeamId;
  score: number;
  roundsPlayed?: number;
  roundsWon?: number;
  accuracy?: number;
}

export interface MatchMVPSnapshot {
  playerId: string;
  name: string;
  avatar: string;
  team: TeamId;
  score: number;
  roundsPlayed?: number;
  roundsWon?: number;
  accuracy?: number;
  isFixedPlayer?: boolean;
  fixedPlayerId?: string;
}

export interface RoundActivityEvent {
  id: string;
  roundNumber: number;
  gameId: GameId;
  gameName: string;
  winnerTeam: TeamId | 'EMPATE';
  pointsA: number;
  pointsB: number;
  cumulativeScoreA: number;
  cumulativeScoreB: number;
  headline: string;
  subheadline: string;
  topPlayerName?: string;
  timestamp: number;
}

export interface GameHistoryEntry {
  id: string;
  gameId: GameId;
  gameName: string;
  timestamp: number;
  winnerTeam: TeamId | 'EMPATE';
  scoreA: number;
  scoreB: number;
  scoreC?: number;
  scoreD?: number;
  roundsPlayed: number;
  theme: string;
  playerScores?: PlayerScoreSnapshot[];
  mvp?: MatchMVPSnapshot;
  roundLog?: RoundActivityEvent[];
}

export interface SessionStats {
  totalMatches: number;
  victoriesA: number;
  victoriesB: number;
  victoriesC?: number;
  victoriesD?: number;
  totalPointsA: number;
  totalPointsB: number;
  totalPointsC?: number;
  totalPointsD?: number;
  history: GameHistoryEntry[];
}

// Main Global Room State
export interface GameRoom {
  roomId: string;
  sessionKey?: string;
  hostId: string;
  connectionMode?: ConnectionMode;
  visualTheme?: VisualTheme;
  difficulty?: GameDifficulty;
  startingPlayerId?: string | null;
  teamCount?: 2 | 3 | 4;
  screen: ScreenState;
  activeGame: GameId | null;
  theme: string;
  activeSubtheme?: string;
  roundNumber: number;
  maxRounds: number;
  timerConfig: number;
  customConfig?: GameCustomConfig;
  usedRoundSignatures?: string[];
  players: Player[];
  teams: {
    A: Team;
    B: Team;
    C?: Team;
    D?: Team;
  };
  sessionStats: SessionStats;
  roundLog?: RoundActivityEvent[];
  limite?: LimiteGameState;
  duvido?: DuvidoGameState;
  proibido?: ProibidoGameState;
  mimica?: MimicaGameState;
  quemSouEu?: QuemSouEuGameState;
  megaResenha?: MegaResenhaGameState;
  repetente?: RepetenteGameState;
  respostasSemPerguntas?: RespostasSemPerguntasState;
  nota?: NotaGameState;
  temOuNaoTem?: TemOuNaoTemGameState;
  perguntasEVerdades?: PerguntasEVerdadesGameState;
  lastBuzzEvent?: {
    playerId: string;
    playerName: string;
    avatar: string;
    timestamp: number;
  } | null;
  lastPingEvent?: {
    targetPlayerId: string;
    targetClientId?: string;
    timestamp: number;
  } | null;
  lastUpdated: number;
}


