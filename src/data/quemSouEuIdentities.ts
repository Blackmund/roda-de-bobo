/**
 * NOV-02: identidades do Quem sou eu.
 *
 * O programa usa atletas, mascotes de competição, atores, lutadores do UFC e personagens (analise/perguntas/
 * quem_sou_eu.md). As identidades que aparecem na tela do programa não constam nas legendas, então esta lista é
 * autoral: só nomes muito conhecidos (pessoas públicas e personagens), sem qualquer afirmação sobre eles.
 */
export interface QuemSouEuIdentity {
  nome: string;
  categoria: string;
  /** link direto de uma foto (so no Onde estou) */
  imagem?: string;
  credito?: string;
}

const c = (categoria: string, nomes: string[]): QuemSouEuIdentity[] => nomes.map((nome) => ({ nome, categoria }));

export const QUEM_SOU_EU_IDENTITIES: QuemSouEuIdentity[] = [
  ...c('Atletas', [
    'Pelé',
    'Neymar',
    'Ronaldo Fenômeno',
    'Ronaldinho Gaúcho',
    'Marta',
    'Cristiano Ronaldo',
    'Lionel Messi',
    'Usain Bolt',
    'Michael Phelps',
    'Ayrton Senna',
    'Gustavo Kuerten',
    'Rebeca Andrade',
    'Daiane dos Santos',
    'Michael Jordan',
    'Serena Williams',
    'Diego Maradona',
    'Zico',
    'Romário',
    'Cafu',
    'Garrincha',
    'Oscar Schmidt',
    'Hortência',
    'Joaquim Cruz',
    'Thiago Braz',
    'Ana Marcela Cunha'
  ]),
  ...c('Mascotes e símbolos', [
    'Canarinho Pistola',
    'Fuleco',
    'Zakumi',
    'Vinicius (mascote da Rio 2016)',
    'Tom (mascote da Rio 2016)',
    'Mickey Mouse',
    'Garfield',
    'Tigre da Kellogg\'s',
    'Zé Gotinho',
    'Smilinguido',
    'Mascote do Flamengo (Urubu)',
    'Mascote do Corinthians (Mosqueteiro)',
    'Mascote do Palmeiras (Periquito)',
    'Coelho da Duracell',
    'Homem da Michelin'
  ]),
  ...c('Atores e apresentadores', [
    'Fernanda Montenegro',
    'Wagner Moura',
    'Lázaro Ramos',
    'Tony Ramos',
    'Xuxa',
    'Faustão',
    'Silvio Santos',
    'Ivete Sangalo',
    'Anitta',
    'Tom Cruise',
    'Will Smith',
    'Leonardo DiCaprio',
    'Brad Pitt',
    'Jim Carrey',
    'Rodrigo Santoro',
    'Marília Pêra',
    'Paulo Gustavo',
    'Whindersson Nunes',
    'Tiago Leifert',
    'Fátima Bernardes'
  ]),
  ...c('Lutadores', [
    'Anderson Silva',
    'Minotauro',
    'José Aldo',
    'Amanda Nunes',
    'Conor McGregor',
    'Mike Tyson',
    'Muhammad Ali',
    'Rocky Balboa',
    'Popó',
    'Maurício Shogun',
    'Charles do Bronx',
    'Ronda Rousey',
    'Hulk Hogan',
    'John Cena',
    'Royce Gracie'
  ]),
  ...c('Personagens de cinema e TV', [
    'Harry Potter',
    'Homem-Aranha',
    'Batman',
    'Super-Homem',
    'Mulher-Maravilha',
    'Darth Vader',
    'Yoda',
    'Shrek',
    'Woody (Toy Story)',
    'Buzz Lightyear',
    'Simba',
    'Capitão Jack Sparrow',
    'Indiana Jones',
    'Homem de Ferro',
    'Thor',
    'Hulk',
    'Dory',
    'Elsa (Frozen)',
    'Chaves',
    'Chapolin Colorado',
    'Sherlock Holmes',
    'Forrest Gump',
    'Jack (Titanic)',
    'Gandalf'
  ]),
  ...c('Desenhos e quadrinhos', [
    'Mônica',
    'Cascão',
    'Cebolinha',
    'Magali',
    'Bob Esponja',
    'Patrick Estrela',
    'Pernalonga',
    'Tom (Tom e Jerry)',
    'Pikachu',
    'Goku',
    'Naruto',
    'Homer Simpson',
    'Scooby-Doo',
    'Pateta',
    'Pato Donald',
    'Tio Patinhas',
    'Snoopy',
    'Popeye',
    'Dragon Ball Vegeta',
    'Mario (Nintendo)'
  ]),
  ...c('Música', [
    'Roberto Carlos',
    'Caetano Veloso',
    'Gilberto Gil',
    'Chico Buarque',
    'Elis Regina',
    'Michael Jackson',
    'Beyoncé',
    'Shakira',
    'Elvis Presley',
    'Madonna',
    'Freddie Mercury',
    'Rihanna',
    'Taylor Swift',
    'Gusttavo Lima',
    'Marília Mendonça',
    'Alok',
    'Luiz Gonzaga',
    'Tim Maia',
    'Cazuza',
    'Zeca Pagodinho'
  ]),
  ...c('Personalidades e história', [
    'Albert Einstein',
    'Santos Dumont',
    'Dom Pedro I',
    'Tiradentes',
    'Princesa Isabel',
    'Leonardo da Vinci',
    'Cleópatra',
    'Napoleão',
    'Chaplin',
    'Pitágoras',
    'Marie Curie',
    'Machado de Assis',
    'Monteiro Lobato',
    'Clarice Lispector',
    'Zumbi dos Palmares',
    'Tarsila do Amaral',
    'Oscar Niemeyer',
    'Cristóvão Colombo',
    'Nelson Mandela',
    'Gandhi'
  ])
];

export const normalizeIdentity = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
