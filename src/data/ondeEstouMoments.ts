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

const commons = (arquivo: string): string => arquivo.startsWith('http') ? arquivo : `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(arquivo.replace(/ /g, '_'))}?width=640`;

/**
 * Fotos livres do Wikimedia Commons (link direto, sem baixar). Chave: trecho do nome do momento. Quem nao tem foto aqui
 * aparece so com a legenda; a tela esconde a imagem se o link falhar.
 */
const FOTOS: Record<string, string> = {
  'Cascão': 'Ronaldo 2002 cropped.jpg',
  'Maracanazo': 'Gol ghiggia vs brasil.jpg',
  'Pelé, aos 17': 'Pelé octubre 1958.JPG',
  'mão de Deus': 'Maradona shilton mano dios.jpg',
  'Zidane dá uma cabeçada': 'Zidane-materazzi-2006.jpg',
  'Götze marca': 'Götze kicks the match winning goal.jpg',
  'Mbappé faz três': '2022 wc final 05.jpg',
  'Corinthians vence o Chelsea': 'Taça FIFA Campeão Mundial 2012 Corinthians.jpg',
  'Fluminense campeão': 'Troféu da Copa Libertadores da América de 2023.jpg',
  'Botafogo campeão': 'TaçaLibertadores2024.jpg',
  'Ayrton Senna': 'Ayrton Senna at Interlagos 1993.jpg',
  'Daiane dos Santos': 'Daiane dos Santos 13072007.jpg',
  'Michael Phelps': 'Michael Phelps Ryan Lochte Laszlo Cseh medals 2008 Olympics.jpg',
  'Usain Bolt': 'Usain Bolt Berlin 2009.JPG',
  'Rebeca Andrade': 'Rebeca Andrade Paris Olympics.jpg',
  'defesa de Gordon Banks': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Gordon_Banks_2007.jpg',
  'Baggio isola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/%D8%B1%D9%88%D8%A8%D8%B1%D8%AA%D9%88_%D8%A8%D8%A7%D8%AC%D9%88_%28cropped%29.jpg/960px-%D8%B1%D9%88%D8%A8%D8%B1%D8%AA%D9%88_%D8%A8%D8%A7%D8%AC%D9%88_%28cropped%29.jpg',
  'Ronaldinho faz o gol de falta': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/2019_-_Press_conferences_-_Day_1_ENX_6950_%2849019873887%29_%28cropped%29.jpg/960px-2019_-_Press_conferences_-_Day_1_ENX_6950_%2849019873887%29_%28cropped%29.jpg',
  'O 7 a 1 da Alemanha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Stadion_Belo_Horizonte_Halbfinale_WM_2014_%2822117986076%29.jpg/960px-Stadion_Belo_Horizonte_Halbfinale_WM_2014_%2822117986076%29.jpg',
  'Argentina de Messi campeã': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Lionel_Messi_Argentina_v_Egypt_7_July_2026-112%28cropped%29.jpg/960px-Lionel_Messi_Argentina_v_Egypt_7_July_2026-112%28cropped%29.jpg',
  'Pelé marca o gol mil': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pele_con_brasil_%28cropped%29.jpg/960px-Pele_con_brasil_%28cropped%29.jpg',
  'Flamengo vence o Liverpool': 'https://upload.wikimedia.org/wikipedia/en/9/94/ToyotaCup1981.jpg',
  'Roberto Carlos faz o gol impossível': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Roberto_Carlos_Credicard_Hall_%2842626066250%29.jpg/960px-Roberto_Carlos_Credicard_Hall_%2842626066250%29.jpg',
  'Milagre de Istambul': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Istanbul_Atat%C3%BCrk_Olympic_Stadium_1.jpg/960px-Istanbul_Atat%C3%BCrk_Olympic_Stadium_1.jpg',
  'Neymar leva o Santos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg/960px-Neymar_Junior_Brazil_V_Morocco_13_June_2026-40.jpg',
  'Barcelona vira o PSG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017.jpg/960px-Bar%C3%A7a_6_-_PSG_1%3B_Dimecres_8_de_mar%C3%A7_de_2017.jpg',
  'Brasil tricampeão no México': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Pele_celebrating_1970.jpg/960px-Pele_celebrating_1970.jpg',
  'Iniesta decide': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/FIFA_World_Cup_2010_Spain_with_cup.jpg/960px-FIFA_World_Cup_2010_Spain_with_cup.jpg',
  'Sergio Ramos empata': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Sergio_Ramos_Interview_2021.jpg',
  'O Dream Team': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Dream_Team_at_the_1992_Summer_Olympics.JPEG/960px-Dream_Team_at_the_1992_Summer_Olympics.JPEG',
  'Guga conquista': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Guga_Kuerten.jpg',
  'Gabigol faz dois gols': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Gabriel_Barbosa_2022.jpg/960px-Gabriel_Barbosa_2022.jpg',
};

const withPhoto = (x: OndeEstouMoment): OndeEstouMoment => {
  const key = Object.keys(FOTOS).find((k) => x.nome.includes(k));
  return key ? { ...x, imagem: commons(FOTOS[key]) } : x;
};

const m = (categoria: string, origem: OndeEstouMoment['origem'], nomes: string[]): OndeEstouMoment[] =>
  nomes.map((nome) => ({ nome, categoria, origem }));

export const ONDE_ESTOU_MOMENTS: OndeEstouMoment[] = [
  // Piadas e memes do programa (a foto real de cada um fica por conta do link `imagem`, quando houver)
  ...m('Piadas e memes', 'programa', [
    'André Luís tira o cartão da mão do árbitro (Botafogo x Estudiantes)',
    'O ensaio nu do Vampeta, o "Vampetaço" (1999)',
    'Deyverson simulando falta do juiz (2021)'
  ]),
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
].map(withPhoto);

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
