import type { GameId } from '../types/game';

/**
 * Jogos cujo conteudo vem de bancos locais (ou da propria dinamica), sem IA: nunca devem pedir rodadas ao servidor
 * (`/api/generate-round`) nem aquecer o cache de IA. Sem esta lista, o pre-carregamento da tela de configuracao
 * mandaria o `gameId` desses jogos para a API (erro 400 sem chave; cota gasta com chave).
 */
export const LOCAL_CONTENT_GAMES: readonly GameId[] = [
  'perguntas-e-verdades',
  'mimica',
  'quem-sou-eu',
  'mega-resenha',
  'repetente',
  'respostas-sem-perguntas',
  'estadios',
  'como-eu-pinto',
  'onde-estou',
  'com-terra'
];

export function usesLocalContent(gameId: GameId | null | undefined): boolean {
  return !!gameId && LOCAL_CONTENT_GAMES.includes(gameId);
}
