import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawRandomScoreCSPRNG,
  toggleNotaSelectedPlayer,
  computeNotaRoundPoints
} from '../../components/SpinningNumberWheel';
import { CURATED_NOTA } from '../../data/curatedRounds';
import { generateRoundContent } from '../aiGameGenerator';

describe('Jogo da Nota — CSPRNG, Reversible Toggle & Scoring Logic', () => {
  it('drawRandomScoreCSPRNG generates unbiased integers within [min, max]', () => {
    for (let i = 0; i < 100; i++) {
      const score = drawRandomScoreCSPRNG(1, 10);
      assert.ok(Number.isInteger(score), 'Score must be an integer');
      assert.ok(score >= 1 && score <= 10, `Score ${score} must be between 1 and 10`);
    }

    for (let i = 0; i < 50; i++) {
      const customScore = drawRandomScoreCSPRNG(5, 20);
      assert.ok(customScore >= 5 && customScore <= 20, `Score ${customScore} must be between 5 and 20`);
    }
  });

  it('toggleNotaSelectedPlayer adds and removes players reversibly (toggle on/off)', () => {
    let selected: string[] = [];

    // 1st click selects player p1
    selected = toggleNotaSelectedPlayer(selected, 'p1');
    assert.deepEqual(selected, ['p1']);

    // Selecting p2 adds p2
    selected = toggleNotaSelectedPlayer(selected, 'p2');
    assert.deepEqual(selected, ['p1', 'p2']);

    // 2nd click on p1 deselects p1 (reversible toggle)
    selected = toggleNotaSelectedPlayer(selected, 'p1');
    assert.deepEqual(selected, ['p2']);

    // 2nd click on p2 deselects p2
    selected = toggleNotaSelectedPlayer(selected, 'p2');
    assert.deepEqual(selected, []);
  });

  it('computeNotaRoundPoints awards +1 pt per selected guesser and +X pts to the Narrator', () => {
    const narratorId = 'narrator-1';
    const allPlayers = [narratorId, 'p2', 'p3', 'p4'];

    // Case 0: Nobody guessed right -> 0 pts for everyone including Narrator
    const zeroResult = computeNotaRoundPoints(allPlayers, narratorId, []);
    assert.equal(zeroResult.narratorPoints, 0);
    assert.equal(zeroResult.pointsAwarded[narratorId], 0);
    assert.equal(zeroResult.pointsAwarded['p2'], 0);

    // Case 1: 2 players guessed right -> +1 pt each and +2 pts for the Narrator
    const twoResult = computeNotaRoundPoints(allPlayers, narratorId, ['p2', 'p3']);
    assert.equal(twoResult.narratorPoints, 2);
    assert.equal(twoResult.pointsAwarded['p2'], 1);
    assert.equal(twoResult.pointsAwarded['p3'], 1);
    assert.equal(twoResult.pointsAwarded['p4'], 0);
    assert.equal(twoResult.pointsAwarded[narratorId], 2);

    // Case 2: Deselecting p3 updates Narrator bonus to +1 pt in real time
    const afterDeselect = toggleNotaSelectedPlayer(['p2', 'p3'], 'p3');
    const oneResult = computeNotaRoundPoints(allPlayers, narratorId, afterDeselect);
    assert.equal(oneResult.narratorPoints, 1);
    assert.equal(oneResult.pointsAwarded['p2'], 1);
    assert.equal(oneResult.pointsAwarded['p3'], 0);
    assert.equal(oneResult.pointsAwarded[narratorId], 1);
  });

  it('toggleLimiteWinnerPoint supports multiple winners simultaneously and deactivates points when clicking an already-scored player', async () => {
    const { toggleLimiteWinnerPoint } = await import('../../components/host/ScreenLimite');

    let state: any = {
      phase: 'SCORING',
      roundData: {
        pergunta: 'Quantos dias tem um ano bissexto?',
        valor_exato: 366,
        unidade: 'dias',
        curiosidade_explicacao: 'Ano bissexto tem 366 dias.'
      },
      guesses: { p1: 360, p2: 360, p3: 350 },
      submittedPlayers: ['p1', 'p2', 'p3'],
      powerCardsPlayed: { p2: 'x2' },
      callTimerRemaining: 0,
      timerActive: false,
      timerSeconds: 60,
      revealedOrder: true,
      winners: [],
      bustedPlayers: [],
      closestDifference: 6,
      pointsAwarded: {}
    };

    // 1. Click player p1 -> activates p1 (+1 pt)
    state = toggleLimiteWinnerPoint(state, 'p1');
    assert.deepEqual(state.winners, ['p1']);
    assert.equal(state.pointsAwarded['p1'], 1);

    // 2. Click player p2 (who played x2 card) -> activates p2 (+2 pts) while keeping p1 active!
    state = toggleLimiteWinnerPoint(state, 'p2');
    assert.deepEqual(state.winners, ['p1', 'p2']);
    assert.equal(state.pointsAwarded['p1'], 1);
    assert.equal(state.pointsAwarded['p2'], 2);

    // 3. Click player p3 -> activates p3 (+1 pt), now 3 players have points
    state = toggleLimiteWinnerPoint(state, 'p3');
    assert.deepEqual(state.winners, ['p1', 'p2', 'p3']);
    assert.equal(state.pointsAwarded['p3'], 1);

    // 4. Click player p1 again -> deactivates p1's point while keeping p2 and p3!
    state = toggleLimiteWinnerPoint(state, 'p1');
    assert.deepEqual(state.winners, ['p2', 'p3']);
    assert.equal(state.pointsAwarded['p1'], undefined);
    assert.equal(state.pointsAwarded['p2'], 2);
    assert.equal(state.pointsAwarded['p3'], 1);

    // 5. Click player p2 again -> deactivates p2's point
    state = toggleLimiteWinnerPoint(state, 'p2');
    assert.deepEqual(state.winners, ['p3']);
    assert.equal(state.pointsAwarded['p2'], undefined);
    assert.equal(state.pointsAwarded['p3'], 1);
  });

  it('CURATED_NOTA and generateRoundContent return clean single-question format without Eixo A/B or fake templates', async () => {
    const { sanitizeCleanGameText, generateThemeStrictFallbackRound } = await import(
      '../aiGameGenerator'
    );

    assert.ok(CURATED_NOTA.length > 0);
    for (const item of CURATED_NOTA) {
      assert.ok(typeof item.pergunta === 'string' && item.pergunta.length >= 10);
      assert.ok(!item.pergunta.includes('Eixo A') && !item.pergunta.includes('Eixo B'));
      assert.ok(
        !/\bnota\b/i.test(item.pergunta),
        `CURATED_NOTA question must never contain the word "nota": ${item.pergunta}`
      );
      assert.ok(
        !/no universo de/i.test(item.pergunta),
        `CURATED_NOTA question must not contain "No universo de": ${item.pergunta}`
      );
    }

    // Verify sanitizeCleanGameText strips fake templates, parenthetical subthemes, and wrapping quotes
    const dirtyNota =
      '"NO UNIVERSO DE \'CIÊNCIA, ESPAÇO E CORPO HUMANO\' (CIÊNCIA, ESPAÇO E CORPO HUMANO: DESCOBERTAS): O QUE MERECE EXATAMENTE A NOTA QUE VOCÊ TIROU?"';
    const cleanedNota = sanitizeCleanGameText(dirtyNota, 'nota');
    assert.ok(!cleanedNota.includes('"') && !cleanedNota.includes("'"));
    assert.ok(!/no universo de/i.test(cleanedNota));
    assert.ok(!/\bnota\b/i.test(cleanedNota));

    // Verify all 5 games with "Ciência, Espaço e Corpo Humano" and custom themes
    const themesToTest = [
      'Ciência, Espaço e Corpo Humano',
      'Futebol Mundial',
      'Comida e Gastronomia',
      'Viagens Interdimensionais'
    ];

    for (const theme of themesToTest) {
      const notaRound = generateThemeStrictFallbackRound('nota', theme).data as any;
      assert.ok(typeof notaRound.pergunta === 'string' && notaRound.pergunta.length > 5);
      assert.ok(!/no universo de/i.test(notaRound.pergunta), `Dirty nota: ${notaRound.pergunta}`);
      assert.ok(!/\bnota\b/i.test(notaRound.pergunta), `Nota word in: ${notaRound.pergunta}`);
      assert.ok(!notaRound.pergunta.startsWith('"') && !notaRound.pergunta.endsWith('"'));

      const duvidoRound = generateThemeStrictFallbackRound('duvido', theme).data as any;
      assert.ok(typeof duvidoRound.categoria_secreta === 'string' && duvidoRound.categoria_secreta.length > 5);
      assert.ok(!/no universo de/i.test(duvidoRound.categoria_secreta));
      assert.ok(!duvidoRound.categoria_secreta.startsWith('"'));

      const limiteRound = generateThemeStrictFallbackRound('limite', theme).data as any;
      assert.ok(typeof limiteRound.pergunta === 'string' && limiteRound.pergunta.length > 10);
      assert.ok(!/no universo de/i.test(limiteRound.pergunta));
      assert.ok(!/^sobre\s+/i.test(limiteRound.pergunta));

      const proibidoRound = generateThemeStrictFallbackRound('proibido', theme).data as any;
      assert.ok(Array.isArray(proibidoRound) && proibidoRound.length >= 5);
      assert.ok(typeof proibidoRound[0].palavra_alvo === 'string');

      const temRound = generateThemeStrictFallbackRound('tem-ou-nao-tem', theme).data as any;
      assert.ok(typeof temRound.pergunta === 'string' && temRound.pergunta.length > 10);
      assert.ok(!/no universo de/i.test(temRound.pergunta));
    }
  });

  it('Multi-round theme fidelity: Round 1, Round 2, Round 3, Round 4 stay 100% within the chosen theme without drifting', async () => {
    const { detectThemeCategory, generateThemeStrictFallbackRound } = await import(
      '../aiGameGenerator'
    );

    const presetThemes = [
      { label: 'Animais e Vida Selvagem', expectedCat: 'animais' },
      { label: 'Hábitos, Cotidiano e Perrengues', expectedCat: 'cotidiano' },
      { label: 'Relacionamentos, Date e Rolês', expectedCat: 'relacionamentos' },
      { label: 'Profissões, Trabalho e Carreira', expectedCat: 'profissoes' },
      { label: 'Comidas, Boteco e Gastronomia', expectedCat: 'comida' },
      { label: 'Futebol Brasileiro e Mundial', expectedCat: 'futebol' },
      { label: 'Filmes, Séries e Cinema', expectedCat: 'cinema' },
      { label: 'Cultura Pop, Memes & Internet', expectedCat: 'cultura_pop' },
      { label: 'Música Brasileira & Shows', expectedCat: 'musica' },
      { label: 'Animes, Games e Cultura Geek', expectedCat: 'games' },
      { label: 'Ciência, Espaço e Corpo Humano', expectedCat: 'ciencia' }
    ];

    for (const preset of presetThemes) {
      assert.equal(
        detectThemeCategory(preset.label),
        preset.expectedCat,
        `Theme "${preset.label}" must map to category "${preset.expectedCat}"`
      );

      for (const gameId of ['duvido', 'limite', 'nota', 'proibido', 'tem-ou-nao-tem'] as const) {
        const usedSigs: string[] = [];
        for (let round = 1; round <= 3; round++) {
          const res = generateThemeStrictFallbackRound(
            gameId,
            preset.label,
            preset.label,
            undefined,
            usedSigs
          );
          assert.ok(
            res.signature.startsWith(`${preset.expectedCat}-`),
            `Round ${round} of ${gameId} for "${preset.label}" drifted to signature "${res.signature}" instead of staying in "${preset.expectedCat}"`
          );
          if (gameId !== 'proibido') {
            assert.ok(
              !usedSigs.includes(res.signature),
              `Round ${round} of ${gameId} for "${preset.label}" repeated signature "${res.signature}"`
            );
          }
          usedSigs.push(res.signature);
        }
      }
    }
  });

  it('SessionMemoryManager: CSPRNG sub-angles never repeat consecutively and semantic block memory records all round terms', async () => {
    const {
      SessionMemoryManager,
      FEW_SHOT_STYLE_GUIDE,
      buildSemanticBlockInstruction
    } = await import('../sessionMemory');

    SessionMemoryManager.clear();

    // Verify FEW_SHOT_STYLE_GUIDE has all 5 games
    assert.ok(FEW_SHOT_STYLE_GUIDE.limite.length >= 2);
    assert.ok(FEW_SHOT_STYLE_GUIDE.duvido.length >= 3);
    assert.ok(FEW_SHOT_STYLE_GUIDE.proibido.length >= 3);
    assert.ok(FEW_SHOT_STYLE_GUIDE.nota.length >= 4);
    assert.ok(FEW_SHOT_STYLE_GUIDE.temOuNaoTem.length >= 1);

    // Draw 15 sub-angles in a row for the same theme and verify no two consecutive draws are equal
    let prevAngleId = -1;
    for (let i = 0; i < 15; i++) {
      const angle = SessionMemoryManager.drawRandomSubAngle('Ciência, Espaço e Corpo Humano');
      assert.notEqual(
        angle.id,
        prevAngleId,
        `Consecutive sub-angles must not repeat: got ${angle.id} twice`
      );
      prevAngleId = angle.id;
    }

    // Record Proibido round data and Tem ou Não Tem round data
    SessionMemoryManager.recordRoundData('proibido', [
      { palavra_alvo: 'BURACO NEGRO', palavras_proibidas: ['ESPAÇO', 'LUZ'] },
      { palavra_alvo: 'ASTRONAUTA', palavras_proibidas: ['LUA', 'FOGUETE'] }
    ]);
    SessionMemoryManager.recordRoundData('tem-ou-nao-tem', {
      pergunta: 'Cite uma parte do corpo que as pessoas costumam quebrar',
      respostas: [{ texto: 'Tornozelo', votos: 50 }, { texto: 'Braço', votos: 50 }]
    });

    const history = SessionMemoryManager.getUsedHistoryForPrompt();
    assert.ok(history.includes('BURACO NEGRO'));
    assert.ok(history.includes('ASTRONAUTA'));
    assert.ok(history.includes('Tornozelo'));

    const blockText = buildSemanticBlockInstruction(history);
    assert.ok(blockText.includes('MEMÓRIA DE BLOQUEIO SEMÂNTICO (PROIBIÇÃO ABSOLUTA)'));
    assert.ok(blockText.includes('BURACO NEGRO'));
  });

  it('applyProibidoCardOutcome: skipping cycles through remaining cards and finishes round when skipping the final card', async () => {
    const { applyProibidoCardOutcome } = await import('../../components/host/ScreenProibido');

    const initialState: any = {
      phase: 'PLAYING',
      cards: [
        { palavra_alvo: 'ZICO', palavras_proibidas: ['FLAMENGO'] },
        { palavra_alvo: 'PELÉ', palavras_proibidas: ['SANTOS'] },
        { palavra_alvo: 'RONALDO', palavras_proibidas: ['FENÔMENO'] }
      ],
      currentCardIndex: 0,
      pendingQueue: [0, 1, 2],
      speakerTeam: 'A',
      speakerPlayerId: 'p1',
      refereeTeam: 'B',
      timerSeconds: 60,
      timerActive: true,
      roundScore: 0,
      cardOutcomes: ['pending', 'pending', 'pending'],
      antiSpoilerMode: 'guesser-back-to-tv'
    };

    // 1. Skip card 0 -> moves card 0 to back of queue [1, 2, 0] and advances currentCardIndex to 1
    const step1 = applyProibidoCardOutcome(initialState, 'skipped');
    assert.equal(step1.justFinishedAllCards, false);
    assert.equal(step1.nextState.currentCardIndex, 1);
    assert.deepEqual(step1.nextState.pendingQueue, [1, 2, 0]);
    assert.equal(step1.nextState.cardOutcomes[0], 'skipped');

    // 2. Hit card 1 -> queue becomes [2, 0], currentCardIndex becomes 2
    const step2 = applyProibidoCardOutcome(step1.nextState, 'correct');
    assert.equal(step2.justFinishedAllCards, false);
    assert.equal(step2.nextState.currentCardIndex, 2);
    assert.equal(step2.nextState.roundScore, 1);
    assert.deepEqual(step2.nextState.pendingQueue, [2, 0]);

    // 3. Foul on card 2 -> queue becomes [0], currentCardIndex becomes 0 (only 1 card left!)
    const step3 = applyProibidoCardOutcome(step2.nextState, 'foul');
    assert.equal(step3.justFinishedAllCards, false);
    assert.equal(step3.nextState.currentCardIndex, 0);
    assert.deepEqual(step3.nextState.pendingQueue, [0]);

    // 4. Skip the last remaining card (card 0) -> stays at [0], and hitting it finishes the round cleanly
    const step4 = applyProibidoCardOutcome(step3.nextState, 'skipped');
    assert.equal(step4.justFinishedAllCards, false);
    assert.equal(step4.nextState.currentCardIndex, 0);
    assert.deepEqual(step4.nextState.pendingQueue, [0]);

    const step5 = applyProibidoCardOutcome(step4.nextState, 'correct');
    assert.equal(step5.justFinishedAllCards, true);
    assert.equal(step5.nextState.phase, 'SUMMARY');
    assert.equal(step5.nextState.timerActive, false);
    assert.deepEqual(step5.nextState.pendingQueue, []);
  });

  it('SessionMemory Snapshot Injection & Strict Sub-Angle / Theme Rejection: exhausts all 6 sub-angles before repeating and embeds snapshot in prompt', async () => {
    const { SessionMemoryManager } = await import('../sessionMemory');
    const { buildProceduralRoundPrompt, clearUsedRoundSignatures } = await import('../aiGameGenerator');

    clearUsedRoundSignatures();

    // 1. Record a previous theme and sub-angle
    SessionMemoryManager.drawRandomSubAngle('Futebol Brasileiro');
    SessionMemoryManager.recordRoundData(
      'nota',
      { pergunta: 'Qual camisa histórica da Seleção Brasileira?' },
      'Futebol Brasileiro'
    );

    // 2. Switch to a new theme and draw 6 sub-angles: all 6 must be distinct (1..6 in some permutation)
    const seenIds = new Set<number>();
    let lastAngle: any = null;
    for (let i = 0; i < 6; i++) {
      const angle = SessionMemoryManager.drawRandomSubAngle('Ciência, Espaço e Corpo Humano');
      seenIds.add(angle.id);
      lastAngle = angle;
    }
    assert.equal(
      seenIds.size,
      6,
      'Drawing 6 sub-angles for a theme must visit all 6 unique semantic sub-angles before any repeat'
    );

    // 3. Build procedural round prompt and verify explicit SessionMemory snapshot is embedded
    const snapshot = SessionMemoryManager.getSnapshot();
    const prompt = buildProceduralRoundPrompt(
      'tem-ou-nao-tem',
      'Ciência, Espaço e Corpo Humano',
      'normal',
      snapshot,
      lastAngle
    );

    assert.ok(prompt.includes('SNAPSHOT EXPLÍCITO DO SESSION_MEMORY'));
    assert.ok(prompt.includes('"rejectedPreviousThemes"'));
    assert.ok(prompt.includes('Futebol Brasileiro'), 'Prompt must explicitly list previous theme for rejection');
    assert.ok(prompt.includes('"rejectedPreviousSubAngles"'));
    assert.ok(prompt.includes('"mandatoryActiveSubAngle"'));
    assert.ok(prompt.includes(lastAngle.semanticDomain));
  });

  it('withTimeoutAndExponentialBackoff: aborts timed-out calls and retries with exponential backoff until succeeding', async () => {
    const { withTimeoutAndExponentialBackoff } = await import('../aiGameGenerator');

    let attempts = 0;
    const retryDelays: number[] = [];
    const result = await withTimeoutAndExponentialBackoff(
      async (attempt) => {
        attempts++;
        if (attempt < 2) {
          // Simulate a call that exceeds the per-attempt timeout (60ms > 25ms)
          await new Promise((r) => setTimeout(r, 60));
          return 'too-late';
        }
        return 'fast-success-on-retry';
      },
      {
        timeoutMs: 25,
        maxRetries: 2,
        baseDelayMs: 15,
        onRetry: (_attempt, _err, delayMs) => retryDelays.push(delayMs)
      }
    );

    assert.equal(result, 'fast-success-on-retry');
    assert.equal(attempts, 3);
    assert.deepEqual(retryDelays, [15, 30]);
  });

  it('localStorage RoundContentCache indexed by gameId and userTheme: persists in localStorage, serves in ~0ms, and filters SessionMemory', async () => {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear()
    };

    const {
      clearUsedRoundSignatures,
      pushToRoundContentCache,
      getRoundContentCacheSize,
      getCacheKey,
      getCachedRoundsFromLocalStorage,
      generateRoundContent
    } = await import('../aiGameGenerator');
    const { DEFAULT_GAME_CUSTOM_CONFIG } = await import('../../types/game');
    const { SessionMemoryManager } = await import('../sessionMemory');

    clearUsedRoundSignatures();

    const theme = 'Cinema e Filmes Clássicos';
    assert.equal(getCacheKey('nota', theme), 'nota::cinema e filmes clássicos');

    // Push 2 rounds into the cache: Round A (already used in SessionMemory) and Round B (fresh)
    SessionMemoryManager.addQuestion('Qual filme de terror mais assustador da história?');

    pushToRoundContentCache('nota', theme, DEFAULT_GAME_CUSTOM_CONFIG, [
      {
        data: { pergunta: 'Qual filme de terror mais assustador da história?' },
        subthemeUsed: 'Ângulo 1: Personagens',
        subAngleId: 1,
        signature: 'Qual filme de terror mais assustador da história?',
        createdAt: Date.now()
      },
      {
        data: { pergunta: 'Qual trilha sonora mais emocionante do cinema?' },
        subthemeUsed: 'Ângulo 2: Objetos e Artefatos',
        subAngleId: 2,
        signature: 'Qual trilha sonora mais emocionante do cinema?',
        createdAt: Date.now()
      }
    ]);

    assert.equal(getRoundContentCacheSize('nota', theme, DEFAULT_GAME_CUSTOM_CONFIG), 2);
    assert.equal(getCachedRoundsFromLocalStorage('nota', theme).length, 2);
    assert.ok(store.has('rb_ai_cache::nota::cinema e filmes clássicos'));

    const start = Date.now();
    // O sorteio banco x IA e aleatorio (BANK_SHARE); aqui queremos o caminho do cache de IA, entao fixamos o sorteio.
    const realRandom = Math.random;
    Math.random = () => 0.99;
    let res;
    try {
      res = await generateRoundContent('nota', theme, DEFAULT_GAME_CUSTOM_CONFIG);
    } finally {
      Math.random = realRandom;
    }
    const elapsed = Date.now() - start;

    // Must skip the stale first item rejected by SessionMemory and return the fresh second item from cache
    assert.equal(res.source, 'ai');
    assert.equal((res.data as any).pergunta, 'Qual trilha sonora mais emocionante do cinema?');
    assert.ok(elapsed < 100, `Cached round must resolve immediately (<100ms), took ${elapsed}ms`);
  });

  it('Tem ou Não Tem 10-item customization: skips 5-item cached prefetch entries and adapts 10-item rawRespostas to 10 items summing to 200 votes', async () => {
    const {
      clearUsedRoundSignatures,
      pushToRoundContentCache,
      generateRoundContent,
      generateThemeStrictFallbackRound
    } = await import('../aiGameGenerator');
    const { DEFAULT_GAME_CUSTOM_CONFIG } = await import('../../types/game');

    clearUsedRoundSignatures();
    const theme = 'Futebol, Copa do Mundo e Esportes';

    // Simulate Step 1 prefetch caching a 5-item entry (without 10 rawRespostas) and another entry with 10 rawRespostas
    pushToRoundContentCache('tem-ou-nao-tem', theme, DEFAULT_GAME_CUSTOM_CONFIG, [
      {
        data: {
          pergunta: 'Pergunta de apenas 5 itens do prefetch inicial',
          respostas: [
            { texto: 'Item 1', sinonimos_aceitos: [], votos: 40 },
            { texto: 'Item 2', sinonimos_aceitos: [], votos: 25 },
            { texto: 'Item 3', sinonimos_aceitos: [], votos: 15 },
            { texto: 'Item 4', sinonimos_aceitos: [], votos: 12 },
            { texto: 'Item 5', sinonimos_aceitos: [], votos: 8 }
          ]
        },
        subthemeUsed: 'Ângulo 1',
        subAngleId: 1,
        signature: 'Pergunta de apenas 5 itens do prefetch inicial',
        createdAt: Date.now()
      },
      {
        data: {
          pergunta: 'Quais os maiores artilheiros da história das Copas?',
          rawRespostas: [
            { texto: 'Miroslav Klose', sinonimos_aceitos: ['Klose'], votos: 38 },
            { texto: 'Ronaldo Fenômeno', sinonimos_aceitos: ['Ronaldo'], votos: 32 },
            { texto: 'Gerd Müller', sinonimos_aceitos: ['Muller'], votos: 24 },
            { texto: 'Just Fontaine', sinonimos_aceitos: ['Fontaine'], votos: 20 },
            { texto: 'Lionel Messi', sinonimos_aceitos: ['Messi'], votos: 18 },
            { texto: 'Kylian Mbappé', sinonimos_aceitos: ['Mbappe'], votos: 16 },
            { texto: 'Pelé', sinonimos_aceitos: ['Rei Pele'], votos: 15 },
            { texto: 'Jürgen Klinsmann', sinonimos_aceitos: ['Klinsmann'], votos: 13 },
            { texto: 'Sándor Kocsis', sinonimos_aceitos: ['Kocsis'], votos: 12 },
            { texto: 'Gabriel Batistuta', sinonimos_aceitos: ['Batistuta'], votos: 12 }
          ],
          respostas: [
            { texto: 'Miroslav Klose', sinonimos_aceitos: ['Klose'], votos: 38 },
            { texto: 'Ronaldo Fenômeno', sinonimos_aceitos: ['Ronaldo'], votos: 32 },
            { texto: 'Gerd Müller', sinonimos_aceitos: ['Muller'], votos: 12 },
            { texto: 'Just Fontaine', sinonimos_aceitos: ['Fontaine'], votos: 10 },
            { texto: 'Lionel Messi', sinonimos_aceitos: ['Messi'], votos: 8 }
          ]
        },
        subthemeUsed: 'Ângulo 2',
        subAngleId: 2,
        signature: 'Quais os maiores artilheiros da história das Copas?',
        createdAt: Date.now()
      }
    ]);

    const config10 = { ...DEFAULT_GAME_CUSTOM_CONFIG, temItemsCount: 10 };
    // O sorteio banco x IA e aleatorio (BANK_SHARE); aqui queremos o caminho do cache de IA, entao fixamos o sorteio.
    const realRandom = Math.random;
    Math.random = () => 0.99;
    let round10;
    try {
      round10 = await generateRoundContent('tem-ou-nao-tem', theme, config10);
    } finally {
      Math.random = realRandom;
    }
    const data10 = round10.data as any;

    assert.equal(data10.pergunta, 'Quais os maiores artilheiros da história das Copas?');
    assert.equal(data10.respostas.length, 10, 'Must return all 10 items when temItemsCount is 10');
    const sum10 = data10.respostas.reduce((acc: number, r: any) => acc + r.votos, 0);
    assert.equal(sum10, 200, 'Votes for 10 items must sum to 200');

    // Also verify fallback round for temItemsCount = 10 returns 10 items summing to 200
    const fb10 = generateThemeStrictFallbackRound('tem-ou-nao-tem', theme, theme, config10);
    const fbData = fb10.data as any;
    assert.equal(fbData.respostas.length, 10);
    const fbSum = fbData.respostas.reduce((acc: number, r: any) => acc + r.votos, 0);
    assert.equal(fbSum, 200);
  });

  it('Jogo do Limite Golden Database: contains all official questions, selects 6-8 theme-prioritized few-shot examples, embeds 7 Golden Laws in buildLimitePrompt, and formats RESPONDA EM: [UNIDADE]', async () => {
    const {
      LIMITE_GOLDEN_QUESTIONS,
      selectFewShotLimiteExamples,
      drawUnusedGoldenLimiteQuestion,
      buildLimitePrompt
    } = await import('../limiteGoldenDatabase');
    const {
      clearUsedRoundSignatures,
      generateThemeStrictFallbackRound,
      buildProceduralRoundPrompt
    } = await import('../aiGameGenerator');
    const { formatLimiteExpectedUnitLabel } = await import('../../components/host/ScreenLimite');

    clearUsedRoundSignatures();

    // 1. Verify official Golden Database structure and IDs (lim-01 .. lim-40)
    assert.ok(LIMITE_GOLDEN_QUESTIONS.length >= 40);
    assert.equal(LIMITE_GOLDEN_QUESTIONS[0].id, 'lim-01');
    assert.equal(LIMITE_GOLDEN_QUESTIONS[39].id, 'lim-40');
    for (const q of LIMITE_GOLDEN_QUESTIONS) {
      assert.ok(q.id && q.categoria && q.pergunta && q.unidade && q.curiosidade_explicacao);
      assert.equal(typeof q.valor_exato, 'number');
    }

    // 2. Verify dynamic few-shot selector returns 6 to 8 examples prioritizing the theme category
    const sportsExamples = selectFewShotLimiteExamples('Futebol e Copa do Mundo', 7);
    assert.equal(sportsExamples.length, 7);
    const sportsMatches = sportsExamples.filter((q) => q.categoria === 'Esportes & Futebol');
    assert.ok(
      sportsMatches.length >= 4,
      `Expected at least 4 Esportes & Futebol examples in 7-example few-shot set, got ${sportsMatches.length}`
    );

    // 3. Verify buildLimitePrompt and buildProceduralRoundPrompt('limite') include the 7 Golden Laws and few-shot JSON
    const promptText = buildLimitePrompt(
      'Cinema e Filmes',
      'normal',
      sportsExamples,
      ['lim-01']
    );
    assert.ok(promptText.includes('AS 7 LEIS DE OURO PARA FORMULAR UMA PERGUNTA DO "JOGO DO LIMITE"'));
    assert.ok(promptText.includes('ESTUDE ESTES EXEMPLOS PERFEITOS DO NOSSO BANCO OFICIAL'));
    assert.ok(promptText.includes('PERGUNTA CURTA E DIRETA'));
    assert.ok(promptText.includes('UNIDADE EXPLÍCITA'));
    assert.ok(promptText.includes('CURIOSIDADE COMPARATIVA NO GABARITO'));

    const fullProceduralPrompt = buildProceduralRoundPrompt('limite', 'Cinema e Filmes', 'normal');
    assert.ok(fullProceduralPrompt.includes('AS 7 LEIS DE OURO'));
    assert.ok(fullProceduralPrompt.includes('ESTUDE ESTES EXEMPLOS PERFEITOS DO NOSSO BANCO OFICIAL'));

    // 4. Verify non-repeating draws from Golden Database
    const usedIds = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const drawn = drawUnusedGoldenLimiteQuestion('Esportes & Futebol', usedIds);
      assert.ok(!usedIds.has(drawn.id), `Golden question ${drawn.id} should not repeat`);
      usedIds.add(drawn.id);
    }
    assert.equal(usedIds.size, 6);

    // Verify generateThemeStrictFallbackRound('limite') draws non-repeating Golden Questions
    const r1 = generateThemeStrictFallbackRound('limite', 'Guinness & Bizarros');
    const r2 = generateThemeStrictFallbackRound('limite', 'Guinness & Bizarros');
    assert.notEqual((r1.data as any).pergunta, (r2.data as any).pergunta);

    // 5. Verify formatLimiteExpectedUnitLabel formats RESPONDA EM: [UNIDADE]
    assert.equal(formatLimiteExpectedUnitLabel('dólares (US$)'), 'RESPONDA EM: DÓLARES (US$)');
    assert.equal(formatLimiteExpectedUnitLabel('minutos'), 'RESPONDA EM: MINUTOS');
    assert.equal(formatLimiteExpectedUnitLabel('km'), 'RESPONDA EM: QUILÔMETROS (KM)');
  });

  it('Duvido, Proibido, Nota & Tem ou Não Tem Golden Databases: verify official records, Golden Laws prompts, and sessionPersistence helpers', async () => {
    const {
      DUVIDO_GOLDEN_CATEGORIES,
      selectFewShotDuvidoExamples,
      buildDuvidoPrompt
    } = await import('../duvidoGoldenDatabase');
    const {
      PROIBIDO_GOLDEN_CARDS,
      selectFewShotProibidoExamples,
      buildProibidoPrompt
    } = await import('../proibidoGoldenDatabase');
    const {
      NOTA_GOLDEN_PROMPTS,
      selectFewShotNotaExamples,
      buildNotaPrompt
    } = await import('../notaGoldenDatabase');
    const {
      TEM_OU_NAO_TEM_GOLDEN_QUESTIONS,
      selectFewShotTemOuNaoTemExamples,
      buildTemOuNaoTemPrompt
    } = await import('../temOuNaoTemGoldenDatabase');
    const {
      ACTIVE_STATE_STORAGE_KEY,
      computePlayerSessionTrophies
    } = await import('../sessionPersistence');

    // 1. Duvido Golden Database (duv-01 .. duv-14)
    assert.equal(DUVIDO_GOLDEN_CATEGORIES.length, 14);
    assert.equal(DUVIDO_GOLDEN_CATEGORIES[0].id, 'duv-01');
    assert.equal(DUVIDO_GOLDEN_CATEGORIES[13].id, 'duv-14');
    for (const item of DUVIDO_GOLDEN_CATEGORIES) {
      assert.ok(item.categoria_secreta.length > 5);
      assert.ok(item.dica_arbitro.length > 5);
      assert.ok(item.total_itens_possiveis >= 15);
      assert.ok(Array.isArray(item.exemplos_validos) && item.exemplos_validos.length >= 15);
    }
    const duvPrompt = buildDuvidoPrompt(
      'Futebol',
      'normal',
      selectFewShotDuvidoExamples('Futebol', 5),
      []
    );
    assert.ok(duvPrompt.includes('AS 6 LEIS DE OURO PARA FORMULAR CATEGORIAS DO "JOGO DO DUVIDO"'));
    assert.ok(duvPrompt.includes('dica_arbitro'));

    // 2. Proibido Golden Database (pro-01 .. pro-18)
    assert.equal(PROIBIDO_GOLDEN_CARDS.length, 18);
    assert.equal(PROIBIDO_GOLDEN_CARDS[0].id, 'pro-01');
    assert.equal(PROIBIDO_GOLDEN_CARDS[17].id, 'pro-18');
    for (const card of PROIBIDO_GOLDEN_CARDS) {
      assert.ok(card.palavra_alvo.length >= 2);
      assert.equal(card.palavras_proibidas.length, 5);
    }
    const proPrompt = buildProibidoPrompt(
      'Cotidiano',
      5,
      'normal',
      selectFewShotProibidoExamples('Cotidiano', 6),
      []
    );
    assert.ok(proPrompt.includes('AS 6 LEIS DE OURO PARA FORMULAR CARTAS DO "JOGO DO PROIBIDO"'));

    // 3. Nota Golden Database (not-01 .. not-17)
    assert.equal(NOTA_GOLDEN_PROMPTS.length, 17);
    assert.equal(NOTA_GOLDEN_PROMPTS[0].id, 'not-01');
    assert.equal(NOTA_GOLDEN_PROMPTS[16].id, 'not-17');
    for (const n of NOTA_GOLDEN_PROMPTS) {
      assert.ok(!/\bnota\b/i.test(n.pergunta), `Nota golden question must not contain "nota": ${n.pergunta}`);
      assert.ok(!/no universo de/i.test(n.pergunta));
    }
    const notPrompt = buildNotaPrompt(
      'Filmes',
      selectFewShotNotaExamples('Filmes', 8),
      []
    );
    assert.ok(notPrompt.includes('AS 6 LEIS DE OURO PARA FORMULAR PERGUNTAS DO "JOGO DA NOTA"'));

    // 4. Tem ou Não Tem Golden Database (tont-01 .. tont-07)
    assert.equal(TEM_OU_NAO_TEM_GOLDEN_QUESTIONS.length, 7);
    assert.equal(TEM_OU_NAO_TEM_GOLDEN_QUESTIONS[0].id, 'tont-01');
    assert.equal(TEM_OU_NAO_TEM_GOLDEN_QUESTIONS[6].id, 'tont-07');
    for (const panel of TEM_OU_NAO_TEM_GOLDEN_QUESTIONS) {
      assert.equal(panel.respostas.length, 5);
      const sum = panel.respostas.reduce((acc: number, r) => acc + r.votos, 0);
      assert.equal(sum, 100, `Golden panel ${panel.id} must sum to 100 votes, got ${sum}`);
    }
    const tontPrompt = buildTemOuNaoTemPrompt(
      'Cotidiano',
      'normal',
      selectFewShotTemOuNaoTemExamples('Cotidiano', 4),
      []
    );
    assert.ok(tontPrompt.includes('AS REGRAS DE OURO PARA FORMULAR PESQUISAS DO "TEM OU NÃO TEM"'));

    // 5. Session Persistence & Trophy helpers
    assert.equal(ACTIVE_STATE_STORAGE_KEY, 'RODA_DE_BOBO_ACTIVE_STATE');
    const mockRoom: any = {
      players: [
        { id: 'p1', name: 'Cazé', score: 10, team: 'A' },
        { id: 'p2', name: 'Beltrão', score: 5, team: 'B' }
      ],
      sessionStats: {
        history: [
          {
            id: 'm1',
            winnerTeam: 'A',
            mvp: { playerId: 'p1', name: 'Cazé', team: 'A', score: 10 },
            playerScores: [
              { id: 'p1', name: 'Cazé', team: 'A', score: 10 },
              { id: 'p2', name: 'Beltrão', team: 'B', score: 5 }
            ]
          }
        ]
      }
    };
    const trophies = computePlayerSessionTrophies(mockRoom);
    assert.equal(trophies['p1'], 2);
  });
});






