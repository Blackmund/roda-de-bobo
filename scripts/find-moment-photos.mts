/**
 * Procura foto (Wikipédia/Commons) para os momentos do banco do Onde estou que ainda não têm.
 * Uso: npx tsx scripts/find-moment-photos.mts   (imprime o trecho para colar em FOTOS)
 */
import { ONDE_ESTOU_MOMENTS } from '../src/data/ondeEstouMoments.ts';
import { findMomentImages, setMomentImageRateWait } from '../src/utils/momentImages.ts';

// chave = trecho do nome do momento; valor = [artigo pt, artigo en, busca]
const HINTS: Record<string, [string, string, string]> = {
  'Brasil tricampeão no México': ['Copa do Mundo FIFA de 1970', 'Pelé 1970 World Cup', 'Pelé 1970 Copa do Mundo Brasil campeão'],
  'defesa de Gordon Banks': ['Gordon Banks', 'Gordon Banks', 'Gordon Banks Pelé 1970 save'],
  'gol do século': ['Diego Maradona', 'Goal of the Century', 'Maradona 1986 Inglaterra gol'],
  'Baggio isola': ['Roberto Baggio', 'Roberto Baggio', 'Baggio 1994 Brasil Itália pênalti'],
  'Ronaldo faz os dois gols': ['Final da Copa do Mundo FIFA de 2002', '2002 FIFA World Cup Final', 'Ronaldo 2002 final Alemanha'],
  'Ronaldinho faz o gol de falta': ['Ronaldinho', 'Ronaldinho', 'Ronaldinho 2002 Seaman falta'],
  'Iniesta decide': ['Final da Copa do Mundo FIFA de 2010', '2010 FIFA World Cup Final', 'Iniesta 2010 final gol'],
  'Suárez morde': ['Luis Suárez', 'Luis Suárez', 'Suárez Chiellini mordida 2014'],
  'O 7 a 1 da Alemanha': ['Brasil 1–7 Alemanha (2014)', 'Brazil v Germany (2014 FIFA World Cup)', 'Brasil Alemanha 7 a 1 Mineirão'],
  'Argentina de Messi campeã': ['Lionel Messi', '2022 FIFA World Cup Final', 'Messi 2022 taça Copa do Mundo'],
  'Pelé marca o gol mil': ['Pelé', 'Pelé', 'Pelé gol mil Maracanã 1969'],
  'Flamengo vence o Liverpool': ['Clube de Regatas do Flamengo', '1981 Intercontinental Cup', 'Flamengo Liverpool 1981 Tóquio'],
  'Roberto Carlos faz o gol impossível': ['Roberto Carlos', 'Roberto Carlos', 'Roberto Carlos free kick France 1997'],
  'Milagre de Istambul': ['Final da Liga dos Campeões da UEFA de 2004–05', '2005 UEFA Champions League final', 'Liverpool Milan 2005 Istanbul'],
  'Neymar leva o Santos': ['Neymar', 'Neymar', 'Neymar Santos Libertadores 2011'],
  'Atlético Mineiro campeão': ['Clube Atlético Mineiro', 'Clube Atlético Mineiro', 'Atlético Mineiro Libertadores 2013'],
  'Sergio Ramos empata': ['Sergio Ramos', '2014 UEFA Champions League final', 'Sergio Ramos Champions 2014 Lisboa'],
  'Leicester City campeão': ['Leicester City Football Club', 'Leicester City F.C.', 'Leicester City 2016 Premier League champions'],
  'Barcelona vira o PSG': ['Barcelona 6–1 Paris Saint-Germain', 'Barcelona 6–1 Paris Saint-Germain', 'Barcelona PSG 6-1 Camp Nou'],
  'Gabigol faz dois gols': ['Gabriel Barbosa', 'Gabriel Barbosa', 'Gabigol Flamengo River Lima 2019'],
  'Brasil campeão da Copa América': ['Copa América de 2019', '2019 Copa América', 'Brasil campeão Copa América 2019 Maracanã'],
  'Argentina campeã da Copa América': ['Copa América de 2021', '2021 Copa América', 'Argentina Copa América 2021 Messi'],
  'Dream Team conquista': ['Dream Team (basquetebol)', '1992 United States men\'s Olympic basketball team', 'Dream Team 1992 Barcelona'],
  'ouro no vôlei masculino': ['Voleibol nos Jogos Olímpicos de Verão de 1992', 'Volleyball at the 1992 Summer Olympics', 'Brasil vôlei ouro Barcelona 1992'],
  'Guga conquista': ['Gustavo Kuerten', 'Gustavo Kuerten', 'Guga Kuerten Roland Garros 1997'],
  'Piadas': ['', '', '']
};

setMomentImageRateWait(40000);
const missing = ONDE_ESTOU_MOMENTS.filter((m) => !m.imagem);
const queries = missing.map((x) => {
  const key = Object.keys(HINTS).find((k) => x.nome.includes(k));
  const h = key ? HINTS[key] : (["", "", x.nome.replace(/(.*?)/g, "")] as [string, string, string]);
  return { wiki: h[0], wikiEn: h[1], busca: h[2] };
});
const urls = await findMomentImages(queries);
missing.forEach((x, i) => console.log(JSON.stringify({ k: x.nome.slice(0, 45), url: urls[i] })));
