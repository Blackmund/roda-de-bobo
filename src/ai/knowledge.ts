/**
 * Conhecimento local da IA: o que ela sabe mesmo sem o Gemini. Vem dos proprios bancos do jogo (cartas, rodadas,
 * identidades, palavras) e de um vocabulario de Adedanha. Serve para a IA nunca "travar": sempre ha uma resposta
 * de verdade, plausivel, para dar.
 */
import * as CB from '../data/categoryBanks';
import { ESTADIOS } from '../data/estadiosBank';
import { QUEM_SOU_EU_IDENTITIES } from '../data/quemSouEuIdentities';
import { MIMICA_WORDS } from '../data/mimicaWords';
import { DESENHO_WORDS } from '../data/desenhoWords';
import { MEGA_RESENHA_WORDS } from '../data/megaResenhaWords';
import { RESPOSTAS_QUESTIONS } from '../data/respostasSemPerguntas';
import { ONDE_ESTOU_MOMENTS } from '../data/ondeEstouMoments';
import { PROIBIDO_GOLDEN_CARDS } from '../utils/proibidoGoldenDatabase';

export const norm = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
const STOP = new Set('que qual quais com para por uma uns umas dos das nos nas como mais sem sua seu suas seus voce voces isso esse essa este esta pelo pela aos ate mas tem ter sao foi ser era quem onde quando porque mais'.split(' '));
const pick = <T,>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined);
const shuffle = <T,>(arr: T[]): T[] => arr.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// ------------------------------------------------------------------ ADEDANHA
/** Vocabulario por categoria (respostas comuns, aceitas em qualquer mesa). */
const LEX: Record<string, string> = {
  nome: 'Ana André Alice Amanda Bruno Beatriz Bianca Caio Camila Carlos Daniel Débora Diego Eduardo Elisa Fábio Fernanda Gabriel Gisele Gustavo Heitor Helena Igor Isabela Ivan João Júlia Juliana Kátia Leonardo Larissa Lucas Marcos Maria Mateus Natália Nicolas Otávio Olívia Paulo Patrícia Pedro Quitéria Rafael Renata Rodrigo Sabrina Sérgio Tatiana Thiago Ulisses Úrsula Vanessa Vitor Wagner Xuxa Yasmin Zeca',
  animal: 'Abelha Águia Anta Avestruz Baleia Barata Besouro Bode Boi Cabra Cachorro Camelo Canguru Capivara Cavalo Cobra Coelho Coruja Crocodilo Dromedário Elefante Ema Esquilo Formiga Foca Gato Galinha Girafa Golfinho Gorila Hipopótamo Hiena Iguana Jacaré Jabuti Javali Jumento Leão Lobo Lagarto Macaco Morcego Mosquito Novilho Onça Ornitorrinco Ovelha Panda Pato Pavão Peru Pinguim Quati Rato Raposa Rinoceronte Sapo Sabiá Suricato Tamanduá Tatu Tigre Tubarão Tucano Urso Urubu Vaca Veado Vespa Zebra',
  cor: 'Amarelo Azul Anil Bege Branco Bordô Bronze Cinza Coral Creme Dourado Esmeralda Escarlate Fúcsia Grafite Gelo Índigo Jade Laranja Lilás Magenta Marrom Mostarda Nude Ocre Ouro Prata Preto Púrpura Rosa Rubi Salmão Turquesa Terracota Uva Verde Vermelho Vinho Violeta',
  fruta: 'Abacate Abacaxi Acerola Ameixa Amora Banana Bacuri Caju Cacau Caqui Carambola Cereja Coco Cupuaçu Damasco Figo Framboesa Goiaba Graviola Groselha Guaraná Ingá Jabuticaba Jaca Jambo Kiwi Laranja Lichia Limão Maçã Mamão Manga Maracujá Melancia Melão Mexerica Morango Nectarina Nêspera Pera Pêssego Pitanga Pitaya Romã Seriguela Tamarindo Tangerina Umbu Uva',
  lugar: 'Amazonas Alagoas Argentina Bahia Belém Brasília Bolívia Chile Curitiba Canadá Dinamarca Espanha Egito Fortaleza França Goiânia Grécia Holanda Índia Itália Jamaica Japão Londres Lisboa Manaus Maceió México Natal Noruega Olinda Paraná Peru Portugal Quênia Recife Rússia Salvador Santos Suíça Teresina Tóquio Uruguai Ubatuba Venezuela Vitória Zâmbia',
  objeto: 'Agulha Almofada Apito Balde Bola Borracha Caneta Cadeira Chave Copo Dado Escova Espelho Faca Garfo Garrafa Guarda-chuva Isqueiro Jarra Lápis Lanterna Livro Martelo Mesa Mochila Nota Óculos Panela Pente Prato Quadro Régua Relógio Sacola Tesoura Travesseiro Tampa Urna Vaso Vassoura Xícara Zíper',
  marca: 'Adidas|Apple|Avon|Brahma|Bombril|Coca-Cola|Colgate|Dell|Dove|Elma Chips|Fiat|Ford|Gillette|Google|Havaianas|Honda|Ipiranga|Itaú|Johnson|Kibon|Lacta|Lego|Magalu|Natura|Nestlé|Nike|Nissan|Omo|Puma|Pepsi|Quaker|Renault|Samsung|Sony|Toyota|Tramontina|Unilever|Uber|Vivo|Volkswagen|Xiaomi|Yamaha|Zara',
  profissao: 'Advogado Arquiteto Ator Bombeiro Barbeiro Cantor Carpinteiro Cozinheiro Dentista Designer Eletricista Engenheiro Enfermeiro Fotógrafo Farmacêutico Garçom Geólogo Historiador Instrutor Jornalista Juiz Locutor Médico Motorista Mecânico Nutricionista Oftalmologista Pedreiro Policial Professor Psicólogo Químico Recepcionista Repórter Sapateiro Soldador Taxista Técnico Urologista Vendedor Veterinário Zelador',
  comida: 'Acarajé Arroz Bife Brigadeiro Bolo Coxinha Cuscuz Churrasco Dobradinha Empada Esfiha Estrogonofe Farofa Feijoada Frango Galinhada Hambúrguer Inhame Jiló Lasanha Linguiça Macarrão Moqueca Mingau Nhoque Omelete Pastel Pamonha Pizza Polenta Quibe Quindim Risoto Rabada Sushi Salada Sopa Tapioca Torta Torresmo Uva-passa Vatapá Virado Xinxim Yakissoba',
  filme: 'Avatar|Aladdin|Batman|Bacurau|Coringa|Carros|Central do Brasil|Divertida Mente|Dexter|Elite|Encanto|Friends|Frozen|Gladiador|Grey’s Anatomy|Harry Potter|House|Interestelar|Jumanji|Jurassic Park|Lost|Matrix|Moana|Narcos|Naruto|Ozark|Procurando Nemo|Pantera Negra|Quarteto Fantástico|Rocky|Rei Leão|Shrek|Sintonia|Titanic|Toy Story|Up|Uncharted|Vingadores|Viva|Wandinha|Zootopia',
  corpo: 'Abdômen Antebraço Barriga Boca Braço Cabelo Cabeça Calcanhar Cotovelo Coxa Dedo Dente Estômago Fígado Garganta Gengiva Joelho Lábio Língua Mão Nariz Nuca Olho Orelha Ombro Pé Perna Pescoço Pulmão Queixo Rim Sobrancelha Tornozelo Testa Umbigo Unha Veia Virilha',
  time: 'América|Atlético Mineiro|Avaí|Bahia|Botafogo|Bragantino|Ceará|Corinthians|Coritiba|Cruzeiro|Cuiabá|Flamengo|Fluminense|Fortaleza|Goiás|Grêmio|Internacional|Juventude|Juventus|Liverpool|Milan|Náutico|Palmeiras|Paysandu|Real Madrid|Remo|Santos|São Paulo|Sport|Tottenham|Vasco|Vitória',
  jogador: 'Adriano|Alisson|Bebeto|Cafu|Casemiro|Dida|Endrick|Edmundo|Falcão|Garrincha|Gabigol|Hulk|Isaque|Jairzinho|Kaká|Lucas Paquetá|Marta|Messi|Neymar|Oscar|Pelé|Quaresma|Romário|Ronaldinho|Ronaldo|Sócrates|Thiago Silva|Tostão|Vini Jr|Zico',
  cantor: 'Alcione|Anitta|Belo|Bruno Mars|Caetano Veloso|Calcinha Preta|Djavan|Elis Regina|Elvis|Fagner|Gilberto Gil|Gusttavo Lima|Henrique e Juliano|Ivete Sangalo|Iza|Jorge e Mateus|Ludmilla|Luan Santana|Marília Mendonça|Maiara e Maraisa|Nando Reis|Oasis|Pabllo Vittar|Queen|Raça Negra|Roberto Carlos|Seu Jorge|Simone Mendes|Titãs|U2|Vitor Kley|Wesley Safadão|Xand Avião|Zé Neto e Cristiano',
  novela: 'Avenida Brasil|Amor de Mãe|A Favorita|Belíssima|Caminho das Índias|Chocolate com Pimenta|Da Cor do Pecado|Esperança|Fina Estampa|Gabriela|Haja Coração|Império|Laços de Família|Mulheres Apaixonadas|Novo Mundo|O Clone|Pantanal|Paraíso Tropical|Que Rei Sou Eu|Roque Santeiro|Senhora do Destino|Terra e Paixão|Tieta|Uga Uga|Vale Tudo',
  personagem: 'Aladdin|Batman|Bob Esponja|Cascão|Chaves|Chapolin|Cebolinha|Dora|Elsa|Fiona|Goku|Hulk|Homer Simpson|Jerry|Kiko|Luigi|Mario|Mônica|Naruto|Olaf|Pikachu|Popeye|Quico|Rapunzel|Shrek|Superman|Sonic|Tom|Tarzan|Ursinho Pooh|Vegeta|Woody|Zorro',
  casa: 'Abajur Armário Almofada Balde Banheira Cama Cadeira Cortina Cômoda Escada Espelho Estante Fogão Geladeira Guarda-roupa Interfone Janela Lâmpada Liquidificador Mesa Micro-ondas Novelo Pia Porta Prateleira Quadro Rodo Sofá Tapete Televisão Torneira Travesseiro Varal Vaso Ventilador',
  bebida: 'Água|Água de coco|Batida|Café|Caipirinha|Cerveja|Chá|Chocolate quente|Champanhe|Energético|Garapa|Guaraná|Isotônico|Iogurte|Licor|Leite|Limonada|Mate|Milk-shake|Néctar|Quentão|Refrigerante|Rum|Saquê|Suco|Tequila|Uísque|Vinho|Vitamina|Vodca',
  esporte: 'Atletismo|Automobilismo|Basquete|Beisebol|Boxe|Canoagem|Ciclismo|Corrida|Esgrima|Futebol|Futsal|Golfe|Ginástica|Handebol|Hipismo|Judô|Jiu-jítsu|Karatê|Luta livre|Maratona|Natação|Polo aquático|Remo|Rúgbi|Skate|Surfe|Tênis|Taekwondo|Triatlo|Vôlei|Vela|Xadrez',
  doenca: 'Alergia Amigdalite Anemia Asma Bronquite Catapora Caxumba Cólica Conjuntivite Dengue Diabetes Enxaqueca Febre Gastrite Gripe Hepatite Hipertensão Insônia Labirintite Malária Meningite Otite Pneumonia Rinite Rubéola Sarampo Sinusite Tendinite Tuberculose Úlcera Varicela Zika',
  instrumento: 'Acordeão Agogô Atabaque Bateria Banjo Berimbau Baixo Cavaquinho Clarinete Contrabaixo Cuíca Flauta Gaita Guitarra Harpa Oboé Pandeiro Piano Reco-reco Repique Sanfona Saxofone Surdo Tamborim Teclado Triângulo Trombone Trompete Tuba Ukulele Viola Violão Violino Xilofone Zabumba',
  transporte: 'Avião|Ambulância|Balão|Barco|Bicicleta|Bonde|Caminhão|Canoa|Carro|Carroça|Charrete|Elevador|Foguete|Helicóptero|Iate|Jangada|Jet ski|Lancha|Metrô|Moto|Navio|Ônibus|Patinete|Patins|Quadriciclo|Skate|Submarino|Táxi|Teleférico|Trator|Trem|Triciclo|Van|Veleiro',
  praia: 'Areia|Barraca|Biquíni|Boia|Bola|Balde|Cadeira|Canga|Chapéu|Coco|Concha|Esteira|Frescobol|Guarda-sol|Gaivota|Isopor|Jangada|Lancha|Mar|Milho|Onda|Óculos de sol|Prancha|Protetor solar|Quiosque|Rede|Sereia|Sol|Sunga|Toalha|Vendedor|Vôlei',
  estadio: 'Arquibancada Apito Bandeira Bola Bandeirinha Camisa Cadeira Catraca Chuteira Escanteio Faixa Gol Gramado Goleiro Hino Ingresso Juiz Lateral Locutor Mascote Narrador Placar Pipoca Refletor Rede Sinalizador Telão Torcida Trave Uniforme Vestiário Vuvuzela',
  desculpa: 'Ataque de alergia|Avó doente|Batida no carro|Cachorro passou mal|Consulta médica|Dor de barriga|Enchente na rua|Febre de repente|Gato fugiu|Internet caiu|Infiltração em casa|Luz acabou|Mudança|Ônibus quebrou|Pneu furou|Queda de energia|Reunião da escola|Sinusite atacou|Trânsito parado|Unha encravada|Vazamento em casa',
  mae: 'Agora não|Arruma esse quarto|Bem que eu avisei|Cadê o casaco|Come tudo|Desliga essa TV|Escova os dentes|Fecha a porta|Guarda isso|Já pra cama|Leva o guarda-chuva|Me liga quando chegar|Na volta a gente conversa|Olha a hora|Pode tirar o cavalinho da chuva|Quem pariu Mateus que balance|Respeita sua mãe|Só por cima do meu cadáver|Toma banho|Uma hora você vai entender|Vai estudar',
  apelido: 'Alemão Baixinho Bigode Branquelo Careca Cabeção Dentinho Doidão Fofão Gordo Grandão Japa Juninho Lerdo Magrão Mineiro Nego Negão Orelha Pezão Pirulito Quatro-olhos Ruivo Sardinha Tampinha Tiozão Urso Vovô Xuxa Zóio',
  termino: 'Arrogância|Briga|Ciúmes|Chatice|Desinteresse|Distância|Egoísmo|Falta de tempo|Ficou estranho|Grosseria|Infidelidade|Imaturidade|Mentira|Mau humor|Mudança|Orgulho|Preguiça|Rotina|Sogra|Traição|Vício em jogo',
  perde: 'Anel|Brinco|Boné|Caneta|Carregador|Chave|Chinelo|Controle remoto|Documento|Elástico|Fone de ouvido|Grampo|Guarda-chuva|Isqueiro|Lenço|Meia|Moeda|Óculos|Pente|Pilha|Prendedor|Relógio|Tampa|Tesoura|Unha postiça',
  palavrao: 'Aff|Bosta|Cacilda|Caramba|Credo|Droga|Diacho|Égua|Eita|Fala sério|Inferno|Jesus amado|Leseira|Meleca|Nossa|Ora bolas|Pô|Porcaria|Puxa|Raios|Saco|Uai|Vixe'
};

const CAT_KEYS: Array<[RegExp, string]> = [
  [/^nome/, 'nome'],
  [/animal/, 'animal'],
  [/^cor/, 'cor'],
  [/fruta/, 'fruta'],
  [/cidade|estado|pais|lugar/, 'lugar'],
  [/coisa de casa/, 'casa'],
  [/objeto/, 'objeto'],
  [/marca/, 'marca'],
  [/profiss/, 'profissao'],
  [/comida/, 'comida'],
  [/filme|serie/, 'filme'],
  [/corpo/, 'corpo'],
  [/jogador/, 'jogador'],
  [/time/, 'time'],
  [/cantor|banda/, 'cantor'],
  [/novela/, 'novela'],
  [/personagem/, 'personagem'],
  [/bebida/, 'bebida'],
  [/esporte/, 'esporte'],
  [/doenca/, 'doenca'],
  [/instrumento/, 'instrumento'],
  [/transporte/, 'transporte'],
  [/praia/, 'praia'],
  [/estadio/, 'estadio'],
  [/desculpa/, 'desculpa'],
  [/mae fala|coisa que a mae/, 'mae'],
  [/apelido/, 'apelido'],
  [/terminar|namoro/, 'termino'],
  [/perde/, 'perde'],
  [/palavr/, 'palavrao']
];

function lexFor(category: string): string[] {
  const c = norm(category);
  const key = CAT_KEYS.find(([re]) => re.test(c))?.[1];
  if (!key) return [];
  const raw = LEX[key];
  return raw.includes('|') ? raw.split('|') : raw.split(' ');
}

/** Respostas locais para a Adedanha (uma por categoria; '' quando nao conhece nenhuma com a letra). */
export function adedanhaLocal(letter: string, categories: string[], used: string[] = []): string[] {
  const L = norm(letter)[0];
  const taken = new Set(used.map(norm));
  return categories.map((cat) => {
    const opts = lexFor(cat).filter((w) => norm(w)[0] === L && !taken.has(norm(w)));
    const w = pick(opts) || '';
    if (w) taken.add(norm(w));
    return w;
  });
}

// ------------------------------------------------------------------ CARTAS / PALAVRAS
type Card = { palavra_alvo: string; palavras_proibidas: string[] };
const ALL_CARDS: Card[] = [
  ...((PROIBIDO_GOLDEN_CARDS as unknown as Card[]) || []),
  ...Object.entries(CB)
    .filter(([k, v]) => k.endsWith('_PROIBIDO_CARDS') && Array.isArray(v))
    .flatMap(([, v]) => v as Card[])
].filter((c) => c && c.palavra_alvo);

/** Palavras que "puxam" a palavra-alvo (das cartas do Proibido: as proibidas sao justamente as dicas obvias). */
export function associationsFor(word: string): string[] {
  const n = norm(word);
  const card = ALL_CARDS.find((c) => norm(c.palavra_alvo) === n);
  return card ? card.palavras_proibidas.slice() : [];
}

interface Worded {
  palavra: string;
  categoria: string;
}
const WORD_BANKS: Worded[] = [...MIMICA_WORDS, ...DESENHO_WORDS, ...MEGA_RESENHA_WORDS] as Worded[];

export function categoryOfWord(word: string): string | null {
  const n = norm(word);
  return WORD_BANKS.find((w) => norm(w.palavra) === n)?.categoria || null;
}

/** Outra palavra plausivel (mesma categoria) para um chute errado que faz sentido. */
export function siblingWord(word: string, exclude: string[] = []): string {
  const cat = categoryOfWord(word);
  const ex = new Set([word, ...exclude].map(norm));
  const pool = WORD_BANKS.filter((w) => (!cat || w.categoria === cat) && !ex.has(norm(w.palavra)));
  return pick(pool)?.palavra || pick(WORD_BANKS.filter((w) => !ex.has(norm(w.palavra))))?.palavra || 'Bola';
}

/** Dicas de uma palavra so para a Mega Resenha (sem Gemini). */
export function megaCluesLocal(word: string): string[] {
  const out = associationsFor(word).filter((c) => !/\s/.test(c.trim()));
  const cat = categoryOfWord(word);
  if (cat) out.push(cat.split(/\s+/)[0]);
  return out;
}

/** Gestos descritos para a Mimica (sem Gemini): partem da categoria e das associacoes. */
export function mimicaActsLocal(word: string): string[] {
  const cat = categoryOfWord(word);
  const assoc = associationsFor(word).slice(0, 2);
  const syl = Math.max(1, (norm(word).match(/[aeiou]+/g) || []).length);
  return [
    cat ? `Faz o sinal de "${cat.toLowerCase()}" com as mãos` : 'Aponta para algo do dia a dia',
    `Mostra ${syl} ${syl === 1 ? 'dedo' : 'dedos'}: são ${syl} sílabas`,
    ...assoc.map((a) => `Encena "${a.toLowerCase()}" com o corpo todo`),
    'Repete o gesto principal mais devagar'
  ];
}

/** Dicas do Proibido sem Gemini: categoria, tamanho e um uso concreto, sem usar palavra proibida. */
export function proibidoCluesLocal(word: string, forbidden: string[]): string[] {
  const cat = categoryOfWord(word);
  const banned = [word, ...forbidden].map(norm);
  const clean = (t: string) => !banned.some((b) => b.length > 2 && norm(t).includes(b));
  const n = norm(word).replace(/\s/g, '').length;
  return [cat ? `É da categoria ${cat.toLowerCase()}` : 'Todo mundo conhece isso', `A palavra tem ${n} letras`, `Começa com a letra ${norm(word)[0].toUpperCase()}`].filter(clean);
}

// ------------------------------------------------------------------ PERGUNTAS COM RESPOSTA
type TemRound = { pergunta: string; respostas: Array<{ texto: string; sinonimos_aceitos?: string[] }> };
const TEM_ROUNDS: TemRound[] = Object.entries(CB)
  .filter(([k, v]) => k.endsWith('_TEM_OU_NAO_TEM') && Array.isArray(v))
  .flatMap(([, v]) => v as TemRound[])
  .filter((r) => r && r.respostas);

/** Resposta plausivel para o Tem ou Nao Tem que nao esta no painel (de rodadas parecidas). */
export function temPlausibleWrong(question: string, avoid: string[]): string {
  const qw = new Set(words(question));
  const ban = new Set(avoid.map(norm));
  const scored = TEM_ROUNDS.map((r) => ({ r, s: words(r.pergunta).filter((w) => qw.has(w)).length }))
    .filter((x) => norm(x.r.pergunta) !== norm(question))
    .sort((a, b) => b.s - a.s);
  for (const { r } of scored.slice(0, 6)) {
    const opt = shuffle(r.respostas.map((x) => x.texto)).find((t) => !ban.has(norm(t)));
    if (opt) return opt;
  }
  return pick(TEM_ROUNDS.flatMap((r) => r.respostas.map((x) => x.texto)).filter((t) => !ban.has(norm(t)))) || 'Futebol';
}

/** Chute plausivel no Respostas sem Perguntas (resposta de outra pergunta da mesma categoria). */
export function respostasPlausibleWrong(category: string, answer: string): string {
  const pool = RESPOSTAS_QUESTIONS.filter((q) => q.categoria === category && norm(q.resposta) !== norm(answer)).map((q) => q.resposta);
  return pick(pool) || pick(RESPOSTAS_QUESTIONS.map((q) => q.resposta).filter((r) => norm(r) !== norm(answer))) || 'Brasil';
}

/** Palavras do Repetente sem Gemini: a categoria e palavras de bancos com a mesma categoria. */
export function repetenteLocal(theme: string, category: string): string[] {
  const tw = new Set(words(theme + ' ' + category));
  const related = WORD_BANKS.filter((w) => words(w.categoria + ' ' + w.palavra).some((x) => tw.has(x))).map((w) => w.palavra);
  const fromLex = lexFor(category).concat(lexFor(theme));
  return Array.from(new Set([...fromLex.slice(0, 3), ...related.slice(0, 3), (theme.split(/\s+/).pop() || theme)])).filter(Boolean);
}

// ------------------------------------------------------------------ IDENTIDADES / ESTADIOS
export function identitySibling(identity: string, category: string | undefined, exclude: string[] = []): string {
  const ex = new Set([identity, ...exclude].map(norm));
  const pool = [
    ...QUEM_SOU_EU_IDENTITIES.map((i) => ({ nome: i.nome, categoria: i.categoria })),
    ...ONDE_ESTOU_MOMENTS.map((m) => ({ nome: (m as unknown as { nome?: string; titulo?: string }).nome || (m as unknown as { titulo?: string }).titulo || '', categoria: (m as unknown as { categoria?: string }).categoria || '' }))
  ].filter((i) => i.nome && !ex.has(norm(i.nome)));
  const same = pool.filter((i) => category && norm(i.categoria) === norm(category));
  return pick(same)?.nome || pick(pool)?.nome || 'Pelé';
}

/** Perguntas de sim/nao que fazem sentido para a categoria da identidade. */
export function questionsFor(category: string | undefined): string[] {
  const c = norm(category || '');
  if (/futebol|esporte|atleta/.test(c)) return ['Eu jogo ou joguei profissionalmente?', 'Eu sou brasileiro?', 'Eu já fui campeão do mundo?', 'Eu ainda estou em atividade?', 'Eu joguei na Europa?', 'Eu sou atacante?', 'Eu tenho mais de 35 anos?'];
  if (/music|cant|banda/.test(c)) return ['Eu canto em português?', 'Eu sou sertanejo?', 'Eu faço parte de uma dupla ou banda?', 'Eu fiz sucesso antes dos anos 2000?', 'Eu sou mulher?', 'Eu ganhei um Grammy?'];
  if (/personagem|desenho|anim|ficc|filme|serie/.test(c)) return ['Eu sou de um desenho animado?', 'Eu tenho superpoderes?', 'Eu sou um animal?', 'Eu apareço em filme de super-herói?', 'Eu sou do bem?', 'Eu sou de um jogo de videogame?'];
  if (/lugar|cidade|pais|momento|historia/.test(c)) return ['É no Brasil?', 'É um lugar que dá para visitar hoje?', 'Aconteceu depois do ano 2000?', 'Tem a ver com futebol?', 'Fica perto do mar?', 'Passou na TV ao vivo?'];
  return ['Eu sou uma pessoa de verdade?', 'Eu sou brasileiro?', 'Eu sou famoso pela TV?', 'Eu sou homem?', 'Eu estou vivo?', 'Eu tenho mais de 40 anos?', 'Eu sou do mundo do esporte?'];
}

export function stadiumSibling(name: string, country: string): string {
  const pool = ESTADIOS.filter((e) => norm(e.nome) !== norm(name));
  return pick(pool.filter((e) => e.pais === country)) ?.nome || pick(pool)?.nome || 'Maracanã';
}

/** Escala da Nota em palavras (para dicas sem Gemini). */
export function notaClueLocal(score: number, min: number, max: number, question: string): string[] {
  const f = (score - min) / Math.max(1, max - min);
  const nivel = f < 0.15 ? 'bem fraquinho, quase nada' : f < 0.35 ? 'abaixo da média' : f < 0.55 ? 'bem no meio, mediano' : f < 0.75 ? 'acima da média, bom' : f < 0.92 ? 'muito bom, quase no topo' : 'o melhor que existe, nota máxima';
  const tema = words(question).slice(0, 3).join(' ');
  return [`Pensando em ${tema || 'isso'}: é ${nivel}.`, `Se fosse comida, seria ${f < 0.35 ? 'um miojo sem tempero' : f < 0.65 ? 'um arroz com feijão honesto' : 'um churrasco de domingo'}.`];
}
