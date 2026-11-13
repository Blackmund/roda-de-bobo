import type { GameId } from '../../types/game';
import type { GameTutorialDefinition } from './tutorialTypes';

export const GAME_TUTORIALS: Record<GameId, GameTutorialDefinition> = {
  limite: {
    gameId: 'limite',
    icon: '🎯',
    name: 'JOGO DO LIMITE',
    welcomeTitle: 'Como Jogar o Limite',
    welcomeSubtitle:
      'Estime o valor numérico da pergunta sem ultrapassar o valor real. Quem chegar mais perto sem passar pontua.',
    steps: [
      {
        stepNumber: 1,
        icon: '🔢',
        headline: 'Pergunta Numérica no Telão',
        description:
          'Uma pergunta quantitativa surge no telão com contagem regressiva. Avalie a melhor estimativa antes do tempo zerar.',
        accentTag: 'Pergunta & Estimativa'
      },
      {
        stepNumber: 2,
        icon: '🤫',
        headline: 'Palpite Secreto pelo Celular',
        description:
          'Envie seu número em segredo. Atenção máxima: quem der um lance maior que o valor real estoura! Se TODOS estourarem, vence quem estourou menos.',
        accentTag: 'Sem Ultrapassar'
      },
      {
        stepNumber: 3,
        icon: '🃏',
        headline: 'Cartas de Poder e Revelação',
        description:
          'São 4 cartas de poder sorteadas às cegas: cada jogador pega UMA e só pode usá-la uma vez na partida. O palpite mais próximo sem passar fatura 1 ponto.',
        accentTag: 'Mais perto = 1 ponto'
      }
    ],
    proibido: [
      'ULTRAPASSAR O NÚMERO REAL DA PERGUNTA (QUEM PASSAR ESTOURA)',
      'ALTERAR O PALPITE APÓS O ENCERRAMENTO DO CRONÔMETRO',
      'PESQUISAR NA INTERNET SEM A CARTA DE LIGAÇÃO'
    ],
    permitido: [
      'USAR A CARTA DE PODER SORTEADA (UMA CARTA POR JOGADOR, USO ÚNICO)',
      'ARREDONDAR PARA BAIXO COM CAUTELA PARA NÃO ESTOURAR'
    ],
    scoringSummary: [
      'Maior palpite que não ultrapassar o valor real fatura +1 ponto. Se todos estourarem, vence quem estourou menos.'
    ]
  },
  duvido: {
    gameId: 'duvido',
    icon: '🚨',
    name: 'JOGO DO DUVIDO',
    welcomeTitle: 'Como Jogar o Duvido',
    welcomeSubtitle:
      'Dinâmica de blefe e confiança: um integrante fica vendado sem ver o tema, enquanto o parceiro aposta na quantidade de itens ou grita DUVIDO para desafiar os rivais!',
    steps: [
      {
        stepNumber: 1,
        icon: '📌',
        headline: 'Um Integrante Vendado sem Saber o Tema',
        description:
          'Em cada equipe, um jogador fica vendado sem ver o tema do telão. O parceiro vê a categoria e avalia se o companheiro manja do assunto.',
        accentTag: 'Parceiro Vendado'
      },
      {
        stepNumber: 2,
        icon: '🚨',
        headline: 'Suba a Aposta ou Grite DUVIDO',
        description:
          'Aumente o lance apostando que seu parceiro vendado sabe o tema, ou aperte DUVIDO quando achar que o rival vendado não vai saber.',
        accentTag: 'Aposta ou Blefe'
      },
      {
        stepNumber: 3,
        icon: '⏱️',
        headline: 'O Vendado Cita os Itens no Cronômetro',
        description:
          'A equipe desafiada vai para a berlinda: o jogador vendado descobre o tema e precisa listar todos os itens antes do cronômetro zerar!',
        accentTag: '30s na Pressão'
      }
    ],
    proibido: [
      'O INTEGRANTE VENDADO ESPIAR O TEMA NO TELÃO OU CELULAR',
      'DAR LANCE MENOR OU IGUAL AO LANCE ANTERIOR NO LEILÃO',
      'REPETIR ITENS OU FALAR ITENS FORA DA CATEGORIA'
    ],
    permitido: [
      'SUBIR O LANCE APOSTANDO NO CONHECIMENTO DO PARCEIRO',
      'GRITAR "DUVIDO!" QUANDO ACHAR QUE A OUTRA EQUIPE NÃO SABE',
      'O PARCEIRO VENDADO DESCOBRIR O TEMA APENAS NA BERLINDA'
    ],
    scoringSummary: [
      'O parceiro vendado citou todos os itens dentro do tempo: +1 ponto para a equipe desafiada.',
      'Tempo esgotou ou errou item: +1 ponto para quem gritou DUVIDO!'
    ]
  },
  proibido: {
    gameId: 'proibido',
    icon: '🚫',
    name: 'JOGO DO PROIBIDO',
    welcomeTitle: 'Como Jogar o Proibido',
    welcomeSubtitle:
      'Comunicação rápida e criativa: faça seu parceiro adivinhar a palavra-chave sem pronunciar nenhuma das 5 palavras proibidas!',
    steps: [
      {
        stepNumber: 1,
        icon: '🙈',
        headline: 'O Orador Vê, o Parceiro Fica Vendado',
        description:
          'Quem dá as dicas olha o telão. O companheiro de equipe fica vendado ou de costas, ouvindo apenas as pistas por voz.',
        accentTag: 'Adivinhador Vendado'
      },
      {
        stepNumber: 2,
        icon: '🙊',
        headline: 'Dicas Ágeis sem Palavras Proibidas',
        description:
          'Descreva a palavra-chave com analogias e sinônimos. É proibido pronunciar as 5 proibidas, a própria palavra, palavras do mesmo radical e traduções em inglês. Sinônimos, frases completas e dicas seguidas valem. Em caso de polêmica, o juiz pode contestar a falta e devolver a carta.',
        accentTag: 'Zero Proibidas'
      },
      {
        stepNumber: 3,
        icon: '⏱️',
        headline: 'Pule se Travar e Pontue a Cada Acerto',
        description:
          'Cada acerto dentro do tempo soma +1 ponto. Se a palavra for difícil demais, use o botão PULAR sem perder pontos!',
        accentTag: '+1 Ponto por Acerto'
      }
    ],
    proibido: [
      'O ADIVINHADOR OLHAR A TELA DA TV OU DO DISPOSITIVO',
      'FALAR QUALQUER UMA DAS 5 PALAVRAS PROIBIDAS DA CARTA',
      'USAR O MESMO RADICAL DA PALAVRA OU FAZER MÍMICAS'
    ],
    permitido: [
      'JOGAR EM DUELOS 1x1 OU EM EQUIPES COMPLETAS',
      'PULAR CARTAS LIVREMENTE SEM PERDA DE PONTOS',
      'ALTERNAR A VISIBILIDADE DAS PALAVRAS NO TELÃO DO ÁRBITRO'
    ],
    scoringSummary: [
      'Cada acerto dentro do tempo soma +1 ponto para a equipe da vez.',
      'Cartas puladas retornam ao final da fila sem penalidade de pontos.'
    ]
  },
  nota: {
    gameId: 'nota',
    icon: '🔟',
    name: 'JOGO DA NOTA',
    welcomeTitle: 'Como Jogar a Nota',
    welcomeSubtitle:
      'Sintonia e intuição pura: descubra a nota secreta de 1 a 10 através de duas pistas calibradas pelo narrador da rodada.',
    steps: [
      {
        stepNumber: 1,
        icon: '🎡',
        headline: 'Sorteio da Nota Secreta (1 a 10)',
        description:
          'A roleta sorteia um número confidencial de 1 a 10 que fica visível unicamente para o narrador da vez no seu celular.',
        accentTag: 'Nota Secreta'
      },
      {
        stepNumber: 2,
        icon: '💬',
        headline: 'Duas Pistas Calibradas no Espectro',
        description:
          'O narrador dá 2 exemplos que refletem exatamente a intensidade da nota sorteada, sem mencionar números ou valores diretos.',
        accentTag: '2 Pistas Calibradas'
      },
      {
        stepNumber: 3,
        icon: '🎯',
        headline: 'Votação da Mesa e Pontuação Mútua',
        description:
          'A mesa vota no palpite da nota. Quem acertar ganha +1 ponto, e o narrador fatura +1 ponto bônus por cada acerto da sala!',
        accentTag: 'Sintonia Coletiva'
      }
    ],
    proibido: [
      'FALAR NÚMEROS OU DAR DICAS DIRETAS SOBRE O VALOR DA NOTA',
      'ESPIAR O SORTEIO SECRETO DA ROLETA DO NARRADOR',
      'ALTERAR O PALPITE APÓS O INÍCIO DA REVELAÇÃO'
    ],
    permitido: [
      'CRIAR UMA SEGUNDA PERGUNTA LIVRE PELA MESA PARA CALIBRAR',
      'USAR COMPARAÇÕES E ANALOGIAS DIVERTIDAS',
      'PONTUAÇÃO MÚTUA: NARRADOR PONTUA COM CADA ACERTO'
    ],
    scoringSummary: [
      'Cada jogador que acertar a nota exata ganha +1 ponto.',
      'O Narrador ganha +1 ponto bônus para cada jogador que acertar sua nota!'
    ]
  },
  'tem-ou-nao-tem': {
    gameId: 'tem-ou-nao-tem',
    icon: '📊',
    name: 'TEM OU NÃO TEM',
    welcomeTitle: 'Como Jogar o Tem ou Não Tem',
    welcomeSubtitle:
      'O Top 5 do programa: em equipes, descubra as respostas mais votadas da pesquisa antes de estourar os erros (3 strikes nas regras da casa, 2 nas do programa)!',
    steps: [
      {
        stepNumber: 1,
        icon: '📊',
        headline: 'Pergunta Popular com 5 Respostas',
        description:
          'Uma pergunta do cotidiano surge no telão com as 5 respostas mais votadas por 100 brasileiros comuns.',
        accentTag: 'Top 5 Respostas'
      },
      {
        stepNumber: 2,
        icon: '👥',
        headline: 'Palpites em Equipe e Revelação',
        description:
          'As equipes respondem alternadamente (a posse da rodada sai no par ou ímpar). Cada acerto abre a ripa no painel e soma ao time os votos daquela resposta.',
        accentTag: 'Pontos Revelados'
      },
      {
        stepNumber: 3,
        icon: '❌',
        headline: 'Cuidado com os 3 Strikes e o Roubo',
        description:
          'Respostas erradas dão Strike [X]. Se acumularem 3 strikes, a equipe adversária ganha uma chance única de roubar a rodada!',
        accentTag: 'Limite de 3 Strikes'
      }
    ],
    proibido: [
      'ATINGIR 3 STRIKES (X), PASSANDO A CHANCE DE ROUBO PARA OS RIVAIS',
      'REPETIR PALPITES QUE JÁ FORAM REVELADOS NO PAINEL',
      'CONTAR PONTUAÇÃO INDIVIDUAL (O PLACAR É SEMPRE DA EQUIPE)'
    ],
    permitido: [
      'CONSULTAR OS COLEGAS DE EQUIPE ANTES DE ENVIAR O PALPITE',
      'ROUBAR A PONTUAÇÃO INTEIRA DA RODADA SE OS RIVAIS FALHAREM',
      'VALIDAR SINÔNIMOS DIRETAMENTE PELO TELÃO DO ÁRBITRO'
    ],
    scoringSummary: [
      'Cada ripa aberta soma o número de votos para a equipe dona da resposta.',
      'Com 3 strikes acumulados, a equipe adversária pode tentar o roubo decisivo.'
    ]
  },
  'perguntas-e-verdades': {
    gameId: 'perguntas-e-verdades',
    icon: '🃏',
    name: 'PERGUNTAS E VERDADES',
    welcomeTitle: 'Como Jogar Perguntas e Verdades',
    welcomeSubtitle:
      'Dedução estratégica e blefe: organize suas 8 cartas secretas, dispute o leilão de fichas e declare a verdade para vencer!',
    steps: [
      {
        stepNumber: 1,
        icon: '🃏',
        headline: 'Organize suas 8 Cartas Secretas',
        description:
          'Receba 8 cartas no celular e ordene-as do menor para o maior dentro de cada naipe. Mantenha sua mão bem protegida.',
        accentTag: '8 Cartas em Ordem'
      },
      {
        stepNumber: 2,
        icon: '🪙',
        headline: 'Leilão de Fichas e Interrogatório',
        description:
          'Aposte fichas no escuro. Quem der o maior lance conquista o poder de interrogar qualquer rival usando as 11 perguntas oficiais.',
        accentTag: 'Leilão Secreto'
      },
      {
        stepNumber: 3,
        icon: '🔍',
        headline: 'Dedução e Declaração da Verdade',
        description:
          'Anote as pistas das respostas. Quando deduzir a mão inteira do oponente, faça a Declaração da Verdade para vencer imediatamente!',
        accentTag: 'Declaração Final'
      }
    ],
    proibido: [
      'MANTER CARTAS DO MESMO NAIPE FORA DA ORDEM CRESCENTE',
      'PASSAR INFORMAÇÃO FALSA AO RESPONDER UMA PERGUNTA OFICIAL',
      'REVELAR O SALDO EXATO DE FICHAS AOS DEMAIS JOGADORES'
    ],
    permitido: [
      'ORGANIZAR LIVREMENTE OS SLOTS DAS CARTAS NO SEU DISPOSITIVO',
      'INTERCALAR NAIPES DIFERENTES NA SUA MÃO',
      'DECLARAR A VERDADE CRAVANDO AS 8 CARTAS DO RIVAL PARA VENCER'
    ],
    scoringSummary: [
      'Empate no leilão devolve as fichas e bonifica ambos com +2 fichas extras.',
      'Cravar todas as 8 cartas do oponente na Declaração da Verdade garante vitória imediata!'
    ]
  },
  mimica: {
    gameId: 'mimica',
    icon: '🎭',
    name: 'JOGO DA MÍMICA',
    welcomeTitle: 'Como Jogar a Mímica',
    welcomeSubtitle:
      'Duplas em ação: um faz mímica das palavras, o parceiro (de olhos vendados na sala principal) adivinha antes do tempo acabar!',
    steps: [
      {
        stepNumber: 1,
        icon: '👀',
        headline: 'O Mímico Vê 3 Palavras',
        description:
          'Só quem faz a mímica olha as palavras (na tela ou no celular). O parceiro que vai adivinhar fica de costas ou vendado.',
        accentTag: '3 Palavras'
      },
      {
        stepNumber: 2,
        icon: '🤐',
        headline: 'Sem Falar, Sem Apontar',
        description:
          'Vale gesto, expressão e movimento. Não vale falar, soprar sons nem apontar para objetos que revelem a palavra.',
        accentTag: 'Só Mímica'
      },
      {
        stepNumber: 3,
        icon: '⏱️',
        headline: 'Acertou, Pulou ou Acabou o Tempo',
        description:
          'O parceiro chuta. O diretor confirma "acertou" ou pula a palavra. Cada rodada vale mais pontos que a anterior (1, 2 e 3 por palavra).',
        accentTag: '1min30 por Rodada'
      }
    ],
    proibido: [
      'FALAR, SUSSURRAR OU FAZER SONS QUE REVELEM A PALAVRA',
      'APONTAR PARA OBJETOS OU PESSOAS QUE DÊEM A RESPOSTA',
      'O ADVERSÁRIO DAR DICAS (ELE PODE OBSERVAR, MAS NÃO PODE AJUDAR)'
    ],
    permitido: [
      'USAR O CORPO INTEIRO E EXPRESSÕES FACIAIS',
      'PULAR UMA PALAVRA E VOLTAR A ELA DEPOIS',
      'O PARCEIRO CHUTAR QUANTAS VEZES QUISER'
    ],
    scoringSummary: [
      'Cada palavra acertada vale o valor da rodada (rodada 1 = 1 ponto, rodada 2 = 2, rodada 3 = 3 nas regras do programa; 1 ponto nas regras da casa).',
      'Palavras puladas ou não acertadas no tempo não pontuam.'
    ]
  },
  'quem-sou-eu': {
    gameId: 'quem-sou-eu',
    icon: '🪪',
    name: 'QUEM SOU EU',
    welcomeTitle: 'Como Jogar o Quem Sou Eu',
    welcomeSubtitle:
      'Todo mundo vê quem você é, menos você! Descubra a sua identidade com perguntas de sim ou não antes dos outros jogadores.',
    steps: [
      {
        stepNumber: 1,
        icon: '🪪',
        headline: 'Uma Identidade na Testa',
        description:
          'Cada jogador recebe uma pessoa ou personagem. A TV (e o celular dos outros) mostra para todos, menos para o dono.',
        accentTag: 'Todos Veem, Menos Você'
      },
      {
        stepNumber: 2,
        icon: '❓',
        headline: 'Pergunte ou Chute na Sua Vez',
        description:
          'Em rodízio, faça uma pergunta de sim ou não ("Eu sou real?", "Sou jogador?") ou chute quem você é. Os outros só podem responder sim ou não.',
        accentTag: 'Só Sim ou Não'
      },
      {
        stepNumber: 3,
        icon: '🏁',
        headline: 'Quem Acerta Primeiro Pontua Mais',
        description:
          'O 1º a descobrir leva mais pontos, o 2º um pouco menos, e assim por diante. Quem gastar todas as perguntas fica de fora.',
        accentTag: 'Corrida de Descoberta'
      }
    ],
    proibido: [
      'DAR DICAS ALÉM DE "SIM" OU "NÃO"',
      'OLHAR A TELA OU O CELULAR COM A SUA IDENTIDADE',
      'CHUTAR VÁRIAS VEZES NA MESMA VEZ'
    ],
    permitido: [
      'PERGUNTAR SOBRE PROFISSÃO, ORIGEM, IDADE E FEITOS',
      'COMEÇAR POR "EU SOU REAL?" PARA SEPARAR PESSOA DE PERSONAGEM',
      'ANOTAR AS RESPOSTAS PARA NÃO REPETIR PERGUNTA'
    ],
    scoringSummary: [
      'O primeiro a acertar leva tantos pontos quanto jogadores na sala; cada acerto seguinte vale 1 ponto a menos (mínimo 1).',
      'Quem esgotar as perguntas ou não descobrir antes do fim da rodada não pontua. (A pontuação do programa ainda não foi confirmada.)'
    ]
  },
  'mega-resenha': {
    gameId: 'mega-resenha',
    icon: '🗣️',
    name: 'MEGA RESENHA',
    welcomeTitle: 'Como Jogar a Mega Resenha',
    welcomeSubtitle:
      'Duas duplas, uma palavra secreta e dicas de UMA palavra só: faça o parceiro vendado acertar o máximo de palavras em 1 minuto!',
    steps: [
      {
        stepNumber: 1,
        icon: '👀',
        headline: 'Quem Dá as Dicas Vê a Palavra',
        description:
          'A palavra aparece só para quem dá as dicas. O parceiro fica vendado e tenta adivinhar ouvindo as dicas.',
        accentTag: '5 Palavras em 1 Minuto'
      },
      {
        stepNumber: 2,
        icon: '☝️',
        headline: 'Uma Palavra por Dica',
        description:
          'Cada dica é UMA palavra só: sem frase, sem nome composto, sem a própria palavra e sem o mesmo radical.',
        accentTag: 'Dica de Uma Palavra'
      },
      {
        stepNumber: 3,
        icon: '⚖️',
        headline: 'O Juiz Decide as Polêmicas',
        description:
          'O jogo avisa quando a dica parece inválida. Se o juiz achar que vale, aceita a dica e a rodada segue.',
        accentTag: 'Checagem Automática'
      }
    ],
    proibido: [
      'DAR UMA FRASE OU UM NOME COMPOSTO COMO DICA',
      'DIZER A PRÓPRIA PALAVRA OU UMA DO MESMO RADICAL',
      'O ADVERSÁRIO DAR DICAS OU REVELAR A PALAVRA'
    ],
    permitido: [
      'DAR VÁRIAS DICAS DE UMA PALAVRA EM SEQUÊNCIA',
      'PULAR A PALAVRA E VOLTAR A ELA DEPOIS',
      'O PARCEIRO CHUTAR QUANTAS VEZES QUISER'
    ],
    scoringSummary: [
      'Cada palavra acertada vale 1 ponto para a equipe da vez (regra da casa; o programa não confirmou a pontuação).',
      'Palavras puladas ou não acertadas até o fim do tempo não pontuam.'
    ]
  },
  repetente: {
    gameId: 'repetente',
    icon: '🖍️',
    name: 'REPETENTE',
    welcomeTitle: 'Como Jogar o Repetente',
    welcomeSubtitle:
      'Pense igual ao seu parceiro! Cada um escreve em segredo UMA palavra para o tema, e a dupla só pontua se as palavras forem a mesma.',
    steps: [
      {
        stepNumber: 1,
        icon: '🎯',
        headline: 'Um Tema para Todos',
        description:
          'O jogo sorteia um tema ("um time do Rio", "algo que se leva à praia"). Cada jogador escreve UMA palavra em segredo, no celular ou na TV.',
        accentTag: 'Uma Palavra Só'
      },
      {
        stepNumber: 2,
        icon: '🤝',
        headline: 'Combine com o Parceiro',
        description:
          'Sem conversar: tente escrever a mesma palavra do seu parceiro. As palavras só aparecem quando todos terminarem (ou o tempo acabar).',
        accentTag: 'Papo Reto'
      },
      {
        stepNumber: 3,
        icon: '🏆',
        headline: 'Combinou, Pontuou',
        description:
          'Dupla que combina ganha 1 ponto. Se só uma dupla combinar, ela leva 2. Em dúvida ("gato" x "gatos"), o juiz decide se vale.',
        accentTag: 'Só Uma Combina = 2'
      }
    ],
    proibido: [
      'COMBINAR A PALAVRA COM O PARCEIRO ANTES DE REVELAR',
      'ESPIAR A PALAVRA DE QUEM ESTÁ ESCREVENDO',
      'ESCREVER MAIS DE UMA PALAVRA'
    ],
    permitido: [
      'ESCREVER O PRIMEIRO QUE VIER À CABEÇA',
      'PENSAR NA RESPOSTA MAIS ÓBVIA PARA O SEU PARCEIRO',
      'PEDIR AO JUIZ PARA ACEITAR PALAVRAS QUASE IGUAIS'
    ],
    scoringSummary: [
      'Dupla que combina as palavras: +1 ponto. Se só uma das duplas combina, ela leva +2 (leitura da regra do programa, a confirmar).',
      'Times com 3 ou mais jogadores só combinam se todos escreverem a mesma palavra.'
    ]
  },
  'respostas-sem-perguntas': {
    gameId: 'respostas-sem-perguntas',
    icon: '❓',
    name: 'RESPOSTAS SEM PERGUNTAS',
    welcomeTitle: 'Como Jogar Respostas sem Perguntas',
    welcomeSubtitle:
      'A pergunta existe, mas você não sabe qual é! Só se conhece a quantidade de palavras. Revele uma, chute a resposta e ganhe pontos.',
    steps: [
      {
        stepNumber: 1,
        icon: '🔢',
        headline: 'Só Se Sabe Quantas Palavras Tem',
        description:
          'A tela mostra casinhas numeradas, uma para cada palavra da pergunta. O texto da pergunta e a resposta ficam escondidos.',
        accentTag: 'Pergunta Oculta'
      },
      {
        stepNumber: 2,
        icon: '👆',
        headline: 'Revele UMA Palavra e Chute',
        description:
          'Na sua vez, escolha uma posição para revelar (a 1ª costuma ser "Quem", "Qual"...) e então arrisque a resposta em voz alta.',
        accentTag: 'Uma Palavra por Vez'
      },
      {
        stepNumber: 3,
        icon: '📉',
        headline: 'Cada Erro Tira 1 Ponto',
        description:
          'Acertar vale tantos pontos quanto palavras na pergunta (11 palavras = 11 pontos). A cada erro, o valor cai 1 e a vez passa ao próximo.',
        accentTag: 'Quem Erra Paga'
      }
    ],
    proibido: [
      'ESPIAR A TELA DO DIRETOR COM A RESPOSTA',
      'REVELAR MAIS DE UMA PALAVRA NA MESMA VEZ',
      'CHUTAR FORA DA SUA VEZ'
    ],
    permitido: [
      'USAR AS PALAVRAS JÁ REVELADAS PARA DEDUZIR A PERGUNTA',
      'ESCOLHER A 1ª PALAVRA PARA SABER O TIPO DA PERGUNTA',
      'ARRISCAR QUALQUER RESPOSTA NA SUA VEZ'
    ],
    scoringSummary: [
      'Quem acerta ganha o valor atual: número de palavras da pergunta menos 1 por erro já cometido (mínimo 1).',
      'Se todas as palavras forem reveladas e ninguém acertar, a rodada termina sem pontos.'
    ]
  },
  estadios: {
    gameId: 'estadios',
    icon: '🏟️',
    name: 'ESTÁDIOS',
    welcomeTitle: 'Como Jogar Estádios',
    welcomeSubtitle:
      'Descubra qual é o estádio! Quanto antes acertar, mais pontos: 5 de primeira, 4 de segunda, e assim por diante.',
    steps: [
      {
        stepNumber: 1,
        icon: '🏟️',
        headline: 'Um Estádio Misterioso',
        description:
          'O jogo escolhe um estádio famoso. Começa só com a primeira pista (a mais vaga); no programa essa pista é uma foto.',
        accentTag: 'Pista 1 de 5'
      },
      {
        stepNumber: 2,
        icon: '🎯',
        headline: 'Chute na Sua Vez',
        description:
          'Em rodízio, cada jogador arrisca o nome do estádio. O diretor confere com a resposta e marca se acertou ou errou.',
        accentTag: 'Rodízio de Chutes'
      },
      {
        stepNumber: 3,
        icon: '📉',
        headline: 'Cada Erro Libera Uma Pista',
        description:
          'Errou? A vez passa, uma pista nova aparece e o valor cai 1 ponto: 5, 4, 3, 2, 1. Errar as 5 pistas encerra sem pontos.',
        accentTag: '5, 4, 3, 2, 1'
      }
    ],
    proibido: [
      'PESQUISAR NO CELULAR DURANTE A RODADA',
      'CHUTAR FORA DA SUA VEZ',
      'ESPIAR A RESPOSTA NA TELA DO DIRETOR'
    ],
    permitido: [
      'ARRISCAR O NOME OFICIAL OU O APELIDO DO ESTÁDIO',
      'USAR AS PISTAS JÁ LIBERADAS PARA DEDUZIR',
      'PEDIR AO DIRETOR PARA ACEITAR UMA VARIAÇÃO DO NOME'
    ],
    scoringSummary: [
      'Acertou de primeira: 5 pontos; de segunda: 4; de terceira: 3; de quarta: 2; de quinta: 1.',
      'Se ninguém acertar depois da quinta pista, a rodada termina sem pontos.'
    ]
  },
  'como-eu-pinto': {
    gameId: 'como-eu-pinto',
    icon: '🎨',
    name: 'COMO EU PINTO',
    welcomeTitle: 'Como Jogar o Como Eu Pinto',
    welcomeSubtitle:
      'Duas duplas, 3 palavras e 2 minutos: um desenha, o parceiro adivinha. Acabou o tempo? A dupla rival tenta roubar as palavras que faltaram!',
    steps: [
      {
        stepNumber: 1,
        icon: '🎨',
        headline: 'Um Desenha, o Outro Adivinha',
        description:
          'Quem desenha vê a palavra e a desenha na tela (na TV ou no celular). O parceiro olha o desenho e chuta a palavra em voz alta.',
        accentTag: '3 Palavras em 2 Minutos'
      },
      {
        stepNumber: 2,
        icon: '🚫',
        headline: 'Sem Letras, Números ou Dicas',
        description:
          'É proibido escrever letras ou números e falar qualquer coisa sobre a palavra. Só vale desenho (setas e símbolos que não sejam letras).',
        accentTag: 'Só Desenho'
      },
      {
        stepNumber: 3,
        icon: '🏴‍☠️',
        headline: 'A Dupla Rival Pode Roubar',
        description:
          'Acabou o tempo e faltam palavras? A dupla rival palpita as que sobraram e leva 1 ponto por cada acerto. Quem desenha não pode falar nada!',
        accentTag: 'Roubo no Final'
      }
    ],
    proibido: [
      'ESCREVER LETRAS OU NÚMEROS NO DESENHO',
      'FALAR OU DAR DICAS SOBRE A PALAVRA ENQUANTO DESENHA',
      'FALAR QUALQUER COISA QUANDO O TEMPO ACABAR (A OUTRA DUPLA ESTÁ PALPITANDO)'
    ],
    permitido: [
      'USAR CORES, SETAS E SÍMBOLOS QUE NÃO SEJAM LETRAS',
      'DESFAZER E LIMPAR O DESENHO À VONTADE',
      'PULAR UMA PALAVRA E VOLTAR A ELA DEPOIS'
    ],
    scoringSummary: [
      'Cada palavra acertada pela dupla que desenha vale 1 ponto.',
      'Palavras que faltarem quando o tempo acabar podem ser roubadas pela dupla rival: 1 ponto cada (valor do roubo a confirmar).'
    ]
  },
  'onde-estou': {
    gameId: 'onde-estou',
    icon: '📍',
    name: 'ONDE ESTOU',
    welcomeTitle: 'Como Jogar o Onde Estou',
    welcomeSubtitle:
      'Todo mundo vê o seu grande momento do esporte, menos você! Descubra qual é com perguntas de sim ou não antes dos outros.',
    steps: [
      {
        stepNumber: 1,
        icon: '📍',
        headline: 'Um Grande Momento na Testa',
        description:
          'Cada jogador recebe um momento histórico do esporte (uma final, um gol, um recorde). A TV e o celular dos outros mostram para todos, menos para o dono.',
        accentTag: 'Todos Veem, Menos Você'
      },
      {
        stepNumber: 2,
        icon: '❓',
        headline: 'Pergunte na Sua Vez',
        description:
          'Em rodízio, faça uma pergunta de sim ou não ("Foi numa Copa do Mundo?", "Foi antes de 2000?") ou chute o momento. Os outros só podem responder sim ou não.',
        accentTag: 'Só Sim ou Não'
      },
      {
        stepNumber: 3,
        icon: '🏁',
        headline: 'Quem Acerta Primeiro Pontua Mais',
        description:
          'O 1º a descobrir leva mais pontos, o 2º um pouco menos, e assim por diante. Quem gastar todas as perguntas fica de fora.',
        accentTag: 'Corrida de Descoberta'
      }
    ],
    proibido: [
      'DAR DICAS ALÉM DE "SIM" OU "NÃO"',
      'OLHAR A TELA OU O CELULAR COM O SEU MOMENTO',
      'CHUTAR VÁRIAS VEZES NA MESMA VEZ'
    ],
    permitido: [
      'PERGUNTAR SOBRE ANO, ESPORTE, PAÍS, TIME OU COMPETIÇÃO',
      'COMEÇAR POR "FOI EM UMA COPA DO MUNDO?" PARA SEPARAR O TIPO DE MOMENTO',
      'ANOTAR AS RESPOSTAS PARA NÃO REPETIR PERGUNTA'
    ],
    scoringSummary: [
      'O primeiro a acertar leva tantos pontos quanto jogadores na sala; cada acerto seguinte vale 1 ponto a menos (mínimo 1).',
      'Quem esgotar as perguntas ou não descobrir antes do fim da rodada não pontua. (A pontuação do programa ainda não foi confirmada.)'
    ]
  },
  'com-terra': {
    gameId: 'com-terra',
    icon: '🧩',
    name: 'COM TERRA',
    welcomeTitle: 'Como Jogar Com Terra',
    welcomeSubtitle:
      'Compre peças na loja e encaixe no tabuleiro. Árvore só passa pelo furo da peça, e não dá para testar antes de comprar.',
    steps: [
      {
        stepNumber: 1,
        icon: '🛒',
        headline: 'Escolha no Olhômetro',
        description:
          'Na loja você vê o formato e os furos de cada peça, mas não pode testá-la no mapa. Fora da sua vez, deixe uma peça pré-escolhida.',
        accentTag: 'Compra sem teste'
      },
      {
        stepNumber: 2,
        icon: '🔄',
        headline: 'Gire, Espelhe e Posicione',
        description:
          'Depois de pegar a peça, mova pelo grid, gire e espelhe. Contorno verde vale; vermelho não. Confirme em dois passos.',
        accentTag: 'Dupla confirmação'
      },
      {
        stepNumber: 3,
        icon: '🌳',
        headline: 'Árvore no Furo, Ficha no Sólido',
        description:
          'Furo sobre árvore dá +2. Bloco sólido sobre ficha recolhe o valor (+1, +2 ou -1). Peça que não cabe é descartada e custa 3 pontos.',
        accentTag: 'Descartar custa 3'
      }
    ],
    proibido: [
      'TESTAR A PEÇA NO MAPA ANTES DE COMPRAR',
      'COBRIR ÁRVORE COM BLOCO SÓLIDO',
      'PLANTAR ÁRVORE EM CIMA DE FICHA'
    ],
    permitido: [
      'PRÉ-ESCOLHER UMA PEÇA FORA DA SUA VEZ',
      'USAR O FURO PARA PULAR UMA FICHA -1',
      'PLANTAR ÁRVORE PARA TRAVAR O ESPAÇO DO RIVAL'
    ],
    scoringSummary: [
      'Cada peça vale pelo número dela: 1, 2, 3, 5, 7, 9 ou 12 pontos. Árvore no furo +2; ficha coberta por bloco sólido soma o valor dela.',
      'No Arquiteto, linha ou coluna cheia vale +2. No Plano do Diabo, quem pega a menor peça joga primeiro. Descartar custa 3 pontos.'
    ]
  }
};
