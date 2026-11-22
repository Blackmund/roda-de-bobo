import type { GeoCategoria, GeoLocal, GeoRegiao } from './geoguessBank';

type Place = [id: string, name: string, city: string, lat: number, lon: number, hint: string, scale?: number];
type Country = [country: string, region: GeoRegiao, groups: [GeoCategoria, Place[]][]];

function places([pais, regiao, groups]: Country): GeoLocal[] {
  return groups.flatMap(([category, rows]) => rows.map(([id, nome, city, lat, lon, dica, escala]) => ({
    id, nome: category === 'paises' ? pais : nome,
    lugar: category === 'paises' ? `${nome}, ${city}` : city === nome ? pais : `${city}, ${pais}`,
    aceitas: [], lat, lon, dica, escala, pais, regiao,
    categorias: category === 'patrimonio' || category === 'arquitetura' ? [category, 'pontos-turisticos'] : [category],
    pergunta: category === 'cidades' ? 'cidade' : category === 'paises' ? 'pais' : 'local'
  })));
}

export const GEO_EXPANSION = ([
  ['Brasil','america-do-sul',[
    ['estadios',[
      ['nilton-santos','Estádio Nilton Santos','Rio de Janeiro',-22.8933,-43.2922,'Estádio de atletismo e futebol na Zona Norte'],
      ['sao-januario','São Januário','Rio de Janeiro',-22.8909,-43.2284,'Estádio com fachada histórica'],
      ['castelao','Arena Castelão','Fortaleza',-3.8073,-38.5225,'Grande arena a alguns quilômetros do litoral'],
      ['fonte-nova','Arena Fonte Nova','Salvador',-12.9788,-38.5043,'Arena próxima de um dique'],
      ['arena-ajuan','Arena da Amazônia','Manaus',-3.083,-60.0281,'Estrutura que lembra um cesto trançado'],
      ['arena-dunas','Arena das Dunas','Natal',-5.8261,-35.2127,'Arena de formas curvas no Nordeste'],
      ['mane-garrincha','Mané Garrincha','Brasília',-15.7835,-47.8991,'Anel de colunas perto de um eixo monumental'],
      ['arena-corinthians-recife','Arena de Pernambuco','São Lourenço da Mata',-8.04,-35.0083,'Arena fora do centro da capital'],
      ['ilha-retiro','Ilha do Retiro','Recife',-8.0627,-34.9049,'Estádio entre bairros e canais'],
      ['arruda','Estádio do Arruda','Recife',-8.0269,-34.891,'Arquibancadas de um estádio tradicional'],
      ['frasqueirao','Frasqueirão','Natal',-5.8887,-35.1765,'Arena perto de um bairro de praia'],
      ['barradao','Barradão','Salvador',-12.9175,-38.4273,'Estádio em terreno acidentado'],
      ['serra-dourada','Serra Dourada','Goiânia',-16.6996,-49.2347,'Arquibancadas descobertas no Centro-Oeste'],
      ['couto-pereira','Couto Pereira','Curitiba',-25.4211,-49.2605,'Estádio cercado por ruas residenciais'],
      ['arena-baixada','Arena da Baixada','Curitiba',-25.4482,-49.2769,'Estádio com cobertura retrátil'],
      ['arena-gremio','Arena do Grêmio','Porto Alegre',-29.973,-51.1949,'Arena perto de ilhas e rodovias'],
      ['arena-mrv','Arena MRV','Belo Horizonte',-19.9301,-44.0052,'Arena moderna junto a uma via expressa'],
      ['ressacada','Estádio da Ressacada','Florianópolis',-27.6663,-48.5306,'Estádio perto do aeroporto de uma ilha'],
      ['orlando-scarpelli','Orlando Scarpelli','Florianópolis',-27.5868,-48.5863,'Estádio no lado continental da cidade'],
      ['arruda-campinas','Moisés Lucarelli','Campinas',-22.9147,-47.0536,'Estádio tradicional do interior paulista'],
      ['brinco-ouro','Brinco de Ouro da Princesa','Campinas',-22.9108,-47.0457,'Estádio de clube alviverde do interior'],
      ['rei-pele','Estádio Rei Pelé','Maceió',-9.661,-35.759,'Estádio entre lagoa, bairros e litoral'],
      ['rei-pele-vale','Estádio Raulino de Oliveira','Volta Redonda',-22.508,-44.0956,'Estádio em uma cidade siderúrgica']
    ]],
    ['arquitetura',[
      ['teatro-amazonas','Teatro Amazonas','Manaus',-3.1303,-60.0234,'Uma cúpula colorida no centro histórico'],
      ['catedral-brasilia','Catedral de Brasília','Brasília',-15.7983,-47.8756,'Colunas curvas abertas para o céu'],
      ['congresso-nacional','Congresso Nacional','Brasília',-15.7997,-47.8642,'Duas torres e duas cúpulas distintas'],
      ['igreja-pampulha','Igreja da Pampulha','Belo Horizonte',-19.8584,-43.9745,'Construção curva à beira de uma lagoa'],
      ['catedral-se','Catedral da Sé','São Paulo',-23.5513,-46.6343,'Duas torres perto do marco zero'],
      ['catedral-petropolis','Catedral de Petrópolis','Petrópolis',-22.5056,-43.1786,'Uma torre neogótica em cidade serrana'],
      ['palacio-planalto','Palácio do Planalto','Brasília',-15.7991,-47.8606,'Colunas brancas e uma rampa cerimonial'],
      ['opera-arame','Ópera de Arame','Curitiba',-25.3848,-49.2765,'Estrutura tubular em uma antiga pedreira'],
      ['palacio-cristal','Palácio de Cristal','Petrópolis',-22.5037,-43.1834,'Estrutura de ferro e vidro na serra'],
      ['farol-barra','Farol da Barra','Salvador',-13.0103,-38.5326,'Um farol no alto de um forte à beira-mar']
    ]],
    ['cultura',[
      ['museu-amanha','Museu do Amanhã','Rio de Janeiro',-22.8949,-43.1793,'Estrutura branca avançando sobre a baía'],
      ['museu-ipiranga','Museu do Ipiranga','São Paulo',-23.5858,-46.6098,'Edifício monumental e jardins simétricos'],
      ['pinacoteca-sp','Pinacoteca de São Paulo','São Paulo',-23.5345,-46.6337,'Tijolos aparentes perto de uma estação'],
      ['inhotim','Inhotim','Brumadinho',-20.1248,-44.2194,'Arte contemporânea em um jardim tropical',-1],
      ['teatro-santa-isabel','Teatro de Santa Isabel','Recife',-8.0612,-34.8774,'Teatro neoclássico junto a um rio'],
      ['centro-dragao','Dragão do Mar','Fortaleza',-3.7224,-38.5192,'Centro cultural de passarelas coloridas'],
      ['oscar-niemeyer','Museu Oscar Niemeyer','Curitiba',-25.4104,-49.2682,'Um enorme olho suspenso'],
      ['marco-zero-recife','Marco Zero do Recife','Recife',-8.0631,-34.8711,'Praça circular na borda do porto'],
      ['abadia-monserrat-rio','Mosteiro de São Bento','Rio de Janeiro',-22.8951,-43.1776,'Edifício religioso sobre um morro no centro'],
      ['escadaria-selaron','Escadaria Selarón','Rio de Janeiro',-22.9153,-43.1792,'Degraus revestidos de azulejos coloridos'],
      ['pelourinho','Pelourinho','Salvador',-12.9725,-38.5108,'Sobrados coloridos em ladeiras de pedra']
    ]],
    ['natureza',[
      ['pao-de-acucar','Pão de Açúcar','Rio de Janeiro',-22.9486,-43.1565,'Morro rochoso na entrada de uma baía'],
      ['pedra-gavea','Pedra da Gávea','Rio de Janeiro',-22.9986,-43.2843,'Um bloco rochoso acima da floresta',-1],
      ['chapada-veadeiros','Chapada dos Veadeiros','Alto Paraíso de Goiás',-14.154,-47.807,'Cânions e quedas d’água no Cerrado',-2],
      ['vale-lua','Vale da Lua','Alto Paraíso de Goiás',-14.187,-47.792,'Rochas moldadas pela água em formas arredondadas'],
      ['dunas-genipabu','Dunas de Genipabu','Extremoz',-5.696,-35.204,'Dunas brancas perto do mar'],
      ['pico-bandeira','Pico da Bandeira','Caparaó',-20.434,-41.797,'Pico alto na divisa de dois estados',-1],
      ['dunas-jalapao','Dunas do Jalapão','Mateiros',-10.602,-46.678,'Areia dourada entre serras e vegetação'],
      ['porto-galinhas','Porto de Galinhas','Ipojuca',-8.507,-35.002,'Piscinas naturais formadas por recifes',-1],
      ['jeri','Jericoacoara','Jijoca de Jericoacoara',-2.795,-40.513,'Vila costeira cercada de areia e lagoas',-1],
      ['bonito-gruta','Gruta do Lago Azul','Bonito',-21.146,-56.590,'Água azul intensa dentro de uma caverna'],
      ['parque-tijuca','Parque Nacional da Tijuca','Rio de Janeiro',-22.9565,-43.2788,'Floresta tropical dentro de uma metrópole',-2],
      ['serra-cipo','Serra do Cipó','Santana do Riacho',-19.35,-43.62,'Campos rupestres e riachos em Minas Gerais',-2],
      ['cambara-fortaleza','Cânion Fortaleza','Cambará do Sul',-29.078,-49.956,'Escarpas profundas em uma serra do Sul',-2]
    ]],
    ['infraestrutura',[
      ['itaipu','Usina de Itaipu','Foz do Iguaçu',-25.408,-54.588,'Barragem enorme na fronteira de dois países',-1],
      ['tucurui','Usina de Tucuruí','Tucuruí',-3.832,-49.645,'Uma barragem no rio Tocantins',-1],
      ['aero-galeao','Aeroporto do Galeão','Rio de Janeiro',-22.81,-43.25,'Pistas e terminais numa ilha',-1],
      ['aero-guarulhos','Aeroporto de Guarulhos','Guarulhos',-23.432,-46.469,'Dois longos eixos paralelos de pouso',-1],
      ['aero-santos-dumont','Aeroporto Santos Dumont','Rio de Janeiro',-22.910,-43.163,'Pista curta cercada de água'],
      ['porto-santos','Porto de Santos','Santos',-23.951,-46.303,'Contêineres às margens de um estuário',-2],
      ['ponte-estaiada-sp','Ponte Octávio Frias de Oliveira','São Paulo',-23.612,-46.699,'Duas pistas curvas penduradas num mastro'],
      ['elevador-lacerda','Elevador Lacerda','Salvador',-12.974,-38.513,'Liga partes alta e baixa de uma cidade'],
      ['ponte-jk','Ponte JK','Brasília',-15.823,-47.83,'Três arcos atravessando um lago'],
      ['estacao-central-brasil','Central do Brasil','Rio de Janeiro',-22.9036,-43.1916,'Estação com torre alta e relógio']
    ]],
    ['lugares-comuns',[
      ['mercado-ver-o-peso','Mercado Ver-o-Peso','Belém',-1.4505,-48.5034,'Mercado à beira d’água com torres metálicas'],
      ['mercado-sao-jose','Mercado de São José','Recife',-8.0694,-34.8779,'Um mercado de ferro numa praça movimentada'],
      ['parque-ibirapuera','Parque Ibirapuera','São Paulo',-23.5874,-46.6576,'Lagos e pavilhões entre grandes avenidas',-1],
      ['lagoa-rodrigo','Lagoa Rodrigo de Freitas','Rio de Janeiro',-22.9718,-43.2123,'Espelho d’água entre bairros e morros',-1],
      ['campo-santana','Campo de Santana','Rio de Janeiro',-22.9061,-43.1899,'Jardim histórico cercado por ruas movimentadas'],
      ['aterro-flamengo','Aterro do Flamengo','Rio de Janeiro',-22.9274,-43.1705,'Parque linear na orla com pistas curvas',-1],
      ['parque-barigui','Parque Barigui','Curitiba',-25.4269,-49.3118,'Lago urbano com capivaras e pista de caminhada'],
      ['parque-jardim-botanico','Jardim Botânico de Curitiba','Curitiba',-25.4427,-49.2397,'Estufa de vidro e canteiros geométricos'],
      ['mercado-publico-poa','Mercado Público de Porto Alegre','Porto Alegre',-30.0277,-51.2282,'Mercado antigo entre o cais e uma praça'],
      ['parque-redencao','Parque Farroupilha','Porto Alegre',-30.0362,-51.2165,'Parque de alamedas perto de uma universidade'],
      ['estacao-das-docas','Estação das Docas','Belém',-1.4478,-48.5031,'Armazéns do porto transformados em passeio'],
      ['ponta-negra-manaus','Praia da Ponta Negra','Manaus',-3.0641,-60.1066,'Orla urbana voltada para um rio escuro']
    ]],
    ['cidades',[
      ['cidade-ouro-preto','Ouro Preto','Ouro Preto',-20.385,-43.503,'Casario colonial em ladeiras da serra',-1],
      ['cidade-paraty','Paraty','Paraty',-23.219,-44.713,'Ruas de pedra em um centro junto ao mar',-1],
      ['cidade-olinda','Olinda','Olinda',-8.014,-34.849,'Igrejas e casario em morros junto ao litoral',-1],
      ['cidade-curitiba','Curitiba','Curitiba',-25.431,-49.272,'Capital do Sul conhecida por parques',-1],
      ['cidade-manaus','Manaus','Manaus',-3.134,-60.023,'Metrópole às margens de um rio escuro',-1],
      ['cidade-belem','Belém','Belém',-1.453,-48.503,'Capital estuarina com mercados perto da água',-1],
      ['cidade-porto-alegre','Porto Alegre','Porto Alegre',-30.03,-51.227,'Capital com cais e pôr do sol à beira d’água',-1],
      ['cidade-natal','Natal','Natal',-5.771,-35.2,'Capital litorânea cercada de dunas',-1],
      ['cidade-joao-pessoa','João Pessoa','João Pessoa',-7.12,-34.88,'Capital perto do extremo leste continental',-1],
      ['cidade-sao-luis','São Luís','São Luís',-2.529,-44.305,'Centro histórico conhecido por azulejos',-1],
      ['cidade-tiradentes','Tiradentes','Tiradentes',-21.11,-44.176,'Casario baixo ao pé da Serra de São José',-1],
      ['cidade-gramado','Gramado','Gramado',-29.38,-50.875,'Cidade serrana de arquitetura de influência europeia',-1],
      ['cidade-foz','Foz do Iguaçu','Foz do Iguaçu',-25.547,-54.588,'Cidade brasileira em uma tríplice fronteira',-1],
      ['cidade-porto-velho','Porto Velho','Porto Velho',-8.763,-63.903,'Capital à margem de um rio amazônico',-1],
      ['cidade-rio-branco','Rio Branco','Rio Branco',-9.975,-67.824,'Capital dividida por um rio sinuoso',-1],
      ['cidade-palmas','Palmas','Palmas',-10.184,-48.334,'Capital planejada na margem de um reservatório',-1]
    ]]
  ]],
  ['Argentina','america-do-sul',[
    ['estadios',[
      ['bombonera','La Bombonera','Buenos Aires',-34.6356,-58.3647,'Arquibancadas angulosas de um estádio portenho'],
      ['monumental-nunez','Estádio Monumental de Núñez','Buenos Aires',-34.5453,-58.4498,'Estádio de uma final mundial na Argentina'],
      ['cilindro','Estádio Presidente Perón','Avellaneda',-34.6675,-58.3687,'Arena circular muito próxima de outra']
    ]],
    ['natureza',[
      ['perito-moreno','Glaciar Perito Moreno','Santa Cruz',-50.49,-73.05,'Uma parede de gelo avançando sobre um lago',-2],
      ['aconcagua','Aconcágua','Mendoza',-32.653,-70.011,'Cume andino de grande altitude',-2]
    ]],
    ['arquitetura',[
      ['obelisco-ba','Obelisco de Buenos Aires','Buenos Aires',-34.6037,-58.3816,'Monumento no cruzamento de avenidas largas'],
      ['casa-rosada','Casa Rosada','Buenos Aires',-34.6081,-58.3703,'Fachada rosada voltada a uma praça cívica'],
      ['teatro-colon','Teatro Colón','Buenos Aires',-34.601,-58.3832,'Casa de ópera próxima a uma avenida larga']
    ]]
  ]],
  ['Chile','america-do-sul',[
    ['natureza',[
      ['torres-paine','Torres del Paine','Patagônia',-50.942,-73.406,'Picos afiados sobre lagos patagônicos',-2],
      ['valle-luna-chile','Valle de la Luna','San Pedro de Atacama',-22.92,-68.29,'Dunas e sal em uma paisagem árida',-2],
      ['laguna-cejar','Laguna Cejar','San Pedro de Atacama',-23.05,-68.219,'Lago salgado cercado por deserto',-1]
    ]],
    ['arquitetura',[
      ['gran-torre','Gran Torre Santiago','Santiago',-33.417,-70.606,'Arranha-céu próximo à cordilheira'],
      ['la-moneda','Palácio de La Moneda','Santiago',-33.443,-70.653,'Palácio cívico de fachada clara e simétrica']
    ]],
    ['cidades',[['cidade-valparaiso','Valparaíso','Valparaíso',-33.044,-71.626,'Porto com casas coloridas nos morros',-1]]]
  ]],
  ['Uruguai','america-do-sul',[
    ['estadios',[['centenario','Estádio Centenário','Montevidéu',-34.8945,-56.1527,'Arena da primeira final mundial']]],
    ['cultura',[['teatro-solis','Teatro Solís','Montevidéu',-34.9101,-56.201,'Teatro de colunas perto da praça central']]]
  ]],
  ['Colômbia','america-do-sul',[
    ['cidades',[['cidade-cartagena','Cartagena','Cartagena',10.423,-75.55,'Centro murado junto ao mar do Caribe',-1]]],
    ['natureza',[['penol','Piedra del Peñol','Guatapé',6.22,-75.179,'Rocha isolada com escadaria sobre represas']]]
  ]],
  ['Peru','america-do-sul',[
    ['natureza',[['vinicunca','Vinicunca','Cusco',-13.87,-71.302,'Encostas coloridas pela composição mineral',-1]]],
    ['patrimonio',[
      ['linhas-nazca','Linhas de Nazca','Nazca',-14.693,-75.122,'Desenhos no chão que se entendem do alto',-1],
      ['sacsayhuaman','Sacsayhuamán','Cusco',-13.51,-71.982,'Muralhas de grandes pedras encaixadas']
    ]]
  ]],
  ['Estados Unidos','america-do-norte',[
    ['estadios',[
      ['fenway','Fenway Park','Boston',42.3467,-71.0972,'Campo antigo em meio a quarteirões de tijolo'],
      ['yankee-stadium','Yankee Stadium','Nova York',40.8296,-73.9262,'Grande estádio de beisebol ao lado de uma ferrovia'],
      ['lambeau','Lambeau Field','Green Bay',44.5013,-88.0622,'Arena de futebol americano em uma cidade pequena'],
      ['rose-bowl','Rose Bowl','Pasadena',34.1613,-118.1676,'Arena oval cercada de vegetação']
    ]],
    ['arquitetura',[
      ['chrysler','Chrysler Building','Nova York',40.7516,-73.9755,'Topo metálico de estilo art déco'],
      ['space-needle','Space Needle','Seattle',47.6205,-122.3493,'Observatório em forma de disco'],
      ['capitolio','Capitólio dos Estados Unidos','Washington',38.8899,-77.0091,'Cúpula branca no alto de uma colina cívica'],
      ['gateway-arch','Gateway Arch','Saint Louis',38.6247,-90.1848,'Arco metálico à margem de um grande rio'],
      ['griffith','Observatório Griffith','Los Angeles',34.1184,-118.3004,'Cúpulas brancas nas colinas de uma metrópole']
    ]],
    ['natureza',[
      ['yosemite','Yosemite','Califórnia',37.743,-119.593,'Um vale profundo entre paredes de granito',-2],
      ['old-faithful','Old Faithful','Yellowstone',44.4605,-110.8281,'Vapor e água saem do solo em intervalos'],
      ['monument-valley','Monument Valley','Arizona e Utah',36.982,-110.112,'Mesas de arenito numa planície árida',-2],
      ['death-valley','Vale da Morte','Califórnia',36.231,-116.766,'Sal e montanhas em um vale muito quente',-2]
    ]],
    ['infraestrutura',[
      ['golden-gate','Golden Gate','São Francisco',37.8199,-122.4783,'Uma ponte suspensa em trecho de neblina',-1],
      ['ponte-brooklyn','Ponte do Brooklyn','Nova York',40.7061,-73.9969,'Torres de pedra sobre um rio urbano'],
      ['hoover','Represa Hoover','Nevada e Arizona',36.0156,-114.7378,'Barragem de concreto encaixada numa garganta']
    ]],
    ['cultura',[
      ['getty-center','Getty Center','Los Angeles',34.078,-118.474,'Museu claro em uma colina urbana'],
      ['guggenheim-ny','Museu Guggenheim de Nova York','Nova York',40.783,-73.959,'Museu branco de rampa em espiral']
    ]]
  ]],
  ['Canadá','america-do-norte',[
    ['natureza',[
      ['lago-louise','Lake Louise','Alberta',51.417,-116.216,'Lago turquesa em vale glacial',-1],
      ['moraine-lake','Moraine Lake','Alberta',51.322,-116.185,'Lago cercado por uma fileira de picos',-1]
    ]],
    ['arquitetura',[['cn-tower','CN Tower','Toronto',43.6426,-79.3871,'Torre de observação perto do lago']]],
    ['cidades',[['cidade-quebec','Cidade de Quebec','Quebec',46.8139,-71.2079,'Cidade murada com vista para um grande rio',-1]]]
  ]],
  ['México','america-do-norte',[
    ['patrimonio',[
      ['chichen-itza','Chichén Itzá','Yucatán',20.683,-88.568,'Pirâmide escalonada cercada de mata'],
      ['teotihuacan','Teotihuacán','Estado do México',19.692,-98.843,'Avenida longa com grandes pirâmides',-1],
      ['tulum','Ruínas de Tulum','Quintana Roo',20.214,-87.429,'Sítio de pedra junto ao mar turquesa']
    ]],
    ['cultura',[['palacio-bellas-artes','Palácio de Belas Artes','Cidade do México',19.4352,-99.1412,'Cúpula alaranjada em um edifício de mármore']]]
  ]],
  ['França','europa',[
    ['patrimonio',[
      ['mont-saint-michel','Mont Saint-Michel','Normandia',48.636,-1.511,'Abadia em uma ilha cercada por marés'],
      ['versailles','Palácio de Versalhes','Versalhes',48.8049,2.1204,'Jardins geométricos e longos eixos',-1],
      ['carcassonne','Cidadela de Carcassonne','Carcassonne',43.206,2.364,'Conjunto de muralhas e torres medievais']
    ]],
    ['cultura',[['orsay','Museu d’Orsay','Paris',48.86,2.3266,'Uma antiga estação virou galeria']]],
    ['arquitetura',[['sacre-coeur','Basílica de Sacré-Cœur','Paris',48.8867,2.3431,'Cúpulas brancas no alto de uma colina']]]
  ]],
  ['Reino Unido','europa',[
    ['estadios',[
      ['anfield','Anfield','Liverpool',53.4308,-2.9609,'Estádio junto a fileiras de casas'],
      ['st-james','St James’ Park','Newcastle',54.9756,-1.6217,'Estádio de arquibancadas altas no centro'],
      ['celtic-park','Celtic Park','Glasgow',55.8497,-4.2056,'Grande estádio no leste de uma cidade escocesa']
    ]],
    ['patrimonio',[
      ['stonehenge','Stonehenge','Wiltshire',51.1789,-1.8262,'Pedras erguidas em um campo aberto'],
      ['castelo-edimburgo','Castelo de Edimburgo','Edimburgo',55.9486,-3.1999,'Fortaleza sobre rocha vulcânica'],
      ['torre-londres','Torre de Londres','Londres',51.5081,-0.0759,'Fortaleza histórica junto ao rio']
    ]],
    ['infraestrutura',[['tower-bridge','Tower Bridge','Londres',51.5055,-0.0754,'Ponte móvel com duas torres']]],
    ['natureza',[['giants-causeway','Calçada dos Gigantes','Irlanda do Norte',55.2408,-6.513,'Colunas de basalto à beira-mar']]]
  ]],
  ['Itália','europa',[
    ['patrimonio',[
      ['pompeia','Pompeia','Campânia',40.75,14.486,'Ruas escavadas ao pé de um vulcão',-1],
      ['forum-romano','Fórum Romano','Roma',41.8925,12.4853,'Ruínas entre colinas e vias modernas'],
      ['matera','Sassi de Matera','Matera',40.666,16.612,'Construções escavadas em encostas de pedra',-1]
    ]],
    ['arquitetura',[
      ['duomo-milao','Catedral de Milão','Milão',45.4641,9.1919,'Telhado com uma floresta de pináculos'],
      ['duomo-florenca','Catedral de Florença','Florença',43.7731,11.256,'Cúpula avermelhada entre telhados antigos'],
      ['pantheon','Panteão de Roma','Roma',41.8986,12.4769,'Cúpula com abertura circular']
    ]]
  ]],
  ['Espanha','europa',[
    ['patrimonio',[
      ['alhambra','Alhambra','Granada',37.176, -3.588,'Pátios e muralhas acima de uma cidade'],
      ['aqueduto-segovia','Aqueduto de Segóvia','Segóvia',40.948,-4.118,'Fileiras de arcos de pedra sobre uma praça']
    ]],
    ['arquitetura',[['sagrada-familia','Sagrada Família','Barcelona',41.4036,2.1744,'Torres pontiagudas em vários estágios de obra']]],
    ['cultura',[['guggenheim-bilbao','Museu Guggenheim Bilbao','Bilbao',43.2686,-2.934,'Fachada de metal curvo junto a um rio']]]
  ]],
  ['Portugal','europa',[
    ['patrimonio',[
      ['torre-belem','Torre de Belém','Lisboa',38.6916,-9.216,'Fortificação à beira de um estuário'],
      ['palacio-pena','Palácio da Pena','Sintra',38.7876,-9.3906,'Palácio colorido no alto de um parque'],
      ['jeronimos','Mosteiro dos Jerónimos','Lisboa',38.697,-9.206,'Claustro monumental perto de um estuário']
    ]],
    ['infraestrutura',[['ponte-luis','Ponte Dom Luís I','Porto',41.14,-8.61,'Ponte de ferro com dois níveis']]],
    ['natureza',[['sete-cidades','Lagoa das Sete Cidades','Açores',37.85,-25.79,'Duas lagoas na mesma cratera vulcânica',-2]]]
  ]],
  ['Alemanha','europa',[
    ['estadios',[['allianz-arena','Allianz Arena','Munique',48.2188,11.6247,'Arena com fachada inflável geométrica'],['dortmund','Signal Iduna Park','Dortmund',51.4926,7.4519,'Estádio conhecido por uma arquibancada amarela']]],
    ['arquitetura',[['brandenburgo','Portão de Brandemburgo','Berlim',52.5163,13.3777,'Portão de colunas sobre um antigo eixo urbano'],['neuschwanstein','Castelo de Neuschwanstein','Baviera',47.5576,10.75,'Castelo de torres claras entre montanhas']]]
  ]],
  ['Grécia','europa',[
    ['patrimonio',[['acropole','Acrópole de Atenas','Atenas',37.9715,23.7257,'Templos sobre um platô rochoso'],['meteora','Meteora','Tessália',39.72,21.63,'Mosteiros no topo de colunas de rocha',-1]]]
  ]],
  ['Japão','asia',[
    ['natureza',[['monte-fuji','Monte Fuji','Honshu',35.3606,138.7274,'Cone vulcânico quase simétrico',-2]]],
    ['patrimonio',[
      ['fushimi','Fushimi Inari','Quioto',34.9671,135.7727,'Caminhos cobertos por inúmeros portais'],
      ['himeji','Castelo de Himeji','Himeji',34.8395,134.6939,'Fortaleza branca com telhados sobrepostos'],
      ['itsukushima','Santuário de Itsukushima','Hatsukaichi',34.296,132.319,'Um portal parece flutuar na maré'],
      ['hiroshima-dome','Memorial da Paz de Hiroshima','Hiroshima',34.3955,132.4536,'Estrutura de cúpula preservada junto ao rio']
    ]],
    ['arquitetura',[['tokyo-skytree','Tokyo Skytree','Tóquio',35.7101,139.8107,'Torre muito alta sobre uma área urbana densa']]]
  ]],
  ['China','asia',[
    ['patrimonio',[
      ['cidade-proibida','Cidade Proibida','Pequim',39.9163,116.3972,'Pátios e telhados em um vasto eixo cerimonial',-1],
      ['templo-ceu','Templo do Céu','Pequim',39.8822,116.4066,'Salão circular sobre terraços de pedra'],
      ['muralha-mutianyu','Muralha da China','Mutianyu',40.4319,116.5704,'Torres ligadas por uma linha sobre montanhas',-1],
      ['budalasa','Palácio de Potala','Lhasa',29.6579,91.1172,'Palácio de paredes claras e vermelhas no alto']
    ]],
    ['arquitetura',[['oriental-pearl','Torre Pérola Oriental','Xangai',31.2397,121.4998,'Esferas suspensas junto a um rio']]],
    ['natureza',[['zhangjiajie','Zhangjiajie','Hunan',29.328,110.43,'Pilares naturais de rocha cobertos de verde',-2]]]
  ]],
  ['Índia','asia',[
    ['patrimonio',[['amber-fort','Forte de Amber','Jaipur',26.9855,75.8513,'Fortaleza no alto de uma colina junto a um lago'],['qutb','Qutb Minar','Délhi',28.5245,77.1855,'Minarete estriado de arenito vermelho']]],
    ['arquitetura',[['lótus-delhi','Templo de Lótus','Nova Délhi',28.5535,77.2588,'Pétalas brancas de concreto em volta de piscinas'],['gateway-india','Portal da Índia','Mumbai',18.922,72.8347,'Arco de pedra voltado para um porto']]]
  ]],
  ['Camboja','asia',[['patrimonio',[['angkor-wat','Angkor Wat','Siem Reap',13.4125,103.867,'Torres de pedra cercadas por um fosso gigantesco',-1],['bayon','Templo de Bayon','Siem Reap',13.4413,103.859,'Rostos de pedra esculpidos nas torres']]]]],
  ['Vietnã','asia',[['natureza',[['ha-long','Baía de Ha Long','Quảng Ninh',20.91,107.18,'Ilhotas calcárias emergem do mar',-2]]],['cidades',[['hoi-an','Hội An','Hội An',15.877,108.328,'Cidade ribeirinha conhecida por lanternas',-1]]]]],
  ['Singapura','asia',[['arquitetura',[['marina-bay','Marina Bay Sands','Singapura',1.2834,103.8607,'Três torres sustentam uma plataforma no alto'],['supertrees','Gardens by the Bay','Singapura',1.2816,103.8636,'Estruturas que parecem árvores gigantes']]]]],
  ['Jordânia','asia',[['patrimonio',[['petra','Petra','Ma’an',30.3285,35.4444,'Fachadas escavadas em um desfiladeiro']]],['natureza',[['wadi-rum','Wadi Rum','Aqaba',29.574,35.42,'Deserto de areia rubra e rochas altas',-2]]]]],
  ['Egito','africa',[
    ['patrimonio',[['luxor-karnak','Templo de Karnak','Luxor',25.7188,32.6573,'Um complexo com colunas e obeliscos'],['abu-simbel','Abu Simbel','Assuã',22.3372,31.6258,'Estátuas gigantes na fachada de uma montanha'],['saqqara','Pirâmide de Djoser','Sacará',29.8713,31.2164,'Uma grande pirâmide em degraus']]],
    ['infraestrutura',[['assua-barragem','Barragem de Assuã','Assuã',23.97,32.878,'Barragem no rio que cruza um deserto',-1]]]
  ]],
  ['Marrocos','africa',[
    ['patrimonio',[['ait-benhaddou','Aït-Ben-Haddou','Ouarzazate',31.047, -7.13,'Aldeia fortificada feita de terra']]],
    ['arquitetura',[['hassan-ii','Mesquita Hassan II','Casablanca',33.6084,-7.6325,'Minarete muito alto na borda do Atlântico']]],
    ['cidades',[['cidade-chefchaouen','Chefchaouen','Chefchaouen',35.171,-5.269,'Ruelas azuis num vale montanhoso',-1]]]
  ]],
  ['África do Sul','africa',[
    ['estadios',[['soccer-city','Soccer City','Joanesburgo',-26.2348,27.9827,'Arena em forma de cabaça']]],
    ['natureza',[['cabo-boa-esperanca','Cabo da Boa Esperança','Península do Cabo',-34.358,18.473,'Ponta rochosa diante de correntes oceânicas',-1]]]
  ]],
  ['Tanzânia','africa',[['natureza',[['kilimanjaro','Kilimanjaro','Kilimanjaro',-3.067,37.355,'Montanha isolada acima das planícies',-2],['ngorongoro','Cratera de Ngorongoro','Arusha',-3.166,35.58,'Uma enorme caldeira vulcânica com vida selvagem',-2]]]]],
  ['Etiópia','africa',[['patrimonio',[['lalibela','Igrejas de Lalibela','Lalibela',12.031,39.042,'Igrejas talhadas abaixo do nível do solo']]]]],
  ['Austrália','oceania',[
    ['natureza',[
      ['uluru','Uluru','Território do Norte',-25.344,131.036,'Monólito vermelho isolado no deserto',-2],
      ['twelve-apostles','Doze Apóstolos','Victoria',-38.665,143.105,'Colunas calcárias emergem das ondas',-1],
      ['great-barrier-reef','Grande Barreira de Corais','Queensland',-18.287,147.699,'Recifes enormes vistos do alto',-3]
    ]],
    ['infraestrutura',[['sydney-harbour-bridge','Sydney Harbour Bridge','Sydney',-33.8523,151.2108,'Grande arco de aço atravessa a baía']]],
    ['estadios',[['melbourne-cricket','Melbourne Cricket Ground','Melbourne',-37.82,144.9834,'Estádio oval no meio de um parque']]]
  ]],
  ['Nova Zelândia','oceania',[
    ['natureza',[
      ['milford-sound','Milford Sound','Fiordland',-44.64,167.9,'Fiorde entre paredes montanhosas',-2],
      ['aoraki','Aoraki / Monte Cook','Ilha Sul',-43.595,170.142,'Pico nevado acima de vales glaciais',-2],
      ['tekapo','Lago Tekapo','Ilha Sul',-44.003,170.477,'Um lago glacial junto a campos abertos',-2]
    ]],
    ['arquitetura',[['sky-tower-auckland','Sky Tower','Auckland',-36.8485,174.7622,'Torre afilada no centro de uma cidade portuária']]],
    ['estadios',[['eden-park','Eden Park','Auckland',-36.875,174.744,'Estádio de rúgbi em um bairro residencial']]]
  ]],
  ['Países Baixos','europa',[['paises',[['pais-kinderdijk','Moinhos de Kinderdijk','Holanda do Sul',51.883,4.642,'Moinhos alinham os canais de uma planície',-1]]]]],
  ['Bélgica','europa',[['paises',[['pais-atomium','Atomium','Bruxelas',50.8949,4.3416,'Esferas metálicas ligadas por tubos']]]]],
  ['Dinamarca','europa',[['paises',[['pais-nyhavn','Nyhavn','Copenhague',55.6798,12.5896,'Casas estreitas e coloridas junto a um canal']]]]],
  ['Suécia','europa',[['paises',[['pais-gamla-stan','Gamla Stan','Estocolmo',59.325,18.071,'Centro medieval em uma ilha']]]]],
  ['Noruega','europa',[['paises',[['pais-bryggen','Bryggen','Bergen',60.3974,5.3243,'Fileira de construções de madeira em um porto']]]]],
  ['Islândia','europa',[['paises',[['pais-gullfoss','Gullfoss','Haukadalur',64.327,-20.121,'Cachoeira em dois níveis e terreno vulcânico',-1]]]]],
  ['Suíça','europa',[['paises',[['pais-lauterbrunnen','Lauterbrunnen','Berna',46.594,7.908,'Vila alpina sob uma queda d’água alta',-1]]]]],
  ['Áustria','europa',[['paises',[['pais-hallstatt','Hallstatt','Salzkammergut',47.562,13.649,'Vila ao pé de montanhas à margem de um lago',-1]]]]],
  ['Turquia','asia',[['paises',[['pais-goreme','Göreme','Capadócia',38.643,34.829,'Pináculos rochosos e balões ao amanhecer',-1]]]]],
  ['Tailândia','asia',[['paises',[['pais-wat-arun','Wat Arun','Bangcoc',13.7437,100.489,'Templo de torre ornamentada junto ao rio']]]]],
  ['Indonésia','asia',[['paises',[['pais-borobudur','Borobudur','Java Central',-7.608,110.204,'Terraços de pedra com numerosas estupas']]]]],
  ['Coreia do Sul','asia',[['paises',[['pais-gyeongbokgung','Gyeongbokgung','Seul',37.5796,126.977,'Palácio de telhados curvos ao pé de montanhas']]]]],
  ['Bolívia','america-do-sul',[['paises',[['pais-uyuni','Salar de Uyuni','Potosí',-20.133,-67.489,'Horizonte branco que vira espelho com chuva',-2]]]]],
  ['Equador','america-do-sul',[['paises',[['pais-cotopaxi','Cotopaxi','Cotopaxi',-0.681,-78.437,'Vulcão nevado em altitude tropical',-2]]]]],
  ['Costa Rica','america-do-norte',[['paises',[['pais-arenal','Vulcão Arenal','Alajuela',10.463,-84.703,'Cone vulcânico cercado por mata tropical',-2]]]]],
  ['Panamá','america-do-norte',[['paises',[['pais-miraflores','Eclusas de Miraflores','Cidade do Panamá',9.005,-79.592,'Navios sobem e descem em câmaras de água']]]]],
  ['Quênia','africa',[['paises',[['pais-masai-mara','Masai Mara','Narok',-1.406,35.095,'Savana cruzada por grandes manadas',-2]]]]],
  ['Namíbia','africa',[['paises',[['pais-deadvlei','Deadvlei','Sossusvlei',-24.76,15.293,'Árvores secas entre dunas de cor intensa',-1]]]]]
] satisfies Country[]).flatMap(places);
