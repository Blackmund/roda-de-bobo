# GeoGuess: formato, imagens e banco

## O formato (quadro "Desafio de hoje: GeoGuessr" da CazéTV)

No programa (episódio de estádios, março de 2026) a regra é dita assim: "foto na tela, acertou de primeira, cinco pontos, acertou de segunda, quatro pontos e por aí vai". A primeira imagem é um close quase ilegível (um pedaço da arquibancada), as seguintes abrem o quadro até o bairro, e a revelação é o nome em letras grandes sobre fundo laranja com a foto aérea.

No site:

1. A rodada abre com uma **dica curta** ("Estádio dividido por dois rivais").
2. **Cinco imagens do mesmo lugar**, do mais difícil ao mais fácil: close extremo de um detalhe, outra parte pouco reconhecível, o lugar inteiro, o entorno e a cidade.
3. **Todos chutam pelo celular** ao mesmo tempo. A TV mostra quem já chutou; o diretor abre os palpites e marca acertou ou errou. Quem errou chuta de novo na próxima imagem.
4. Acertou na 1ª imagem: 5 pontos; na 2ª: 4; … na 5ª: 1. Todos que acertam pontuam.
5. **Revelação**: nome grande e foto aérea clara sobre fundo âmbar (o laranja do programa, dentro da paleta do site).

Sem celulares (modo uma tela só), o diretor ouve o chute falado e usa os mesmos botões ✓/✗ ao lado de cada jogador.

## Por que as imagens de uma rodada são sempre coerentes

As cinco imagens são **recortes da mesma fonte em volta da mesma coordenada**: muda só o zoom do tile e um pequeno deslocamento em metros. Não há busca de imagens, então não tem como uma etapa mostrar o Arco do Triunfo e a seguinte outra coisa. O código está em `src/utils/geoguessEngine.ts` (`geoTilesFor`) e o componente em `src/components/geoguess/SatView.tsx`.

Etapas padrão (`GEO_ETAPAS_PADRAO`): zoom 19 com deslocamento (close), 18 com outro deslocamento (outra parte), 17 (o lugar), 15 (o entorno) e 13 (a cidade). A revelação usa o zoom 17 centrado.

## Fontes de imagem e licença

| Fonte | O que dá | Licença / uso | Decisão |
|---|---|---|---|
| **Esri World Imagery** (tiles por coordenada) | Satélite e aéreas até zoom 19+ nas cidades | Esri Master License Agreement. Exige atribuição ("Powered by Esri" e as fontes), que a tela mostra no canto da imagem. Para publicar o site de forma comercial ou com muito tráfego, use uma conta ArcGIS Location Platform (tem nível gratuito) e confira os termos do item no ArcGIS Online. | **Usada.** Trocar de provedor é mudar `GEO_TILE_SOURCE`. |
| Google Earth / Google Maps | O que o programa usou | Os termos do Google proíbem copiar ou exibir imagens fora das APIs dele, com as regras dele. | **Não usada.** |
| OpenStreetMap (tile.openstreetmap.org) | Mapa desenhado, sem satélite | ODbL com atribuição; a política de uso dos servidores proíbe tráfego pesado de apps. | Não serve para fotos; possível etapa de "mapa" no futuro, com servidor próprio. |
| Sentinel-2 cloudless (EOX) | Satélite sem nuvens | CC BY 4.0 (versão 2016); versões novas CC BY-NC-SA. | Resolução de 10 m: não dá close de arquibancada. |
| Banco de fotos curado (ex.: Wikimedia Commons) | Fotos de chão | Licença por foto (CC BY / CC BY-SA, com crédito de cada autor). | Alternativa para o futuro: uma foto por lugar e crops de zoom dela também garantem a coerência. |

## Banco de lugares (`src/data/geoguessBank.ts`)

Cada lugar é uma linha. Campos:

| Campo | Para que serve |
|---|---|
| `id` | Único, minúsculo, com hífens. Também evita repetir lugar na sessão. |
| `nome` | Resposta mostrada na revelação. |
| `lugar` | "Cidade, país": linha de apoio na revelação. |
| `aceitas` | Variações que o diretor pode aceitar. |
| `lat`, `lon` | Ponto central em graus decimais (WGS84). Ponha no meio do que deve ser descoberto. |
| `regiao` | Continente: `america-do-sul`, `america-do-norte`, `europa`, `asia`, `africa`, `oceania`. |
| `pais` | País. `Brasil` também casa com a tag Brasil. |
| `categorias` | Uma ou mais: `estadios`, `pontos-turisticos`, `cidades`, `natureza`, `paises`, `lugares-comuns`. |
| `pergunta` | O que se adivinha: `local` (padrão), `cidade` ou `pais`. |
| `dica` | Dica inicial curta (até 60 caracteres) que não entrega o nome. |
| `close` | Opcional: `{ dx, dy }` em metros do close da 1ª imagem (ex.: fugir de um nome pintado no teto). |
| `escala` | Opcional: desloca todos os zooms (−1 ou −2 para lugares enormes ou sem imagem no zoom 19). |
| `etapas` | Opcional: 5 etapas próprias `{ z, span, dx, dy }`. |

Depois de acrescentar lugares, rode:

```bash
npm run geo:check
```

O script baixa o tile central de cada etapa e acusa quando a Esri devolve o quadro "Map data not yet available". Lugar acusado: use `escala: -1` (ou menos).

Para criar um tema novo, acrescente o id em `GEO_CATEGORIAS` (ou uma região em `GEO_REGIOES`) e marque os lugares. O seletor do setup lê essas listas.

## Temas como tags

No setup as tags ficam em dois grupos: **Onde** (regiões) e **O quê** (categorias).

- Tags do mesmo grupo somam: Europa + América do Sul = lugares da Europa ou da América do Sul.
- Grupos diferentes cruzam: Brasil + Pontos turísticos = pontos turísticos do Brasil.
- Nenhuma tag num grupo = tudo daquele grupo ("Todos os países").
- O setup mostra quantos lugares cabem na combinação. Combinação vazia usa o banco inteiro.

O banco inicial tem 56 lugares em 7 regiões e 6 categorias, incluindo lugares nada famosos (uma praça de BH, o telhado do Mercadão).
