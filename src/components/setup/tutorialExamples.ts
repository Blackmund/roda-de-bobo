import type { GameId } from '../../types/game';

/**
 * UX-12: um exemplo curto por jogo no tutorial. Os 8 primeiros vem do programa, com o video-fonte e o minuto
 * (extraidos das legendas automaticas: nomes e numeros podem ter pequenos erros; "confianca" diz o quanto conferir).
 * Os demais sao itens do banco do jogo (sem video-fonte).
 */
export interface TutorialExample {
  /** O exemplo em si, curto e completo. */
  texto: string;
  /** Como o jogo reage a ele (a regra em acao). */
  detalhe: string;
  /** Video do programa em que apareceu (ID do YouTube + segundo). Ausente = exemplo do banco do jogo. */
  fonte?: { id: string; t: number; confianca: 'alta' | 'media' | 'baixa' };
}

export const TUTORIAL_EXAMPLES: Record<GameId, TutorialExample> = {
  limite: {
    texto: 'Tob, o cachorro do Canadá, estoura balões e entrou no Guinness. Em quanto tempo ele estourou 100 balões?',
    detalhe: 'Unidade: segundos. Cada um manda um palpite em segredo; ganha quem chegar mais perto SEM ultrapassar o valor real.',
    fonte: { id: '9tzeBB-VZGI', t: 214, confianca: 'alta' }
  },
  duvido: {
    texto: 'Citar camisas 10 do Brasil em Copas do Mundo desde 1950',
    detalhe: 'Alguém dá o lance ("eu cito 7!"), outro diz "duvido" e o falante tem 1 minuto para citar. Ex.: Pelé, Rivelino, Zico, Silas, Raí, Rivaldo, Ronaldinho, Neymar.',
    fonte: { id: 'GeRHRvcGw7Q', t: 499, confianca: 'media' }
  },
  proibido: {
    texto: 'Palavra-alvo: COBERTURA (um gol de cobertura)',
    detalhe: 'Dizer "encobrir" vale: não é do mesmo radical de "cobertura", e o diretor decidiu a favor. Dizer "cobrir" ou "cobertura" perderia a carta.',
    fonte: { id: '4mPuaMRZKqA', t: 80, confianca: 'media' }
  },
  nota: {
    texto: 'Tema: um calçado',
    detalhe: 'O narrador sorteia uma nota de 1 a 10 e dá exemplos na intensidade dela (um chinelo furado seria nota 2; um tênis de coleção, nota 10). Os outros adivinham o número.',
    fonte: { id: 'LFueUB64lxg', t: 43, confianca: 'alta' }
  },
  'tem-ou-nao-tem': {
    texto: 'Qual o bobo favorito do programa?',
    detalhe: 'Resposta dos 100 membros do canal: Donan 92, Casimiro 4, Luizinho 2, Bruninho 1, Simões 1. Cada acerto soma os votos daquela resposta à equipe.',
    fonte: { id: 'hMfnB79L84o', t: 44, confianca: 'media' }
  },
  'perguntas-e-verdades': {
    texto: 'Cartas 3♠, 7♥ e 12♣ na mão; o adversário aposta 4 fichas para perguntar qual é a mais alta.',
    detalhe: 'Exemplo do banco do jogo (formato original do site; não existe no programa): quem aposta mais faz a pergunta e o outro responde a verdade ou blefa.'
  },
  mimica: {
    texto: 'Remo',
    detalhe: 'O mímico faz gestos, sem falar, até a equipe acertar. Falou "acertou", o diretor confirma e vale 1, 2 ou 3 pontos conforme o tempo. Pode pular.',
    fonte: { id: 'v9Tck__zVwQ', t: 189, confianca: 'media' }
  },
  'quem-sou-eu': {
    texto: 'Identidades da edição anterior: Usain Bolt, Shakira, Canarinho Pistola e Donan.',
    detalhe: 'Cada um vê a identidade de todos, menos a própria, e descobre a sua com perguntas de sim ou não ("sou real?", "jogo futebol?").',
    fonte: { id: 'So27pjCDljs', t: 7, confianca: 'alta' }
  },
  'mega-resenha': {
    texto: 'Palavra-alvo: ARTILHEIRO',
    detalhe: 'Cada dica é UMA palavra só: goleador, matador, campeonato, artilharia... Mesmo radical da palavra-alvo é proibido. São 5 palavras em 1 minuto.',
    fonte: { id: '7hSI_3uDmgg', t: 115, confianca: 'alta' }
  },
  repetente: {
    texto: 'Tema: Pior jogador do Desafio Itaú',
    detalhe: 'Cada um escreve em segredo uma palavra para o tema. Quando os parceiros escrevem a MESMA palavra, ganham ponto.'
  },
  'respostas-sem-perguntas': {
    texto: 'Resposta: Caio Fumaça',
    detalhe: 'A resposta aparece e o jogo esconde a pergunta ("Quem é o produtor mais bonito do Roda de Bobo?"). Quem revelar as palavras certas e adivinhar ganha mais.'
  },
  estadios: {
    texto: 'Maracanã (Rio de Janeiro, Brasil)',
    detalhe: 'As pistas saem aos poucos: "fica na América do Sul", "cidade do Carnaval e do Cristo Redentor"... quanto antes acertar, mais pontos.'
  },
  'como-eu-pinto': {
    texto: 'Palavra para desenhar: Benfica',
    detalhe: 'Um jogador desenha no celular, sem letras nem números, e a equipe tem de adivinhar. O adversário pode roubar se o tempo acabar.'
  },
  'onde-estou': {
    texto: 'O cabelo "Cascão" de Ronaldo na Copa (2002)',
    detalhe: 'Cada um recebe um grande momento colado na testa (todos veem menos você) e descobre qual é com perguntas de sim ou não.'
  },
  adedanha: {
    texto: 'Letra P: Nome Paula, Animal Pato, Cor Preto, Fruta Pera',
    detalhe: 'Resposta só sua vale 10; se alguém escreveu a mesma, vale 5; sem resposta ou recusada pela mesa, 0.'
  },
  'com-terra': {
    texto: 'Peça 5 com furo: encaixe o furo sobre uma árvore e ganhe 7 + 2 pontos',
    detalhe: 'Bloco sólido não pode ficar em cima de árvore. Bloco sólido sobre uma ficha recolhe o valor dela; furo sobre a ficha deixa a ficha lá.'
  }
};

/** Link do video-fonte no minuto certo. */
export function exampleSourceUrl(f: NonNullable<TutorialExample['fonte']>): string {
  return `https://youtu.be/${f.id}?t=${f.t}`;
}
