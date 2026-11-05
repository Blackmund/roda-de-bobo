import React from 'react';
import { GameId, Player } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { Play, SkipForward, ArrowLeft, Trophy, CheckCircle2 } from 'lucide-react';

export interface TutorialCardStep {
  stepNumber: 1 | 2 | 3;
  icon: string;
  headline: string;
  description: string;
  accentTag: string;
}

export interface GameTutorialDefinition {
  gameId: GameId;
  icon: string;
  name: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  steps: [TutorialCardStep, TutorialCardStep, TutorialCardStep];
  proibido: string[];
  permitido: string[];
  scoringSummary: string[];
}

export const GAME_TUTORIALS: Record<GameId, GameTutorialDefinition> = {
  limite: {
    gameId: 'limite',
    icon: '🎯',
    name: 'JOGO DO LIMITE',
    welcomeTitle: 'Como Jogar o Limite',
    welcomeSubtitle:
      'Estime o valor numérico da pergunta sem ultrapassar o valor real. Quem chegar mais perto pontua e quem cravar o número exato leva bônus!',
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
          'Envie seu número em segredo. Atenção máxima: quem der um lance maior que o valor real estoura e zera na rodada!',
        accentTag: 'Sem Ultrapassar'
      },
      {
        stepNumber: 3,
        icon: '🃏',
        headline: 'Cartas de Poder e Revelação',
        description:
          'Ative sua carta especial antes de revelar. O palpite mais próximo fatura 1 ponto; cravar o valor exato vale 2 pontos diretos!',
        accentTag: 'Cravou = 2 Pontos'
      }
    ],
    proibido: [
      'ULTRAPASSAR O NÚMERO REAL DA PERGUNTA (QUEM PASSAR ESTOURA)',
      'ALTERAR O PALPITE APÓS O ENCERRAMENTO DO CRONÔMETRO',
      'PESQUISAR NA INTERNET SEM A CARTA DE LIGAÇÃO'
    ],
    permitido: [
      'USAR A CARTA DE PODER SORTEADA (UMA VEZ POR PARTIDA)',
      'CRAVAR O NÚMERO EXATO PARA GANHAR 2 PONTOS DIRETOS',
      'ARREDONDAR PARA BAIXO COM CAUTELA PARA NÃO ESTOURAR'
    ],
    scoringSummary: [
      'Maior palpite que não ultrapassar o valor real fatura +1 ponto.',
      'SUPER BÔNUS: Cravar o número exato vale 2 PONTOS diretos!'
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
          'Descreva a palavra-chave com analogias e sinônimos. É proibido pronunciar qualquer uma das 5 palavras proibidas ou radicais!',
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
      'Disputa de auditório em equipes: descubra as respostas mais populares da pesquisa antes de acumular 3 strikes vermelhos!',
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
          'A equipe da vez dá palpites juntos. Cada acerto vira a ripa no painel e soma os pontos correspondentes de votos ao time.',
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
  }
};

/**
 * 18 Custom Vector Illustrations matching authentic Roda de Bobô / CazéTV vintage cartoon aesthetic.
 * (Dark ink outlines #0C0D16, cream skin/elements #F5F2EB, crimson accents #FF1E56, cyan #17B8B8, gold #FFD166)
 * Tuned with high-contrast, crystal-clear typography (system-ui / Space Mono / spaced Anton) for zero letter cramping.
 */
export const TutorialStepIllustration: React.FC<{
  gameId: GameId;
  stepNumber: 1 | 2 | 3;
}> = ({ gameId, stepNumber }) => {
  // 1. JOGO DO LIMITE
  if (gameId === 'limite') {
    if (stepNumber === 1) {
      // Step 1: Retro CRT TV showing question and countdown
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Antenna */}
          <line x1="80" y1="18" x2="60" y2="4" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="18" x2="100" y2="4" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="4" r="3.5" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
          <circle cx="100" cy="4" r="3.5" fill="#17B8B8" stroke="#0C0D16" strokeWidth="1.5" />
          {/* TV Outer Cabinet */}
          <rect x="25" y="16" width="110" height="82" rx="8" fill="#141824" stroke="#0C0D16" strokeWidth="4" />
          {/* TV Bezel */}
          <rect x="33" y="24" width="76" height="66" rx="4" fill="#070913" stroke="#17B8B8" strokeWidth="2.5" />
          {/* Numbers on screen - Space Mono with generous tracking for matrix look */}
          <text x="71" y="52" textAnchor="middle" fill="#F5F2EB" fontFamily="'Space Mono', monospace, sans-serif" fontSize="18" fontWeight="bold" letterSpacing="3">
            4 8 1 5
          </text>
          {/* Question Tag */}
          <rect x="38" y="60" width="66" height="18" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="1.5" />
          <text x="71" y="73" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1.2">
            ? QUANTOS?
          </text>
          {/* TV Knobs */}
          <circle cx="121" cy="35" r="5" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
          <circle cx="121" cy="50" r="5" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2" />
          <rect x="115" y="65" width="12" height="18" rx="2" fill="#0C0D16" />
        </svg>
      );
    }
    if (stepNumber === 2) {
      // Step 2: Cartoon Smartphone with secret lock and limit line
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Hand holding phone */}
          <path d="M42 95 C42 80 50 75 52 70" stroke="#0C0D16" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M118 95 C118 80 110 75 108 70" stroke="#0C0D16" strokeWidth="4" strokeLinecap="round" fill="none" />
          {/* Smartphone Frame */}
          <rect x="52" y="10" width="56" height="92" rx="7" fill="#1A2035" stroke="#0C0D16" strokeWidth="4" />
          {/* Phone Screen */}
          <rect x="57" y="18" width="46" height="74" rx="3" fill="#F5F2EB" />
          {/* Secret Shield / Lock */}
          <path d="M80 25 L89 28 L89 36 C89 42 80 47 80 47 C80 47 71 42 71 36 L71 28 Z" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
          <circle cx="80" cy="34" r="2.5" fill="#FFFFFF" />
          {/* Dashed Limit Line with clear typography */}
          <line x1="57" y1="54" x2="103" y2="54" stroke="#FF1E56" strokeWidth="2.5" strokeDasharray="3 2" />
          <text x="80" y="50" textAnchor="middle" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8" fontWeight="900" letterSpacing="1.2">
            LIMITE MÁXIMO
          </text>
          {/* Keypad dots */}
          <circle cx="67" cy="65" r="2.5" fill="#0C0D16" />
          <circle cx="80" cy="65" r="2.5" fill="#0C0D16" />
          <circle cx="93" cy="65" r="2.5" fill="#0C0D16" />
          <circle cx="67" cy="74" r="2.5" fill="#0C0D16" />
          <circle cx="80" cy="74" r="2.5" fill="#0C0D16" />
          <circle cx="93" cy="74" r="2.5" fill="#0C0D16" />
          <circle cx="80" cy="83" r="2.5" fill="#17B8B8" />
        </svg>
      );
    }
    // Step 3: Golden Trophy, Powers and +2 PTS CRAVOU
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Glow bursts */}
        <line x1="80" y1="10" x2="80" y2="3" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
        <line x1="55" y1="18" x2="48" y2="12" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
        <line x1="105" y1="18" x2="112" y2="12" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
        {/* Trophy Cup */}
        <path d="M60 20 L100 20 L94 52 C94 62 86 66 80 66 C74 66 66 62 66 52 Z" fill="#FFD166" stroke="#0C0D16" strokeWidth="3.5" />
        {/* Trophy Handles */}
        <path d="M60 26 C48 26 48 44 62 44" stroke="#0C0D16" strokeWidth="3.5" fill="none" />
        <path d="M100 26 C112 26 112 44 98 44" stroke="#0C0D16" strokeWidth="3.5" fill="none" />
        {/* Trophy Stem & Base */}
        <rect x="76" y="66" width="8" height="10" fill="#FFD166" stroke="#0C0D16" strokeWidth="2.5" />
        <path d="M56 76 L104 76 L108 86 L52 86 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="2" />
        {/* Star in cup */}
        <polygon points="80,26 83,34 91,34 85,39 87,47 80,42 73,47 75,39 69,34 77,34" fill="#FF1E56" />
        {/* +2 PTS CRAVOU Banner - crystal clear typography with wide positive tracking */}
        <rect x="22" y="74" width="116" height="24" rx="5" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
        <text x="80" y="86" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fontWeight="900" letterSpacing="1.5">
          +2 PTS CRAVOU!
        </text>
      </svg>
    );
  }

  // 2. JOGO DO DUVIDO
  if (gameId === 'duvido') {
    if (stepNumber === 1) {
      // Step 1: One player blindfolded without knowing theme, the other seeing the theme
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Topic Board top */}
          <rect x="36" y="8" width="88" height="24" rx="4" fill="#0C0D16" stroke="#17B8B8" strokeWidth="2.5" />
          <text x="80" y="24" textAnchor="middle" fill="#17B8B8" fontFamily="Anton, sans-serif" fontSize="12" fontWeight="bold" letterSpacing="1.8">
            TEMA DO LEILÃO
          </text>

          {/* Player 1 (Left) - BLINDFOLDED (WITHOUT KNOWING THEME) */}
          <g>
            <circle cx="44" cy="54" r="14" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3" />
            <path d="M32 50 C32 37 54 37 58 50 Z" fill="#0C0D16" />
            {/* Blindfold */}
            <rect x="30" y="48" width="28" height="9" rx="3" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
            {/* Body */}
            <path d="M32 70 L28 94 L58 94 L54 70 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="2" />
            {/* Thought bubble: ? */}
            <circle cx="58" cy="38" r="1.5" fill="#FFD166" />
            <circle cx="62" cy="33" r="2.5" fill="#FFD166" />
            <rect x="56" y="20" width="16" height="12" rx="3" fill="#FFD166" stroke="#0C0D16" strokeWidth="1.5" />
            <text x="64" y="29.5" textAnchor="middle" fill="#0C0D16" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="900">?</text>
            <rect x="20" y="93" width="48" height="13" rx="2.5" fill="#FF1E56" />
            <text x="44" y="102.5" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8" fontWeight="900" letterSpacing="1.2">VENDADO</text>
          </g>

          {/* Player 2 (Right) - SEES THE THEME & ESTIMATES/BIDS */}
          <g>
            <circle cx="116" cy="54" r="14" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3" />
            <path d="M104 50 C104 37 126 37 130 50 Z" fill="#0C0D16" />
            {/* Eyes open looking at board */}
            <circle cx="112" cy="52" r="3" fill="#0C0D16" />
            <circle cx="120" cy="52" r="3" fill="#0C0D16" />
            {/* Smile */}
            <path d="M112 60 Q116 63 120 60" stroke="#0C0D16" strokeWidth="1.5" fill="none" />
            {/* Body */}
            <path d="M104 70 L100 94 L130 94 L126 70 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="2" />
            <rect x="92" y="93" width="48" height="13" rx="2.5" fill="#17B8B8" />
            <text x="116" y="102.5" textAnchor="middle" fill="#000000" fontFamily="system-ui, sans-serif" fontSize="8" fontWeight="900" letterSpacing="1.2">VÊ O TEMA</text>
          </g>

          {/* Speech bubble from player 2 */}
          <rect x="58" y="58" width="58" height="22" rx="4" fill="#FFD166" stroke="#0C0D16" strokeWidth="2" />
          <text x="87" y="72.5" textAnchor="middle" fill="#000000" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1">
            "ELE SABE 5!"
          </text>
        </svg>
      );
    }
    if (stepNumber === 2) {
      // Step 2: Auction Gavel striking DUVIDO! button
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Comic Impact Rays */}
          <line x1="80" y1="42" x2="68" y2="30" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="42" x2="92" y2="30" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="55" x2="48" y2="55" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
          <line x1="100" y1="55" x2="112" y2="55" stroke="#FFD166" strokeWidth="3" strokeLinecap="round" />
          {/* Auction Gavel */}
          <g transform="rotate(-25 80 30)">
            <rect x="55" y="16" width="50" height="22" rx="4" fill="#8B4513" stroke="#0C0D16" strokeWidth="3.5" />
            <rect x="62" y="16" width="6" height="22" fill="#D2B48C" />
            <rect x="92" y="16" width="6" height="22" fill="#D2B48C" />
            <rect x="76" y="-12" width="8" height="30" rx="3" fill="#A0522D" stroke="#0C0D16" strokeWidth="2.5" />
          </g>
          {/* Big Red DUVIDO Button with generous padding and tracking */}
          <rect x="28" y="56" width="104" height="28" rx="6" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
          <text x="80" y="70" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="900" letterSpacing="2.5">
            DUVIDO!
          </text>
        </svg>
      );
    }
    // Step 3: Stopwatch ticking and checklist
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Stopwatch Body */}
        <circle cx="64" cy="58" r="34" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
        <rect x="60" y="16" width="8" height="10" rx="2" fill="#0C0D16" />
        <rect x="57" y="12" width="14" height="6" rx="2" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
        {/* Tick marks */}
        <line x1="64" y1="30" x2="64" y2="35" stroke="#0C0D16" strokeWidth="2.5" />
        <line x1="64" y1="86" x2="64" y2="81" stroke="#0C0D16" strokeWidth="2.5" />
        <line x1="36" y1="58" x2="41" y2="58" stroke="#0C0D16" strokeWidth="2.5" />
        <line x1="92" y1="58" x2="87" y2="58" stroke="#0C0D16" strokeWidth="2.5" />
        {/* Red needle */}
        <line x1="64" y1="58" x2="82" y2="44" stroke="#FF1E56" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="64" cy="58" r="4" fill="#0C0D16" />
        {/* Checklist Board Right - Clear bold sans-serif */}
        <rect x="105" y="30" width="46" height="54" rx="4" fill="#0C0D16" stroke="#17B8B8" strokeWidth="2.5" />
        <text x="128" y="45" textAnchor="middle" fill="#17B8B8" fontFamily="system-ui, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1.2">
          META: 5
        </text>
        <text x="128" y="60" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="bold" letterSpacing="1">
          ✓ 1 · 2
        </text>
        <text x="128" y="73" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="bold" letterSpacing="1">
          ✓ 3 · 4
        </text>
      </svg>
    );
  }

  // 3. JOGO DO PROIBIDO
  if (gameId === 'proibido') {
    if (stepNumber === 1) {
      // Step 1: Blindfolded Player with headphones listening
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <circle cx="80" cy="52" r="28" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
          {/* Hair */}
          <path d="M54 45 C54 20 106 20 106 45 Z" fill="#0C0D16" />
          {/* Blindfold in Crimson */}
          <rect x="52" y="42" width="56" height="16" rx="4" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3" />
          {/* Smile */}
          <path d="M72 70 Q80 76 88 70" stroke="#0C0D16" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Headphones Band */}
          <path d="M48 52 C48 18 112 18 112 52" stroke="#17B8B8" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* Headphone Cups */}
          <rect x="42" y="42" width="12" height="22" rx="4" fill="#17B8B8" stroke="#0C0D16" strokeWidth="2.5" />
          <rect x="106" y="42" width="12" height="22" rx="4" fill="#17B8B8" stroke="#0C0D16" strokeWidth="2.5" />
          {/* Sound wave cues */}
          <path d="M26 44 C22 48 22 56 26 60" stroke="#FFD166" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M134 44 C138 48 138 56 134 60" stroke="#FFD166" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    }
    if (stepNumber === 2) {
      // Step 2: Taboo Card with crossed words and siren
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Taboo Card */}
          <rect x="30" y="10" width="76" height="90" rx="5" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="3.5" />
          {/* Header Key Word with clean spacing */}
          <rect x="30" y="10" width="76" height="24" rx="4" fill="#FF1E56" />
          <text x="68" y="22" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fontWeight="900" letterSpacing="2">
            BRASÍLIA
          </text>
          {/* Crossed out prohibited lines */}
          <g stroke="#0C0D16" strokeWidth="2" strokeLinecap="round">
            <line x1="38" y1="42" x2="98" y2="42" />
            <line x1="38" y1="52" x2="98" y2="52" />
            <line x1="38" y1="62" x2="98" y2="62" />
            <line x1="38" y1="72" x2="98" y2="72" />
            <line x1="38" y1="82" x2="98" y2="82" />
          </g>
          {/* Red X over list */}
          <line x1="42" y1="36" x2="94" y2="88" stroke="#FF1E56" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="94" y1="36" x2="42" y2="88" stroke="#FF1E56" strokeWidth="3.5" strokeLinecap="round" />
          {/* Emergency Siren Right */}
          <path d="M120 75 L144 75 L148 90 L116 90 Z" fill="#0C0D16" stroke="#0C0D16" strokeWidth="2" />
          <path d="M121 75 C121 54 143 54 143 75 Z" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2.5" />
          <line x1="132" y1="46" x2="132" y2="38" stroke="#FFD166" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="144" y1="52" x2="150" y2="46" stroke="#FFD166" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    }
    // Step 3: Skip button & points
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Skip Button Box with letter-spacing */}
        <rect x="22" y="24" width="70" height="34" rx="5" fill="#0C0D16" stroke="#17B8B8" strokeWidth="3" />
        <text x="52" y="41" textAnchor="middle" dominantBaseline="central" fill="#17B8B8" fontFamily="system-ui, -apple-system, sans-serif" fontSize="12" fontWeight="900" letterSpacing="1.8">
          PULAR
        </text>
        <polygon points="73,36 78,41 73,46" fill="#17B8B8" />
        <polygon points="79,36 84,41 79,46" fill="#17B8B8" />
        {/* Score Basket / Trophy +1 PTO */}
        <circle cx="122" cy="50" r="26" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3.5" />
        <text x="122" y="44" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18" fontWeight="900">
          +1
        </text>
        <text x="122" y="60" textAnchor="middle" dominantBaseline="central" fill="#F5F2EB" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1.5">
          PONTO
        </text>
        {/* Star bursts */}
        <polygon points="122,16 125,23 132,23 127,27 129,34 122,30 115,34 117,27 112,23 119,23" fill="#FFD166" />
        <polygon points="102,82 104,86 109,86 105,89 107,94 102,91 97,94 99,89 95,86 100,86" fill="#FFD166" />
      </svg>
    );
  }

  // 4. JOGO DA NOTA
  if (gameId === 'nota') {
    if (stepNumber === 1) {
      // Step 1: Carnival Roulette wheel partitioned 1..10
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Wheel Frame */}
          <circle cx="80" cy="55" r="42" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4" />
          {/* Slices representation */}
          <path d="M80 55 L80 13 A42 42 0 0 1 112 28 Z" fill="#FF1E56" />
          <path d="M80 55 L112 28 A42 42 0 0 1 122 55 Z" fill="#17B8B8" />
          <path d="M80 55 L122 55 A42 42 0 0 1 112 82 Z" fill="#FFD166" />
          <path d="M80 55 L112 82 A42 42 0 0 1 80 97 Z" fill="#FF6B00" />
          <path d="M80 55 L80 97 A42 42 0 0 1 48 82 Z" fill="#17B8B8" />
          <path d="M80 55 L48 82 A42 42 0 0 1 38 55 Z" fill="#FF1E56" />
          <path d="M80 55 L38 55 A42 42 0 0 1 48 28 Z" fill="#FFD166" />
          <path d="M80 55 L48 28 A42 42 0 0 1 80 13 Z" fill="#FF6B00" />
          {/* Center Hub with secret question */}
          <circle cx="80" cy="55" r="16" fill="#0C0D16" stroke="#FFFFFF" strokeWidth="2" />
          <text x="80" y="61" textAnchor="middle" fill="#FFFFFF" fontFamily="Anton, sans-serif" fontSize="16" fontWeight="bold">
            ?
          </text>
          {/* Top Pointer */}
          <polygon points="80,18 73,6 87,6" fill="#FFD166" stroke="#0C0D16" strokeWidth="2" />
        </svg>
      );
    }
    if (stepNumber === 2) {
      // Step 2: Calibrated Gauge with speech bubbles
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Speech Bubble 1 - System font with clean tracking */}
          <rect x="14" y="14" width="64" height="26" rx="4" fill="#0C0D16" stroke="#17B8B8" strokeWidth="2" />
          <text x="46" y="30.5" textAnchor="middle" fill="#17B8B8" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1.2">
            PISTA 1: LEVE
          </text>
          {/* Speech Bubble 2 */}
          <rect x="82" y="14" width="66" height="26" rx="4" fill="#0C0D16" stroke="#FF1E56" strokeWidth="2" />
          <text x="115" y="30.5" textAnchor="middle" fill="#FF1E56" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1.2">
            PISTA 2: FORTE
          </text>
          {/* Horizontal Gauge Bar */}
          <rect x="20" y="65" width="120" height="16" rx="8" fill="#1A2035" stroke="#0C0D16" strokeWidth="3" />
          {/* Filled progress to 7 */}
          <rect x="22" y="67" width="84" height="12" rx="6" fill="#FFD166" />
          {/* Needle at 7 */}
          <line x1="106" y1="52" x2="106" y2="88" stroke="#FF1E56" strokeWidth="4" strokeLinecap="round" />
          <circle cx="106" cy="52" r="5" fill="#FF1E56" stroke="#0C0D16" strokeWidth="2" />
          {/* Labels 1, 7 and 10 */}
          <text x="26" y="96" fill="#F5F2EB" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="bold">1</text>
          <text x="106" y="98" textAnchor="middle" fill="#FF1E56" fontFamily="Anton, sans-serif" fontSize="13" fontWeight="bold">7</text>
          <text x="134" y="96" textAnchor="end" fill="#F5F2EB" fontFamily="system-ui, sans-serif" fontSize="10" fontWeight="bold">10</text>
        </svg>
      );
    }
    // Step 3: Two hands holding up "10" plaque (authentic CazéTV style)
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Rectangular card held up */}
        <rect x="35" y="15" width="90" height="68" rx="5" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="4.5" />
        <text x="80" y="66" textAnchor="middle" fill="#0C0D16" fontFamily="Anton, sans-serif" fontSize="48" fontWeight="900" letterSpacing="3">
          10
        </text>
        {/* Left Hand Gripping */}
        <g stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" fill="#F5F2EB">
          <rect x="22" y="44" width="18" height="10" rx="5" />
          <rect x="20" y="55" width="20" height="10" rx="5" />
          <rect x="22" y="66" width="18" height="10" rx="5" />
          <path d="M22 76 C22 96 36 98 42 98 L42 76 Z" />
        </g>
        {/* Right Hand Gripping */}
        <g stroke="#0C0D16" strokeWidth="4" strokeLinejoin="round" fill="#F5F2EB">
          <rect x="120" y="44" width="18" height="10" rx="5" />
          <rect x="120" y="55" width="20" height="10" rx="5" />
          <rect x="120" y="66" width="18" height="10" rx="5" />
          <path d="M138 76 C138 96 124 98 118 98 L118 76 Z" />
        </g>
        {/* Victory stars */}
        <polygon points="80,2 82,7 87,7 83,10 85,15 80,12 75,15 77,10 73,7 78,7" fill="#FFD166" />
        <polygon points="40,6 42,10 46,10 43,12 44,16 40,14 36,16 37,12 34,10 38,10" fill="#FF1E56" />
        <polygon points="120,6 122,10 126,10 123,12 124,16 120,14 116,16 117,12 114,10 118,10" fill="#17B8B8" />
      </svg>
    );
  }

  // 5. TEM OU NÃO TEM
  if (gameId === 'tem-ou-nao-tem') {
    if (stepNumber === 1) {
      // Step 1: Auditorium 5 closed slats board
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Board Frame */}
          <rect x="25" y="12" width="110" height="86" rx="6" fill="#0C0D16" stroke="#17B8B8" strokeWidth="4" />
          {/* Slats 1 to 5 closed */}
          <rect x="33" y="20" width="94" height="12" rx="2" fill="#17B8B8" stroke="#0C0D16" strokeWidth="1.5" />
          <text x="80" y="29.5" textAnchor="middle" fill="#0C0D16" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1.5">
            #1 ? ? ? ? ? ? ?
          </text>
          
          <rect x="33" y="36" width="94" height="12" rx="2" fill="#1A2035" stroke="#0C0D16" strokeWidth="1.5" />
          <text x="80" y="45.5" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="bold">#2 ? ? ? ? ? ? ?</text>

          <rect x="33" y="52" width="94" height="12" rx="2" fill="#1A2035" stroke="#0C0D16" strokeWidth="1.5" />
          <text x="80" y="61.5" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="bold">#3 ? ? ? ? ? ? ?</text>

          <rect x="33" y="68" width="94" height="12" rx="2" fill="#1A2035" stroke="#0C0D16" strokeWidth="1.5" />
          <text x="80" y="77.5" textAnchor="middle" fill="#FFFFFF" fontFamily="system-ui, sans-serif" fontSize="8.5" fontWeight="bold">#4 ? ? ? ? ? ? ?</text>

          <rect x="33" y="84" width="94" height="10" rx="2" fill="#1A2035" stroke="#0C0D16" strokeWidth="1.5" />
        </svg>
      );
    }
    if (stepNumber === 2) {
      // Step 2: Slat flips open revealing answer + points
      return (
        <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
          {/* Rotating slat in 3D perspective with crisp typography */}
          <polygon points="18,34 142,24 142,70 18,60" fill="#FF1E56" stroke="#0C0D16" strokeWidth="3.5" />
          <text x="65" y="47" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="12.5" fontWeight="900" letterSpacing="1.5">
            RESPOSTA #1
          </text>
          {/* Points Box */}
          <polygon points="106,31 136,28 136,63 106,60" fill="#FFD166" stroke="#0C0D16" strokeWidth="2" />
          <text x="121" y="46" textAnchor="middle" dominantBaseline="central" fill="#0C0D16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="900">
            42
          </text>
          {/* Light flare beams */}
          <line x1="80" y1="12" x2="80" y2="22" stroke="#17B8B8" strokeWidth="3" strokeLinecap="round" />
          <line x1="45" y1="16" x2="52" y2="26" stroke="#17B8B8" strokeWidth="3" strokeLinecap="round" />
          <line x1="115" y1="12" x2="108" y2="22" stroke="#17B8B8" strokeWidth="3" strokeLinecap="round" />
          {/* Team score banner below - Clean sans-serif with proper tracking */}
          <rect x="18" y="74" width="124" height="24" rx="5" fill="#0C0D16" stroke="#FFD166" strokeWidth="2" />
          <text x="80" y="86" textAnchor="middle" dominantBaseline="central" fill="#FFD166" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9.5" fontWeight="900" letterSpacing="1.2">
            +42 PONTOS PRA EQUIPE!
          </text>
        </svg>
      );
    }
    // Step 3: [X] [X] [X] 3 strikes and steal
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Strike Box 1 */}
        <rect x="18" y="22" width="36" height="42" rx="4" fill="#0C0D16" stroke="#FF1E56" strokeWidth="3.5" />
        <text x="36" y="43" textAnchor="middle" dominantBaseline="central" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="900">
          X
        </text>
        {/* Strike Box 2 */}
        <rect x="62" y="22" width="36" height="42" rx="4" fill="#0C0D16" stroke="#FF1E56" strokeWidth="3.5" />
        <text x="80" y="43" textAnchor="middle" dominantBaseline="central" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="900">
          X
        </text>
        {/* Strike Box 3 (Flashing) */}
        <rect x="106" y="22" width="36" height="42" rx="4" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2.5" />
        <text x="124" y="43" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="900">
          X
        </text>
        {/* Warning Banner - High contrast white on red background, spaced text */}
        <rect x="16" y="74" width="128" height="24" rx="5" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
        <text x="80" y="86" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1.2">
          PASSA A VEZ PARA O RIVAL!
        </text>
      </svg>
    );
  }

  // 6. PERGUNTAS E VERDADES
  if (stepNumber === 1) {
    // Step 1: 4 cards fanned out in order
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Card 1 */}
        <g transform="rotate(-15 45 50)">
          <rect x="30" y="10" width="34" height="54" rx="4" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
          <text x="35" y="24" fill="#0C0D16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="900">01</text>
          <text x="47" y="44" textAnchor="middle" fill="#0C0D16" fontSize="15">♠</text>
        </g>
        {/* Card 2 */}
        <g transform="rotate(-5 65 50)">
          <rect x="50" y="6" width="34" height="54" rx="4" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
          <text x="55" y="20" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="900">04</text>
          <text x="67" y="40" textAnchor="middle" fill="#FF1E56" fontSize="15">♥</text>
        </g>
        {/* Card 3 */}
        <g transform="rotate(5 85 50)">
          <rect x="70" y="6" width="34" height="54" rx="4" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
          <text x="75" y="20" fill="#0C0D16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="900">08</text>
          <text x="87" y="40" textAnchor="middle" fill="#0C0D16" fontSize="15">♣</text>
        </g>
        {/* Card 4 */}
        <g transform="rotate(15 105 50)">
          <rect x="90" y="10" width="34" height="54" rx="4" fill="#F5F2EB" stroke="#0C0D16" strokeWidth="2.5" />
          <text x="95" y="24" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="900">13</text>
          <text x="107" y="44" textAnchor="middle" fill="#FF1E56" fontSize="15">♦</text>
        </g>
        {/* Shield in front with clean sans-serif */}
        <rect x="22" y="74" width="116" height="24" rx="5" fill="#0C0D16" stroke="#17B8B8" strokeWidth="2" />
        <text x="80" y="86" textAnchor="middle" dominantBaseline="central" fill="#17B8B8" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9.5" fontWeight="900" letterSpacing="1.5">
          ORDEM CRESCENTE
        </text>
      </svg>
    );
  }
  if (stepNumber === 2) {
    // Step 2: Casino chips and questions dossier with crystal clear fonts
    return (
      <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
        {/* Chips stack */}
        <ellipse cx="52" cy="74" rx="28" ry="9" fill="#141824" stroke="#FFD166" strokeWidth="2.5" />
        <ellipse cx="52" cy="65" rx="28" ry="9" fill="#141824" stroke="#FFD166" strokeWidth="2.5" />
        <ellipse cx="52" cy="56" rx="28" ry="9" fill="#FFD166" stroke="#0C0D16" strokeWidth="2.5" />
        <text x="52" y="60.5" textAnchor="middle" fill="#0C0D16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="9" fontWeight="900" letterSpacing="1.5">
          FICHAS
        </text>
        {/* Question dossier Right */}
        <rect x="88" y="14" width="58" height="76" rx="5" fill="#0C0D16" stroke="#FF1E56" strokeWidth="3" />
        <text x="117" y="38" textAnchor="middle" dominantBaseline="central" fill="#FF1E56" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="900">
          ?
        </text>
        <rect x="92" y="52" width="50" height="34" rx="3" fill="#FF1E56" />
        <text x="117" y="62" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="0.8">
          11 PERGUNTAS
        </text>
        <text x="117" y="75" textAnchor="middle" dominantBaseline="central" fill="#FFD166" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1">
          OFICIAIS
        </text>
      </svg>
    );
  }
  // Step 3: Deduction Magnifying Glass & Declaração da Verdade
  return (
    <svg viewBox="0 0 160 110" fill="none" className="w-full h-full max-h-32 object-contain" xmlns="http://www.w3.org/2000/svg">
      {/* Target card envelope with clean text */}
      <rect x="18" y="14" width="94" height="54" rx="5" fill="#0C0D16" stroke="#17B8B8" strokeWidth="3" />
      <text x="65" y="34" textAnchor="middle" dominantBaseline="central" fill="#FFD166" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="900" letterSpacing="2">
        VERDADE
      </text>
      <text x="65" y="51" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="8.5" fontWeight="900" letterSpacing="1.2">
        8 CARTAS CRAVADAS
      </text>
      {/* Magnifying Glass positioned to the right so lens DOES NOT overlap text */}
      <circle cx="126" cy="38" r="16" fill="#17B8B8" fillOpacity="0.25" stroke="#FF1E56" strokeWidth="3" />
      <line x1="137" y1="49" x2="152" y2="67" stroke="#0C0D16" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="137" y1="49" x2="152" y2="67" stroke="#FF1E56" strokeWidth="2.5" strokeLinecap="round" />
      {/* Victory Crown Banner */}
      <rect x="20" y="74" width="120" height="24" rx="5" fill="#FF1E56" stroke="#FFFFFF" strokeWidth="2" />
      <text x="80" y="86" textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" fontWeight="900" letterSpacing="1.5">
        VITÓRIA IMEDIATA!
      </text>
    </svg>
  );
};

export interface Step5GameTutorialProps {
  gameId: GameId;
  players: Player[];
  onBack: () => void;
  onStartGameNow: () => void;
}

export const Step5GameTutorial: React.FC<Step5GameTutorialProps> = React.memo(({
  gameId,
  players,
  onBack,
  onStartGameNow
}) => {
  const tutorial = GAME_TUTORIALS[gameId] || GAME_TUTORIALS.limite;

  const handleSkipOrStart = () => {
    sounds.playPowerup();
    onStartGameNow();
  };

  return (
    <div
      data-testid="step5-game-tutorial"
      className="max-w-6xl mx-auto w-full relative h-full flex flex-col justify-between min-h-0 overflow-hidden select-none py-1 px-1 sm:px-2 gap-2"
    >
      {/* 1. CABEÇALHO SUPERIOR COMPACTO (SEM SCROLL, SEM BARRA DE PROGRESSO) */}
      <header className="bg-[#090b14] border border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{tutorial.icon}</span>
          <span className="font-anton text-lg sm:text-xl text-white uppercase tracking-wider truncate">
            {tutorial.name}
          </span>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-wider">
            TUTORIAL OFICIAL • 3 PASSOS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-mono-code text-emerald-400 font-bold">
            ✓ {players.length} JOGADORES NA SALA
          </span>
        </div>
      </header>

      {/* 2. ÁREA CENTRAL: BANNER COMPACTO + OS 3 PASSOS LADO A LADO EM TELA ÚNICA */}
      <main className="flex-1 min-h-0 flex flex-col justify-between gap-2 px-1 overflow-y-auto md:overflow-hidden">
        {/* Banner do Tutorial (Muito compacto para evitar scroll) */}
        <div className="text-center space-y-0.5 py-0.5 shrink-0">
          <h1 className="font-anton text-xl sm:text-2xl md:text-3xl text-white uppercase tracking-wide leading-none">
            {tutorial.welcomeTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mx-auto truncate sm:whitespace-normal">
            {tutorial.welcomeSubtitle}
          </p>
        </div>

        {/* 3 CARDS VISUAIS LADO A LADO - VISÍVEIS DE UMA VEZ SÓ, SEM CLIQUE OBRIGATÓRIO */}
        <div
          data-testid="tutorial-3cards-container"
          className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0"
        >
          {tutorial.steps.map((card) => (
            <div
              key={card.stepNumber}
              data-testid={`tutorial-step-card-${card.stepNumber}`}
              className="rounded-xl border border-cyan-500/30 bg-[#0a0d18] flex flex-col justify-between p-2.5 sm:p-3 min-h-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              {/* Header da Etapa: Número do Passo + Tagzinha no Topo (100% livre de sobreposição com a ilustração) */}
              <div className="flex items-center justify-between gap-1.5 pb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-black font-anton text-xs flex items-center justify-center font-bold shrink-0">
                    {card.stepNumber}
                  </span>
                  <span className="font-anton text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider">
                    PASSO {card.stepNumber}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/50 text-[9px] sm:text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-wider shrink-0 shadow-sm">
                  {card.accentTag}
                </span>
              </div>

              {/* Ilustração Vetorial Cartoon Vintage Estilo CazéTV / Roda de Bobô (Totalmente desobstruída) */}
              <div className="h-28 sm:h-32 md:h-36 rounded-lg bg-[#060810] border border-white/5 flex items-center justify-center relative overflow-hidden p-1.5 shrink-0">
                <TutorialStepIllustration gameId={gameId} stepNumber={card.stepNumber} />
              </div>

              {/* Textos explicativos diretos e sem enrolação */}
              <div className="space-y-1 pt-1.5 flex-1 flex flex-col justify-start min-h-0">
                <h3 className="font-anton text-sm sm:text-base text-white uppercase tracking-wide leading-tight">
                  {card.headline}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-snug font-sans">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo Rápido de Pontuação (Faixa compacta) */}
        <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy size={13} className="text-amber-400 shrink-0" />
            <span className="font-mono-code text-[11px] sm:text-xs text-amber-200 font-bold truncate">
              {tutorial.scoringSummary[0]}
            </span>
          </div>
          {tutorial.scoringSummary[1] && (
            <span className="font-mono-code text-[10px] sm:text-[11px] text-cyan-300 font-bold truncate">
              • {tutorial.scoringSummary[1]}
            </span>
          )}
        </div>
      </main>

      {/* 3. RODAPÉ PADRONIZADO: PULAR TUTORIAL AO LADO DE INICIAR JOGO AGORA */}
      <footer className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono-code text-slate-400 truncate max-w-md">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span className="truncate">
            Jogadores prontos:{' '}
            <strong className="text-white">
              {players.map((p) => p.name).join(', ')}
            </strong>
          </span>
        </div>

        {/* Grupo de Ação à Direita: PULAR TUTORIAL ao lado de INICIAR JOGO AGORA */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
          {/* Botão Pular Tutorial */}
          <button
            type="button"
            data-testid="tutorial-skip-btn"
            onClick={handleSkipOrStart}
            className="px-3.5 sm:px-4 py-2 border border-slate-700 hover:border-cyan-400 bg-black/70 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 font-anton text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SkipForward size={14} />
            <span>PULAR TUTORIAL</span>
          </button>

          {/* Botão Padrão do Sistema: Retangular com cor #E6194B e Apenas 1 Ícone de Play */}
          <button
            type="button"
            data-testid="tutorial-start-game-btn"
            onClick={handleSkipOrStart}
            style={{ backgroundColor: '#E6194B', color: '#FFFFFF' }}
            className="px-5 sm:px-6 py-2 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white font-anton font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(230,25,75,0.5)] border border-rose-400/80 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Play size={14} className="fill-white text-white shrink-0" />
            <span className="text-white font-black">COMEÇAR A JOGAR AGORA</span>
          </button>
        </div>
      </footer>
    </div>
  );
});
