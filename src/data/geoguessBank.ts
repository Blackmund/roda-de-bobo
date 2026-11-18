/**
 * Banco do GeoGuess: lugares por COORDENADA.
 *
 * Por que coordenada: todas as imagens de uma rodada sao recortes da mesma fonte (tiles de satelite) em volta do
 * mesmo ponto, so muda o zoom e o deslocamento. Assim a rodada nunca mistura lugares (nada de uma etapa com o Arco do
 * Triunfo e outra com outra coisa): a coerencia vem da geometria, nao de uma busca de imagens.
 *
 * Fonte das imagens: Esri World Imagery (ver `GEO_TILE_SOURCE` em utils/geoguessEngine.ts e docs/geoguess.md, com a
 * analise de licenca). Google Earth/Maps nao e usado: os termos do Google proibem tirar imagens fora das APIs dele.
 *
 * FORMATO DE UM LUGAR (para ampliar o banco):
 *   id         identificador unico, minusculo, com hifens
 *   nome       resposta mostrada na revelacao
 *   lugar      "cidade, pais" (linha de apoio da revelacao)
 *   aceitas    variacoes que o diretor pode aceitar
 *   lat, lon   ponto central (graus decimais, WGS84). Ponha no meio do que deve ser descoberto.
 *   regiao     continente (ver GEO_REGIOES); `pais === 'Brasil'` tambem casa com a tag Brasil
 *   pais       pais do lugar
 *   categorias uma ou mais (ver GEO_CATEGORIAS)
 *   pergunta   o que se adivinha: 'local' (o lugar), 'cidade' ou 'pais'
 *   dica       dica inicial curta, mostrada antes da 1a imagem (nao entrega a resposta)
 *   close      opcional: deslocamento { dx, dy } em metros do close da 1a imagem (ex.: fugir de um nome pintado no teto)
 *   escala     opcional: desloca todos os zooms (ex.: -2 para algo enorme, como um canion; +0 por padrao)
 *   etapas     opcional: 5 etapas proprias ({ z, span, dx, dy }), quando as padrao nao servem
 *
 * `npm run geo:check` (scripts/checkGeoguessTiles.mjs) confere se cada etapa tem imagem na fonte.
 */
import type { GeoEtapa } from '../types/game';

export const GEO_REGIOES = [
  { id: 'brasil', label: 'Brasil' },
  { id: 'america-do-sul', label: 'América do Sul' },
  { id: 'america-do-norte', label: 'América do Norte' },
  { id: 'europa', label: 'Europa' },
  { id: 'asia', label: 'Ásia' },
  { id: 'africa', label: 'África' },
  { id: 'oceania', label: 'Oceania' }
] as const;

export const GEO_CATEGORIAS = [
  { id: 'estadios', label: 'Estádios' },
  { id: 'pontos-turisticos', label: 'Pontos turísticos' },
  { id: 'cidades', label: 'Cidades' },
  { id: 'natureza', label: 'Natureza' },
  { id: 'paises', label: 'Países' },
  { id: 'lugares-comuns', label: 'Lugares comuns' }
] as const;

export type GeoRegiao = Exclude<(typeof GEO_REGIOES)[number]['id'], 'brasil'>;
export type GeoCategoria = (typeof GEO_CATEGORIAS)[number]['id'];

export interface GeoLocal {
  id: string;
  nome: string;
  lugar: string;
  aceitas: string[];
  lat: number;
  lon: number;
  regiao: GeoRegiao;
  pais: string;
  categorias: GeoCategoria[];
  pergunta: 'local' | 'cidade' | 'pais';
  dica: string;
  close?: { dx: number; dy: number };
  escala?: number;
  etapas?: GeoEtapa[];
}

type Base = Omit<GeoLocal, 'pergunta' | 'categorias'> & Partial<Pick<GeoLocal, 'pergunta'>>;
const L = (categorias: GeoCategoria[], b: Base): GeoLocal => ({ pergunta: 'local', ...b, categorias });

export const GEO_LOCAIS: GeoLocal[] = [
  // ESTADIOS
  L(['estadios'], { id: 'maracana', nome: 'Maracanã', lugar: 'Rio de Janeiro, Brasil', aceitas: ['Maracana', 'Mário Filho'], lat: -22.91217, lon: -43.23017, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio de uma final de Copa do Mundo' }),
  L(['estadios'], { id: 'mineirao', nome: 'Mineirão', lugar: 'Belo Horizonte, Brasil', aceitas: ['Mineirao'], lat: -19.86589, lon: -43.97108, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio no Sudeste do Brasil' }),
  L(['estadios'], { id: 'beira-rio', nome: 'Beira-Rio', lugar: 'Porto Alegre, Brasil', aceitas: ['Beira Rio'], lat: -30.06528, lon: -51.23583, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio à beira d’água no Brasil' }),
  L(['estadios'], { id: 'morumbi', nome: 'Morumbi', lugar: 'São Paulo, Brasil', aceitas: ['MorumBIS', 'Cícero Pompeu de Toledo'], lat: -23.60008, lon: -46.72017, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio grande e antigo no Brasil' }),
  L(['estadios'], { id: 'neo-quimica', nome: 'Neo Química Arena', lugar: 'São Paulo, Brasil', aceitas: ['Arena Corinthians', 'Itaquerão'], lat: -23.5453, lon: -46.47436, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio da Copa de 2014', close: { dx: -45, dy: 30 } }),
  L(['estadios'], { id: 'allianz-parque', nome: 'Allianz Parque', lugar: 'São Paulo, Brasil', aceitas: ['Palestra Itália', 'Arena Palmeiras'], lat: -23.52745, lon: -46.67838, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Arena moderna no meio da cidade', close: { dx: -40, dy: -35 } }),
  L(['estadios'], { id: 'vila-belmiro', nome: 'Vila Belmiro', lugar: 'Santos, Brasil', aceitas: ['Urbano Caldeira'], lat: -23.95103, lon: -46.33889, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Estádio pequeno e histórico' }),
  L(['estadios'], { id: 'san-siro', nome: 'San Siro', lugar: 'Milão, Itália', aceitas: ['Giuseppe Meazza', 'Meazza'], lat: 45.47806, lon: 9.12397, regiao: 'europa', pais: 'Itália', dica: 'Estádio dividido por dois rivais' }),
  L(['estadios'], { id: 'camp-nou', nome: 'Camp Nou', lugar: 'Barcelona, Espanha', aceitas: ['Spotify Camp Nou', 'Nou Camp'], lat: 41.38088, lon: 2.12282, regiao: 'europa', pais: 'Espanha', dica: 'O maior estádio da Europa' }),
  L(['estadios'], { id: 'bernabeu', nome: 'Santiago Bernabéu', lugar: 'Madri, Espanha', aceitas: ['Bernabeu'], lat: 40.45305, lon: -3.68835, regiao: 'europa', pais: 'Espanha', dica: 'Estádio numa capital europeia' }),
  L(['estadios'], { id: 'wembley', nome: 'Wembley', lugar: 'Londres, Inglaterra', aceitas: ['Wembley Stadium'], lat: 51.55602, lon: -0.27963, regiao: 'europa', pais: 'Inglaterra', dica: 'Estádio com um arco gigante' }),
  L(['estadios'], { id: 'old-trafford', nome: 'Old Trafford', lugar: 'Manchester, Inglaterra', aceitas: ['Teatro dos Sonhos'], lat: 53.46313, lon: -2.29134, regiao: 'europa', pais: 'Inglaterra', dica: 'Chamado de “teatro”' }),
  L(['estadios'], { id: 'allianz-arena', nome: 'Allianz Arena', lugar: 'Munique, Alemanha', aceitas: ['Arena de Munique'], lat: 48.21882, lon: 11.62472, regiao: 'europa', pais: 'Alemanha', dica: 'Estádio que muda de cor à noite' }),
  L(['estadios'], { id: 'signal-iduna', nome: 'Signal Iduna Park', lugar: 'Dortmund, Alemanha', aceitas: ['Westfalenstadion'], lat: 51.4926, lon: 7.45185, regiao: 'europa', pais: 'Alemanha', dica: 'Estádio da “muralha amarela”' }),
  L(['estadios'], { id: 'bombonera', nome: 'La Bombonera', lugar: 'Buenos Aires, Argentina', aceitas: ['Bombonera', 'Alberto J. Armando'], lat: -34.63564, lon: -58.36477, regiao: 'america-do-sul', pais: 'Argentina', dica: 'Estádio com um lado reto' }),
  L(['estadios'], { id: 'monumental', nome: 'Monumental de Núñez', lugar: 'Buenos Aires, Argentina', aceitas: ['Monumental', 'Más Monumental'], lat: -34.54535, lon: -58.44975, regiao: 'america-do-sul', pais: 'Argentina', dica: 'O maior estádio da América do Sul' }),
  L(['estadios'], { id: 'centenario', nome: 'Estádio Centenário', lugar: 'Montevidéu, Uruguai', aceitas: ['Centenario'], lat: -34.89448, lon: -56.1528, regiao: 'america-do-sul', pais: 'Uruguai', dica: 'Estádio da primeira Copa do Mundo' }),
  L(['estadios'], { id: 'da-luz', nome: 'Estádio da Luz', lugar: 'Lisboa, Portugal', aceitas: ['Da Luz', 'Estadio da Luz'], lat: 38.7527, lon: -9.18469, regiao: 'europa', pais: 'Portugal', dica: 'Estádio de uma águia' }),

  // PONTOS TURISTICOS
  L(['pontos-turisticos'], { id: 'cristo-redentor', nome: 'Cristo Redentor', lugar: 'Rio de Janeiro, Brasil', aceitas: ['Corcovado', 'Cristo'], lat: -22.95192, lon: -43.21049, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Monumento no alto de um morro' }),
  L(['pontos-turisticos', 'natureza'], { id: 'pao-de-acucar', nome: 'Pão de Açúcar', lugar: 'Rio de Janeiro, Brasil', aceitas: ['Pao de Acucar', 'Bondinho'], lat: -22.94868, lon: -43.15726, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Morro famoso ligado por um bondinho' }),
  L(['pontos-turisticos'], { id: 'congresso', nome: 'Congresso Nacional', lugar: 'Brasília, Brasil', aceitas: ['Congresso', 'Esplanada dos Ministérios'], lat: -15.7997, lon: -47.86434, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Prédio público de arquiteto famoso' }),
  L(['pontos-turisticos'], { id: 'teatro-amazonas', nome: 'Teatro Amazonas', lugar: 'Manaus, Brasil', aceitas: ['Teatro de Manaus'], lat: -3.13021, lon: -60.02341, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Teatro da época da borracha' }),
  L(['pontos-turisticos'], { id: 'elevador-lacerda', nome: 'Elevador Lacerda', lugar: 'Salvador, Brasil', aceitas: ['Lacerda'], lat: -12.97439, lon: -38.51352, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Liga a parte alta e a parte baixa' }),
  L(['pontos-turisticos'], { id: 'torre-eiffel', nome: 'Torre Eiffel', lugar: 'Paris, França', aceitas: ['Eiffel'], lat: 48.85826, lon: 2.2945, regiao: 'europa', pais: 'França', dica: 'Estrutura de ferro do século XIX' }),
  L(['pontos-turisticos'], { id: 'coliseu', nome: 'Coliseu', lugar: 'Roma, Itália', aceitas: ['Coliseu de Roma', 'Colosseum'], lat: 41.89021, lon: 12.49223, regiao: 'europa', pais: 'Itália', dica: 'Arena com quase 2 mil anos' }),
  L(['pontos-turisticos'], { id: 'sagrada-familia', nome: 'Sagrada Família', lugar: 'Barcelona, Espanha', aceitas: ['Sagrada Familia'], lat: 41.40363, lon: 2.17436, regiao: 'europa', pais: 'Espanha', dica: 'Igreja em obras há mais de cem anos' }),
  L(['pontos-turisticos'], { id: 'torre-de-belem', nome: 'Torre de Belém', lugar: 'Lisboa, Portugal', aceitas: ['Torre de Belem'], lat: 38.69158, lon: -9.21598, regiao: 'europa', pais: 'Portugal', dica: 'Torre na beira de um rio' }),
  L(['pontos-turisticos'], { id: 'westminster', nome: 'Big Ben e Parlamento', lugar: 'Londres, Inglaterra', aceitas: ['Big Ben', 'Palácio de Westminster', 'Parlamento Britânico'], lat: 51.49973, lon: -0.12464, regiao: 'europa', pais: 'Inglaterra', dica: 'Prédio de governo com relógio' }),
  L(['pontos-turisticos'], { id: 'estatua-liberdade', nome: 'Estátua da Liberdade', lugar: 'Nova York, Estados Unidos', aceitas: ['Estatua da Liberdade', 'Liberty Island'], lat: 40.68925, lon: -74.0445, regiao: 'america-do-norte', pais: 'Estados Unidos', dica: 'Presente de um país para outro' }),
  L(['pontos-turisticos'], { id: 'opera-sydney', nome: 'Ópera de Sydney', lugar: 'Sydney, Austrália', aceitas: ['Opera de Sydney', 'Sydney Opera House'], lat: -33.85678, lon: 151.2153, regiao: 'oceania', pais: 'Austrália', dica: 'Telhado em forma de velas' }),
  L(['pontos-turisticos'], { id: 'piramides', nome: 'Pirâmides de Gizé', lugar: 'Gizé, Egito', aceitas: ['Piramides', 'Quéops', 'Gizé'], lat: 29.97923, lon: 31.1342, regiao: 'africa', pais: 'Egito', dica: 'Uma das sete maravilhas antigas' }),
  L(['pontos-turisticos'], { id: 'taj-mahal', nome: 'Taj Mahal', lugar: 'Agra, Índia', aceitas: ['Taj'], lat: 27.17501, lon: 78.04215, regiao: 'asia', pais: 'Índia', dica: 'Mausoléu feito por amor' }),
  L(['pontos-turisticos', 'natureza'], { id: 'machu-picchu', nome: 'Machu Picchu', lugar: 'Cusco, Peru', aceitas: ['Machu Pichu'], lat: -13.16314, lon: -72.54497, regiao: 'america-do-sul', pais: 'Peru', dica: 'Ruínas no alto das montanhas', escala: -2 }),
  L(['pontos-turisticos'], { id: 'burj-khalifa', nome: 'Burj Khalifa', lugar: 'Dubai, Emirados Árabes', aceitas: ['Burj'], lat: 25.1972, lon: 55.2744, regiao: 'asia', pais: 'Emirados Árabes', dica: 'Prédio no meio do deserto' }),

  // NATUREZA
  L(['natureza', 'pontos-turisticos'], { id: 'cataratas-iguacu', nome: 'Cataratas do Iguaçu', lugar: 'Foz do Iguaçu, Brasil e Argentina', aceitas: ['Foz do Iguaçu', 'Garganta do Diabo', 'Iguaçu'], lat: -25.69539, lon: -54.43665, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Muita água caindo de uma vez', escala: -1 }),
  L(['natureza'], { id: 'grand-canyon', nome: 'Grand Canyon', lugar: 'Arizona, Estados Unidos', aceitas: ['Grande Canyon', 'Grand Canion'], lat: 36.0617, lon: -112.1076, regiao: 'america-do-norte', pais: 'Estados Unidos', dica: 'Rio que cavou a pedra por milhões de anos', escala: -2 }),
  L(['natureza'], { id: 'lencois', nome: 'Lençóis Maranhenses', lugar: 'Maranhão, Brasil', aceitas: ['Lencois Maranhenses', 'Lençóis'], lat: -2.4865, lon: -43.1285, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Areia e lagoas a perder de vista', escala: -2 }),
  L(['natureza', 'pontos-turisticos'], { id: 'baia-do-sancho', nome: 'Baía do Sancho', lugar: 'Fernando de Noronha, Brasil', aceitas: ['Fernando de Noronha', 'Noronha', 'Sancho'], lat: -3.85467, lon: -32.4431, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Praia de ilha, uma das mais bonitas do mundo', escala: -1 }),

  // CIDADES (adivinhe a cidade)
  L(['cidades'], { id: 'copacabana', nome: 'Rio de Janeiro', lugar: 'Calçadão de Copacabana, Brasil', aceitas: ['Rio', 'Copacabana'], lat: -22.97135, lon: -43.18264, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Calçada famosa à beira-mar' }),
  L(['cidades'], { id: 'paulista', nome: 'São Paulo', lugar: 'Avenida Paulista (MASP), Brasil', aceitas: ['Sao Paulo', 'Sampa', 'Paulista'], lat: -23.56141, lon: -46.65588, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Avenida cheia de prédios e museu' }),
  L(['cidades'], { id: 'veneza', nome: 'Veneza', lugar: 'Ponte de Rialto, Itália', aceitas: ['Venice', 'Venezia'], lat: 45.438, lon: 12.3359, regiao: 'europa', pais: 'Itália', pergunta: 'cidade', dica: 'Cidade sem carros' }),
  L(['cidades'], { id: 'amsterda', nome: 'Amsterdã', lugar: 'Praça Dam, Holanda', aceitas: ['Amsterdam', 'Amsterda'], lat: 52.3731, lon: 4.8927, regiao: 'europa', pais: 'Holanda', pergunta: 'cidade', dica: 'Cidade de canais e bicicletas' }),
  L(['cidades'], { id: 'nova-york', nome: 'Nova York', lugar: 'Times Square, Estados Unidos', aceitas: ['New York', 'NY', 'Manhattan'], lat: 40.758, lon: -73.9855, regiao: 'america-do-norte', pais: 'Estados Unidos', pergunta: 'cidade', dica: 'Cruzamento cheio de telões' }),
  L(['cidades'], { id: 'barcelona-eixample', nome: 'Barcelona', lugar: 'Eixample, Espanha', aceitas: ['Barça'], lat: 41.3915, lon: 2.165, regiao: 'europa', pais: 'Espanha', pergunta: 'cidade', dica: 'Quarteirões de cantos cortados' }),
  L(['cidades', 'pontos-turisticos'], { id: 'palm-jumeirah', nome: 'Dubai', lugar: 'Palm Jumeirah, Emirados Árabes', aceitas: ['Palm Jumeirah'], lat: 25.1124, lon: 55.139, regiao: 'asia', pais: 'Emirados Árabes', pergunta: 'cidade', dica: 'Ilha feita pelo homem', escala: -1 }),

  // PAISES (adivinhe o pais)
  L(['paises'], { id: 'shibuya', nome: 'Japão', lugar: 'Cruzamento de Shibuya, Tóquio', aceitas: ['Japao', 'Tóquio'], lat: 35.6595, lon: 139.7005, regiao: 'asia', pais: 'Japão', pergunta: 'pais', dica: 'O cruzamento mais movimentado do mundo' }),
  L(['paises'], { id: 'oia', nome: 'Grécia', lugar: 'Oia, Santorini', aceitas: ['Grecia', 'Santorini'], lat: 36.4613, lon: 25.3756, regiao: 'europa', pais: 'Grécia', pergunta: 'pais', dica: 'Casas brancas num penhasco sobre o mar', escala: -1 }),
  L(['paises'], { id: 'praca-vermelha', nome: 'Rússia', lugar: 'Praça Vermelha, Moscou', aceitas: ['Russia', 'Moscou'], lat: 55.7539, lon: 37.6208, regiao: 'europa', pais: 'Rússia', pergunta: 'pais', dica: 'Praça enorme na capital' }),
  L(['paises'], { id: 'jemaa-el-fna', nome: 'Marrocos', lugar: 'Praça Jemaa el-Fna, Marrakech', aceitas: ['Marrakech', 'Marraquexe'], lat: 31.6259, lon: -7.9891, regiao: 'africa', pais: 'Marrocos', pergunta: 'pais', dica: 'Praça de mercado e encantadores de serpente' }),
  L(['paises'], { id: 'cidade-do-cabo', nome: 'África do Sul', lugar: 'Cidade do Cabo, Montanha da Mesa', aceitas: ['Africa do Sul', 'Cidade do Cabo'], lat: -33.9036, lon: 18.4207, regiao: 'africa', pais: 'África do Sul', pergunta: 'pais', dica: 'Porto aos pés de uma montanha chata' }),
  L(['paises'], { id: 'zocalo', nome: 'México', lugar: 'Zócalo, Cidade do México', aceitas: ['Mexico'], lat: 19.4326, lon: -99.1332, regiao: 'america-do-norte', pais: 'México', pergunta: 'pais', dica: 'Praça central com uma bandeira gigante' }),

  // LUGARES COMUNS (nada famoso: o desafio e ler a cidade)
  L(['lugares-comuns'], { id: 'ponte-rio-niteroi', nome: 'Ponte Rio–Niterói', lugar: 'Baía de Guanabara, Brasil', aceitas: ['Ponte Rio Niteroi', 'Ponte Costa e Silva'], lat: -22.8713, lon: -43.1675, regiao: 'america-do-sul', pais: 'Brasil', dica: 'Uma ponte bem comprida' }),
  L(['lugares-comuns'], { id: 'praca-liberdade-bh', nome: 'Belo Horizonte', lugar: 'Praça da Liberdade, Brasil', aceitas: ['BH', 'Praça da Liberdade'], lat: -19.93197, lon: -43.93801, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Praça com jardins e palácios' }),
  L(['lugares-comuns'], { id: 'mercadao-sp', nome: 'São Paulo', lugar: 'Mercado Municipal, Brasil', aceitas: ['Sao Paulo', 'Mercadão'], lat: -23.5417, lon: -46.6297, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Telhado de um mercado antigo' }),
  L(['lugares-comuns'], { id: 'hercilio-luz', nome: 'Florianópolis', lugar: 'Ponte Hercílio Luz, Brasil', aceitas: ['Floripa', 'Florianopolis'], lat: -27.5938, lon: -48.5642, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Ponte pênsil ligando uma ilha' }),
  L(['lugares-comuns'], { id: 'estacao-da-luz', nome: 'São Paulo', lugar: 'Estação da Luz, Brasil', aceitas: ['Sao Paulo', 'Estação da Luz'], lat: -23.5347, lon: -46.6352, regiao: 'america-do-sul', pais: 'Brasil', pergunta: 'cidade', dica: 'Estação de trem com torre de relógio' })
];

export const GEO_TAGS = [
  ...GEO_REGIOES.map((r) => ({ ...r, kind: 'regiao' as const })),
  ...GEO_CATEGORIAS.map((c) => ({ ...c, kind: 'categoria' as const }))
];

const regiaoMatch = (l: GeoLocal, tag: string) => (tag === 'brasil' ? l.pais === 'Brasil' : l.regiao === tag);

/**
 * Filtra pelas tags escolhidas. Regioes combinam entre si com OU (Europa + America do Sul), categorias tambem
 * (Estadios + Pontos turisticos), e uma regiao combina com uma categoria com E (Brasil + Pontos turisticos =
 * pontos turisticos do Brasil). Sem tag de um grupo, esse grupo vale tudo ("Todos os paises").
 */
export function geoPool(tags: readonly string[] = []): GeoLocal[] {
  const regioes = tags.filter((t) => GEO_REGIOES.some((r) => r.id === t));
  const cats = tags.filter((t) => GEO_CATEGORIAS.some((c) => c.id === t));
  return GEO_LOCAIS.filter(
    (l) => (!regioes.length || regioes.some((r) => regiaoMatch(l, r))) && (!cats.length || cats.some((c) => l.categorias.includes(c as GeoCategoria)))
  );
}

/** Sorteia um lugar nao usado entre os das tags (sem nenhum, usa o banco inteiro). */
export function drawGeoLocal(used: Set<string> = new Set(), tags: readonly string[] = [], rng: () => number = Math.random): GeoLocal {
  let all = geoPool(tags);
  if (all.length === 0) all = GEO_LOCAIS;
  let pool = all.filter((l) => !used.has(l.id));
  if (pool.length === 0) pool = all;
  return pool[Math.floor(rng() * pool.length)];
}
