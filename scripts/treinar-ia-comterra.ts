/**
 * Treino da IA do Com Terra (Arquiteto/Barenpark) por autojogo.
 * Joga partidas completas IA x IA com sorteio fixo (seeds) e compara pesos de avaliacao de jogada.
 * Uso: npx tsx scripts/treinar-ia-comterra.ts
 */
import { BP_WEIGHTS, bpPlacements, type BPWeights } from '../src/ai/adapters2';
import { areaSpots, bpCanPlaceAny, bpCurrent, bpPass, bpPlace, bpPlaceArea, bpScore, bpTakeReward, buildBPState, rewardOptions, rewardValue, tileShape } from '../src/utils/bpEngine';
import type { BPState } from '../src/types/game';

/** Uma partida inteira entre dois jogadores com pesos diferentes. Devolve os pontos de cada um. */
export function playGame(seed: number, wa: BPWeights, wb: BPWeights): [number, number] {
  let s: BPState = buildBPState(['a', 'b'], seed);
  const W: Record<string, BPWeights> = { a: wa, b: wb };
  for (let guard = 0; guard < 400 && !s.finished; guard++) {
    const p = s.pending[0];
    if (p) {
      if (p.kind === 'crew') {
        const spot = areaSpots(s.parks[p.playerId])[0];
        s = spot ? bpPlaceArea(s, p.playerId, s.areaPiles[0].length ? 0 : 1, spot.ax, spot.ay) : { ...s, pending: s.pending.slice(1) };
      } else {
        const opts = rewardOptions(s, p.kind).sort((x, y) => rewardValue(s, y) - rewardValue(s, x) || tileShape(y).flat().filter(Boolean).length - tileShape(x).flat().filter(Boolean).length);
        s = opts[0] ? bpTakeReward(s, p.playerId, opts[0]) : { ...s, pending: s.pending.slice(1) };
      }
      continue;
    }
    const pid = bpCurrent(s);
    if (!pid) break;
    if (!bpCanPlaceAny(s.parks[pid])) {
      s = bpPass(s, pid);
      continue;
    }
    const best = bpPlacements(s, pid, W[pid])[0];
    if (!best) break;
    s = bpPlace(s, pid, best.uid, best.m, best.x, best.y);
  }
  return [bpScore(s, 'a'), bpScore(s, 'b')];
}

/** Placar de uma configuracao contra outra (joga dos dois lados para nao dar vantagem de quem comeca). */
export function duel(w1: BPWeights, w2: BPWeights, seeds: number[]): number {
  let wins = 0;
  for (const seed of seeds) {
    const [a, b] = playGame(seed, w1, w2);
    const [c, d] = playGame(seed, w2, w1);
    wins += (a > b ? 1 : a < b ? 0 : 0.5) + (d > c ? 1 : d < c ? 0 : 0.5);
  }
  return wins / (seeds.length * 2);
}

if (process.argv[1]?.includes('treinar-ia-comterra')) {
  const seeds = Array.from({ length: 12 }, (_, i) => 1000 + i * 37);
  let best: BPWeights = { ...BP_WEIGHTS };
  const keys = Object.keys(best) as Array<keyof BPWeights>;
  // subida de encosta simples: mexe um peso por vez e fica com o que ganhar do campeao atual
  for (let round = 0; round < 2; round++) {
    for (const k of keys) {
      for (const f of [0.5, 1.6]) {
        const cand = { ...best, [k]: +(best[k] * f).toFixed(3) };
        const rate = duel(cand, best, seeds);
        console.log(`${k} x${f} -> ${(rate * 100).toFixed(0)}% contra o campeao`);
        if (rate > 0.55) best = cand;
      }
    }
  }
  console.log('PESOS FINAIS', JSON.stringify(best));
  console.log('contra os pesos iniciais:', (duel(best, BP_WEIGHTS, seeds) * 100).toFixed(0) + '%');
}
