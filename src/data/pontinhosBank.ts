/**
 * Banco do Jogo dos Pontinhos (antigo jogo de pistas do "Estadios").
 *
 * Cada item tem um TEMA, uma resposta e 5 pistas, da mais vaga para a mais obvia. A 1a tentativa ve so a pista 1
 * (vale 5), a 2a ve as pistas 1 e 2 (vale 4), e assim por diante ate 1 ponto.
 *
 * Para ampliar: acrescente itens em `PONTINHOS_EXTRA` (ou um tema novo em `PONTINHOS_TEMAS`). Regras do banco
 * (conferidas em tests/dataIntegrity.test.ts): 5 pistas, as 3 primeiras nao podem conter a resposta, e `aceitas`
 * lista as variacoes que o diretor pode aceitar.
 */
import { ESTADIOS } from './estadiosBank';

export interface PontinhoItem {
  tema: PontinhoTema;
  nome: string;
  /** linha de detalhe mostrada junto da resposta (opcional) */
  detalhe?: string;
  aceitas: string[];
  pistas: [string, string, string, string, string];
}

export const PONTINHOS_TEMAS = ['Estádios', 'Animais', 'Países', 'Comidas', 'Objetos', 'Profissões', 'Esportes'] as const;
export type PontinhoTema = (typeof PONTINHOS_TEMAS)[number];

const P = (
  tema: PontinhoTema,
  nome: string,
  aceitas: string[],
  pistas: [string, string, string, string, string],
  detalhe?: string
): PontinhoItem => ({ tema, nome, aceitas, pistas, detalhe });

export const PONTINHOS_EXTRA: PontinhoItem[] = [
  // ANIMAIS
  P('Animais', 'Girafa', [], [
    'É um mamífero que vive em savanas.',
    'Come folhas do alto das árvores.',
    'Tem a língua escura e bem comprida.',
    'É o animal mais alto do mundo.',
    'Tem um pescoço enorme e manchas marrons.'
  ]),
  P('Animais', 'Pinguim', [], [
    'É uma ave, mas não voa.',
    'Vive principalmente no Hemisfério Sul.',
    'Nada muito bem e come peixe.',
    'Anda em bando, meio desajeitado, sobre o gelo.',
    'Parece usar um terno preto e branco.'
  ]),
  P('Animais', 'Polvo', [], [
    'Vive no mar.',
    'Não tem ossos.',
    'Solta tinta para fugir dos predadores.',
    'Tem três corações.',
    'Tem oito braços cheios de ventosas.'
  ]),
  P('Animais', 'Camaleão', ['Camaleao'], [
    'É um réptil.',
    'Cada olho se mexe para um lado.',
    'Pega insetos com uma língua comprida e rápida.',
    'Vive em árvores e anda devagar.',
    'É famoso por mudar de cor.'
  ]),
  P('Animais', 'Morcego', [], [
    'É um mamífero noturno.',
    'Se orienta pelo eco dos sons que emite.',
    'Dorme de cabeça para baixo.',
    'Algumas espécies bebem sangue.',
    'É o único mamífero que voa de verdade.'
  ]),
  P('Animais', 'Tamanduá-bandeira', ['Tamandua', 'Tamanduá', 'Tamandua bandeira'], [
    'É um mamífero das Américas.',
    'Não tem dentes.',
    'Tem garras fortes nas patas da frente.',
    'Come milhares de formigas e cupins por dia.',
    'Tem focinho comprido e uma cauda que parece um estandarte.'
  ]),
  P('Animais', 'Canguru', [], [
    'É um mamífero da Oceania.',
    'Carrega o filhote numa bolsa.',
    'Usa a cauda para se equilibrar.',
    'É símbolo da Austrália.',
    'Anda aos saltos com as patas de trás.'
  ]),
  P('Animais', 'Tubarão', ['Tubarao'], [
    'Vive no mar há milhões de anos.',
    'O esqueleto é de cartilagem, não de osso.',
    'Troca de dentes a vida inteira.',
    'Uma barbatana para fora d’água assusta os banhistas.',
    'Foi o vilão do filme de Spielberg de 1975.'
  ]),
  // PAISES
  P('Países', 'Japão', ['Japao'], [
    'Fica na Ásia.',
    'É um arquipélago com muitos vulcões.',
    'Tem um trem-bala famoso.',
    'A capital é Tóquio.',
    'É a terra do sushi e do monte Fuji.'
  ]),
  P('Países', 'Egito', [], [
    'Fica no norte da África.',
    'Um rio muito longo atravessa o país.',
    'A língua oficial é o árabe.',
    'A capital é o Cairo.',
    'Tem as pirâmides de Gizé.'
  ]),
  P('Países', 'Canadá', ['Canada'], [
    'Fica na América do Norte.',
    'É o segundo maior país do mundo em área.',
    'Tem dois idiomas oficiais.',
    'A capital é Ottawa.',
    'Tem uma folha de bordo na bandeira.'
  ]),
  P('Países', 'Portugal', [], [
    'Fica na Europa.',
    'Tem litoral no Atlântico.',
    'Foi uma potência das grandes navegações.',
    'A capital é Lisboa.',
    'É a terra de Cristiano Ronaldo e do pastel de nata.'
  ]),
  P('Países', 'Argentina', [], [
    'Fica na América do Sul.',
    'Tem a Patagônia no sul.',
    'É famosa pelo churrasco e pelo tango.',
    'A capital é Buenos Aires.',
    'Ganhou a Copa de 2022 com Messi.'
  ]),
  P('Países', 'Índia', ['India'], [
    'Fica na Ásia.',
    'É um dos países mais populosos do mundo.',
    'Tem dezenas de línguas faladas.',
    'A capital é Nova Délhi.',
    'Tem o Taj Mahal e o críquete como paixão.'
  ]),
  P('Países', 'Islândia', ['Islandia'], [
    'Fica na Europa, numa ilha.',
    'Tem gêiseres e vulcões ativos.',
    'Dá para ver aurora boreal no inverno.',
    'A capital é Reykjavík.',
    'A torcida ficou famosa pelo grito "huh!" na Euro 2016.'
  ]),
  P('Países', 'México', ['Mexico'], [
    'Fica na América do Norte.',
    'Tem pirâmides de povos antigos.',
    'Faz fronteira com os Estados Unidos.',
    'A capital é a Cidade do México.',
    'É a terra do taco, da tequila e do Chaves.'
  ]),
  // COMIDAS
  P('Comidas', 'Feijoada', [], [
    'É um prato salgado.',
    'Costuma ser servida no sábado.',
    'Leva várias partes do porco.',
    'Acompanha arroz, couve e laranja.',
    'É feita com feijão-preto.'
  ]),
  P('Comidas', 'Pão de queijo', ['Pao de queijo'], [
    'É um salgado pequeno.',
    'É mais gostoso quente.',
    'É feito com polvilho.',
    'É um orgulho de Minas Gerais.',
    'É uma bolinha de massa com queijo.'
  ]),
  P('Comidas', 'Brigadeiro', [], [
    'É um doce de festa.',
    'Leva leite condensado.',
    'É servido em forminha de papel.',
    'O nome homenageia um militar.',
    'É uma bolinha de chocolate com granulado.'
  ]),
  P('Comidas', 'Pizza', [], [
    'Pode ser doce ou salgada.',
    'É assada em forno bem quente.',
    'Costuma ser dividida em fatias.',
    'Veio da Itália, de Nápoles.',
    'Tem massa redonda, molho de tomate e muçarela.'
  ]),
  P('Comidas', 'Açaí', ['Acai'], [
    'É de origem amazônica.',
    'Vem de uma palmeira.',
    'No Norte é comido com peixe e farinha.',
    'No resto do país é servido na tigela.',
    'É roxo e leva granola e banana.'
  ]),
  P('Comidas', 'Coxinha', [], [
    'É um salgado de festa e de lanchonete.',
    'É frita.',
    'Tem recheio de frango.',
    'É empanada na farinha de rosca.',
    'Tem o formato de uma coxa de galinha.'
  ]),
  // OBJETOS
  P('Objetos', 'Guarda-chuva', ['Guarda chuva', 'Sombrinha'], [
    'Fica esquecido em todo lugar.',
    'Tem varetas de metal.',
    'Abre e fecha.',
    'Às vezes vira do avesso com o vento.',
    'Protege da chuva.'
  ]),
  P('Objetos', 'Controle remoto', ['Controle'], [
    'Vive sumindo no sofá.',
    'Funciona com pilha.',
    'Usa luz infravermelha.',
    'Tem botões de números e de volume.',
    'Serve para mudar o canal da TV.'
  ]),
  P('Objetos', 'Escova de dentes', ['Escova'], [
    'Cada um tem a sua.',
    'Deve ser trocada a cada três meses.',
    'Tem cerdas.',
    'Fica no banheiro, perto da pia.',
    'É usada com pasta, depois das refeições.'
  ]),
  P('Objetos', 'Bússola', ['Bussola'], [
    'Ajuda quem está perdido.',
    'Funciona sem bateria.',
    'Tem uma agulha imantada.',
    'Era indispensável aos navegadores.',
    'Aponta sempre para o norte.'
  ]),
  P('Objetos', 'Apito', [], [
    'É bem pequeno.',
    'Funciona com o ar dos pulmões.',
    'Faz um som agudo e alto.',
    'O salva-vidas usa.',
    'O árbitro usa para parar o jogo.'
  ]),
  P('Objetos', 'Cubo mágico', ['Cubo de Rubik', 'Cubo magico'], [
    'É um brinquedo que virou febre nos anos 80.',
    'Foi inventado por um húngaro.',
    'Tem campeonato de quem resolve mais rápido.',
    'Tem seis cores.',
    'É um cubo com faces que giram.'
  ]),
  // PROFISSOES
  P('Profissões', 'Bombeiro', [], [
    'Trabalha em turnos e dorme no quartel.',
    'Usa roupa especial e capacete.',
    'Resgata gente e até gato na árvore.',
    'Anda num caminhão vermelho com sirene.',
    'Apaga incêndios.'
  ]),
  P('Profissões', 'Dentista', [], [
    'Trabalha sentado ao lado de uma cadeira reclinável.',
    'Usa máscara e luvas.',
    'Pede para você abrir a boca.',
    'Usa um motorzinho que dá medo.',
    'Cuida dos dentes.'
  ]),
  P('Profissões', 'Astronauta', [], [
    'Treina por anos antes do primeiro trabalho.',
    'Passa meses longe de casa.',
    'Trabalha sem gravidade.',
    'Usa um traje pressurizado e capacete.',
    'Viaja para o espaço.'
  ]),
  P('Profissões', 'Goleiro', [], [
    'É uma posição de um esporte.',
    'Usa uniforme de cor diferente do time.',
    'Pode usar as mãos, mas só numa área.',
    'É o último homem do time.',
    'Defende o gol.'
  ]),
  P('Profissões', 'Carteiro', [], [
    'Anda muito todos os dias.',
    'Às vezes é perseguido por cachorro.',
    'Trabalha para os Correios.',
    'Carrega uma bolsa grande.',
    'Entrega cartas.'
  ]),
  P('Profissões', 'Padeiro', [], [
    'Começa a trabalhar de madrugada.',
    'Usa touca.',
    'Mexe com farinha o dia inteiro.',
    'Trabalha perto de um forno.',
    'Faz o pão francês.'
  ]),
  // ESPORTES
  P('Esportes', 'Vôlei', ['Volei', 'Voleibol'], [
    'É um esporte coletivo olímpico.',
    'Tem rodízio de posições.',
    'Cada time pode tocar três vezes na bola.',
    'Tem saque, levantamento e cortada.',
    'Dois times separados por uma rede alta.'
  ]),
  P('Esportes', 'Surfe', ['Surf'], [
    'É praticado ao ar livre.',
    'Depende das condições do tempo.',
    'Gabriel Medina e Ítalo Ferreira são estrelas.',
    'O atleta fica em pé sobre uma prancha.',
    'É praticado nas ondas do mar.'
  ]),
  P('Esportes', 'Xadrez', [], [
    'É disputado por duas pessoas.',
    'Pode durar horas, em silêncio.',
    'Usa um relógio com dois botões.',
    'Tem rei, rainha, torre e cavalo.',
    'É jogado num tabuleiro de 64 casas.'
  ]),
  P('Esportes', 'Boxe', ['Box', 'Pugilismo'], [
    'É um esporte de combate.',
    'A luta é dividida em rounds.',
    'Muhammad Ali foi um dos maiores.',
    'É disputado num ringue com cordas.',
    'Os atletas lutam com luvas, só com os punhos.'
  ]),
  P('Esportes', 'Fórmula 1', ['Formula 1', 'F1', 'Formula Um'], [
    'É um esporte de velocidade.',
    'Tem uma temporada pelo mundo inteiro.',
    'As equipes trocam pneus em segundos.',
    'Senna e Piquet foram campeões.',
    'É a principal categoria do automobilismo.'
  ])
];

const ESTADIOS_COMO_PONTINHOS: PontinhoItem[] = ESTADIOS.map((e) => ({
  tema: 'Estádios',
  nome: e.nome,
  detalhe: `${e.cidade}, ${e.pais}`,
  aceitas: e.aceitas,
  pistas: e.pistas
}));

export const PONTINHOS: PontinhoItem[] = [...ESTADIOS_COMO_PONTINHOS, ...PONTINHOS_EXTRA];

export const normalizePontinhoKey = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Itens que caem nos temas escolhidos (lista vazia = todos os temas). */
export function pontinhosPool(temas: readonly string[] = []): PontinhoItem[] {
  if (!temas.length) return PONTINHOS;
  const pool = PONTINHOS.filter((p) => temas.includes(p.tema));
  return pool.length ? pool : PONTINHOS;
}

/** Sorteia um item ainda nao usado nos temas escolhidos (esgotado, recomeca). */
export function drawPontinho(
  used: Set<string> = new Set(),
  temas: readonly string[] = [],
  rng: () => number = Math.random
): PontinhoItem {
  const all = pontinhosPool(temas);
  let pool = all.filter((p) => !used.has(normalizePontinhoKey(p.nome)));
  if (pool.length === 0) pool = all;
  return pool[Math.floor(rng() * pool.length)];
}
