import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  Check,
  Clock,
  Eraser,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Info,
  Pencil,
  Redo2,
  RotateCcw,
  Swords,
  Trash2,
  Undo2,
  X as XIcon
} from 'lucide-react';
import { ComoEuPintoState, DrawStroke, GameRoom } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { TEAM_META } from '../../utils/teamUtils';
import { resolvePublicShareOrigin } from '../../utils/multiplayerRoomEngine';
import { DrawingCanvas } from '../DrawingCanvas';
import { DynamicQRCode } from '../DynamicQRCode';
import {
  PINTO_BRUSH_PRESETS,
  PINTO_COLORS,
  PINTO_PAPER_COLOR,
  addStroke,
  clearDrawing,
  dismissTvWordReveal,
  endDrawing,
  finishSteal,
  markDrawn,
  pintoRoundPoints,
  redoStroke,
  setLiveStroke,
  skipWord,
  startPintoWithMode,
  stealWord,
  tickPintoTimer,
  undoStroke
} from '../../utils/comoEuPintoEngine';

interface ScreenComoEuPintoProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdatePintoState: (updater: (prev: ComoEuPintoState) => ComoEuPintoState) => void;
  onNextRound: () => void;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ScreenComoEuPinto: React.FC<ScreenComoEuPintoProps> = ({ room, onUpdatePintoState, onNextRound }) => {
  const st = room.comoEuPinto;
  const updateRef = useRef(onUpdatePintoState);
  updateRef.current = onUpdatePintoState;
  const [color, setColor] = useState<string>(PINTO_COLORS[0]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState<number>(0.011);
  const [opacity, setOpacity] = useState<number>(1);

  useEffect(() => {
    if (!st || room.timerConfig === 0 || st.phase !== 'PLAYING' || !st.timerActive) return;
    const interval = setInterval(() => {
      updateRef.current((prev) => {
        const next = tickPintoTimer(prev);
        if (next.phase !== 'PLAYING' && prev.phase === 'PLAYING') sounds.playBuzzer();
        else if (next.timerSeconds <= 10 && next.timerSeconds > 0) sounds.playTick(next.timerSeconds);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, st?.phase, st?.timerActive]);

  if (!st) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada...</div>;
  }

  const drawer = room.players.find((p) => p.id === st.drawerPlayerId);
  const guesser = room.players.find((p) => p.id === st.guesserPlayerId);
  const teamMeta = TEAM_META[st.drawTeam];
  const teamName = room.teams[st.drawTeam]?.name || teamMeta.defaultName;
  const rivalName = st.rivalTeam ? room.teams[st.rivalTeam]?.name || TEAM_META[st.rivalTeam].defaultName : '';
  const isShow = isShowRuleset(room.customConfig);
  const isLocalRoom = room.connectionMode === 'local';
  const free = room.timerConfig === 0;
  const hits = st.outcomes.filter((o) => o === 'correct').length;
  const pts = pintoRoundPoints(st);
  const openCount = st.outcomes.filter((o) => o === 'pending').length;

  const isTvDrawingMode = st.inputMode === 'tv';
  const activeColor = tool === 'eraser' ? PINTO_PAPER_COLOR : color;
  const activeOpacity = tool === 'eraser' ? 1 : opacity;
  const shareOrigin = resolvePublicShareOrigin();
  const padJoinUrl = `${shareOrigin}/?join=${room.roomId}&role=client&pad=1`;

  const startLocalTv = () => {
    sounds.playPowerup();
    onUpdatePintoState((prev) => startPintoWithMode(prev, 'tv', room.timerConfig > 0, isLocalRoom));
  };
  const startPadOrHost = () => {
    sounds.playPowerup();
    onUpdatePintoState((prev) => startPintoWithMode(prev, 'pad', room.timerConfig > 0, isLocalRoom));
  };
  const onStroke = (s: DrawStroke) => onUpdatePintoState((prev) => addStroke(prev, s));
  const hit = () => {
    sounds.playSuccess();
    onUpdatePintoState((prev) => {
      const next = markDrawn(prev);
      if (next.phase === 'SUMMARY' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 42, spread: 55, disableForReducedMotion: true });
      }
      return next;
    });
  };

  const clock = free ? 'Livre' : fmt(st.timerSeconds);
  const clockHot = !free && st.timerSeconds <= 10 && st.phase === 'PLAYING';

  return (
    <div data-testid="pinto-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Como eu pinto
          <span className="rdb-lim-round">{teamName}</span>
          {isShow && (
            <span data-testid="pinto-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: sem letras nem números">
              programa
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Quem desenha não pode escrever letras ou números nem falar da palavra. Quando o tempo acaba, a dupla rival tenta as palavras que faltaram.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="pinto-timer-display" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={free ? 'Sem limite de tempo' : 'Tempo da rodada'}>
            {free ? <InfinityIcon size={16} /> : <Clock size={16} />}
            {clock}
          </span>
          {st.phase === 'PLAYING' && isTvDrawingMode && !st.tvRevealGate && (
            <button
              type="button"
              data-testid="pinto-toggle-word-btn"
              className={'rdb-lim-icon' + (st.wordHidden ? '' : ' is-on')}
              aria-pressed={!st.wordHidden}
              aria-label={st.wordHidden ? 'Mostrar a palavra' : 'Ocultar a palavra'}
              data-tip={st.wordHidden ? 'Espiar a palavra na TV' : 'Ocultar a palavra na TV'}
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => ({ ...prev, wordHidden: !prev.wordHidden }));
              }}
            >
              {st.wordHidden ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          )}
        </div>
      </header>
      <span className="sr-only">
        <span data-testid="pinto-drawer-name">{drawer?.name || '—'}</span>
        <span data-testid="pinto-guesser-name">{guesser?.name || '—'}</span>
      </span>

      {st.phase === 'READY' && isLocalRoom && (
        <section data-testid="pinto-mode-choice" className="rdb-pinto-choice">
          <div className={`rdb-pinto-choice-card ${st.inputMode !== 'tv' ? 'is-rec' : ''}`}>
            <div className="rdb-pinto-choice-top">
              <span className="rdb-tag">Ideal · Estilo Gartic TV</span>
              <h3>1 celular como prancheta</h3>
              <p>
                Conecte 1 celular. O tema fica escondido só nele e a TV espelha o desenho ao vivo. Na troca de vez é só passar o celular.
              </p>
            </div>
            <div className="rdb-pinto-qr-row">
              <div className="rdb-pinto-qr-box">
                <DynamicQRCode url={padJoinUrl} size={132} />
              </div>
              <div className="rdb-pinto-qr-meta">
                <span className="rdb-pinto-room-code">SALA {room.roomId}</span>
                <span
                  data-testid="pinto-pad-connection-status"
                  className={`rdb-pinto-conn ${st.padConnected ? 'is-on' : ''}`}
                >
                  {st.padConnected ? 'Prancheta conectada' : 'Aguardando prancheta'}
                </span>
                <span className="rdb-pinto-qr-hint">
                  Aponte a câmera do celular para usar só como tela de desenho.
                </span>
              </div>
            </div>
            <button
              type="button"
              data-testid="pinto-start-pad-btn"
              className="rdb-btn rdb-setup-start"
              onClick={startPadOrHost}
            >
              Começar na prancheta
              <ArrowRight />
            </button>
          </div>

          <div className={`rdb-pinto-choice-card ${st.inputMode === 'tv' ? 'is-rec' : ''}`}>
            <div className="rdb-pinto-choice-top">
              <span className="rdb-lim-round">Sem celular extra</span>
              <h3>Só pela TV</h3>
              <p>
                Pede para todos fecharem os olhos para revelar a palavra para {drawer?.name || 'quem desenha'}, depois oculta no botão de olhinho.
              </p>
            </div>
            <div className="rdb-pinto-tv-note">
              <strong>{st.words.length} palavras nesta rodada</strong>
              <span>
                {drawer?.name || 'Desenhista'} desenha na TV e {guesser?.name || 'dupla'} adivinha. Sem letras nem números.
              </span>
            </div>
            <button
              type="button"
              data-testid="pinto-start-btn"
              className="rdb-btn"
              onClick={startLocalTv}
            >
              Jogar só pela TV
            </button>
          </div>
        </section>
      )}

      {st.phase === 'READY' && !isLocalRoom && (
        <section className="rdb-pro-ready">
          <h2>{st.words.length} palavras</h2>
          <p>
            {drawer?.name} desenha no celular e {guesser?.name} adivinha olhando a TV. A palavra aparece só no celular de {drawer?.name}; a TV espelha o desenho ao vivo.
          </p>
          <button type="button" data-testid="pinto-start-btn" className="rdb-btn rdb-setup-start" onClick={startPadOrHost}>
            {free ? 'Começar' : `Iniciar cronômetro (${room.timerConfig}s)`}
          </button>
        </section>
      )}

      {st.phase === 'PLAYING' && isTvDrawingMode && st.tvRevealGate && (
        <section data-testid="pinto-tv-blind-gate" className="rdb-pro-ready rdb-pinto-gate">
          <span className="rdb-lim-round">
            Palavra {st.currentIndex + 1} de {st.words.length}
          </span>
          {st.wordHidden !== false ? (
            <>
              <h2>Todos fechem os olhos</h2>
              <p>
                Só <strong>{drawer?.name || 'quem vai desenhar'}</strong> pode olhar a TV agora para ver a palavra secreta.
              </p>
              <button
                type="button"
                data-testid="pinto-tv-reveal-secret-btn"
                className="rdb-btn rdb-setup-start"
                onClick={() => {
                  sounds.playFlip();
                  onUpdatePintoState((prev) => ({ ...prev, wordHidden: false }));
                }}
              >
                <Eye /> Mostrar palavra para {drawer?.name || 'desenhista'}
              </button>
            </>
          ) : (
            <>
              <div data-testid="pinto-current-word" className="rdb-pinto-secret-word">
                {st.words[st.currentIndex]}
              </div>
              <p>Memorize a palavra, peça para os outros abrirem os olhos e comece o desenho.</p>
              <button
                type="button"
                data-testid="pinto-tv-hide-and-draw-btn"
                className="rdb-btn rdb-pro-hit"
                onClick={() => {
                  sounds.playPowerup();
                  onUpdatePintoState((prev) => dismissTvWordReveal(prev, room.timerConfig > 0));
                }}
              >
                <EyeOff /> Ocultar palavra e desenhar
              </button>
            </>
          )}
        </section>
      )}

      {st.phase === 'PLAYING' && isTvDrawingMode && !st.tvRevealGate && (
        <>
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {st.words.map((_, i) => (
                <i key={i} className={st.outcomes[i] === 'correct' ? 'is-hit' : i === st.currentIndex ? 'is-now' : ''}>
                  {st.outcomes[i] === 'correct' ? <Check size={14} strokeWidth={4} /> : i + 1}
                </i>
              ))}
            </div>
            {st.wordHidden ? (
              <span className="rdb-word-hidden">Palavra oculta (use o olhinho no topo se precisar espiar)</span>
            ) : (
              <strong data-testid="pinto-current-word" className="rdb-pinto-inline-word">
                {st.words[st.currentIndex]}
              </strong>
            )}
            <div className="rdb-pro-counts" data-testid="pinto-score">
              <span data-tip="Acertos">
                <Check size={16} /> {hits}
              </span>
              <span data-tip="Pontos nesta rodada">+{pts.draw}</span>
            </div>
          </div>

          <div className="rdb-pinto-studio">
            <div className="rdb-pinto-studio-left" role="toolbar" aria-label="Ferramentas de desenho na TV">
              <button
                type="button"
                aria-label="Lápis"
                aria-pressed={tool === 'pen'}
                onClick={() => setTool('pen')}
                className={`rdb-lim-icon ${tool === 'pen' ? 'is-on' : ''}`}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label="Borracha"
                aria-pressed={tool === 'eraser'}
                onClick={() => setTool('eraser')}
                className={`rdb-lim-icon ${tool === 'eraser' ? 'is-on' : ''}`}
              >
                <Eraser size={16} />
              </button>
              <button
                type="button"
                data-testid="pinto-undo-btn"
                className="rdb-lim-icon"
                aria-label="Desfazer"
                data-tip="Desfazer o último traço"
                onClick={() => onUpdatePintoState((prev) => undoStroke(prev))}
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                data-testid="pinto-redo-btn"
                className="rdb-lim-icon"
                aria-label="Refazer"
                data-tip="Refazer traço"
                onClick={() => onUpdatePintoState((prev) => redoStroke(prev))}
              >
                <Redo2 size={16} />
              </button>
              <button
                type="button"
                data-testid="pinto-clear-btn"
                className="rdb-lim-icon"
                aria-label="Limpar"
                data-tip="Limpar o desenho"
                onClick={() => onUpdatePintoState((prev) => clearDrawing(prev))}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="rdb-pinto-canvas">
              <DrawingCanvas
                testId="pinto-canvas"
                strokes={st.strokes}
                liveStroke={st.liveStroke}
                editable={true}
                color={activeColor}
                lineWidth={tool === 'eraser' ? Math.max(0.018, lineWidth * 1.4) : lineWidth}
                opacity={activeOpacity}
                backgroundColor={PINTO_PAPER_COLOR}
                onLiveStroke={(s) => onUpdatePintoState((prev) => setLiveStroke(prev, s))}
                onStroke={onStroke}
              />
            </div>

            <div className="rdb-pinto-studio-right">
              <div className="rdb-pinto-preview">
                <span
                  style={{
                    backgroundColor: activeColor,
                    opacity: activeOpacity,
                    width: `${Math.max(8, Math.min(26, lineWidth * 1000))}px`,
                    height: `${Math.max(8, Math.min(26, lineWidth * 1000))}px`,
                    border: activeColor === '#FFFFFF' ? '1px solid #0a0b1e' : 'none'
                  }}
                />
              </div>
              <div className="rdb-pinto-presets">
                {PINTO_BRUSH_PRESETS.map((preset) => {
                  const isActive = Math.abs(lineWidth - preset.width) < 0.0025;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={isActive ? 'is-on' : ''}
                      onClick={() => setLineWidth(preset.width)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="rdb-pinto-tools">
                {PINTO_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    data-testid={`pinto-color-${c.slice(1)}`}
                    onClick={() => {
                      setTool('pen');
                      setColor(c);
                    }}
                    style={{ backgroundColor: c }}
                    className={tool === 'pen' && color === c ? 'is-on' : ''}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rdb-pinto-sliders">
            <label>
              <span>Espessura</span>
              <input
                type="range"
                min={0.003}
                max={0.032}
                step={0.001}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
              />
            </label>
            <label>
              <span>Opacidade</span>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>
          </div>

          <footer className="rdb-pro-foot">
            <button type="button" data-testid="pinto-hit-btn" className="rdb-btn rdb-pro-hit" onClick={hit}>
              <Check size={20} strokeWidth={3} /> Acertou (+1)
            </button>
            <button
              type="button"
              data-testid="pinto-skip-btn"
              className="rdb-btn"
              disabled={openCount <= 1}
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => skipWord(prev));
              }}
            >
              <RotateCcw /> Pular
            </button>
            <div className="rdb-pro-foot-end">
              <button
                type="button"
                data-testid="pinto-end-btn"
                className="rdb-btn"
                onClick={() => {
                  sounds.playFlip();
                  onUpdatePintoState((prev) => endDrawing(prev));
                }}
              >
                Encerrar tempo
              </button>
            </div>
          </footer>
        </>
      )}

      {st.phase === 'PLAYING' && !isTvDrawingMode && (
        <>
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {st.words.map((_, i) => (
                <i key={i} className={st.outcomes[i] === 'correct' ? 'is-hit' : i === st.currentIndex ? 'is-now' : ''}>
                  {st.outcomes[i] === 'correct' ? <Check size={14} strokeWidth={4} /> : i + 1}
                </i>
              ))}
            </div>
            <span data-testid="pinto-mirror-status" className="rdb-pinto-mirror-pill">
              {st.padPassGate
                ? `Passando o celular para ${drawer?.name || 'quem desenha'}...`
                : isLocalRoom
                ? `Desenhando no celular (${drawer?.name || 'vez'}) · tema oculto na TV`
                : `Ao vivo do celular de ${drawer?.name || 'quem desenha'} · tema oculto na TV`}
            </span>
            <div className="rdb-pro-counts" data-testid="pinto-score">
              <span data-tip="Acertos">
                <Check size={16} /> {hits}
              </span>
              <span data-tip="Pontos nesta rodada">+{pts.draw}</span>
            </div>
          </div>

          <div className="rdb-pinto-board rdb-pinto-mirror">
            <div className="rdb-pinto-canvas">
              <DrawingCanvas
                testId="pinto-canvas"
                strokes={st.strokes}
                liveStroke={st.liveStroke}
                editable={false}
                backgroundColor={PINTO_PAPER_COLOR}
              />
            </div>
          </div>

          <footer className="rdb-pro-foot">
            <button type="button" data-testid="pinto-hit-btn" className="rdb-btn rdb-pro-hit" onClick={hit}>
              <Check size={20} strokeWidth={3} /> Acertou (+1)
            </button>
            <button
              type="button"
              data-testid="pinto-skip-btn"
              className="rdb-btn"
              disabled={openCount <= 1}
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => skipWord(prev));
              }}
            >
              <RotateCcw /> Pular
            </button>
            <div className="rdb-pro-foot-end">
              <button
                type="button"
                data-testid="pinto-end-btn"
                className="rdb-btn"
                onClick={() => {
                  sounds.playFlip();
                  onUpdatePintoState((prev) => endDrawing(prev));
                }}
              >
                Encerrar tempo
              </button>
            </div>
          </footer>
        </>
      )}

      {st.phase === 'STEAL' && (
        <section data-testid="pinto-steal" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Tempo esgotado</span>
            <h2>
              {rivalName} <small>pode roubar</small>
            </h2>
            <p>A dupla rival palpita as palavras que faltaram (1 ponto cada). Marque as que ela acertou.</p>
          </div>
          <div className="rdb-pro-sum-grid">
            {st.words.map((w, i) =>
              st.outcomes[i] === 'pending' ? (
                <div key={i} className="rdb-pro-sum-card">
                  <span className="rdb-pro-sum-top">
                    <strong>{w}</strong>
                  </span>
                  <button
                    type="button"
                    data-testid={`pinto-steal-${i}`}
                    className="rdb-btn rdb-pro-hit"
                    onClick={() => {
                      sounds.playSuccess();
                      onUpdatePintoState((prev) => stealWord(prev, i));
                    }}
                  >
                    <Check /> A rival acertou
                  </button>
                </div>
              ) : null
            )}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="pinto-finish-steal-btn" className="rdb-btn rdb-setup-start" onClick={() => onUpdatePintoState((prev) => finishSteal(prev))}>
              Finalizar o roubo
              <ArrowRight />
            </button>
          </div>
        </section>
      )}

      {st.phase === 'SUMMARY' && (
        <section data-testid="pinto-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {teamName} +{pts.draw}
              {st.rivalTeam ? <small> · {rivalName} +{pts.rival}</small> : null}
            </h2>
          </div>
          <div className="rdb-pinto-thumbs">
            {st.words.map((w, i) => (
              <div key={i} className={'rdb-pinto-thumb' + (st.outcomes[i] === 'correct' ? ' is-hit' : st.outcomes[i] === 'stolen' ? ' is-stolen' : '')}>
                <DrawingCanvas testId={`pinto-thumb-${i}`} strokes={st.drawings[i] ?? []} backgroundColor={PINTO_PAPER_COLOR} aspect={4 / 3} />
                <span>
                  {st.outcomes[i] === 'correct' ? <Check size={16} strokeWidth={4} /> : st.outcomes[i] === 'stolen' ? <Swords size={16} /> : <XIcon size={16} strokeWidth={4} />} {w}
                  {st.outcomes[i] === 'stolen' ? ' (roubada)' : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="pinto-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
