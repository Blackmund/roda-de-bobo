import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Pencil, Redo2, Trash2, Undo2 } from 'lucide-react';
import { GameRoom, Player } from '../../../types/game';
import { DrawingCanvas } from '../../DrawingCanvas';
import { sounds } from '../../../utils/soundEffects';
import {
  PINTO_BRUSH_PRESETS,
  PINTO_COLORS,
  PINTO_ASPECT,
  PINTO_PAPER_COLOR,
  addStroke as pintoAddStroke,
  clearDrawing as pintoClear,
  dismissPadPassGate,
  pintoRoundPoints,
  redoStroke as pintoRedo,
  setLiveStroke,
  undoStroke as pintoUndo
} from '../../../utils/comoEuPintoEngine';

interface ComoEuPintoControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
  pintoColor: string;
  setPintoColor: React.Dispatch<React.SetStateAction<string>>;
  isSharedPad?: boolean;
}

export const ComoEuPintoController: React.FC<ComoEuPintoControllerProps> = ({
  room,
  player,
  onUpdateRoom,
  wrapIfMultiMode,
  pintoColor,
  setPintoColor,
  isSharedPad = false
}) => {
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState<number>(0.011);
  const [opacity, setOpacity] = useState<number>(1);
  const c = room.activeGame === 'como-eu-pinto' ? room.comoEuPinto : undefined;
  const isDrawerHere = !!c && (isSharedPad || player.id === c.drawerPlayerId);

  // Palavra nova: aparece em tela cheia por alguns segundos e some sozinha (o tempo ja esta correndo).
  const [intro, setIntro] = useState<string | null>(null);
  const showWord = c?.phase === 'PLAYING' && isDrawerHere && !c?.padPassGate;
  const introKey = showWord ? `${room.roundNumber}-${c?.drawerPlayerId}-${c?.currentIndex}` : '';
  useEffect(() => {
    if (!introKey || !c) return;
    setIntro(c.words[c.currentIndex] || null);
    sounds.playFlip();
    const t = window.setTimeout(() => setIntro(null), 2200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introKey]);

  // Avisos de tempo para quem desenha: a cada minuto, 30 s, 10 s (com contagem) e 3-2-1 na tela.
  const [alert, setAlert] = useState<{ text: string; big?: boolean; id: number } | null>(null);
  const lastSecRef = useRef<number | null>(null);
  const secs = c?.timerSeconds ?? 0;
  const timed = room.timerConfig > 0;
  useEffect(() => {
    if (!c || !isDrawerHere || !timed) return;
    const prev = lastSecRef.current;
    lastSecRef.current = secs;
    if (c.phase !== 'PLAYING' || c.padPassGate || prev === null || secs >= prev) return;
    const elapsed = room.timerConfig - secs;
    const say = (text: string, big = false) => setAlert({ text, big, id: Date.now() });
    if (secs <= 3 && secs > 0) {
      sounds.playTick(secs);
      say(String(secs), true);
    } else if (secs === 10) {
      sounds.playAlarm();
      say('10 segundos');
    } else if (secs < 10) {
      sounds.playTick(secs);
    } else if (secs === 30) {
      sounds.playAlarm();
      say('30 segundos');
    } else if (elapsed > 0 && elapsed % 60 === 0) {
      sounds.playPowerup();
      say(elapsed === 60 ? 'Passou 1 minuto' : `Passaram ${elapsed / 60} minutos`);
    }
  }, [secs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tempo acabou: "Tempo!" na tela
  const phaseRef = useRef(c?.phase);
  useEffect(() => {
    const before = phaseRef.current;
    phaseRef.current = c?.phase;
    if (before === 'PLAYING' && c && c.phase !== 'PLAYING' && isDrawerHere) {
      sounds.playBuzzer();
      setAlert({ text: 'Tempo!', big: true, id: Date.now() });
    }
  }, [c?.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!alert) return;
    const t = window.setTimeout(() => setAlert(null), alert.big ? 900 : 1600);
    return () => window.clearTimeout(t);
  }, [alert]);

  // Avisa a TV que o celular prancheta esta conectado na sala.
  // Dispara apos breve atraso para garantir que os canais de sincronizacao da sala pai ja montaram.
  useEffect(() => {
    if (!isSharedPad || !c || c.padConnected || (room.players?.length || 0) === 0) return;
    const ping = () => {
      onUpdateRoom((prev) => ({
        ...prev,
        comoEuPinto: prev.comoEuPinto ? { ...prev.comoEuPinto, padConnected: true } : undefined
      }));
    };
    const t1 = window.setTimeout(ping, 220);
    const t2 = window.setTimeout(ping, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isSharedPad, c?.padConnected, room.players?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!(room.activeGame === 'como-eu-pinto' && c)) return null;

  const isDrawer = isSharedPad || player.id === c.drawerPlayerId;
  const drawer = room.players.find((p) => p.id === c.drawerPlayerId);
  const guesser = room.players.find((p) => p.id === c.guesserPlayerId);
  const mm = Math.floor(c.timerSeconds / 60);
  const ss = String(c.timerSeconds % 60).padStart(2, '0');
  const clockLabel = room.timerConfig === 0 ? 'LIVRE' : `${mm}:${ss}`;
  const update = (fn: (prev: NonNullable<GameRoom['comoEuPinto']>) => NonNullable<GameRoom['comoEuPinto']>) =>
    onUpdateRoom((prev) => ({ ...prev, comoEuPinto: prev.comoEuPinto ? fn(prev.comoEuPinto) : undefined }));

  const activeColor = tool === 'eraser' ? PINTO_PAPER_COLOR : pintoColor;
  const activeOpacity = tool === 'eraser' ? 1 : opacity;
  const wordPos = `${Math.min(c.currentIndex + 1, c.words.length)}/${Math.max(1, c.words.length)}`;
  const pts = pintoRoundPoints(c);

  const content = (
    <div data-testid="controller-pinto-view" className="rdb-pad">
      {intro && (
        <div className="rdb-pad-intro" data-testid="controller-pinto-intro" onClick={() => setIntro(null)}>
          <span>Desenhe</span>
          <strong>{intro}</strong>
          <small>Sem letras e sem números · toque para fechar</small>
        </div>
      )}
      {alert && (
        <div key={alert.id} className={'rdb-pad-alert' + (alert.big ? ' is-big' : '')} data-testid="controller-pinto-alert">
          {alert.text}
        </div>
      )}
      <header className="rdb-pad-head">
        <div className="rdb-pad-head-left">
          <span className="rdb-pad-badge">
            {isDrawer ? `Palavra ${wordPos}` : 'Espelho ao vivo'}
          </span>
          {c.phase === 'PLAYING' && isDrawer && !c.padPassGate && (
            <strong data-testid="controller-pinto-word" className="rdb-pad-word">
              {c.words[c.currentIndex]}
            </strong>
          )}
        </div>
        <div className="rdb-pad-head-right">
          {drawer && (
            <span className="rdb-pad-who">
              {drawer.name}
              {guesser ? ` -> ${guesser.name}` : ''}
            </span>
          )}
          <span
            data-testid="controller-pinto-timer"
            className={`rdb-pad-clock is-big ${c.timerSeconds <= 10 && c.phase === 'PLAYING' ? 'is-hot' : ''} ${c.timerSeconds <= 30 && c.phase === 'PLAYING' ? 'is-warn' : ''}`}
          >
            {clockLabel}
          </span>
        </div>
      </header>

      {c.phase === 'READY' && (
        <section data-testid="controller-pinto-ready" className="rdb-pad-gate">
          <div className="rdb-pad-gate-box">
            <span className="rdb-pad-badge">Como eu pinto · Rodada {room.roundNumber}</span>
            <h2>
              {isDrawer
                ? `${drawer?.name || 'Você'} vai desenhar agora`
                : `${drawer?.name || 'Desenhista'} vai desenhar`}
            </h2>
            <p>
              {isSharedPad
                ? 'Esta é a prancheta da sala. Assim que a rodada começar na TV, só quem desenha pode olhar para o celular.'
                : isDrawer
                ? `Suas ${c.words.length} palavras secretas aparecem aqui ao começar. A TV mostra só o seu traço em tempo real.`
                : `${guesser?.name || 'Sua dupla'} adivinha olhando a TV.`}
            </p>
            <div className="rdb-pad-status">Aguardando o início na TV...</div>
          </div>
        </section>
      )}

      {c.phase === 'PLAYING' && isSharedPad && c.padPassGate && (
        <section data-testid="controller-pinto-pass-gate" className="rdb-pad-gate">
          <div className="rdb-pad-gate-box is-focus">
            <span className="rdb-pad-badge">Proteção do tema</span>
            <h2>Passe o celular para {drawer?.name || 'quem vai desenhar'}</h2>
            <p>
              Só <strong>{drawer?.name || 'o desenhista'}</strong> pode olhar a tela agora para ver a palavra secreta e começar a desenhar.
            </p>
            <button
              type="button"
              data-testid="controller-pinto-unlock-btn"
              onClick={() => {
                sounds.playPowerup();
                update((prev) => dismissPadPassGate(prev, room.timerConfig > 0));
              }}
              className="rdb-pad-cta"
            >
              Ver palavra e desenhar
            </button>
          </div>
        </section>
      )}

      {c.phase === 'PLAYING' && (!isSharedPad || !c.padPassGate) && isDrawer && (
        <div className="rdb-pad-studio">
          <div className="rdb-pad-dock-left" role="toolbar" aria-label="Ferramentas de desenho">
            <button
              type="button"
              data-testid="controller-pinto-pen"
              aria-label="Lápis"
              aria-pressed={tool === 'pen'}
              onClick={() => setTool('pen')}
              className={`rdb-pad-tool ${tool === 'pen' ? 'is-on' : ''}`}
            >
              <Pencil size={18} />
            </button>
            <button
              type="button"
              data-testid="controller-pinto-eraser"
              aria-label="Borracha"
              aria-pressed={tool === 'eraser'}
              onClick={() => setTool('eraser')}
              className={`rdb-pad-tool ${tool === 'eraser' ? 'is-on' : ''}`}
            >
              <Eraser size={18} />
            </button>
            <button
              type="button"
              data-testid="controller-pinto-undo"
              aria-label="Desfazer"
              disabled={c.strokes.length === 0}
              onClick={() => update((prev) => pintoUndo(prev))}
              className="rdb-pad-tool"
            >
              <Undo2 size={18} />
            </button>
            <button
              type="button"
              data-testid="controller-pinto-redo"
              aria-label="Refazer"
              disabled={(c.redoStrokes?.length || 0) === 0}
              onClick={() => update((prev) => pintoRedo(prev))}
              className="rdb-pad-tool"
            >
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              data-testid="controller-pinto-clear"
              aria-label="Limpar folha"
              disabled={c.strokes.length === 0}
              onClick={() => {
                sounds.playFlip();
                update((prev) => pintoClear(prev));
              }}
              className="rdb-pad-tool is-danger"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="rdb-pad-sheet">
            <DrawingCanvas
              testId="controller-pinto-canvas"
              strokes={c.strokes}
              liveStroke={c.liveStroke}
              editable={true}
              color={activeColor}
              lineWidth={tool === 'eraser' ? Math.max(0.018, lineWidth * 1.4) : lineWidth}
              opacity={activeOpacity}
              backgroundColor={PINTO_PAPER_COLOR}
              aspect={PINTO_ASPECT}
              onLiveStroke={(stroke) => update((prev) => setLiveStroke(prev, stroke))}
              onStroke={(stroke) => update((prev) => pintoAddStroke(prev, stroke))}
            />
          </div>

          <div className="rdb-pad-dock-right">
            <div className="rdb-pad-preview" aria-label="Cor e tamanho atual">
              <span
                className="rdb-pad-preview-dot"
                style={{
                  backgroundColor: activeColor,
                  opacity: activeOpacity,
                  width: `${Math.max(8, Math.min(28, lineWidth * 1000))}px`,
                  height: `${Math.max(8, Math.min(28, lineWidth * 1000))}px`,
                  border: activeColor === '#FFFFFF' ? '1px solid #0a0b1e' : 'none'
                }}
              />
            </div>
            <div className="rdb-pad-presets" role="group" aria-label="Espessura rápida">
              {PINTO_BRUSH_PRESETS.map((preset) => {
                const isActive = Math.abs(lineWidth - preset.width) < 0.0025;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setLineWidth(preset.width)}
                    className={`rdb-pad-preset ${isActive ? 'is-on' : ''}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="rdb-pad-swatches" role="group" aria-label="Cores">
              {PINTO_COLORS.map((col) => {
                const isSelected = tool === 'pen' && pintoColor === col;
                return (
                  <button
                    key={col}
                    type="button"
                    aria-label={`Cor ${col}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setTool('pen');
                      setPintoColor(col);
                    }}
                    style={{ backgroundColor: col }}
                    className={`rdb-pad-swatch ${isSelected ? 'is-on' : ''}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="rdb-pad-dock-bottom">
            <label className="rdb-pad-slider">
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
            <label className="rdb-pad-slider">
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
            <span className="rdb-pad-hint">Acertos e pulos na TV</span>
          </div>
        </div>
      )}

      {c.phase === 'PLAYING' && !isDrawer && !isSharedPad && (
        <section className="rdb-pad-watch">
          <div className="rdb-pad-watch-msg">
            {player.id === c.guesserPlayerId
              ? 'Sua dupla está desenhando! Olhe e fale seu palpite em voz alta.'
              : `${drawer?.name || 'Desenhista'} está desenhando ao vivo. Aguarde a sua vez ou a chance de roubo.`}
          </div>
          <div className="rdb-pad-sheet is-watch">
            <DrawingCanvas
              testId="controller-pinto-canvas"
              strokes={c.strokes}
              liveStroke={c.liveStroke}
              editable={false}
              backgroundColor={PINTO_PAPER_COLOR}
              aspect={PINTO_ASPECT}
            />
          </div>
        </section>
      )}

      {c.phase === 'STEAL' && (
        <section className="rdb-pad-gate">
          <div className="rdb-pad-gate-box">
            <span className="rdb-pad-badge">Tempo esgotado</span>
            <h2>Roubo da dupla rival na TV</h2>
            <p>
              A dupla rival tenta adivinhar as palavras restantes em voz alta. O anfitrião confirma na TV.
            </p>
          </div>
        </section>
      )}

      {c.phase === 'SUMMARY' && (
        <section className="rdb-pad-gate">
          <div className="rdb-pad-gate-box">
            <span className="rdb-pad-badge">Fim da rodada</span>
            <h2>+{pts.draw} pontos na rodada</h2>
            {c.rivalTeam && (
              <p>Pontos de roubo da rival: +{pts.rival}</p>
            )}
            <div className="rdb-pad-status">Veja os desenhos revelados na TV.</div>
          </div>
        </section>
      )}
    </div>
  );

  return isSharedPad ? content : wrapIfMultiMode(content);
};
