/**
 * BANCO LOCAL DE TEMAS - DADOS BASE (curados à mão, sem IA, sem rede)
 *
 * Cada categoria tem temas-base curtos (2 a 5 palavras). O arquivo utils/themeBank.ts
 * multiplica esses temas pelos "recortes" de cada jogo (ver GAME_ANGLES), o que
 * gera dezenas de milhares de combinações únicas sem precisar de nenhuma API.
 *
 * Inspiração: os 6 jogos do projeto, os bancos de ouro (Limite, Duvido, Proibido,
 * Nota, Tem ou Não Tem) e o universo CazéTV (futebol, Copa, Olimpíadas, reações,
 * narração, bastidores, humor do dia a dia).
 *
 * Para adicionar temas: acrescente na string da categoria, separando por "|".
 */

export type ThemeGameId =
  | 'limite'
  | 'duvido'
  | 'proibido'
  | 'nota'
  | 'tem-ou-nao-tem'
  | 'perguntas-e-verdades';

export interface ThemeCategoryData {
  id: string;
  nome: string;
  /** Jogos em que a categoria funciona bem. */
  jogos: ThemeGameId[];
  /** true = estilo/universo CazéTV (usado no filtro "só CazéTV"). */
  cazetv?: boolean;
  /** true = humor mais adulto (+18 leve). Pode ser filtrado na interface. */
  adulto?: boolean;
  temas: string[];
}

const p = (s: string): string[] =>
  s
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);

const TODOS: ThemeGameId[] = [
  'limite',
  'duvido',
  'proibido',
  'nota',
  'tem-ou-nao-tem',
  'perguntas-e-verdades'
];
const FATOS: ThemeGameId[] = ['limite', 'duvido', 'proibido', 'tem-ou-nao-tem'];
const SOCIAL: ThemeGameId[] = ['nota', 'tem-ou-nao-tem', 'perguntas-e-verdades', 'proibido'];
const LISTAS: ThemeGameId[] = ['duvido', 'proibido', 'tem-ou-nao-tem', 'limite', 'nota'];

export const THEME_CATEGORIES: ThemeCategoryData[] = [
  {
    id: 'futebol-brasil',
    nome: 'Futebol Brasileiro',
    jogos: TODOS,
    cazetv: true,
    temas: p(
      'Brasileirão|Clubes da Série A|Clubes da Série B|Rebaixamentos Históricos|Clássicos Estaduais|Clássico Fla-Flu|Grenal|Majestoso|Clássico Mineiro|Derby Paulista|Libertadores e brasileiros|Copa do Brasil|Estaduais e Campeonatos Regionais|Estádios do Brasil|Maracanã|Torcidas Organizadas|Hinos dos Clubes|Mascotes dos Clubes|Camisas Históricas|Goleiros Brasileiros|Zagueiros Brasileiros|Laterais Brasileiros|Camisa 10 do Brasil|Centroavantes Brasileiros|Artilheiros do Brasileirão|Técnicos Brasileiros|Técnicos Estrangeiros no Brasil|Jogadores que Viraram Meme|Contratações Furadas|Joias da Base|Árbitros e Polêmicas|VAR e Lances Polêmicos|Gols de Placa|Pênaltis Perdidos|Comemorações de Gol|Narradores e Bordões|Transmissão Esportiva|Mesa Redonda|Mercado da Bola|Jogador Rebaixado e Chorando|Time do Interior|Futebol de Várzea|Pelada de Fim de Semana|Futebol Feminino Brasileiro|Seleção Brasileira|Convocação da Seleção|Camisa Amarelinha|Futsal|Futebol de Areia|Fut7 e Society'
    )
  },
  {
    id: 'futebol-mundo',
    nome: 'Futebol Mundial e Copas',
    jogos: TODOS,
    cazetv: true,
    temas: p(
      'Copa do Mundo|Copas do Mundo Históricas|Seleções Campeãs do Mundo|Copa de 1970|Copa de 1994|Copa de 2002|Copa de 2014 e o 7 a 1|Copa de 2022|Copa de 2026|Eliminatórias Sul-Americanas|Eurocopa|Copa América|Champions League|Final da Champions|Premier League|La Liga|Serie A Italiana|Bundesliga|Ligue 1|Clássico Real x Barça|Clássico Inglês|Superclássico Argentino|Mundial de Clubes|Bola de Ouro|Chuteira de Ouro|Craques Argentinos|Craques Portugueses|Craques Franceses|Craques da Década de 90|Brasileiros na Europa|Brasileiros na Arábia|Goleiros Lendários|Zagueiros Lendários|Camisas de Seleções|Mascotes de Copas|Músicas de Copa|Álbum de Figurinhas|Figurinha Difícil|Estádios da Europa|Torcidas Estrangeiras|Cartões Vermelhos Históricos|Viradas Épicas|Zebras Históricas|Torcida na Arquibancada|Pênaltis em Decisões|Lesões que Mudaram Tudo|Transferências Milionárias|Técnicos Lendários|Seleções que Nunca Venceram|Futebol Africano|Futebol Asiático|MLS e Futebol dos EUA'
    )
  },
  {
    id: 'cazetv-universo',
    nome: 'Universo CazéTV (Reações e Transmissões)',
    jogos: SOCIAL.concat(['limite']),
    cazetv: true,
    temas: p(
      'Reações ao Vivo|Janela de Reação do Narrador|Grito de Gol|Bordões de Narrador|Narrando Lances Históricos|Auuutoriza o Árbitro|Corte de Craque|Live da Madrugada|Resenha Pós-Jogo|Comentarista de Plantão|Pré-Jogo Animado|Enquete do Chat|Chat Enlouquecido|Cortes que Viralizam|Reagindo a Casas Milionárias|Reagindo a Lancheiras|Reagindo a Aeroportos|Reagindo a Reality Shows|Reagindo a Programas de Namoro|Reagindo ao BBB|Reagindo a Vídeos Antigos|Reagindo a Gols Bizarros|Transmissão de Olimpíadas|Narrar Esportes Estranhos|Modalidades Olímpicas Esquisitas|Brincadeira com Patrocinador|Intervalo Maluco|Pausa para Hidratação|Torcedor no Telão|Torcedor Sofredor|Torcedor Fanático|Superstições de Torcedor|Ritual Antes do Jogo|Desculpas de Jogador|Bate-Boca na Resenha|Previsões que Deram Errado|Palpite de Boteco|Bolão do Trabalho|Sofrer Junto no Sofá|Churrasco na Final|Lenda Urbana do Futebol|Bastidores de uma Transmissão|Erros ao Vivo na TV|Bloopers de Narração|Jogador que Virou Piada|Figurinhas e Álbuns da Copa|Fantasy Game e Cartola|Quiz de Futebol|Caça-Níquel de Bordões'
    )
  },
  {
    id: 'esportes-olimpiadas',
    nome: 'Esportes e Olimpíadas',
    jogos: TODOS,
    cazetv: true,
    temas: p(
      'Jogos Olímpicos|Medalhistas Brasileiros|Esportes Olímpicos|Esportes de Verão|Esportes de Inverno|Natação|Atletismo|Ginástica|Judô|Vôlei|Vôlei de Praia|Basquete|NBA|NFL e Futebol Americano|Fórmula 1|Pilotos Brasileiros|Corridas Famosas|MotoGP|Tênis|Grand Slams|Golfe|Surfe|Skate|Boxe|MMA e UFC|Jiu-Jitsu|Handebol|Rugby|Hóquei|Beisebol|Ciclismo|Tour de France|Maratonas|Natação Artística|Esgrima|Tiro com Arco|Remo e Canoagem|Halterofilismo|Xadrez|E-sports|Esportes Radicais|Esportes com Raquete|Esportes Coletivos|Mascotes Olímpicos|Tochas e Cerimônias|Recordes Mundiais|Doping e Polêmicas|Esportes Paralímpicos|Educação Física na Escola|Academia e Treino'
    )
  },
  {
    id: 'comidas-brasil',
    nome: 'Comidas do Brasil',
    jogos: TODOS,
    temas: p(
      'Comidas de Rua|Pastel de Feira|Pão de Queijo|Coxinha|Brigadeiro|Feijoada|Moqueca|Acarajé|Tapioca|Cuscuz|Baião de Dois|Arroz e Feijão|Marmita|Prato Feito|Self-Service por Quilo|Lanche de Padaria|Salgados de Festa|Pizza Brasileira|Hambúrguer Artesanal|Cachorro-Quente de Rua|X-Tudo|Açaí|Pamonha|Churros|Milho Cozido|Quentão e Vinho Quente|Comidas de São João|Comidas de Festa Junina|Comida de Vó|Almoço de Domingo|Macarronada de Domingo|Sopa de Frio|Café da Manhã|Café com Pão na Chapa|Lanche da Tarde|Ceia de Natal|Sobras da Geladeira|Miojo e Cia|Macarrão Instantâneo|Comida Congelada|Delivery e Aplicativos|Fast Food|Rodízio|Buffet Livre|Comida Mineira|Comida Nordestina|Comida Gaúcha|Comida Baiana|Comida Paraense|Comida Capixaba|Comida Goiana|Comida Caiçara|Pratos com Peixe|Frutas Brasileiras|Pratos que Dão Sono|Temperos e Molhos|Pimentas e Ardências|Comida Apimentada|Pratos de Boteco|Petiscos de Bar'
    )
  },
  {
    id: 'boteco-churrasco',
    nome: 'Boteco, Churrasco e Bebidas',
    jogos: TODOS,
    cazetv: true,
    temas: p(
      'Boteco|Churrasco de Domingo|Cortes de Carne|Ponto da Carne|Espetinho|Linguiça e Pão de Alho|Churrasqueiro da Família|Farofa e Vinagrete|Cerveja Gelada|Cervejas Artesanais|Cachaças Brasileiras|Caipirinha|Drinks e Coquetéis|Vinhos|Whisky|Gin|Tequila|Energéticos|Refrigerantes|Sucos e Vitaminas|Água de Coco|Café Expresso|Chá Gelado|Bebidas de Festa|Brinde e Saideira|Ressaca|Rodada de Cerveja|Mesa de Bar|Conta Dividida|Jogo de Truco|Dominó na Calçada|Sinuca|Karaokê no Bar|Samba de Mesa|Pagode no Quintal|Piscina e Laje|Laje com Churrasco|Aniversário no Bar|Primeira Bebida|Quem Paga a Conta|Happy Hour|Balada|Fila da Balada|Carteirinha de Bar|Garçom Lendário|Cardápio do Bar|Bar de Esquina|Torcida no Bar|Bar com Telão'
    )
  },
  {
    id: 'doces',
    nome: 'Doces e Sobremesas',
    jogos: TODOS,
    temas: p(
      'Doces & Sobremesas|Doces de Festa|Doces de Padaria|Doces Brasileiros|Brigadeiro e Beijinho|Pudim|Mousse|Torta de Limão|Bolo de Cenoura|Bolo de Aniversário|Bolo Caseiro|Pão de Mel|Sorvete|Picolé|Sorvete de Casquinha|Chocolate|Barras de Chocolate|Bombons|Ovo de Páscoa|Balas e Chicletes|Doces de Infância|Doces de Boteco|Doces Juninos|Paçoca|Cocada|Rapadura|Goiabada com Queijo|Doce de Leite|Churros e Cia|Donuts|Cupcakes|Milkshake|Sobremesas Italianas|Sobremesas Francesas|Sobremesas Japonesas|Doces Árabes|Sobremesas Geladas|Sobremesa de Restaurante|Fatia Disputada|Último Pedaço|Doce Escondido|Sobremesa de Natal|Cafeteria e Confeitaria'
    )
  },
  {
    id: 'culinaria-mundo',
    nome: 'Culinária do Mundo',
    jogos: TODOS,
    temas: p(
      'Culinária Mundial|Comida Italiana|Pizza e Massas|Comida Japonesa|Sushi e Sashimi|Comida Chinesa|Comida Mexicana|Tacos e Burritos|Comida Árabe|Comida Indiana|Comida Tailandesa|Comida Coreana|Comida Francesa|Comida Alemã|Comida Portuguesa|Comida Espanhola|Comida Argentina|Comida Peruana|Comida Americana|Comida Africana|Comida Grega|Queijos do Mundo|Embutidos|Frutos do Mar|Massas Famosas|Molhos Famosos|Pratos Típicos de Países|Comida Exótica|Comida Estranha do Mundo|Pratos com Arroz|Sopas do Mundo|Street Food do Mundo|Cafés do Mundo|Chás do Mundo|Pães do Mundo|Culinária Vegana|Culinária Vegetariana|Competição de Culinária|MasterChef e Cia'
    )
  },
  {
    id: 'cotidiano',
    nome: 'Cotidiano e Casa',
    jogos: TODOS,
    temas: p(
      'Cotidiano|Geladeira|Cozinha de Casa|Banheiro|Quarto Bagunçado|Guarda-Roupa|Sala de Estar|Quintal|Varanda|Área de Serviço|Lavanderia|Faxina de Sábado|Louça Suja|Roupa no Varal|Sofá e TV|Controle Remoto|Streaming no Sofá|Cama Fofa|Soneca da Tarde|Despertador|Segunda-Feira|Sexta-Feira|Fim de Semana|Feriado Prolongado|Domingo à Noite|Vizinhos|Condomínio|Reunião de Condomínio|Síndico|Elevador|Portaria|Entregador|Mercado|Supermercado|Feira Livre|Padaria da Esquina|Farmácia|Banco e Fila|Cartório|Correios|Lotérica|Contas a Pagar|Boletos|Aluguel|Mudança|Móveis e Montagem|Ferramentas|Obra em Casa|Eletrodomésticos|Celular Quebrado|Carregador Perdido|Wi-Fi Fraco|Senhas Esquecidas|Notificações|Bateria Acabando|Chuva Inesperada|Calor e Ventilador|Frio e Cobertor|Sono e Insônia|Banho Gelado|Sapatos e Chinelos|Mochilas e Bolsas|Chaves Perdidas|Gaveta de Bagunça|Casa Arrumada|Perrengues Domésticos'
    )
  },
  {
    id: 'vida-adulta',
    nome: 'Vida Adulta e Trabalho',
    jogos: TODOS,
    temas: p(
      'Vida Adulta|Primeiro Emprego|Entrevista de Emprego|Escritório|Home Office|Reunião que Podia Ser E-mail|Chefe Exigente|Colega de Trabalho|Café da Firma|Happy Hour da Empresa|Amigo Secreto da Firma|Metas e Prazos|Sexta de Pagamento|Salário que Acaba|Finanças Pessoais|Cartão de Crédito|Parcelamento|Promoções e Black Friday|Compras Online|Compra por Impulso|Dívidas|Aluguel x Financiamento|Primeiro Apartamento|Casa Própria|Carteira de Motorista|Prova de Direção|Imposto de Renda|Plano de Saúde|Academia que Ninguém Vai|Dieta de Segunda|Terapia e Autocuidado|Rotina Matinal|Transporte Público|Trânsito de Segunda|Corrida de Aplicativo|Dia de Mudança|Concurso Público|Faculdade à Noite|Freelancer|Empreendedorismo|Reunião no Zoom|Câmera Ligada|Mute Esquecido|Crachá e Catraca|Férias Marcadas|Banco de Horas|Demissão e Recomeço|Aposentadoria|Planejamento de Vida'
    )
  },
  {
    id: 'relacionamentos',
    nome: 'Relacionamentos e Dates',
    jogos: SOCIAL,
    adulto: true,
    temas: p(
      'Primeiro Encontro|Aplicativos de Namoro|Mensagem de Bom Dia|Visualizou e Não Respondeu|Ex que Aparece|Ciúmes|Pedido de Namoro|Pedido de Casamento|Casamento dos Sonhos|Sogra e Sogro|Conhecer os Pais|Bodas e Aniversário de Namoro|Presente Romântico|Jantar Romântico|Viagem a Dois|Brigas de Casal|Fazer as Pazes|Término|Amizade Colorida|Crush da Escola|Paquera na Balada|Cantada Ruim|Cantada que Funciona|Declaração de Amor|Carta de Amor|Cinema a Dois|Vai Dar Namoro|Reality de Namoro|Casais Famosos|Término Famoso|Sinais de Interesse|Ghosting|Fofoca de Casal|Grupo de Amigas|Grupo de Amigos|Melhor Amigo|Amigo Chato|Amigo que Some|Confiança|Segredos|Bagunça no Date|Date que Deu Errado|Date que Deu Certo|Redes Sociais do Casal|Stalkear o Ex|Foto de Casal'
    )
  },
  {
    id: 'familia-festas',
    nome: 'Família e Festas',
    jogos: TODOS,
    temas: p(
      'Família|Almoço em Família|Tios e Tias|Primos|Avós|Netos|Cunhado e Cunhada|Reunião de Família|Grupo da Família no Zap|Churrasco de Família|Aniversário|Parabéns Desafinado|Festa Surpresa|Festa Infantil|Pula-Pula e Salgadinhos|Casamento|Despedida de Solteiro|Chá de Bebê|Chá de Panela|Formatura|Bodas|Natal|Ano Novo|Réveillon|Páscoa|Dia das Mães|Dia dos Pais|Dia das Crianças|Dia dos Namorados|Amigo Secreto|Festa Junina|Quadrilha Junina|Carnaval|Bloco de Rua|Escola de Samba|Fantasias de Carnaval|Festas de Fim de Ano|Ceia e Sobras|Presentes que Ninguém Quer|Álbum de Família|Fotos Antigas|Histórias de Família|Tradições Familiares|Receitas de Família|Brigas de Família|Viagem em Família|Carro Cheio|Férias com Crianças|Sobrinhos|Irmão Mais Velho|Irmão Mais Novo|Filho Único'
    )
  },
  {
    id: 'escola',
    nome: 'Escola, Faculdade e Infância',
    jogos: TODOS,
    temas: p(
      'Escola & Infância|Primeiro Dia de Aula|Volta às Aulas|Material Escolar|Lancheira|Merenda|Cantina da Escola|Recreio|Educação Física|Professores Inesquecíveis|Prova Surpresa|Cola na Prova|Semana de Provas|Recuperação|Boletim|Caderno Bagunçado|Livro Didático|Trabalho em Grupo|Seminário|Feira de Ciências|Festa de Formatura|Excursão Escolar|Ônibus Escolar|Uniforme|Mochila Pesada|Grêmio Estudantil|Amor de Escola|Briga de Colégio|Apelidos|Panelinha da Sala|Vestibular|ENEM|Cursinho|Faculdade|Calouros e Trote|República Estudantil|TCC|Estágio|Intercâmbio|Matérias Odiadas|Matérias Favoritas|Matemática|Português|Química e Física|Geografia da Escola|História da Escola|Brincadeiras de Rua|Brincadeiras de Infância|Pique-Esconde|Pega-Pega|Bolinha de Gude|Pipa|Elástico|Amarelinha|Jogos de Tabuleiro|Cartas de Baralho'
    )
  },
  {
    id: 'viagens',
    nome: 'Viagens e Perrengues',
    jogos: TODOS,
    temas: p(
      'Viagens|Perrengues de Viagem|Aeroporto|Bagagem Extraviada|Check-in e Embarque|Voo Atrasado|Turbulência|Poltrona do Avião|Comida de Avião|Rodoviária|Viagem de Ônibus|Viagem de Carro|Estrada e Pedágio|Posto de Gasolina|Hotel|Hospedagem Barata|Airbnb|Hostel|Camping|Resort All Inclusive|Cruzeiro|Mochilão|Lua de Mel|Viagem de Formatura|Viagem de Amigos|Praia|Verão|Praias do Brasil|Litoral e Serra|Cachoeiras|Trilhas|Ecoturismo|Parques Temáticos|Disney|Passeio de Barco|Câmbio e Moeda|Passaporte e Visto|Alfândega|Souvenirs|Pontos Turísticos|Cidades Turísticas|Roteiro de Viagem|Guia Turístico|Fotos de Viagem|Mapa e GPS|Perder o Voo|Dormir no Aeroporto|Intercâmbio no Exterior|Turismo Brasileiro|Turismo Europeu|Turismo na Ásia'
    )
  },
  {
    id: 'geografia-brasil',
    nome: 'Brasil: Estados, Cidades e Regiões',
    jogos: FATOS,
    temas: p(
      'Estados Brasileiros|Capitais do Brasil|Cidades do Interior|Regiões do Brasil|Região Sul|Região Sudeste|Região Nordeste|Região Norte|Região Centro-Oeste|Rios do Brasil|Praias do Nordeste|Biomas do Brasil|Amazônia|Pantanal|Cerrado|Mata Atlântica|Caatinga|Pampas|Parques Nacionais|Patrimônios do Brasil|Cidades Históricas|Minas Gerais|São Paulo|Rio de Janeiro|Bahia|Pernambuco|Ceará|Rio Grande do Sul|Santa Catarina|Paraná|Goiás|Pará|Amazonas|Sotaques do Brasil|Gírias Regionais|Danças Regionais|Festas Regionais|Culinária Regional|Cartões-Postais|Pontes e Monumentos|Serras e Montanhas|Ilhas Brasileiras|Fronteiras do Brasil|Rodovias Famosas|Aeroportos do Brasil|Universidades Federais|Clubes por Estado|Cidades Grandes|Cidades Pequenas|Bairros Famosos'
    )
  },
  {
    id: 'geografia-mundo',
    nome: 'Mundo: Países, Capitais e Lugares',
    jogos: FATOS,
    temas: p(
      'Países do Mundo|Capitais do Mundo|Países da América do Sul|Países da América Central|Países da Europa|Países da Ásia|Países da África|Países da Oceania|Bandeiras do Mundo|Moedas do Mundo|Idiomas do Mundo|Rios do Mundo|Oceanos e Mares|Montanhas do Mundo|Desertos do Mundo|Ilhas do Mundo|Cidades do Mundo|Metrópoles|Maravilhas do Mundo|Monumentos Famosos|Museus do Mundo|Estádios do Mundo|Aeroportos do Mundo|Fusos Horários|Países Pequenos|Países Gigantes|Países sem Litoral|Países Gelados|Países Quentes|Lugares Assombrados|Parques Nacionais do Mundo|Vulcões|Cataratas|Florestas do Mundo|Pontes Famosas|Arranha-Céus|Torres Famosas|Castelos|Cidades Costeiras|Países que Começam com B|Países que Começam com A|Países que Terminam em Stan|Continentes|Polos Norte e Sul|Linha do Equador|Estados dos EUA|Cidades dos EUA|Províncias do Canadá|Países Nórdicos|Países Árabes'
    )
  },
  {
    id: 'animais',
    nome: 'Animais e Pets',
    jogos: TODOS,
    temas: p(
      'Animais|Pets|Cachorros|Raças de Cachorro|Gatos|Raças de Gato|Peixes de Aquário|Hamsters e Roedores|Pássaros de Estimação|Cavalos|Vida Selvagem|Safari Africano|Animais da Amazônia|Animais do Pantanal|Animais Marinhos|Tubarões|Baleias e Golfinhos|Aves|Aves de Rapina|Répteis|Cobras|Jacarés e Crocodilos|Anfíbios|Insetos|Abelhas e Formigas|Borboletas|Aranhas|Animais Gigantes|Animais Pequenos|Animais Rápidos|Animais Noturnos|Animais em Extinção|Dinossauros|Pré-História|Mamíferos|Felinos Selvagens|Primatas|Ursos|Animais Polares|Animais do Deserto|Animais da Fazenda|Animais Venenosos|Animais Fofos|Animais Bizarros|Recordes Animais|Instinto Animal|Migração Animal|Animais que Hibernam|Cuidar de Pet|Veterinário|Passeio com o Cachorro|Adoção de Animais|Zoológico|Aquário Gigante|Fazendinha|Vaquejada e Rodeio|Animais de Desenho|Animais no Futebol|Mascotes Animais'
    )
  },
  {
    id: 'natureza',
    nome: 'Natureza e Planeta',
    jogos: FATOS,
    temas: p(
      'Natureza|Meio Ambiente|Florestas|Plantas e Flores|Árvores Brasileiras|Frutas Tropicais|Hortaliças|Clima e Tempo|Chuva e Tempestade|Furacões e Tornados|Terremotos|Vulcões em Erupção|Oceanos|Geleiras|Aquecimento Global|Reciclagem|Energias Renováveis|Água no Planeta|Rios e Lagos|Cachoeiras|Cavernas|Ilhas Paradisíacas|Estações do Ano|Dia e Noite|Arco-Íris|Neve|Desertos|Montanhas|Minerais e Pedras Preciosas|Jardinagem|Horta em Casa|Plantas Carnívoras|Cogumelos|Florestas Tropicais|Corais|Marés|Raios e Trovões|Eclipses|Aurora Boreal|Placas Tectônicas|Fósseis|Mapas e Bússolas|Estrelas do Céu|Luas do Sistema Solar|Fenômenos Naturais|Desastres Naturais|Biodiversidade|Ecossistemas'
    )
  },
  {
    id: 'corpo-humano',
    nome: 'Corpo Humano e Curiosidades',
    jogos: FATOS,
    temas: p(
      'Corpo Humano|Ossos e Músculos|Cérebro|Coração|Pulmões|Sentidos|Olhos e Visão|Ouvidos e Audição|Pele|Dentes|Cabelo e Unhas|Sangue|Digestão|Sono e Sonhos|Crescimento|Bebês|Envelhecimento|Órgãos Internos|Esqueleto|Curiosidades do Corpo|Recordes do Corpo Humano|Reflexos|Esportistas e Corpo|Alimentação Saudável|Vitaminas|Exercício Físico|Primeiros Socorros|Vacinas|Mitos sobre o Corpo|Emoções|Memória|Cócegas e Espirros|Soluço e Bocejo|Digitais|Altura e Peso|Idade e Longevidade|Sinais Vitais|Respiração|Gestação|Células|DNA e Genética|Sistema Imunológico'
    )
  },
  {
    id: 'ciencia-tech',
    nome: 'Ciência e Tecnologia',
    jogos: FATOS,
    temas: p(
      'Ciência|Física do Dia a Dia|Química do Dia a Dia|Biologia|Matemática Curiosa|Inventores|Invenções que Mudaram o Mundo|Cientistas Famosos|Prêmio Nobel|Laboratório|Experimentos Caseiros|Elementos Químicos|Tabela Periódica|Eletricidade|Magnetismo|Luz e Cores|Som e Ruído|Energia|Átomos|Robótica|Inteligência Artificial|Computadores|Internet|Redes Sociais|Smartphones|Aplicativos|Programação|Videogames e Tecnologia|Drones|Carros Elétricos|Realidade Virtual|Gadgets|Câmeras e Fotografia|Satélites|Telecomunicações|Cabos e Conectores|Computação Antiga|Marcos da Tecnologia|Big Techs|Segurança Digital|Golpes Online|Criptomoedas|Streaming|Jogos Online|Trens e Aviões|Engenharia|Arquitetura|Pontes e Túneis|Medidas e Unidades|Números Famosos|Geometria|Lógica e Charadas|Enigmas'
    )
  },
  {
    id: 'espaco',
    nome: 'Espaço e Universo',
    jogos: FATOS,
    temas: p(
      'Espaço|Sistema Solar|Planetas|Luas|Sol|Estrelas|Galáxias|Buracos Negros|Cometas e Asteroides|Astronautas|Missões à Lua|Missões a Marte|Estação Espacial|Foguetes|Satélites Artificiais|Telescópios|Constelações|Eclipses|Big Bang|Vida Extraterrestre|Exploração Espacial|Corrida Espacial|Agências Espaciais|Cães e Animais no Espaço|Viagem no Tempo|Gravidade|Distâncias Cósmicas|Nebulosas|Superlua|Chuva de Meteoros|Planetas Anões|Cinturão de Asteroides|Mistérios do Espaço|Recordes Espaciais|Filmes de Espaço|Turismo Espacial|Astrologia e Signos|Signos do Zodíaco|Horóscopo'
    )
  },
  {
    id: 'historia',
    nome: 'História e Curiosidades Históricas',
    jogos: FATOS,
    temas: p(
      'História|História do Brasil|Descobrimento do Brasil|Império Brasileiro|República Brasileira|Presidentes do Brasil|Ditadura e Redemocratização|Independência do Brasil|Escravidão e Abolição|Era Vargas|Copa de 1950|Bandeirantes|Cangaço|Ciclo do Ouro|Ciclo da Borracha|Fundação das Cidades|História Antiga|Egito Antigo|Roma Antiga|Grécia Antiga|Idade Média|Cavaleiros e Castelos|Vikings|Renascimento|Grandes Navegações|Revolução Francesa|Revolução Industrial|Primeira Guerra Mundial|Segunda Guerra Mundial|Guerra Fria|Queda do Muro de Berlim|Reis e Rainhas|Imperadores|Faraós|Piratas|Descobertas Históricas|Invenções Antigas|Impérios Antigos|Maias e Astecas|Incas|Civilizações Perdidas|Líderes Históricos|Mulheres na História|Frases Históricas|Viagens de Exploração|Pirâmides|Muralhas e Fortalezas|Século XX|Anos 20|Anos 50|Anos 60|Anos 70|Anos 80|Moda ao Longo do Tempo|Música ao Longo do Tempo|Esportes ao Longo do Tempo|Curiosidades de Museu'
    )
  },
  {
    id: 'filmes',
    nome: 'Filmes e Cinema',
    jogos: TODOS,
    temas: p(
      'Filmes|Cinema Clássico|Blockbusters|Filmes de Ação|Filmes de Comédia|Filmes de Terror|Filmes de Suspense|Filmes de Ficção Científica|Filmes de Fantasia|Filmes de Aventura|Filmes de Animação|Filmes Brasileiros|Filmes Nacionais de Sucesso|Filmes de Super-Heróis|Filmes de Guerra|Filmes de Romance|Filmes de Drama|Documentários|Filmes de Época|Filmes de Natal|Filmes de Férias|Filmes de Sessão da Tarde|Filmes de Vídeo Locadora|Franquias de Cinema|Sequências Famosas|Remakes|Vilões do Cinema|Heróis do Cinema|Atores e Atrizes|Diretores Famosos|Trilhas Sonoras|Oscar|Festival de Cannes|Cenas Inesquecíveis|Frases de Filmes|Efeitos Especiais|Dublagem|Pipoca e Cinema|Sala de Cinema|Pré-Estreia|Bilheteria|Filmes com Final Surpreendente|Filmes Inspirados em Fatos Reais|Filmes de Esporte|Filmes de Música|Filmes de Pirata|Filmes de Dinossauros|Filmes de Tubarão|Filmes de Carro|Comédias Românticas|Filmes Cult|Filmes de Terror Clássicos|Filmes de Assalto|Filmes de Espionagem'
    )
  },
  {
    id: 'series',
    nome: 'Séries e Streaming',
    jogos: TODOS,
    temas: p(
      'Séries|Séries de Comédia|Séries de Drama|Séries de Suspense|Séries de Terror|Séries de Fantasia|Séries de Ficção Científica|Séries Policiais|Séries Médicas|Séries Jurídicas|Séries Adolescentes|Séries Brasileiras|Séries Coreanas|Séries Espanholas|Séries Britânicas|Séries Clássicas|Sitcoms|Séries da Netflix|Séries da HBO|Séries do Prime Video|Séries da Disney+|Maratona de Séries|Final de Série|Spoiler|Personagens de Série|Vilões de Série|Casais de Série|Temporadas Longas|Séries Canceladas|Reboot de Série|Spin-offs|Cenas de Série|Abertura de Série|Fandom e Teorias|Dorama|Reality Shows de Streaming|Documentários de Streaming|Catálogo de Streaming|Perfil Compartilhado|Senha Emprestada|Assinatura Cara|Recomendações de Série|Série Mais Longa|Séries de Época|Séries de Crime|Séries Infantis|Séries Antigas'
    )
  },
  {
    id: 'tv-novelas',
    nome: 'TV, Novelas e Reality Shows',
    jogos: TODOS,
    temas: p(
      'Novelas|Novelas Clássicas|Vilões de Novela|Mocinhas de Novela|Cenas de Novela|Final de Novela|Quem Matou na Novela|Casais de Novela|Frases de Novela|Aberturas de Novela|Trilhas de Novela|Atores de Novela|Novelas Mexicanas|Novelas das Seis|Novelas das Sete|Novelas das Nove|Reality Shows|Big Brother|Paredão|Prova do Líder|Fazenda de Reality|Reality de Culinária|Reality de Dança|Reality de Música|Reality de Encontros|Programas de Auditório|Programas de Domingo|Programas de Humor|Humoristas|Quadros de Humor|Programas Infantis|Apresentadores|Programa de Calouros|Telejornais|Previsão do Tempo|Chamadas de TV|Comerciais Marcantes|Jingles|Propagandas Antigas|TV a Cabo|Canal Aberto|Programação de TV|Sessão da Tarde|Novela Reprise|Celebridades|Fofocas de Celebridades|Famosos e Polêmicas|Famosos Brasileiros|Cantores que Viraram Atores|Apresentadoras|Programas de Culinária|Game Shows|Programa de Perguntas|Quiz na TV|Paródias'
    )
  },
  {
    id: 'musica-br',
    nome: 'Música Brasileira',
    jogos: TODOS,
    temas: p(
      'Música Brasileira|Sertanejo|Sertanejo Universitário|Sertanejo Raiz|Pagode|Samba|Samba-Enredo|Bossa Nova|MPB|Axé|Forró|Piseiro|Funk Brasileiro|Rap Nacional|Rock Nacional|Pop Nacional|Brega|Tecnobrega|Música Gospel|Música Infantil|Marchinhas de Carnaval|Músicas de São João|Duplas Sertanejas|Cantores Brasileiros|Cantoras Brasileiras|Bandas Brasileiras|Hits do Verão|Hits de Carnaval|Músicas de Karaokê|Karaokê Brasileiro|Músicas de Boteco|Músicas de Churrasco|Músicas de Churrasco e Pagode|Músicas de Festa|Músicas de Casamento|Músicas de Dor de Cotovelo|Sofrência|Músicas de Churrasco Antigo|Músicas Românticas|Festivais de Música|Rock in Rio|Lollapalooza Brasil|Shows e Turnês|Instrumentos Brasileiros|Violão e Viola|Percussão|Sanfona|Compositores|Letras Marcantes|Refrões Grudentos|Músicas Tema de Copa|Músicas de Futebol|Trilha de Novela|Programas de Música|Rádio FM|Rádios Antigas|Disco e Vinil|CDs Antigos|Fita Cassete'
    )
  },
  {
    id: 'musica-pop',
    nome: 'Música Pop, Rock e Mundial',
    jogos: TODOS,
    temas: p(
      'Música|Música Pop|Pop Internacional|Rock Clássico|Rock Alternativo|Heavy Metal|Punk|Grunge|Hip Hop|Trap|Música Eletrônica|DJs Famosos|Reggaeton|K-Pop|Música Latina|Country|Blues|Jazz|Soul e R&B|Disco Music|Música Clássica|Ópera|Trilhas de Cinema|Bandas Lendárias|Cantores Lendários|Divas do Pop|Boy Bands|Girl Groups|Bandas dos Anos 80|Bandas dos Anos 90|Hits dos Anos 2000|Hits de Hoje|Hits do TikTok|Músicas Virais|Músicas Chiclete|Álbuns Famosos|Turnês Históricas|Festivais Internacionais|Grammy|Clipes Famosos|Instrumentos Musicais|Guitarra|Bateria|Piano|Teclado|Dueto Famoso|Covers|Músicas Tristes|Músicas de Academia|Playlist de Viagem|Playlist de Festa|Playlist de Estudo|Streaming de Música|Fones de Ouvido|Shows ao Vivo|Karaokê Internacional|Músicas em Inglês|Letras Mal Entendidas'
    )
  },
  {
    id: 'games',
    nome: 'Games e Cultura Geek',
    jogos: TODOS,
    temas: p(
      'Games|Videogames Clássicos|Consoles|Atari e Master System|Super Nintendo|Mega Drive|PlayStation|Xbox|Nintendo|Game Boy|Fliperama|Jogos de Luta|Jogos de Corrida|Jogos de Plataforma|Jogos de Tiro|Jogos de Aventura|Jogos de RPG|Jogos de Estratégia|Jogos de Esporte|Jogos de Futebol|Jogos de Terror|Jogos de Mundo Aberto|Jogos Mobile|Jogos de Cartas|Jogos de Tabuleiro|Battle Royale|MOBA|Minecraft|Fortnite|Pokémon|Mario|Zelda|Sonic|Street Fighter|Mortal Kombat|FIFA e EA FC|GTA|The Sims|Among Us|League of Legends|Counter-Strike|Free Fire|Roblox|Personagens de Games|Vilões de Games|Trilhas de Games|Cheats e Códigos|Fases Impossíveis|Chefes Difíceis|Speedrun|E-sports e Torneios|Streamers e Lives|Gamers Famosos|Lan House|Controle Quebrado|Jogo Viciante|Jogos Indie|Jogos Retrô|Colecionáveis Geek|Nostalgia Gamer|Cultura Geek|RPG de Mesa|Card Games|Quebra-Cabeça|Jogos de Palavras'
    )
  },
  {
    id: 'animes-herois',
    nome: 'Animes, Quadrinhos e Super-Heróis',
    jogos: TODOS,
    temas: p(
      'Animes|Animes Clássicos|Animes de Luta|Animes de Esporte|Animes de Aventura|Animes de Romance|Animes de Terror|Mangás|Personagens de Anime|Vilões de Anime|Aberturas de Anime|Dragon Ball|Naruto|One Piece|Pokémon Anime|Cavaleiros do Zodíaco|Digimon|Bleach|Attack on Titan|Demon Slayer|Studio Ghibli|Super-Heróis|Heróis da Marvel|Heróis da DC|Vingadores|Liga da Justiça|Vilões Clássicos|X-Men|Homem-Aranha|Batman|Superman|Quadrinhos|Gibis Brasileiros|Turma da Mônica|HQs Clássicas|Heróis Brasileiros|Poderes de Super-Herói|Origens de Heróis|Uniformes de Heróis|Frases de Heróis|Universos Cinematográficos|Séries de Heróis|Cosplay|Convenções Geek|Colecionar Figuras|Action Figures|Capas de Revista|Fantasia e Magia|Harry Potter|Senhor dos Anéis|Star Wars|Star Trek|Game of Thrones|Percy Jackson|Jogos Vorazes|Crepúsculo|Livros Adaptados|Sagas Literárias'
    )
  },
  {
    id: 'desenhos',
    nome: 'Desenhos e Infância',
    jogos: TODOS,
    temas: p(
      'Desenhos Animados|Desenhos Clássicos|Desenhos dos Anos 90|Desenhos dos Anos 2000|Desenhos Brasileiros|Desenhos da Disney|Filmes da Pixar|Cartoon Network|Nickelodeon|Desenhos de Sábado de Manhã|Personagens de Desenho|Vilões de Desenho|Duplas de Desenho|Bichinhos de Desenho|Princesas|Príncipes|Fadas e Bruxas|Dinossauros de Desenho|Super-Heróis de Desenho|Desenhos de Luta|Desenhos de Aventura|Desenhos de Comédia|Desenhos Educativos|Programas Infantis|Palhaços e Circo|Música Infantil|Cantigas de Roda|Histórias de Ninar|Contos de Fadas|Fábulas|Sítio do Picapau Amarelo|Turma da Mônica Infância|Chaves|Chapolin|Chaves e Turma|Carrossel|Mundo Bita|Peppa Pig|Patrulha Canina|Bob Esponja|Os Simpsons|Pica-Pau|Tom e Jerry|Looney Tunes|Scooby-Doo|Hanna-Barbera|Brinquedos Antigos|Bonecas e Bonecos|Carrinhos|Lego|Pelúcias|Álbum de Figurinhas Infantil|Brinquedos de Parquinho|Parque de Diversões'
    )
  },
  {
    id: 'nostalgia',
    nome: 'Nostalgia Anos 80, 90 e 2000',
    jogos: TODOS,
    temas: p(
      'Anos 90 & 2000|Infância Brasileira|Nostalgia Anos 90|Nostalgia Anos 2000|Nostalgia Anos 80|Brinquedos dos Anos 90|Tamagotchi|Fliperama e Ficha|Walkman e Discman|Fita VHS|Locadora de Vídeo|Telefone de Disco|Orelhão e Ficha|Orkut|MSN Messenger|Fotolog|MySpace|Chats Antigos|Celular Tijolão|Toques Polifônicos|Bluetooth Antigo|Pen Drive e CD|Disquete|Lan House Anos 2000|Revistas de Fofoca|Revistas de Adolescentes|Pôsteres de Quarto|Álbum de Figurinhas Antigo|Chiclete com Tatuagem|Refrigerantes Antigos|Doces Antigos|Salgadinhos Antigos|Propagandas dos Anos 90|Carros dos Anos 90|Moda dos Anos 90|Moda dos Anos 2000|Cortes de Cabelo Antigos|Gírias Antigas|Músicas dos Anos 90|Músicas dos Anos 2000|Novelas dos Anos 90|Programas de TV Antigos|Programas de Auditório Antigos|Filmes dos Anos 90|Desenhos dos Anos 90 Nostalgia|Bandas de Escola|Festinhas da Escola|Cartas de Amor Antigas|Bilhetinhos|Carta e Selo|Fotos Reveladas|Câmera Descartável|Coleção de Selos|Álbuns de Fotografia'
    )
  },
  {
    id: 'internet-memes',
    nome: 'Internet, Memes e Redes Sociais',
    jogos: TODOS,
    temas: p(
      'Memes & Internet|Memes Brasileiros|Memes Clássicos|Memes de Futebol|Memes de Novela|Memes de Reality|Vídeos Virais|Challenge do TikTok|Dancinhas do TikTok|Influenciadores|Youtubers|Streamers|Podcasts|Canais de YouTube|Gírias da Internet|Emojis|Figurinhas de WhatsApp|Áudios de WhatsApp|Grupos de WhatsApp|Fofocas de Grupo|Status e Stories|Instagram|TikTok|Twitter e X|Kwai|Facebook Antigo|LinkedIn Engraçado|Comentários Engraçados|Cancelamentos|Polêmicas da Internet|Fake News|Golpes de Internet|Trends|Hashtags|Selfies|Filtros|Fotos de Perfil|Bios Engraçadas|Notificações Sem Fim|Curtidas|Seguidores|Unfollow|Spoiler nas Redes|Fandoms|Tretas Online|Crossovers de Memes|Vídeos Antigos do YouTube|Compilação de Fails|Pegadinhas|Vídeos de Gatinhos|Vídeos de Cachorros|Lives Famosas|Cortes de Live|Reagindo na Live|Avatares|Stickers|GIFs Famosos|Shitposting'
    )
  },
  {
    id: 'marcas',
    nome: 'Marcas e Consumo',
    jogos: TODOS,
    temas: p(
      'Marcas Famosas|Marcas de Refrigerante|Marcas de Cerveja|Marcas de Chocolate|Marcas de Biscoito|Marcas de Salgadinho|Marcas de Sorvete|Marcas de Fast Food|Redes de Supermercado|Lojas de Departamento|Marcas de Roupa|Marcas de Tênis|Marcas de Esporte|Marcas de Celular|Marcas de Carro|Marcas de Moto|Marcas de Computador|Marcas de Videogame|Marcas de Brinquedo|Marcas de Beleza|Marcas de Perfume|Marcas de Shampoo|Marcas de Sabão|Marcas de Eletrodoméstico|Marcas de TV|Marcas de Cereal|Marcas de Café|Marcas de Leite|Marcas de Iogurte|Marcas de Macarrão|Marcas de Molho|Marcas de Tempero|Slogans Famosos|Logotipos|Cores de Marcas|Propagandas Famosas|Mascotes de Marcas|Embalagens Icônicas|Marcas Antigas|Marcas que Faliram|Marcas Brasileiras|Marcas Internacionais|Lojas de Rua|Shopping|Praça de Alimentação|Liquidações|Black Friday|Promoção Imperdível|Carrinho de Compras|Cupons de Desconto|Troca de Presentes|Lojas Online'
    )
  },
  {
    id: 'carros-transito',
    nome: 'Carros, Motos e Trânsito',
    jogos: TODOS,
    temas: p(
      'Carros & Trânsito|Carros Antigos|Carros Populares|Carros de Luxo|Carros Esportivos|Carros Elétricos|SUVs e Picapes|Fusca|Kombi|Marcas de Carro|Modelos Brasileiros|Montadoras|Motos|Marcas de Moto|Motoboys|Bicicletas|Patinetes|Ônibus|Metrô|Trem|Táxi e Aplicativo|Caminhoneiros|Estrada e Rodovia|Pedágios|Postos de Gasolina|Manutenção do Carro|Mecânico|Oficina|Pneu Furado|Bateria Descarregada|Placa de Carro|Multas|Carteira de Habilitação|Autoescola|Baliza|Estacionamento|Flanelinha|Trânsito Parado|Rodízio|Placas de Trânsito|Semáforos|Buzinadas|Motorista de Aplicativo|Carona|Viagem de Carro|Som Automotivo|Tuning|Corridas de Rua|Autódromos|Fórmula 1 e Carros|Museus de Carros|Carros de Filmes|Carros de Desenho|Carros Raros|Carros que Quebram|Carro da Família'
    )
  },
  {
    id: 'moda-beleza',
    nome: 'Moda e Beleza',
    jogos: SOCIAL,
    temas: p(
      'Moda|Moda dos Anos 90|Tendências de Moda|Roupas de Festa|Roupas de Academia|Roupas de Praia|Roupas de Frio|Tênis de Coleção|Sapatos|Chinelos|Acessórios|Óculos|Relógios|Bolsas|Joias e Bijuterias|Perfumes|Maquiagem|Skincare|Cortes de Cabelo|Cabelos Coloridos|Salão de Beleza|Barbearia|Unhas|Tatuagens|Piercings|Looks de Celebridades|Desfiles|Semana de Moda|Estilistas|Estilo de Cada Signo|Estilos Musicais e Roupas|Roupa Nova no Armário|Armário Cheio sem Roupa|Fashion Fails|Provador|Liquidação de Roupas|Brechó|Roupa Íntima|Pijamas|Uniformes|Fantasias|Looks de Casamento|Looks de Entrevista|Looks de Date|Beleza Natural|Cuidados com a Pele|Protetor Solar|Bronzeado|Barba e Bigode|Penteados|Moda Infantil'
    )
  },
  {
    id: 'profissoes',
    nome: 'Profissões e Mundo do Trabalho',
    jogos: TODOS,
    temas: p(
      'Profissões|Profissões Estranhas|Profissões do Futuro|Profissões de Saúde|Médicos|Enfermeiros|Dentistas|Professores|Policiais|Bombeiros|Advogados|Juízes|Engenheiros|Arquitetos|Programadores|Designers|Jornalistas|Repórteres|Narradores|Comentaristas|Fotógrafos|Cozinheiros|Garçons|Barbeiros|Cabeleireiros|Mecânicos|Pedreiros|Eletricistas|Encanadores|Motoristas|Pilotos|Comissários de Bordo|Caminhoneiros|Entregadores|Vendedores|Atendentes|Seguranças|Porteiros|Faxineiros|Agricultores|Pescadores|Artistas|Músicos|Atores|Dubladores|Youtubers e Criadores|Atletas|Árbitros|Técnicos de Futebol|Professores de Educação Física|Cientistas|Astronautas|Empresários|Banqueiros|Contadores|Publicitários|Garis|Carteiros|Padeiros|Açougueiros'
    )
  },
  {
    id: 'folclore-mitos',
    nome: 'Folclore, Mitologia e Lendas',
    jogos: TODOS,
    temas: p(
      'Folclore Brasileiro|Lendas Urbanas|Lendas do Futebol|Saci-Pererê|Curupira|Iara e Boto|Mula Sem Cabeça|Lobisomem|Bumba Meu Boi|Mitologia Grega|Deuses Gregos|Heróis Gregos|Monstros Mitológicos|Mitologia Nórdica|Mitologia Egípcia|Mitologia Romana|Mitologia Indígena|Lendas Medievais|Reino Mágico|Criaturas Fantásticas|Dragões|Fadas|Bruxas|Vampiros|Zumbis|Fantasmas|Casas Assombradas|Superstições|Crendices Populares|Simpatias|Sorte e Azar|Trevo de Quatro Folhas|Gato Preto|Sexta-Feira 13|Mau-Olhado|Horóscopo|Signos|Tarô e Cartas|Mistérios Não Resolvidos|Triângulo das Bermudas|Ovnis|Pé-Grande|Monstro do Lago Ness|Contos Populares|Parlendas|Trava-Línguas|Provérbios|Ditados Populares|Frases de Vó|Histórias de Assombração'
    )
  },
  {
    id: 'festas-datas',
    nome: 'Festas, Datas e Tradições',
    jogos: TODOS,
    temas: p(
      'Feriados do Brasil|Feriadão|Carnaval de Rua|Carnaval de Salvador|Carnaval do Rio|Folia de Momo|Páscoa|Semana Santa|Tiradentes|Dia do Trabalhador|Festa Junina|São João|Festas Populares|Parintins|Círio de Nazaré|Oktoberfest|Réveillon na Praia|Pular Ondas|Ceia de Natal|Papai Noel|Árvore de Natal|Amigo Oculto|Dia dos Namorados|Dia das Mães|Dia dos Pais|Dia das Crianças|Halloween|Dia de Finados|Festas de Fim de Ano|Festa de Aniversário|Festa de 15 Anos|Festa de Casamento|Festa de Formatura|Festa de Firma|Festa de Condomínio|Festa Universitária|Rodeio|Festival de Música|Festival de Inverno|Feira do Livro|Festival de Cinema|Bienal|Show de Fogos|Fogos de Artifício|Lanterna e Balões|Procissões|Tradições de Ano Novo|Simpatia de Réveillon|Roupa Branca no Réveillon|Lentilha e Uvas|Natal em Família|Natal com Amigos'
    )
  },
  {
    id: 'dinheiro-negocios',
    nome: 'Dinheiro, Economia e Negócios',
    jogos: FATOS.concat(['nota']),
    temas: p(
      'Dinheiro|Moedas e Cédulas|Notas do Real|Plano Real|Inflação|Preço de Tudo|Salário Mínimo|Poupança|Investimentos|Bolsa de Valores|Ações Famosas|Bancos|Fintechs|Pix|Cartão de Débito|Cartão de Crédito Brasileiro|Seguro|Imposto|Loteria|Mega-Sena|Bilhões e Bilionários|Empresas Gigantes|Startups|Franquias|Lojas Famosas|Shoppings|Comércio de Rua|Camelô|Feira Livre Preços|Empreendedores|Negócios Familiares|Criptomoedas e Bitcoin|Economia Doméstica|Pechinchar|Desconto à Vista|Cheque Especial|Dívida Antiga|Aluguel Caro|Preço do Combustível|Preço da Carne|Preço do Café|Preço do Ingresso|Preço da Cerveja|Ingressos de Show|Cartão Fidelidade|Cashback|Milhas Aéreas|Leilão|Casa de Câmbio|Feira de Troca|Brechós e Usados|Vender na Internet'
    )
  },
  {
    id: 'terror-misterio',
    nome: 'Terror, Mistério e Suspense',
    jogos: TODOS,
    adulto: true,
    temas: p(
      'Filmes de Terror Clássicos|Assassinos de Cinema|Monstros Clássicos|Casas Mal-Assombradas|Lendas Urbanas Assustadoras|Crimes Famosos|Detetives|Sherlock Holmes|Investigações Famosas|Mistérios Históricos|Desaparecimentos Famosos|Ilhas Misteriosas|Cidades Fantasma|Cemitérios|Fantasmas Famosos|Jogos de Terror Clássicos|Livros de Terror|Contos de Horror|Halloween e Fantasias|Sustos de Infância|Escuro e Medos|Medo de Altura|Medo de Barata|Medo de Palhaço|Medo de Agulha|Medo de Cobra|Maiores Medos|Suspense Policial|Séries de Crime|Documentários de Crime|Mistérios do Oceano|Mistérios do Espaço Sombrio|Teorias da Conspiração|Superstições Assustadoras|Noite de Terror|Acampamento Assustador|Filme que Dá Medo|Sustos Falsos|Pegadinha de Susto|Escape Room|Salas de Enigma'
    )
  },
  {
    id: 'bizarros-recordes',
    nome: 'Bizarros, Recordes e Guinness',
    jogos: FATOS.concat(['nota']),
    temas: p(
      'Guinness e Bizarros|Recordes Mundiais|Recordes Brasileiros|Maiores do Mundo|Menores do Mundo|Mais Rápidos do Mundo|Mais Caros do Mundo|Mais Altos do Mundo|Mais Antigos do Mundo|Mais Pesados do Mundo|Mais Longos do Mundo|Fatos Bizarros|Curiosidades Inúteis|Coincidências Incríveis|Coisas Esquisitas|Invenções Malucas|Leis Estranhas|Profissões Bizarras|Comidas Estranhas|Esportes Bizarros|Festivais Estranhos|Competições Malucas|Desafios Extremos|Desafios de Comer|Recordes de Comida|Recordes de Esporte|Recordes de Natureza|Recordes de Tecnologia|Recordes de Cinema|Recordes de Música|Recordes de Games|Recordes de Futebol|Recordes Olímpicos|Recordes de Altura|Recordes de Velocidade|Recordes de Idade|Casos Insólitos|Notícias Estranhas|Fatos Históricos Bizarros|Acontecimentos Inacreditáveis|Surpresas da Natureza|Objetos Mais Estranhos|Leilões Estranhos|Coleções Estranhas|Mitos e Verdades|Verdade ou Mito|Você Sabia|Curiosidades Gerais'
    )
  },
  {
    id: 'humor-confissoes',
    nome: 'Humor, Confissões e Verdades da Roda',
    jogos: ['nota', 'perguntas-e-verdades', 'tem-ou-nao-tem', 'proibido'],
    adulto: true,
    temas: p(
      'Verdades da Roda|Confissões de Amigos|Vergonhas Passadas|Mico em Público|Mentiras Inocentes|Desculpas Esfarrapadas|Coisas que Todo Mundo Faz|Manias Estranhas|Hábitos Esquisitos|Medos Bobos|Sonhos Estranhos|Crushes Antigos|Primeiro Beijo|Primeira Vez que|Pior Presente|Melhor Presente|Pior Chefe|Pior Date|Pior Viagem|Pior Comida|Melhor Comida|Pior Cantada|Maior Fofoca|Maior Susto|Maior Vergonha|Maior Mentira|Pior Ideia|Melhor Ideia|Coisa que Nunca Contou|Segredo de Infância|Apelido Vergonhoso|Pior Corte de Cabelo|Pior Foto|Pior Mensagem Enviada|Mensagem para o Grupo Errado|Áudio Enviado Sem Querer|Bebida Demais|Ressaca Memorável|Noite Inesquecível|Mico de Aniversário|Quem Mais Provavelmente|Verdade ou Desafio|Eu Nunca|Quem Seria Capaz|Se Eu Fosse Rico|Se Eu Fosse Presidente|Se Eu Fosse Invisível|Se Eu Ganhasse na Loteria|Desculpa para Faltar|Mentira para Chegar Atrasado'
    )
  },
  {
    id: 'saude-esporte-casa',
    nome: 'Saúde, Academia e Bem-Estar',
    jogos: SOCIAL.concat(['limite']),
    temas: p(
      'Academia|Treino de Peito|Treino de Perna|Personal Trainer|Dieta|Dieta de Segunda|Jejum|Suplementos|Corrida de Rua|Caminhada|Yoga|Pilates|Crossfit|Natação Recreativa|Pedalar|Esportes de Quadra|Churrasco Pós-Treino|Hidratação|Sono Bom|Alongamento|Postura|Dor nas Costas|Cansaço|Meditação|Terapia|Autocuidado|Spa|Massagem|Dia de Descanso|Estresse|Ansiedade do Domingo|Vitaminas e Remédios Caseiros|Chás Caseiros|Receita de Vó para Gripe|Gripe e Resfriado|Alergia|Visita ao Médico|Check-up|Dentista com Medo|Vacina|Pressão Alta|Balança|Fome de Madrugada|Beliscos|Lanche Saudável|Salada|Comida Fit|Marmita Fit|Bebida Fit|Hábitos Saudáveis'
    )
  },
  {
    id: 'pop-cultura-br',
    nome: 'Cultura Pop Brasileira',
    jogos: TODOS,
    temas: p(
      'Cultura Pop Brasileira|Celebridades Brasileiras|Apresentadores Brasileiros|Humoristas Brasileiros|Atores Brasileiros|Atrizes Brasileiras|Cantores Famosos|Escritores Brasileiros|Livros Brasileiros|Poetas Brasileiros|Pintores Brasileiros|Cinema Nacional|Séries Nacionais|Novelas Nacionais|Programas Nacionais|Esportistas Brasileiros|Ídolos do Esporte|Ídolos da Música|Ídolos da TV|Ídolos da Internet|Bordões Brasileiros|Gírias Brasileiras|Expressões Populares|Frases Famosas|Bordões da TV|Slogans Brasileiros|Jingles Brasileiros|Marcas Brasileiras Pop|Comidas Pop do Brasil|Festas Pop do Brasil|Orgulho Brasileiro|Símbolos do Brasil|Hino e Bandeira|Jeitinho Brasileiro|Sotaque Carioca|Sotaque Paulista|Sotaque Mineiro|Sotaque Nordestino|Sotaque Gaúcho|Cultura Popular|Artesanato|Dança Popular|Teatro e Peças|Stand-up Comedy|Circo|Museus do Brasil|Livros Infantis|Revistas Brasileiras|Jornais Antigos'
    )
  },
  {
    id: 'jogos-mesa',
    nome: 'Jogos, Brincadeiras e Passatempos',
    jogos: TODOS,
    temas: p(
      'Jogos de Tabuleiro|Jogos de Cartas|Truco|Uno|Banco Imobiliário|Detetive|War|Xadrez e Damas|Dominó|Baralho|Poker|Bingo|Jogo da Velha|Quebra-Cabeça|Palavras Cruzadas|Caça-Palavras|Sudoku|Charadas|Adivinhações|Mímica|Imagem e Ação|Stop|Forca|Batalha Naval|Pega-Varetas|Pião|Bolinha de Gude Brincadeira|Brincadeiras de Rua Antigas|Brincadeiras de Piscina|Brincadeiras de Praia|Brincadeiras de Festa|Jogos de Grupo|Jogos de Bar|Jogos de Viagem|Jogos de Escritório|Jogos de Carro|Jogos de Dado|Jogos de Palavra|Jogos de Memória|Jogos de Velocidade|Jogos Cooperativos|Jogos Competitivos|Quiz Show|Programas de Perguntas|Gincana|Caça ao Tesouro|Olimpíada de Família|Campeonato de Videogame|Torneio de Truco|Jogo de Sinuca|Pebolim|Air Hockey'
    )
  }
];
