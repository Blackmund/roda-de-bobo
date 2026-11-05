import { GameId } from '../types/game';

const SESSION_MEMORY_STORAGE_KEY = 'rb_session_semantic_memory_v3';
const MAX_KEYWORDS_MEMORY = 180;
const MAX_QUESTIONS_MEMORY = 100;
const MAX_THEMES_MEMORY = 40;
const MAX_SUB_ANGLES_MEMORY = 40;

export interface SessionMemorySnapshot {
  usedThemes: string[];
  usedSubAngles: string[];
  usedSubAngleIdsByTheme: Record<string, number[]>;
  lastGlobalSubAngleId: number;
  usedTargetsAndKeywords: string[];
  usedQuestions: string[];
  lastSubAngleIndexByTheme: Record<string, number>;
  roundCounter: number;
  updatedAt: number;
}

export interface SubAngleDefinition {
  id: number;
  label: string;
  semanticDomain: string;
  instruction: string;
}

export const SEMANTIC_SUB_ANGLES: SubAngleDefinition[] = [
  {
    id: 1,
    label: 'Ângulo 1: Personagens, Figuras Históricas, Ídolos ou Profissionais',
    semanticDomain: 'DOMÍNIO HUMANO & BIOGRÁFICO (Pessoas, Ídolos, Profissionais, Vilões e Lendas)',
    instruction:
      'Foque exclusivamente em PESSOAS, personagens famosos, figuras históricas, ídolos, criadores, atletas, artistas ou profissionais marcantes dentro deste tema. PROIBIDO focar em objetos ou conceitos genéricos.'
  },
  {
    id: 2,
    label: 'Ângulo 2: Objetos Físicos, Ferramentas, Comidas ou Equipamentos',
    semanticDomain: 'DOMÍNIO MATERIAL & ARTEFATOS (Objetos Físicos, Comidas, Bebidas, Ferramentas e Equipamentos)',
    instruction:
      'Foque exclusivamente em OBJETOS Físicos concretos, ferramentas, comidas, bebidas, instrumentos, roupas, acessórios ou equipamentos palpáveis ligados a este tema.'
  },
  {
    id: 3,
    label: 'Ângulo 3: Lugares Específicos, Construções, Países ou Cenários',
    semanticDomain: 'DOMÍNIO GEOGRÁFICO & ESPACIAL (Lugares, Arenas, Cidades, Construções e Cenários)',
    instruction:
      'Foque exclusivamente em LUGARES ESPECÍFICOS, cidades, países, arenas, ambientes, construções famosas, hábitats ou cenários icônicos deste universo.'
  },
  {
    id: 4,
    label: 'Ângulo 4: Eventos Marcantes, Recordes Bizarros, Gafes ou Bastidores',
    semanticDomain: 'DOMÍNIO HISTÓRICO & CURIOSIDADES EXTREMAS (Recordes, Gafes, Bastidores e Eventos)',
    instruction:
      'Foque exclusivamente em EVENTOS MARCANTES, recordes extremos, curiosidades surpreendentes de bastidores, histórias engraçadas, gafes famosas ou momentos históricos desse tema.'
  },
  {
    id: 5,
    label: 'Ângulo 5: Conceitos Específicos, Gírias, Regras, Manias ou Fenômenos',
    semanticDomain: 'DOMÍNIO CULTURAL & COMPORTAMENTAL (Gírias, Regras, Rituais, Manias e Fenômenos)',
    instruction:
      'Foque exclusivamente em GÍRIAS, expressões populares, regras específicas, manias, rituais, comportamentos ou fenômenos curiosos típicos desse tema.'
  },
  {
    id: 6,
    label: 'Ângulo 6: Nostalgia (Anos 80/90/2000) vs. Atualidade',
    semanticDomain: 'DOMÍNIO TEMPORAL & GERACIONAL (Nostalgia Anos 80/90/2000 vs. Tendências Atuais)',
    instruction:
      'Foque no contraste entre CLÁSSICOS NOSTÁLGICOS (anos 80, 90, 2000, infância) e tendências ultra-atuais dentro deste tema.'
  }
];

export const FEW_SHOT_STYLE_GUIDE = {
  limite: [
    {
      pergunta: "Quantos episódios teve a série 'A Grande Família' somando todas as temporadas?",
      valor_exato: 485,
      unidade: 'episódios',
      curiosidade_explicacao: 'A Grande Família teve 14 temporadas e 485 episódios exibidos na TV Globo.'
    },
    {
      pergunta: 'Quantos metros de comprimento teve o maior sanduíche do mundo registrado no Guinness?',
      valor_exato: 735,
      unidade: 'metros',
      curiosidade_explicacao: 'O recorde mundial de maior sanduíche contava com 735 metros de comprimento.'
    }
  ],
  duvido: [
    'Clubes que disputam a atual temporada da Premier League',
    'Países do mundo que começam com a letra B',
    'Filmes dirigidos por Quentin Tarantino'
  ],
  proibido: [
    {
      palavra_alvo: 'ZICO',
      palavras_proibidas: ['FLAMENGO', 'GALINHO', 'MARACANÃ', 'FUTEBOL', '1981']
    },
    {
      palavra_alvo: 'ABACAXI',
      palavras_proibidas: ['FRUTA', 'COROA', 'ESPINHO', 'AMARELO', 'BOB ESPONJA']
    },
    {
      palavra_alvo: 'POLO AQUÁTICO',
      palavras_proibidas: ['ÁGUA', 'NATAÇÃO', 'PISCINA', 'BOLA', 'GOL']
    }
  ],
  nota: [
    'Qual estádio de futebol brasileiro?',
    'Qual comida vendida em estádio?',
    'Qual lugar para levar alguém no primeiro encontro (date)?',
    'Qual animal predador da natureza?'
  ],
  temOuNaoTem: [
    {
      pergunta: 'Diga um jogador que você lembra imediatamente quando o assunto é cobrança de pênalti',
      respostas: [
        { texto: 'Cristiano Ronaldo', votos: 70 },
        { texto: 'Henrique Dourado', votos: 10 },
        { texto: 'Neymar Jr.', votos: 10 },
        { texto: 'Gabigol', votos: 6 },
        { texto: 'Fábio Santos', votos: 4 }
      ]
    }
  ]
} as const;

const PortugueseStopwords = new Set([
  'qual', 'quais', 'quantos', 'quantas', 'como', 'onde', 'quando', 'quem', 'para', 'pelo', 'pela',
  'pelos', 'pelas', 'mais', 'menos', 'muito', 'muita', 'voce', 'pessoas', 'todo', 'toda', 'todos',
  'todas', 'uma', 'uns', 'umas', 'dos', 'das', 'nos', 'nas', 'num', 'numa', 'sobre', 'entre',
  'dentro', 'fora', 'coisa', 'coisas', 'algo', 'alguem', 'item', 'itens', 'cite', 'diga', 'fale',
  'lembra', 'imediatamente', 'assunto', 'costumam', 'fazer', 'feito', 'feita', 'mundo', 'brasil',
  'brasileiro', 'brasileira', 'brasileiros', 'historia', 'famoso', 'famosa', 'famosos', 'famosas',
  'comum', 'comuns', 'maior', 'maiores', 'melhor', 'melhores', 'primeiro', 'primeira', 'segundo'
]);

function normalizeToken(text: string): string {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractSalientKeywordsFromText(text: string): string[] {
  const cleaned = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ');
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !PortugueseStopwords.has(t));
  return Array.from(new Set(tokens)).slice(0, 6);
}

class SessionMemoryManagerClass {
  private memory: SessionMemorySnapshot = {
    usedThemes: [],
    usedSubAngles: [],
    usedSubAngleIdsByTheme: {},
    lastGlobalSubAngleId: -1,
    usedTargetsAndKeywords: [],
    usedQuestions: [],
    lastSubAngleIndexByTheme: {},
    roundCounter: 0,
    updatedAt: Date.now()
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(SESSION_MEMORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.memory = {
              usedThemes: Array.isArray(parsed.usedThemes)
                ? parsed.usedThemes.slice(-MAX_THEMES_MEMORY)
                : [],
              usedSubAngles: Array.isArray(parsed.usedSubAngles)
                ? parsed.usedSubAngles.slice(-MAX_SUB_ANGLES_MEMORY)
                : [],
              usedSubAngleIdsByTheme:
                parsed.usedSubAngleIdsByTheme && typeof parsed.usedSubAngleIdsByTheme === 'object'
                  ? parsed.usedSubAngleIdsByTheme
                  : {},
              lastGlobalSubAngleId:
                typeof parsed.lastGlobalSubAngleId === 'number' ? parsed.lastGlobalSubAngleId : -1,
              usedTargetsAndKeywords: Array.isArray(parsed.usedTargetsAndKeywords)
                ? parsed.usedTargetsAndKeywords.slice(-MAX_KEYWORDS_MEMORY)
                : [],
              usedQuestions: Array.isArray(parsed.usedQuestions)
                ? parsed.usedQuestions.slice(-MAX_QUESTIONS_MEMORY)
                : [],
              lastSubAngleIndexByTheme:
                parsed.lastSubAngleIndexByTheme && typeof parsed.lastSubAngleIndexByTheme === 'object'
                  ? parsed.lastSubAngleIndexByTheme
                  : {},
              roundCounter: Number(parsed.roundCounter) || 0,
              updatedAt: Number(parsed.updatedAt) || Date.now()
            };
          }
        }
      }
    } catch {
      // Ignore storage errors in non-browser or restricted environments
    }
  }

  private saveToStorage(): void {
    try {
      this.memory.updatedAt = Date.now();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SESSION_MEMORY_STORAGE_KEY, JSON.stringify(this.memory));
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getSnapshot(): SessionMemorySnapshot {
    const clonedSubAnglesByTheme: Record<string, number[]> = {};
    for (const [k, v] of Object.entries(this.memory.usedSubAngleIdsByTheme)) {
      clonedSubAnglesByTheme[k] = Array.isArray(v) ? [...v] : [];
    }
    return {
      usedThemes: [...this.memory.usedThemes],
      usedSubAngles: [...this.memory.usedSubAngles],
      usedSubAngleIdsByTheme: clonedSubAnglesByTheme,
      lastGlobalSubAngleId: this.memory.lastGlobalSubAngleId,
      usedTargetsAndKeywords: [...this.memory.usedTargetsAndKeywords],
      usedQuestions: [...this.memory.usedQuestions],
      lastSubAngleIndexByTheme: { ...this.memory.lastSubAngleIndexByTheme },
      roundCounter: this.memory.roundCounter,
      updatedAt: this.memory.updatedAt
    };
  }

  public getUsedHistoryForPrompt(limit: number = 80): string[] {
    const combined = [
      ...this.memory.usedTargetsAndKeywords.slice(-limit),
      ...this.memory.usedQuestions.slice(-30)
    ];
    return Array.from(new Set(combined)).slice(-limit);
  }

  public recordTheme(theme: string): void {
    const clean = normalizeToken(theme);
    if (!clean) return;
    const filtered = this.memory.usedThemes.filter(
      (t) => t.toLowerCase() !== clean.toLowerCase()
    );
    filtered.push(clean);
    this.memory.usedThemes = filtered.slice(-MAX_THEMES_MEMORY);
    this.saveToStorage();
  }

  public recordSubAngle(theme: string, angle: SubAngleDefinition): void {
    const themeKey = (theme || 'default').trim().toLowerCase();
    const angleIndex = SEMANTIC_SUB_ANGLES.findIndex((a) => a.id === angle.id);
    if (angleIndex >= 0) {
      this.memory.lastSubAngleIndexByTheme[themeKey] = angleIndex;
    }
    this.memory.lastGlobalSubAngleId = angle.id;

    const existingIds = this.memory.usedSubAngleIdsByTheme[themeKey] || [];
    if (!existingIds.includes(angle.id)) {
      this.memory.usedSubAngleIdsByTheme[themeKey] = [...existingIds, angle.id];
    }

    const entry = `${normalizeToken(theme || 'Geral')} :: ${angle.label}`;
    const filtered = this.memory.usedSubAngles.filter((s) => s !== entry);
    filtered.push(entry);
    this.memory.usedSubAngles = filtered.slice(-MAX_SUB_ANGLES_MEMORY);
    this.saveToStorage();
  }

  /**
   * Uses CSPRNG (`crypto.getRandomValues`) to pick a semantic sub-angle
   * that strictly rejects ALL previously used sub-angles for that theme
   * (until all 6 have been exhausted, at which point the cycle resets while still
   * rejecting both the last theme sub-angle and the last global sub-angle).
   */
  public drawRandomSubAngle(theme: string): SubAngleDefinition {
    const themeKey = (theme || 'default').trim().toLowerCase();
    this.recordTheme(theme || 'Geral');

    const lastIdx = this.memory.lastSubAngleIndexByTheme[themeKey] ?? -1;
    const lastGlobalId = this.memory.lastGlobalSubAngleId;
    let usedIdsForTheme = this.memory.usedSubAngleIdsByTheme[themeKey] || [];

    // Filter out all previously used sub-angle IDs for this theme
    let candidateIndices = SEMANTIC_SUB_ANGLES.map((angle, idx) => ({ angle, idx }))
      .filter(({ angle, idx }) => !usedIdsForTheme.includes(angle.id) && idx !== lastIdx && angle.id !== lastGlobalId)
      .map(({ idx }) => idx);

    if (candidateIndices.length === 0) {
      candidateIndices = SEMANTIC_SUB_ANGLES.map((angle, idx) => ({ angle, idx }))
        .filter(({ angle, idx }) => !usedIdsForTheme.includes(angle.id) && idx !== lastIdx)
        .map(({ idx }) => idx);
    }

    // If all 6 sub-angles were exhausted for this theme, reset the per-theme history
    // while strictly rejecting the immediately preceding sub-angle
    if (candidateIndices.length === 0) {
      usedIdsForTheme = [];
      this.memory.usedSubAngleIdsByTheme[themeKey] = [];
      candidateIndices = SEMANTIC_SUB_ANGLES.map((angle, idx) => ({ angle, idx }))
        .filter(({ angle, idx }) => idx !== lastIdx && angle.id !== lastGlobalId)
        .map(({ idx }) => idx);
      if (candidateIndices.length === 0) {
        candidateIndices = SEMANTIC_SUB_ANGLES.map((_, idx) => idx).filter((idx) => idx !== lastIdx);
      }
    }

    let randomValue = Math.floor(Math.random() * 100000);
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        randomValue = buf[0];
      }
    } catch {
      // Fallback to Math.random if crypto is unavailable
    }

    const chosenIdx = candidateIndices[randomValue % candidateIndices.length] ?? 0;
    const chosenAngle = SEMANTIC_SUB_ANGLES[chosenIdx];
    this.recordSubAngle(theme, chosenAngle);
    return chosenAngle;
  }

  public addKeywords(keywords: string[]): void {
    const currentSet = new Set(this.memory.usedTargetsAndKeywords);
    for (const kw of keywords) {
      const clean = normalizeToken(kw);
      if (clean && clean.length >= 2) {
        currentSet.add(clean);
      }
    }
    this.memory.usedTargetsAndKeywords = Array.from(currentSet).slice(-MAX_KEYWORDS_MEMORY);
    this.saveToStorage();
  }

  public addQuestion(question: string): void {
    const clean = normalizeToken(question);
    if (!clean) return;
    const currentSet = new Set(this.memory.usedQuestions);
    currentSet.add(clean);
    this.memory.usedQuestions = Array.from(currentSet).slice(-MAX_QUESTIONS_MEMORY);
    const extracted = extractSalientKeywordsFromText(clean);
    this.addKeywords(extracted);
  }

  /**
   * Validates whether a candidate round (e.g. from cache or batch) is 100% fresh
   * against SessionMemory and excluded signatures.
   */
  public isContentFresh(
    gameId: GameId,
    data: any,
    excludeSignatures: string[] = []
  ): boolean {
    if (!data) return false;
    const lowerQuestions = new Set(
      [...this.memory.usedQuestions, ...excludeSignatures].map((q) =>
        normalizeToken(q).toLowerCase()
      )
    );
    const lowerKeywords = new Set(
      this.memory.usedTargetsAndKeywords.map((k) => normalizeToken(k).toLowerCase())
    );

    if (gameId === 'proibido' && Array.isArray(data)) {
      if (data.length === 0) return false;
      for (const card of data) {
        const target = normalizeToken(card?.palavra_alvo || '').toLowerCase();
        if (!target || lowerKeywords.has(target) || lowerQuestions.has(target)) {
          return false;
        }
      }
      return true;
    }

    if (gameId === 'duvido') {
      const cat = normalizeToken(data.categoria_secreta || '').toLowerCase();
      if (!cat || lowerQuestions.has(cat)) return false;
      return true;
    }

    if (gameId === 'tem-ou-nao-tem' || gameId === 'limite' || gameId === 'nota') {
      const q = normalizeToken(data.pergunta || '').toLowerCase();
      if (!q || lowerQuestions.has(q)) return false;
      return true;
    }

    return true;
  }

  /**
   * Automatically extracts and saves all main terms, target words, top answers,
   * and questions from a newly generated round so the next round or next game
   * never repeats anything similar.
   */
  public recordRoundData(gameId: GameId, data: any, theme?: string, subAngle?: SubAngleDefinition): void {
    if (!data) return;
    this.memory.roundCounter = (this.memory.roundCounter || 0) + 1;

    if (theme) {
      this.recordTheme(theme);
    }
    if (theme && subAngle) {
      this.recordSubAngle(theme, subAngle);
    }

    if (gameId === 'proibido' && Array.isArray(data)) {
      const targets: string[] = [];
      for (const card of data) {
        if (card?.palavra_alvo) {
          targets.push(String(card.palavra_alvo).toUpperCase());
        }
      }
      this.addKeywords(targets);
      return;
    }

    if (gameId === 'tem-ou-nao-tem') {
      if (data.pergunta) {
        this.addQuestion(String(data.pergunta));
      }
      if (Array.isArray(data.respostas)) {
        const topAnswers = data.respostas
          .slice(0, 5)
          .map((r: any) => String(r?.texto || '').trim())
          .filter(Boolean);
        this.addKeywords(topAnswers);
      }
      return;
    }

    if (gameId === 'duvido') {
      if (data.categoria_secreta) {
        this.addQuestion(String(data.categoria_secreta));
      }
      if (Array.isArray(data.exemplos_validos)) {
        this.addKeywords(data.exemplos_validos.slice(0, 4).map((e: any) => String(e)));
      }
      return;
    }

    if (gameId === 'limite' || gameId === 'nota') {
      if (data.pergunta) {
        this.addQuestion(String(data.pergunta));
      }
      return;
    }
  }

  public clear(): void {
    this.memory = {
      usedThemes: [],
      usedSubAngles: [],
      usedSubAngleIdsByTheme: {},
      lastGlobalSubAngleId: -1,
      usedTargetsAndKeywords: [],
      usedQuestions: [],
      lastSubAngleIndexByTheme: {},
      roundCounter: 0,
      updatedAt: Date.now()
    };
    this.saveToStorage();
  }
}

export const SessionMemoryManager = new SessionMemoryManagerClass();

/**
 * Builds the explicit SessionMemory snapshot injection and strict semantic pivot instructions
 * for the Gemini prompt. Forces the model to reject all previous themes, sub-angles, questions,
 * and keywords, and pivot to a completely unrelated semantic domain for each new game round.
 */
export function buildSessionMemoryPromptBlock(
  snapshot: SessionMemorySnapshot,
  currentTheme: string,
  activeSubAngle: SubAngleDefinition,
  extraExcludedTerms: string[] = []
): string {
  const normCurrentTheme = normalizeToken(currentTheme).toLowerCase();
  const previousOtherThemes = (snapshot.usedThemes || []).filter(
    (t) => normalizeToken(t).toLowerCase() !== normCurrentTheme
  );
  const themeKey = normCurrentTheme || 'default';
  const rejectedAngleIdsForTheme = (snapshot.usedSubAngleIdsByTheme?.[themeKey] || []).filter(
    (id) => id !== activeSubAngle.id
  );
  const rejectedAngleLabels = SEMANTIC_SUB_ANGLES.filter((a) =>
    rejectedAngleIdsForTheme.includes(a.id)
  ).map((a) => a.label);

  const combinedKeywords = Array.from(
    new Set([
      ...(snapshot.usedTargetsAndKeywords || []),
      ...extraExcludedTerms
    ])
  ).slice(-90);

  const recentQuestions = (snapshot.usedQuestions || []).slice(-35);

  const embeddedSnapshot = {
    roundCounter: snapshot.roundCounter || 0,
    activeTheme: currentTheme,
    rejectedPreviousThemes: previousOtherThemes.slice(-15),
    rejectedPreviousSubAngles: Array.from(
      new Set([...(snapshot.usedSubAngles || []).slice(-12), ...rejectedAngleLabels])
    ),
    mandatoryActiveSubAngle: {
      id: activeSubAngle.id,
      label: activeSubAngle.label,
      semanticDomain: activeSubAngle.semanticDomain
    },
    blockedKeywordsAndTargets: combinedKeywords,
    blockedQuestions: recentQuestions
  };

  return `
MEMÓRIA DE BLOQUEIO SEMÂNTICO (PROIBIÇÃO ABSOLUTA) & SNAPSHOT EXPLÍCITO DO SESSION_MEMORY:
\`\`\`json
${JSON.stringify(embeddedSnapshot, null, 2)}
\`\`\`

DIRETRIZES INVIOLÁVEIS DE BLOQUEIO SEMÂNTICO E PIVÔ DE DOMÍNIO (SESSION_MEMORY):
1. REJEIÇÃO DE TEMAS ANTERIORES: Ignore e rejeite 100% qualquer resquício dos temas anteriores (${JSON.stringify(embeddedSnapshot.rejectedPreviousThemes)}). O universo atual é EXCLUSIVAMENTE "${currentTheme}".
2. REJEIÇÃO ESTRITA DE SUB-ÂNGULOS ANTERIORES: Os sub-ângulos ${JSON.stringify(embeddedSnapshot.rejectedPreviousSubAngles)} JÁ FORAM USADOS e estão BLOQUEADOS nesta rodada.
3. PIVÔ OBRIGATÓRIO DE DOMÍNIO SEMÂNTICO: Faça um pivô radical para o domínio semântico atual -> [${activeSubAngle.semanticDomain}] (${activeSubAngle.label}: ${activeSubAngle.instruction}). Escolha um campo lexical, época, categoria de objetos/pessoas/lugares TOTALMENTE INDEPENDENTE e SEM RELAÇÃO SEMÂNTICA com as rodadas passadas.
4. PROIBIÇÃO ABSOLUTA DE TERMOS E PERGUNTAS USADAS: É ESTRITAMENTE PROIBIDO repetir, parafrasear ou usar derivados de qualquer item em \`blockedKeywordsAndTargets\` ou \`blockedQuestions\`.`;
}

export function buildSemanticBlockInstruction(
  usedHistory: string[],
  snapshot?: SessionMemorySnapshot,
  currentTheme: string = 'Geral',
  activeSubAngle: SubAngleDefinition = SEMANTIC_SUB_ANGLES[0]
): string {
  const effectiveSnapshot: SessionMemorySnapshot = snapshot || {
    ...SessionMemoryManager.getSnapshot(),
    usedTargetsAndKeywords: usedHistory
  };
  return buildSessionMemoryPromptBlock(
    effectiveSnapshot,
    currentTheme,
    activeSubAngle,
    usedHistory
  );
}
