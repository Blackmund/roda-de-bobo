# Checklist da estrutura — Roda de Bobo (12/11/2026)

Cruza cada item de `analise/06_backlog_consolidado.md` com o que existe hoje no código (verificado no repositório, `main` em 12/11/2026).

**Legenda:** ✅ feito · 🟡 feito em parte · ⬜ falta · 👤 depende de você (aparelho, vídeo, hospedagem) · ⏸️ adiado por decisão sua

**Placar:** 42 ✅ · 11 🟡 · 2 ⬜ · 2 👤 · 7 ⏸️ (64 itens do backlog)

---

## O que ainda falta (resumo)

| # | Item | Situação | O que fazer |
|---|---|---|---|
| 1 | INF-03 Multiplayer em aparelhos reais | 👤 | Rodar `docs/ROTEIRO_TESTE_MULTIPLAYER.md` com a TV + 2 celulares (a medição dos brokers já foi feita: 0% de perda, ~200 ms) |
| 2 | INF-04 Canal seguro | 👤 | Precisa de broker próprio com usuário e senha (ou Supabase com RLS). O app já aceita `VITE_MQTT_*` |
| 3 | DAD-03 Conferir itens no vídeo | 👤 | Revisão manual com os links `youtu.be/ID?t=` |
| 4 | REG-06 Lista de radicais do Proibido | ⬜ | Contestar e tutorial já existem; falta a lista de radicais para o juiz consultar |
| 5 | DAD-02 Esquema único de dados | 🟡 | Há validação nos bancos importados e testes de integridade; falta um esquema único com os 10 campos para todos os bancos |
| 6 | DAD-05 Filtro por origem | 🟡 | O selo "IA / Banco pronto" existe; falta filtrar por origem (programa × IA) |
| 7 | UX-18 Transições lentas | ⬜ | Medir a volta ao catálogo (meta < 1 s) |
| 8 | UX-19 Contagem de rodadas no fim do P&V | 🟡 | Voltar a testar com uma partida de 1 rodada |
| 9 | UX-20 Feedback no botão "Palpitar" | 🟡 | Cartas já usadas já ficam desativadas; falta o retorno imediato ao clicar |
| 10 | UX-01 Teste automático de largura | 🟡 | O corte em 360–414 px foi corrigido; falta o teste que mede 360/390/414/768/1280 |
| 11 | UX-04 Tema por jogo | 🟡 | Há proteção para o tema do P&V; falta guardar o tema de cada jogo |
| 12 | UX-06 Confirmar saída só com partida em andamento | 🟡 | Conferir a condição do "SIM, SAIR" |
| 13 | UX-07 Ícones com rótulo | 🟡 | Modo dev já fica escondido; faltam `aria-label` em parte dos ícones |
| 14 | COD-02 Uma cena por card | ⬜ | Conferir se `compact` e `wide` ainda duplicam o DOM |
| 15 | ART-01 Pasta `_master/` | ⬜ | A tag `arte-boa-0711` existe; falta arquivar os PNG/JPG mestres |
| 16 | Arte em geral | ⏸️ | Você pediu para melhorar depois (ver seção G) |
| 17 | NOV-04 Ritmo | ⏸️ | Você pediu para pular |

---

## A. Infraestrutura e conectividade

- [x] **INF-01** API ausente detectada; IA no ar na Vercel por funções `api/`; salas seguem por MQTT/Supabase
- [x] **INF-02** Polling de sala com backoff (1,5 s até 30 s)
- [ ] 👤 **INF-03** Teste com TV + 2 celulares (medição dos brokers e roteiro prontos)
- [ ] 🟡 **INF-04** Código de sala com `crypto` ✅ · broker com senha 👤
- [x] **INF-05** Persistência com `schemaVersion`
- [x] **INF-06** `package.json` e README
- [x] **INF-07** `npm test` e CI (lint, testes, build)
- [x] **INF-08** `/api/*` na Vercel (confirmado em produção)
- [x] **INF-09** Status real da IA (chamada de teste, 5 min de cache)
- [x] **INF-10** Causa da IA parada (crédito do Gemini, HTTP 402) tratada; chave nova configurada
- [x] **COD-03** `cazePieces.json` carregado sob demanda

## B. UX, UI e responsividade

- [ ] 🟡 **UX-01** Corte em 360–414 px corrigido ✅ · teste automático de largura ⬜
- [x] **UX-02** Recarregar nunca deixa tela em branco
- [x] **UX-03** `GAME_LIMITS` (mín/máx) no catálogo, lobby e botão iniciar
- [ ] 🟡 **UX-04** Tema por jogo
- [x] **UX-05** Equipes com fonte única (`getActiveTeamIds`)
- [ ] 🟡 **UX-06** Confirmação ao sair
- [ ] 🟡 **UX-07** Modo dev escondido ✅ · rótulos nos ícones 🟡
- [x] **UX-08** Textos com 14 jogos (corrigido em 12/11)
- [x] **UX-09** Ruleset `show` × `home` com seletor
- [x] **UX-10** Juiz: contestar no Proibido e no Duvido
- [x] **UX-11** Confirmar palpite em 2 toques; fonte maior na TV
- [x] **UX-12** Exemplo do programa em cada tutorial (com vídeo e minuto)
- [x] **UX-13** Tem ou Não Tem trava no fim da rodada
- [x] **UX-14** Ranking sem limite de 6 jogadores
- [x] **UX-15** MVP e estatísticas só da partida atual
- [x] **UX-16** "Palpites encerrados" no lugar de "Tempo esgotado" (corrigido em 12/11)
- [x] **UX-17** Aviso de que o P&V joga 2 por vez
- [ ] ⬜ **UX-18** Transições lentas (não medido)
- [ ] 🟡 **UX-19** P&V: contagem de rodadas
- [ ] 🟡 **UX-20** P&V: feedback no botão "Palpitar"

## C. Regras

- [x] **REG-01** Duvido modo programa: 9 temas, melhor de 5
- [x] **REG-02** Nota modo programa
- [x] **REG-03** Limite: bônus de palpite exato = 0 no modo programa
- [x] **REG-04** Limite: tutorial ("se todos estouram…") e cartas
- [x] **REG-05** Reverse com dois alvos
- [ ] 🟡 **REG-06** Proibido: contestar ✅ · lista de radicais ⬜
- [x] **REG-07** Top 5 documentado no tutorial
- [x] **REG-08** P&V: limites 2 a 6 alinhados
- [x] **REG-09** Unidade em destaque no Limite
- [x] **REG-10** Top 5 compara por aproximação ("praia" não revela "shopping")

## D. Dados e perguntas

- [x] **DAD-01** Bancos do programa importados (1.435 itens) com origem
- [ ] 🟡 **DAD-02** Esquema único
- [ ] 👤 **DAD-03** Conferir no vídeo
- [x] **DAD-04** Mímica 226 · Mega Resenha 165 · Quem sou eu 159 (meta: 20)
- [ ] 🟡 **DAD-05** Origem visível (selo) ✅ · filtro ⬜

## E. Novos jogos

- [x] **NOV-01** Mímica
- [x] **NOV-02** Quem sou eu
- [x] **NOV-03** Mega Resenha
- [ ] ⏸️ **NOV-04** Ritmo (pulado a pedido)
- [x] **NOV-05** Repetente
- [x] **NOV-06** Onde estou / Estádios
- [x] **NOV-07** Como eu pinto
- [x] **NOV-08** Respostas sem perguntas

## F. Código

- [x] **COD-01** Arquivos divididos: nenhum arquivo de código passa de 44 KB (restam só os de dados)
- [ ] ⬜ **COD-02** Cenas duplicadas

## G. Arte (adiada: "vamos melhorar depois")

- [ ] 🟡 **ART-01** Tag `arte-boa-0711` ✅ · `_master/` ⬜
- [ ] ⏸️ **ART-02** Voltar ao visual de 07/11
- [ ] ⏸️ **ART-03** Animação por camadas (já existem cenas animadas do lobby)
- [x] ⏸️ **ART-04** Kit de ícones (1ª versão feita; você quer refazer)
- [x] ⏸️ **ART-05** Logo em SVG (1ª versão feita)
- [x] ⏸️ **ART-06** `RetroWindow` (1ª versão feita)
- [ ] ⏸️ **ART-07** Arte dos formatos novos (hoje são SVGs simples)
- [x] **ART-08** Artes em WebP (3,4 MB → 0,5 MB)

---

## Decisões do dono (seção "Pontos que dependem de decisão")

| # | Decisão | Situação |
|---|---|---|
| 1 | Onde hospedar | Resolvido: site e IA na Vercel; salas por MQTT/Supabase. Em aberto: broker próprio (INF-04) |
| 2 | Manter Perguntas e Verdades | Mantido no Fliperama |
| 3 | Abordagem de animação | Adiada com a arte |
| 4 | Ordem dos jogos novos | Feita (só Ritmo pulado) |
| 5 | Modo "programa" como padrão | **Em aberto** — hoje o padrão é o modo casa; quer que o modo programa (4 jogadores, regras fiéis) seja o padrão? |

## Além do backlog (feito nesta jornada)

Lobby com 6 jogos por página · 14 jogos · IA com status real e reserva sem IA (banco de 2.300 temas) · memória anti-repetição (30 mil itens) e mistura banco + IA · pontos por jogador nos jogos de equipe · auditoria dos bancos com testes de integridade · telas grandes divididas (App, ControllerView e outras) · 205 testes e CI.
