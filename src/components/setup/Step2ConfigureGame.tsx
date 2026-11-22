import React, { useState, useEffect } from 'react';
import { CTMode, CTSkin,
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
import { AdedanhaCategoryEditor } from './AdedanhaCategoryEditor';
import { GEO_CATEGORIAS, GEO_REGIOES, geoPool } from '../../data/geoguessBank';
import { PONTINHOS_TEMAS, pontinhosPool } from '../../data/pontinhosBank';

type TagGroup = { label: string; tags: ReadonlyArray<{ id: string; label: string }> };
const PON_TAG_GROUPS: TagGroup[] = [{ label: 'Temas', tags: PONTINHOS_TEMAS.map((t) => ({ id: t, label: t })) }];

const GeoFilters: React.FC<{ tags: string[]; onChange: (tags: string[]) => void }> = ({ tags, onChange }) => {
  const regionTags = tags.filter(id => GEO_REGIOES.some(region => region.id === id));
  const categoryTags = tags.filter(id => GEO_CATEGORIAS.some(category => category.id === id));
  const selection = (ids: string[]) => ids.length > 1 ? '__multiple' : ids[0] || '';
  const count = geoPool(tags).length;

  return (
    <div className="rdb-opt" data-testid="geo-tags">
      <div className="rdb-geo-filters">
        <label>
          <span className="rdb-opt-label">Tema · Região</span>
          <select className="rdb-select" data-testid="geo-region" value={selection(regionTags)} onChange={event => {
            const regions = event.target.value ? [event.target.value] : [];
            const next = [...regions, ...categoryTags];
            onChange(geoPool(next).length ? next : regions);
          }}>
            <option value="">Mundo todo</option>
            {regionTags.length > 1 && <option value="__multiple" disabled>Várias regiões salvas</option>}
            {GEO_REGIOES.map(region => <option key={region.id} value={region.id}>{region.label}</option>)}
          </select>
        </label>
        <label>
          <span className="rdb-opt-label">Subtema · Tipo de lugar</span>
          <select className="rdb-select" data-testid="geo-category" value={selection(categoryTags)} onChange={event =>
            onChange(event.target.value ? [...regionTags, event.target.value] : regionTags)
          }>
            <option value="">Todos os tipos</option>
            {categoryTags.length > 1 && <option value="__multiple" disabled>Vários tipos salvos</option>}
            {GEO_CATEGORIAS.map(category => {
              const amount = geoPool([...regionTags, category.id]).length;
              return <option key={category.id} value={category.id} disabled={!amount}>{category.label} ({amount})</option>;
            })}
          </select>
        </label>
        <span className="rdb-tags-count" data-testid="geo-tags-count" aria-live="polite">
          {count ? `${count} ${count === 1 ? 'lugar disponível' : 'lugares disponíveis'}` : 'Sem lugares neste filtro salvo. Selecione outro tipo.'}
        </span>
      </div>
    </div>
  );
};

const TagPicker: React.FC<{
  testid: string;
  groups: TagGroup[];
  selected: string[];
  count: (sel: string[]) => number;
  noun: [string, string];
  onChange: (next: string[]) => void;
}> = ({ testid, groups, selected, count, noun, onChange }) => {
  const n = count(selected);
  const toggle = (id: string) => {
    sounds.playTick();
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className="rdb-opt" data-testid={testid}>
      <span className="rdb-opt-label">Temas</span>
      <div className="rdb-tags">
        {groups.map((g) => {
          const none = !g.tags.some((t) => selected.includes(t.id));
          return (
            <div className="rdb-tags-group" key={g.label}>
              {groups.length > 1 && <span>{g.label}</span>}
              <button
                type="button"
                className="rdb-seg"
                aria-pressed={none}
                data-testid={`${testid}-all-${g.label}`}
                onClick={() => {
                  sounds.playTick();
                  onChange(selected.filter((x) => !g.tags.some((t) => t.id === x)));
                }}
              >
                {g.label === 'Onde' ? 'Todos os países' : 'Todos'}
              </button>
              {g.tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rdb-seg"
                  aria-pressed={selected.includes(t.id)}
                  data-testid={`${testid}-${t.id}`}
                  onClick={() => toggle(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          );
        })}
        <span className={'rdb-tags-count' + (n === 0 ? ' is-empty' : '')} data-testid={`${testid}-count`}>
          {n === 0 ? 'Nenhum com essa combinação: o jogo usa o banco inteiro' : `${n} ${n === 1 ? noun[0] : noun[1]} nessa combinação`}
        </span>
      </div>
    </div>
  );
};
import {
  ADEDANHA_LETRAS_EXCLUIDAS_PADRAO,
  ADEDANHA_PADRAO
} from '../../data/adedanhaCategorias';


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
  /** Troca o jogo sem sair do setup (modos que sao jogos irmaos, como Quem Sou Eu / Onde Estou). */
  onSwitchGame?: (gameId: GameId) => void;
}

/** Modos do Quem Sou Eu: o classico (identidades) e o Onde Estou (grandes momentos do esporte). */
const QSE_MODES: Array<{ id: GameId; label: string }> = [
  { id: 'quem-sou-eu', label: 'Quem Sou Eu clássico' },
  { id: 'onde-estou', label: 'Onde Estou' }
];

const TIMER_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 30, label: '30 s', desc: 'Rápido' },
  { value: 60, label: '60 s', desc: 'Padrão Oficial' },
  { value: 90, label: '90 s', desc: 'Com calma' },
  { value: 0, label: 'Livre', desc: 'Sem limite' }
];

/** Adedanha: tempo por rodada no estilo do Stop (rapido, medio, lento) ou sem tempo. */
const AD_TIMER_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 60, label: 'Rápido', desc: '60 segundos por rodada' },
  { value: 90, label: 'Médio', desc: '90 segundos por rodada (padrão)' },
  { value: 150, label: 'Lento', desc: '2 minutos e 30 por rodada' },
  { value: 0, label: 'Sem tempo', desc: 'A rodada só para no STOP' }
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

const CT_MODES: CTMode[] = ['arquiteto', 'diabo'];
const CT_SKINS: Array<{ value: CTSkin; label: string }> = [
  { value: 'clean', label: 'Clean' },
  { value: 'classic', label: 'Clássica' },
  { value: 'cartoon', label: 'Cartoon BR' }
];
const CT_VARIANTS: Array<{ value: 'mare' | 'contratos'; label: string }> = [
  { value: 'mare', label: 'Maré Alta' },
  { value: 'contratos', label: 'Contratos' }
];
const CT_MODE_NOTES: Record<CTMode, string[]> = {
  arquiteto: [
    'Reserva · Bärenpark brasileiro: cada um monta o próprio parque com até 4 áreas de 4×4',
    'Cubra Carriola (Área Verde), Betoneira (Viveiro), Cavadeira (12 Cercados únicos) e Equipe de Obra (nova área)',
    'Área completa ganha o Monumento do topo; quem completar 4 áreas dispara a última volta (até 8 jogadores)'
  ],
  diabo: [
    'Mapa grande e diferente a cada partida, um só para todos; cada um joga na sua vez',
    'Cada bloco vale 1; quadrado da sua cor vale mais: 2×2 +3, 3×3 +8, 4×4 +15, 5×5 +24',
    '3 diabinhos por partida para sabotar o mapa; ponte passa sobre a água'
  ],
  fronteiras: [
    'Cada um começa na própria base 5x5, ligada a uma ilha central',
    'As peças crescem em trilha contínua até a ilha',
    'A ilha tem as fichas de maior valor (e as armadilhas)'
  ]
};

const DIFFICULTY_LIST: GameDifficulty[] = ['facil', 'medio', 'dificil', 'impossivel'];

/** Jogos que tem ajustes exclusivos (abrem na janela "Mais ajustes deste jogo"). */


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
  gameTitle,
  onSwitchGame
}) => {
  const isQSE = activeGame === 'quem-sou-eu' || activeGame === 'onde-estou';
  const isGeo = activeGame === 'estadios';
  const isPon = activeGame === 'pontinhos';
  const usesTags = isGeo || isPon;
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
    activeGame === 'pontinhos' ||
    activeGame === 'adedanha' ||
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
  type ExtraRow = { id: string; label: string; select?: boolean; options: Array<{ id: string; label: string; on: boolean; pick: () => void }> };
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
      : activeGame === 'adedanha'
      ? [
          { select: true, ...pickRow('ad-stop', 'Quem pede STOP', customConfig.adedanhaStopRule || 'first', [
            ['first', 'Quem terminar primeiro', { adedanhaStopRule: 'first' }],
            ['majority', 'A maioria', { adedanhaStopRule: 'majority' }],
            ['host', 'Só o diretor', { adedanhaStopRule: 'host' }],
            ['none', 'Ninguém (só o tempo)', { adedanhaStopRule: 'none' }]
          ]) },
          { select: true, ...pickRow('ad-letras', 'Letras difíceis', (customConfig.adedanhaExcludedLetters ?? ADEDANHA_LETRAS_EXCLUIDAS_PADRAO).length > 0, [
            [true, 'Fora (K, W, Y, X, Q)', { adedanhaExcludedLetters: ADEDANHA_LETRAS_EXCLUIDAS_PADRAO }],
            [false, 'Todas as letras', { adedanhaExcludedLetters: [] }]
          ]) }
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
    <div data-testid="step2-configure-game" className={'rdb-setup' + (activeGame === 'adedanha' ? ' is-dense' : '')}>
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
          {isCT && ctMode === 'diabo' && (
            <div className="rdb-opt" data-testid="ct-variant-selector">
              <span className="rdb-opt-label">Variantes</span>
              <div className="rdb-opt-choices">
                {CT_VARIANTS.map((o) => {
                  const on = !!customConfig.ctVariants?.[o.value];
                  return (
                    <Seg
                      key={o.value}
                      testid={'ct-variant-btn-' + o.value}
                      on={on}
                      onClick={() =>
                        onChangeCustomConfig((prev) => ({ ...prev, ctVariants: { ...(prev.ctVariants || {}), [o.value]: !on } }))
                      }
                    >
                      {o.label}
                    </Seg>
                  );
                })}
              </div>
            </div>
          )}
          {isCT && ctMode === 'arquiteto' && (
            <div className="rdb-opt" data-testid="ct-skin-selector">
              <span className="rdb-opt-label">Visual</span>
              <div className="rdb-opt-choices">
                {CT_SKINS.map((o) => (
                  <Seg
                    key={o.value}
                    testid={'ct-skin-btn-' + o.value}
                    on={(customConfig.ctSkin || 'classic') === o.value}
                    onClick={() => onChangeCustomConfig((prev) => ({ ...prev, ctSkin: o.value }))}
                  >
                    {o.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {isQSE && (
            <div className="rdb-opt" data-testid="qse-mode-selector">
              <span className="rdb-opt-label">Modo</span>
              <div className="rdb-opt-choices">
                {QSE_MODES.map((m) => (
                  <Seg
                    key={m.id}
                    testid={'qse-mode-btn-' + m.id}
                    on={activeGame === m.id}
                    onClick={() => activeGame !== m.id && onSwitchGame?.(m.id)}
                  >
                    {m.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {isGeo && (
            <GeoFilters
              tags={customConfig.geoTags || []}
              onChange={(next) => onChangeCustomConfig((prev) => ({ ...prev, geoTags: next }))}
            />
          )}
          {isPon && (
            <TagPicker
              testid="pon-tags"
              groups={PON_TAG_GROUPS}
              selected={customConfig.pontinhosTemas || []}
              count={(sel) => pontinhosPool(sel).length}
              noun={['resposta', 'respostas']}
              onChange={(next) => onChangeCustomConfig((prev) => ({ ...prev, pontinhosTemas: next }))}
            />
          )}

          {!isPV && !isCT && !usesTags && activeGame !== 'adedanha' && (
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

          {!isPV && !isCT && !usesTags && activeGame !== 'adedanha' && (
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
                {(activeGame === 'adedanha' ? AD_TIMER_OPTIONS : TIMER_OPTIONS).map((opt) => (
                  <Seg key={opt.value} testid={`timer-btn-${opt.value}`} on={timer === opt.value} onClick={() => onChangeTimer(opt.value)} title={opt.desc}>
                    {opt.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {isCT && ctMode === 'arquiteto' ? null : activeGame === 'adedanha' ? (
            <div className="rdb-opt">
              <span className="rdb-opt-label">Rodadas</span>
              <div className="rdb-opt-choices rdb-adstep" data-testid="ad-rounds-stepper">
                <button type="button" className="rdb-seg" aria-label="Menos uma rodada" data-testid="ad-rounds-minus" disabled={rounds <= 1} onClick={() => onChangeRounds(Math.max(1, rounds - 1))}>
                  −
                </button>
                <strong data-testid="ad-rounds-value">{rounds} {rounds === 1 ? 'rodada' : 'rodadas'}</strong>
                <button type="button" className="rdb-seg" aria-label="Mais uma rodada" data-testid="ad-rounds-plus" disabled={rounds >= 30} onClick={() => onChangeRounds(Math.min(30, rounds + 1))}>
                  +
                </button>
              </div>
            </div>
          ) : (
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
          )}

          {activeGame === 'adedanha' && (
            <AdedanhaCategoryEditor
              categories={customConfig.adedanhaCategories ?? ADEDANHA_PADRAO}
              onChange={(next) => onChangeCustomConfig((prev) => ({ ...prev, adedanhaCategories: next }))}
            />
          )}

          {extraRows.map((row) => (
            <div className="rdb-opt" key={row.id} data-testid={'setup-extra-' + row.id}>
              <span className="rdb-opt-label">{row.label}</span>
              {row.select ? (
                <div className="rdb-opt-choices">
                  <select
                    className="rdb-select"
                    data-testid={`setup-extra-${row.id}-select`}
                    value={row.options.find((o) => o.on)?.id ?? row.options[0]?.id}
                    onChange={(e) => row.options.find((o) => o.id === e.target.value)?.pick()}
                  >
                    {row.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
              <div className="rdb-opt-choices">
                {row.options.map((o) => (
                  <Seg key={o.id} testid={`setup-extra-${row.id}-${o.id}`} on={o.on} onClick={o.pick}>
                    {o.label}
                  </Seg>
                ))}
              </div>
              )}
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
