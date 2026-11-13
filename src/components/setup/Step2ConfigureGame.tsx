import React, { useState, useEffect } from 'react';
import { CTMode,
  GameId,
  GameCustomConfig,
  GameDifficulty
} from '../../types/game';
import { DIFFICULTY_META } from '../../utils/multiplayerRoomEngine';
import { getTemTotalRespondents } from '../../utils/aiGameGenerator';
import { sounds } from '../../utils/soundEffects';
import {
  getRulesetPreset,
  limiteExactBonusFor
} from '../../config/rulesets';
import {
  Sparkles,
  RefreshCw,
  Dices,
  Clock,
  Target,
  Sliders,
  Infinity as InfinityIcon,
  ArrowRight,
  Play,
  Flame,
  Check,
  Search,
  BookOpen,
  User,
  Users
} from 'lucide-react';
import { ThemeSection } from './step2/ThemeSection';
import { POPULAR_THEMES } from './step2/popularThemes';
import { GameCardArt } from '../art/GameCardArt';
import { CT_MODE_LABEL } from '../../utils/comTerraEngine';
import { usesLocalContent } from '../../config/localGames';

export interface Step2ConfigureGameProps {
  activeGame: GameId;
  theme: string;
  onChangeTheme: (nextTheme: string) => void;
  dynamicThemes: string[];
  isGeneratingThemes: boolean;
  onGenerateAiThemes: () => void;
  onRollRandomTheme: () => void;
  difficulty: GameDifficulty;
  onChangeDifficulty: (nextDifficulty: GameDifficulty) => void;
  timer: number;
  onChangeTimer: (nextTimer: number) => void;
  rounds: number;
  onChangeRounds: (nextRounds: number) => void;
  customConfig: GameCustomConfig;
  onChangeCustomConfig: React.Dispatch<React.SetStateAction<GameCustomConfig>>;
  onContinueToMode?: () => void;
  onProceedToTeams?: () => void;
  onStartDirectly?: () => void;
  onGoToRules?: () => void;
  onBackToLobby?: () => void;
  onToggleTeamsDrawer?: () => void;
  connectedPlayersCount?: number;
  connectionMode?: string;
  /** Nome do jogo, mostrado no cartaz. */
  gameTitle?: string;
}

const TIMER_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 30, label: '30 s', desc: 'Rápido' },
  { value: 60, label: '60 s', desc: 'Padrão Oficial' },
  { value: 90, label: '90 s', desc: 'Com calma' },
  { value: 0, label: 'Livre', desc: 'Sem limite' }
];

const ROUND_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 3, label: '3 Rodadas', desc: 'Partida Rápida' },
  { value: 5, label: '5 Rodadas', desc: 'Padrão Oficial' },
  { value: 7, label: '7 Rodadas', desc: 'Desafio Longo' },
  { value: 10, label: '10 Rodadas', desc: 'Maratona' }
];

const PV_ROUND_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 1, label: '1 Jogo', desc: 'Morte Súbita' },
  { value: 3, label: 'MD3', desc: 'Primeiro a 2' },
  { value: 5, label: 'MD5', desc: 'Primeiro a 3' },
  { value: 7, label: 'MD7', desc: 'Primeiro a 4' },
  { value: 9, label: 'MD9', desc: 'Primeiro a 5' }
];

const CT_MODES: CTMode[] = ['arquiteto', 'diabo', 'fronteiras'];
const CT_MODE_NOTES: Record<CTMode, string[]> = {
  arquiteto: [
    'Cada jogador monta o próprio tabuleiro 8x8; na TV aparecem todos',
    'Turnos em rodízio: pegue uma peça da loja e encaixe',
    'Linha ou coluna cheia vale +2'
  ],
  diabo: [
    'Um mapa só para todos, diferente a cada partida',
    'Rodada em 3 fases: escolher a peça, sabotar o mapa e colocar',
    'Quem pega a menor peça joga primeiro; a maior vale mais e joga por último'
  ],
  fronteiras: [
    'Cada um começa na própria base 5x5, ligada a uma ilha central',
    'As peças crescem em trilha contínua até a ilha',
    'A ilha tem as fichas de maior valor (e as armadilhas)'
  ]
};

const DIFFICULTY_LIST: GameDifficulty[] = ['facil', 'medio', 'dificil', 'impossivel'];

/** Jogos que tem ajustes exclusivos (abrem na janela "Mais ajustes deste jogo"). */
/** DAD-05: de onde vem o conteudo das perguntas. */
const CONTENT_SOURCES: Array<{ value: NonNullable<GameCustomConfig['contentSource']>; label: string; hint: string }> = [
  { value: 'auto', label: 'Misto', hint: 'Banco pronto + IA, sem repetir' },
  { value: 'bank', label: 'Só banco pronto', hint: 'Itens do programa e revisados; não chama a IA' },
  { value: 'ai', label: 'Só IA', hint: 'Conteúdo novo gerado na hora' }
];


export const Step2ConfigureGame: React.FC<Step2ConfigureGameProps> = React.memo(({
  activeGame,
  theme,
  onChangeTheme,
  dynamicThemes,
  isGeneratingThemes,
  onGenerateAiThemes,
  onRollRandomTheme,
  difficulty,
  onChangeDifficulty,
  timer,
  onChangeTimer,
  rounds,
  onChangeRounds,
  customConfig,
  onChangeCustomConfig,
  onProceedToTeams,
  onStartDirectly,
  onGoToRules,
  onBackToLobby,
  connectedPlayersCount,
  gameTitle
}) => {
  const isPV = activeGame === 'perguntas-e-verdades';
  const isCT = activeGame === 'com-terra';
  const ctMode: CTMode = customConfig.ctMode || 'arquiteto';
  const isIndividualMode =
    isCT ||
    activeGame === 'limite' ||
    activeGame === 'nota' ||
    activeGame === 'quem-sou-eu' ||
    activeGame === 'onde-estou' ||
    activeGame === 'respostas-sem-perguntas' ||
    activeGame === 'estadios' ||
    activeGame === 'perguntas-e-verdades';

  const [isAllThemesExpanded, setIsAllThemesExpanded] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Esc fecha a janela do tema
  useEffect(() => {
    if (!isThemeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsThemeOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isThemeOpen]);

  // As regras do programa sao o padrao de cada jogo; o host ajusta o que quiser nas linhas ao lado.
  const showPreset = getRulesetPreset(activeGame, 'show');
  // Garante que o numero de rodadas vindo do preset (ex.: 9 no Duvido) apareca como opcao.
  const roundOptions = ROUND_OPTIONS.some((o) => o.value === rounds)
    ? ROUND_OPTIONS
    : [...ROUND_OPTIONS, { value: rounds, label: rounds + ' Rodadas', desc: 'Regras do programa' }].sort(
        (a, b) => a.value - b.value
      );

  // For Perguntas e Verdades, rounds must be [1, 3, 5, 7, 9] (defaults to 3 if outside)
  useEffect(() => {
    if (isPV && ![1, 3, 5, 7, 9].includes(rounds)) {
      onChangeRounds(3);
    }
  }, [isPV, rounds, onChangeRounds]);

  // Ajustes exclusivos de cada jogo, como linhas da propria tela (antes ficavam numa janela a parte).
  type ExtraRow = { id: string; label: string; options: Array<{ id: string; label: string; on: boolean; pick: () => void }> };
  const set = (patch: Partial<GameCustomConfig>) => () => onChangeCustomConfig((prev) => ({ ...prev, ...patch }));
  const pickRow = <T extends string | number | boolean>(
    id: string,
    label: string,
    current: T,
    options: Array<[T, string, Partial<GameCustomConfig>]>
  ): ExtraRow => ({
    id,
    label,
    options: options.map(([value, text, patch]) => ({ id: String(value), label: text, on: current === value, pick: set(patch) }))
  });
  const extraRows: ExtraRow[] =
    activeGame === 'limite'
      ? [
          pickRow('limite-cartas', 'Cartas de poder', !!customConfig.limiteEnablePowerCards, [
            [true, 'Ligadas', { limiteEnablePowerCards: true }],
            [false, 'Desligadas', { limiteEnablePowerCards: false }]
          ]),
          pickRow('limite-bonus', 'Bônus por cravar', limiteExactBonusFor(customConfig), [
            [0, 'Sem bônus', { limiteExactBonus: 0 }],
            [2, '2 pontos', { limiteExactBonus: 2 }],
            [3, '3 pontos', { limiteExactBonus: 3 }]
          ])
        ]
      : activeGame === 'nota'
      ? [
          pickRow('nota-escala', 'Escala da nota', `${customConfig.notaScaleMin ?? 1}-${customConfig.notaScaleMax ?? 10}`, [
            ['1-5', '1 a 5', { notaScaleMin: 1, notaScaleMax: 5 }],
            ['1-10', '1 a 10', { notaScaleMin: 1, notaScaleMax: 10 }],
            ['0-10', '0 a 10', { notaScaleMin: 0, notaScaleMax: 10 }],
            ['1-20', '1 a 20', { notaScaleMin: 1, notaScaleMax: 20 }]
          ])
        ]
      : activeGame === 'tem-ou-nao-tem'
      ? [
          pickRow('tem-respostas', 'Painel', customConfig.temItemsCount, [
            [5, 'Top 5', { temItemsCount: 5 }],
            [6, 'Top 6', { temItemsCount: 6 }],
            [8, 'Top 8', { temItemsCount: 8 }],
            [10, 'Top 10', { temItemsCount: 10 }]
          ]),
          pickRow('tem-erros', 'Erros por equipe', customConfig.temMaxStrikes, [
            [1, '1', { temMaxStrikes: 1 }],
            [2, '2', { temMaxStrikes: 2 }],
            [3, '3', { temMaxStrikes: 3 }]
          ])
        ]
      : activeGame === 'proibido'
      ? [
          pickRow('proibido-cartas', 'Nº de cartas', customConfig.proibidoCardsCount, [
            [3, '3', { proibidoCardsCount: 3 }],
            [5, '5', { proibidoCardsCount: 5 }],
            [7, '7', { proibidoCardsCount: 7 }],
            [10, '10', { proibidoCardsCount: 10 }]
          ]),
          pickRow('proibido-proibidas', 'Nº de proibidas', customConfig.proibidoForbiddenCount, [
            [3, '3', { proibidoForbiddenCount: 3 }],
            [5, '5', { proibidoForbiddenCount: 5 }],
            [6, '6', { proibidoForbiddenCount: 6 }]
          ])
        ]
      : activeGame === 'duvido'
      ? [
          pickRow('duvido-lance', 'Lance inicial', customConfig.duvidoStartingBid, [
            [1, '1 item', { duvidoStartingBid: 1 }],
            [2, '2 itens', { duvidoStartingBid: 2 }],
            [3, '3 itens', { duvidoStartingBid: 3 }]
          ])
        ]
      : activeGame === 'perguntas-e-verdades'
      ? [
          pickRow('pv-baralho', 'Baralho', customConfig.pvDeckStyle || 'padrao', [
            ['padrao', 'Padrão', { pvDeckStyle: 'padrao' }],
            ['compacto', 'Compacto', { pvDeckStyle: 'compacto' }],
            ['holografico', 'Holográfico', { pvDeckStyle: 'holografico' }]
          ]),
          pickRow('pv-cartas', 'Cartas', customConfig.pvDeckMode, [
            ['assisted', 'Digital na TV', { pvDeckMode: 'assisted' }],
            ['physical', 'Baralho físico', { pvDeckMode: 'physical' }]
          ])
        ]
      : [];

  const isGeneralTheme = !theme || theme.trim().toLowerCase() === 'geral';

  const Seg = (p: { testid: string; on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      data-testid={p.testid}
      aria-pressed={p.on}
      title={p.title}
      onClick={() => {
        sounds.playTick();
        p.onClick();
      }}
      className="rdb-seg"
    >
      {p.children}
    </button>
  );

  return (
    <div data-testid="step2-configure-game" className="rdb-setup">
      <div className="rdb-setup-body">
        {/* CARTAZ DO JOGO: vinheta, nome e o resumo das regras do modo escolhido */}
        <aside className="rdb-setup-poster" data-testid="setup-poster">
          <div className="rdb-setup-poster-art">
            <GameCardArt gameId={activeGame} />
          </div>
          <div className="rdb-setup-poster-text">
            <span className="rdb-tag">{isIndividualMode ? 'Individual' : 'Em equipes'}</span>
            <h2 className="rdb-setup-title">{gameTitle || 'Jogo'}</h2>
            {showPreset ? (
              <ul data-testid="ruleset-notes" className="rdb-setup-notes">
                {showPreset.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : isCT ? (
              <ul data-testid="ct-mode-notes" className="rdb-setup-notes">
                {CT_MODE_NOTES[ctMode].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="rdb-setup-notes">Ajuste o ritmo do jeito que a roda preferir.</p>
            )}
          </div>
        </aside>

        {/* ESCOLHAS: uma linha por decisao, rotulo a esquerda e opcoes a direita */}
        <div className={'rdb-setup-rows' + (extraRows.length > 0 ? ' rdb-setup-rows--dense' : '')}>
          {isCT && (
            <div className="rdb-opt" data-testid="ct-mode-selector">
              <span className="rdb-opt-label">Modo</span>
              <div className="rdb-opt-choices">
                {CT_MODES.map((m) => (
                  <Seg
                    key={m}
                    testid={'ct-mode-btn-' + m}
                    on={ctMode === m}
                    onClick={() => onChangeCustomConfig((prev) => ({ ...prev, ctMode: m }))}
                  >
                    {CT_MODE_LABEL[m]}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {!isPV && !isCT && (
            <div className="rdb-opt" data-testid="setup-theme-row">
              <span className="rdb-opt-label">Tema</span>
              <div className="rdb-opt-choices">
                <span className="rdb-opt-value" data-testid="setup-theme-current">
                  {isGeneralTheme ? 'Assuntos diversos' : theme}
                </span>
                <button
                  type="button"
                  data-testid="setup-theme-open-btn"
                  className="rdb-seg rdb-seg--action"
                  onClick={() => {
                    sounds.playTick();
                    setIsThemeOpen(true);
                  }}
                >
                  Trocar tema
                </button>
              </div>
            </div>
          )}

          {!isPV && !isCT && (
            <div className="rdb-opt">
              <span className="rdb-opt-label">Dificuldade</span>
              <div className="rdb-opt-choices">
                {DIFFICULTY_LIST.map((diffKey) => (
                  <Seg
                    key={diffKey}
                    testid={`difficulty-btn-${diffKey}`}
                    on={difficulty === diffKey}
                    onClick={() => onChangeDifficulty(diffKey)}
                    title={DIFFICULTY_META[diffKey].description}
                  >
                    {DIFFICULTY_META[diffKey].shortLabel || DIFFICULTY_META[diffKey].label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {!isCT && (
            <div className="rdb-opt">
              <span className="rdb-opt-label">Tempo por rodada</span>
              <div className="rdb-opt-choices">
                {TIMER_OPTIONS.map((opt) => (
                  <Seg key={opt.value} testid={`timer-btn-${opt.value}`} on={timer === opt.value} onClick={() => onChangeTimer(opt.value)} title={opt.desc}>
                    {opt.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          <div className="rdb-opt">
            <span className="rdb-opt-label">{isPV ? 'Série de jogos' : 'Rodadas'}</span>
            <div className="rdb-opt-choices">
              {(isPV ? PV_ROUND_OPTIONS : roundOptions).map((opt) => (
                <Seg key={opt.value} testid={`rounds-btn-${opt.value}`} on={rounds === opt.value} onClick={() => onChangeRounds(opt.value)} title={opt.desc}>
                  {isPV ? opt.label : opt.value}
                </Seg>
              ))}
            </div>
          </div>

          {!usesLocalContent(activeGame) && !isPV && (
            <div className="rdb-opt" data-testid="content-source-selector">
              <span className="rdb-opt-label">Perguntas</span>
              <div className="rdb-opt-choices">
                {CONTENT_SOURCES.map((o) => (
                  <Seg
                    key={o.value}
                    testid={'content-source-btn-' + o.value}
                    on={(customConfig.contentSource ?? 'auto') === o.value}
                    onClick={() => onChangeCustomConfig((prev) => ({ ...prev, contentSource: o.value }))}
                    title={o.hint}
                  >
                    {o.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {extraRows.map((row) => (
            <div className="rdb-opt" key={row.id} data-testid={'setup-extra-' + row.id}>
              <span className="rdb-opt-label">{row.label}</span>
              <div className="rdb-opt-choices">
                {row.options.map((o) => (
                  <Seg key={o.id} testid={`setup-extra-${row.id}-${o.id}`} on={o.on} onClick={o.pick}>
                    {o.label}
                  </Seg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* JANELA: escolha do tema (busca, sortear, sugerir com IA e todas as categorias) */}
      {isThemeOpen && !isPV && (
        <div className="rdb-sheet-backdrop" data-testid="setup-theme-sheet" onClick={() => setIsThemeOpen(false)}>
          <div className="rdb-sheet" role="dialog" aria-modal="true" aria-label="Escolher tema" onClick={(e) => e.stopPropagation()}>
            <div className="rdb-sheet-head">
              <h3>Escolher tema</h3>
              <button type="button" className="rdb-seg rdb-seg--action" data-testid="setup-theme-close-btn" onClick={() => setIsThemeOpen(false)}>
                Pronto
              </button>
            </div>
            <div className="rdb-sheet-body">
              <ThemeSection isGeneralTheme={isGeneralTheme} theme={theme} onChangeTheme={onChangeTheme} onRollRandomTheme={onRollRandomTheme} isGeneratingThemes={isGeneratingThemes} onGenerateAiThemes={onGenerateAiThemes} setIsAllThemesExpanded={setIsAllThemesExpanded} isAllThemesExpanded={isAllThemesExpanded} dynamicThemes={dynamicThemes} />
            </div>
          </div>
        </div>
      )}

      <div className="rdb-setup-foot">
        {onBackToLobby ? (
          <button
            type="button"
            data-testid="setup-back-btn"
            className="rdb-btn"
            onClick={() => {
              sounds.playFlip();
              onBackToLobby();
            }}
          >
            Voltar ao catálogo
          </button>
        ) : (
          <span />
        )}
        <div className="rdb-setup-foot-actions">
          {onProceedToTeams && (
            <button
              type="button"
              data-testid="step2-proceed-to-teams-btn"
              className="rdb-btn"
              onClick={() => {
                sounds.playTick();
                onProceedToTeams();
              }}
            >
              {isIndividualMode ? `Jogadores (${connectedPlayersCount ?? '—'})` : `Equipes (${connectedPlayersCount ?? '—'} jogadores)`}
            </button>
          )}
          {onGoToRules && (
            <button
              type="button"
              data-testid="step2-continue-to-mode-btn"
              className="rdb-btn"
              onClick={() => {
                sounds.playTick();
                onGoToRules();
              }}
            >
              Como jogar
            </button>
          )}
          {onStartDirectly && (
            <button
              type="button"
              data-testid="setup-start-direct-btn"
              className="rdb-btn rdb-setup-start"
              onClick={() => {
                sounds.playPowerup();
                onStartDirectly();
              }}
            >
              Iniciar jogo
              <ArrowRight />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
