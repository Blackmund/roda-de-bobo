/**
 * NOV-06 (variante "Onde estou"): grandes momentos do esporte.
 *
 * No programa cada jogador recebe um grande momento (ex.: o cabelo "Cascão" do Ronaldo em 2002) e faz perguntas de
 * sim ou não para descobrir QUAL e o momento, como no Quem sou eu. A mecânica é a mesma; muda o banco.
 *
 * Só entram momentos amplamente documentados, com ano. Exemplos do programa que não deu para confirmar daqui
 * (como o "Vampetaço" de 1999 e "Dayverson x Pitana", 2021) ficaram de fora de propósito: acrescente-os depois de
 * conferir. Lista própria; o campo `origem` marca o que foi citado no programa.
 */
import type { QuemSouEuIdentity } from './quemSouEuIdentities';

export interface OndeEstouMoment extends QuemSouEuIdentity {
  origem: 'programa' | 'autoral';
}

const m = (categoria: string, origem: OndeEstouMoment['origem'], nomes: string[]): OndeEstouMoment[] =>
  nomes.map((nome) => ({ nome, categoria, origem }));

export const ONDE_ESTOU_MOMENTS: OndeEstouMoment[] = [
  ...m('Copa do Mundo', 'programa', ['O cabelo "Cascão" de Ronaldo na Copa (2002)']),
  ...m('Copa do Mundo', 'autoral', [
    'O Maracanazo: Uruguai vence o Brasil na final (1950)',
    'Pelé, aos 17 anos, campeão do mundo na Suécia (1958)',
    'A defesa de Gordon Banks no cabeceio de Pelé (1970)',
    'Brasil tricampeão no México e fica com a taça Jules Rimet (1970)',
    'A "mão de Deus" de Maradona contra a Inglaterra (1986)',
    'O gol do século de Maradona contra a Inglaterra (1986)',
    'Baggio isola o pênalti e o Brasil é tetra (1994)',
    'Ronaldo faz os dois gols e o Brasil é penta (2002)',
    'Ronaldinho faz o gol de falta no goleiro Seaman (2002)',
    'Zidane dá uma cabeçada em Materazzi na final (2006)',
    'Iniesta decide a final e a Espanha é campeã (2010)',
    'Suárez morde Chiellini na Copa do Brasil (2014)',
    'O 7 a 1 da Alemanha sobre o Brasil no Mineirão (2014)',
    'Götze marca no Maracanã e a Alemanha é campeã (2014)',
    'Argentina de Messi campeã do mundo no Catar (2022)',
    'Mbappé faz três gols na final do Catar (2022)'
  ]),
  ...m('Clubes e seleções', 'autoral', [
    'Pelé marca o gol mil no Maracanã (1969)',
    'Flamengo vence o Liverpool e é campeão mundial em Tóquio (1981)',
    'Roberto Carlos faz o gol impossível de falta contra a França (1997)',
    'O Milagre de Istambul: Liverpool vira contra o Milan (2005)',
    'Neymar leva o Santos ao título da Libertadores (2011)',
    'Corinthians vence o Chelsea e é campeão mundial (2012)',
    'Atlético Mineiro campeão da Libertadores nos pênaltis (2013)',
    'Sergio Ramos empata aos 93 minutos na final da Champions (2014)',
    'Leicester City campeão da Premier League (2016)',
    'Barcelona vira o PSG por 6 a 1 no Camp Nou (2017)',
    'Gabigol faz dois gols nos acréscimos e o Flamengo vira sobre o River (2019)',
    'Brasil campeão da Copa América no Maracanã (2019)',
    'Argentina campeã da Copa América no Maracanã (2021)',
    'Fluminense campeão da Libertadores no Maracanã (2023)',
    'Botafogo campeão da Libertadores em Buenos Aires (2024)'
  ]),
  ...m('Outros esportes', 'autoral', [
    'Ayrton Senna vence em Interlagos pela primeira vez (1991)',
    'O Dream Team conquista o ouro olímpico em Barcelona (1992)',
    'Brasil conquista o ouro no vôlei masculino em Barcelona (1992)',
    'Guga conquista Roland Garros pela primeira vez (1997)',
    'Daiane dos Santos é campeã mundial no solo (2003)',
    'Michael Phelps ganha oito ouros numa só Olimpíada (2008)',
    'Usain Bolt corre os 100 m em 9,58 s em Berlim (2009)',
    'Rebeca Andrade é ouro no solo em Paris (2024)'
  ])
];

export const normalizeMomentKey = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `count` momentos diferentes (ainda nao usados), de categorias variadas quando possivel. */
export function drawMoments(
  count: number,
  used: Set<string> = new Set(),
  rng: () => number = Math.random
): OndeEstouMoment[] {
  let pool = ONDE_ESTOU_MOMENTS.filter((x) => !used.has(normalizeMomentKey(x.nome)));
  if (pool.length < count) pool = [...ONDE_ESTOU_MOMENTS];
  const shuffled = shuffle(pool, rng);
  const picked: OndeEstouMoment[] = [];
  const cats = new Set<string>();
  for (const x of shuffled) {
    if (picked.length >= count) break;
    if (!cats.has(x.categoria)) {
      picked.push(x);
      cats.add(x.categoria);
    }
  }
  for (const x of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(x)) picked.push(x);
  }
  return shuffle(picked, rng);
}
