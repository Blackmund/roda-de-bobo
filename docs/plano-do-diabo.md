# Com Terra · Plano do Diabo (versão nova): proposta de regras

## Ideia

Um mapa grande, diferente a cada partida, para todos. Cada jogador joga na sua vez, num rodízio fixo, com uma loja aberta de peças. O objetivo é ocupar o mapa com as próprias peças e fechar **quadrados** da própria cor, que dão bônus cada vez maiores. Árvores, fichas e a sabotagem continuam no jogo.

## A vez de cada jogador (rodízio fixo)

A ordem é sorteada no começo da partida. A cada rodada, quem começa passa para o próximo jogador, e a peça escolhida nunca muda a ordem.

Na sua vez, o jogador:

1. **Sabota (opcional).** Cada jogador tem **3 diabinhos** por partida. Com um deles, põe numa casa livre uma árvore, uma ficha −1 ou uma ficha +1.
2. **Pega 1 peça** da loja aberta. A loja mostra jogadores + 3 peças e é reposta na hora.
3. **Encaixa a peça** no mapa: pode girar e espelhar, não pode ficar na água nem sobre outra peça, e árvore só passa pelo furo.
   - A primeira peça vai em qualquer lugar. Da segunda em diante, ela precisa encostar (pelo lado) em uma peça sua.
   - Se não houver nenhum encaixe encostado, a peça pode começar um território novo em qualquer lugar.
   - Se a peça não couber em lugar nenhum, o jogador descarta e perde 2 pontos.
4. **Faz a ação do ícone (se tiver).** Quem cobre um ícone de ação com bloco sólido planta uma árvore ou põe uma ficha numa casa livre, como hoje.

## Pontuação

| O quê | Pontos |
|---|---|
| Cada bloco colocado | **+1** (a peça de 6 blocos vale 6) |
| Ficha coberta por bloco sólido | +1, +2 ou −1 |
| Árvore dentro do furo | +2 |
| **Quadrado da sua cor** formado com a peça nova | **2×2 +3 · 3×3 +8 · 4×4 +15 · 5×5 +24 · 6×6 +35** (k² − 1) |
| Descartar a peça | −2 |
| Fim de jogo: maior território contínuo | +8 (empate: +4 para cada um) |

**Regra do quadrado.** Depois de encaixar a peça, conta o **maior** quadrado k×k que fica todo coberto por blocos seus (sólidos ou furados, de quaisquer peças suas) e que inclui ao menos um bloco da peça nova. Se esse quadrado for maior que o maior que já existia naquele lugar, o jogador ganha o bônus daquele tamanho. Cada peça dá no máximo 1 bônus. Assim, crescer um 3×3 até virar 4×4 rende os +15, mas encher de 2×2 repetidos rende pouco. O placar mostra o recorde de quadrado de cada um.

## Peças (catálogo de ~70, de 1 a 8 blocos)

- **Comum (sólida):** monominó até octominó, incluindo todos os 12 pentominós e uma seleção de hexaminós.
- **Com furo:** cerca de 1/3 das peças tem 1 furo, e as grandes (7–8 blocos) podem ter 2. O furo encaixa árvore (+2) e deixa a ficha à mostra (ela não vale).
- **Ponte (nova):** peças de 3 a 5 blocos com um bloco-ponte que **pode ficar sobre a água**. Elas ligam territórios separados por rios.
- **Peça do Diabo (nova, rara):** um bloco só, que pode ser colocado **sem encostar** em peça sua e vale −1. Serve para atrapalhar o quadrado de alguém.

O saco é embaralhado e tem mais peças médias (3–5 blocos). Quando acaba, um novo saco é montado.

## Mapa procedural

- **Tamanho:** 2 jogadores 14×14 · 3 jogadores 16×16 · 4 jogadores 18×18 (hoje é 9 a 12).
- **Contorno:** uma ilha orgânica gerada por ruído e suavizada por autômato celular, sempre com uma única massa de terra conectada.
- **Água:** de 1 a 2 rios que cruzam o mapa (só passáveis com Ponte) e de 2 a 4 lagos.
- **Bosques:** árvores em grupos de 2 a 4, e não espalhadas uma a uma.
- **Fichas e ícones:** distribuídos por setor, para nenhum canto ser muito melhor que outro. As fichas +2 ficam perto da água.
- **Semente:** a mesma semente gera o mesmo mapa, o que permite repetir uma partida.

## Variantes (escolhidas na configuração, combináveis)

1. **Clássico.** As regras acima.
2. **Maré Alta.** No fim de cada rodada, a água avança: 2 a 4 casas livres na beira da água viram água. O mapa encolhe, então é preciso ocupar cedo.
3. **Contratos do Diabo.** No início, 3 contratos públicos são sorteados entre: "feche um 3×3", "tenha 3 árvores dentro de furos", "encoste em 8 casas de água", "tenha 3 territórios separados", "ponha 2 blocos-ponte na água" e "coloque 20 blocos". Quem cumpre um contrato primeiro ganha +8, e o segundo ganha +4.

## Fim da partida

O jogo acaba depois de N rodadas (configurável de 3 a 12, 8 por padrão) ou quando ninguém consegue encaixar nada da loja. Aí entra o bônus de território e ganha quem tiver mais pontos.

## Telas

- **TV (16:9, sem rolagem):** o mapa grande ocupa toda a altura à esquerda. À direita ficam a legenda dos quadrados, a loja numa fileira, o placar (pontos, recorde de quadrado e diabinhos restantes), os contratos, o registro e os botões do diretor. A vez de quem joga aparece na faixa do app.
- **Mesa (um aparelho só):** mostra o lugar de quem está na vez; na vez de uma IA, mostra o último jogador humano assistindo.
- **Celular:** o mapa com zoom; tocar no mapa move a peça; os botões Girar, Espelhar, Posicionar e Descartar ficam fixos no rodapé. Fora da vez, o celular mostra o mapa e "Vez de X".
- **IA:** os bots avaliam o encaixe por pontos imediatos, quadrados em formação e território. Também sabotam o quadrado em formação do líder.

## Ordem dos PRs

1. Motor novo (turnos, catálogo, mapa procedural, pontuação de quadrados, variantes) + testes + bots.
2. Telas da TV e do celular + verificação em 1600×900 e 390×844.
