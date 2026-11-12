# Checklist da estrutura — Roda de Bobo (12/11/2026, atualizado)

Cruza cada item de `analise/06_backlog_consolidado.md` com o que existe hoje no código (verificado no repositório).

**Legenda:** ✅ feito · 🟡 feito em parte · ⬜ falta · 👤 depende de você (aparelho, vídeo, hospedagem) · ⏸️ adiado por decisão sua

**Placar:** **53 ✅ · 2 🟡 · 0 ⬜ · 2 👤 · 7 ⏸️** (64 itens do backlog)

**Decisão tomada:** o **modo do programa (estilo CazéTV) é o modo padrão**. Ao escolher um jogo ele já abre com as regras e o preset do programa (rodadas, tempo, parâmetros); o host pode trocar para as "regras da casa" no setup.

---

## O que ainda falta

| # | Item | Situação | O que fazer |
|---|---|---|---|
| 1 | INF-03 Multiplayer em aparelhos reais | 👤 | Rodar `docs/ROTEIRO_TESTE_MULTIPLAYER.md` com a TV + 2 celulares (a medição dos brokers já foi feita: 0% de perda, ~200 ms) |
| 2 | INF-04 Canal seguro | 👤 | Precisa de broker próprio com usuário e senha (ou Supabase com RLS). O app já aceita `VITE_MQTT_*` |
| 3 | DAD-03 Conferir itens no vídeo | 👤 | Revisão manual com os links `youtu.be/ID?t=` |
| 4 | UX-01 Teste automático de largura | 🟡 | Medi à mão no catálogo (360, 390, 414 e 768 px: sem estouro); falta um teste que rode no CI |
| 5 | Arte em geral | ⏸️ | Você pediu para melhorar depois (seção G) |
| 6 | NOV-04 Ritmo | ⏸️ | Você pediu para pular |

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

- [ ] 🟡 **UX-01** Corte em 360–414 px corrigido e medido ✅ · teste automático no CI ⬜
- [x] **UX-02** Recarregar nunca deixa tela em branco
- [x] **UX-03** `GAME_LIMITS` (mín/máx) no catálogo, lobby e botão iniciar
- [x] **UX-04** Cada jogo lembra o próprio tema (`themeByGame`); não herda o do jogo anterior
- [x] **UX-05** Equipes com fonte única (`getActiveTeamIds`)
- [x] **UX-06** A confirmação de saída só aparece com partida em andamento
- [x] **UX-07** Modo dev escondido; todos os botões só com ícone têm rótulo (varredura automática)
- [x] **UX-08** Textos com 14 jogos
- [x] **UX-09** Ruleset programa × casa com seletor (programa é o padrão)
- [x] **UX-10** Juiz: contestar no Proibido e no Duvido; checagem de radical no Proibido
- [x] **UX-11** Confirmar palpite em 2 toques; fonte maior na TV
- [x] **UX-12** Exemplo do programa em cada tutorial (com vídeo e minuto)
- [x] **UX-13** Tem ou Não Tem trava no fim da rodada
- [x] **UX-14** Ranking sem limite de 6 jogadores
- [x] **UX-15** MVP e estatísticas só da partida atual
- [x] **UX-16** "Palpites encerrados" no lugar de "Tempo esgotado"
- [x] **UX-17** Aviso de que o P&V joga 2 por vez
- [x] **UX-18** Voltar ao catálogo leva ~0,5 s (medido: Nota 462 ms, Limite 483 ms)
- [x] **UX-19** P&V: estatísticas da partida vêm da própria série (`applyPVMatchResult`)
- [x] **UX-20** P&V: o botão "Palpitar" mostra quantas cartas faltam e responde ao toque

## C. Regras

- [x] **REG-01** Duvido modo programa: 9 temas, melhor de 5
- [x] **REG-02** Nota modo programa
- [x] **REG-03** Limite: bônus de palpite exato = 0 no modo programa
- [x] **REG-04** Limite: tutorial ("se todos estouram…") e cartas
- [x] **REG-05** Reverse com dois alvos
- [x] **REG-06** Proibido: contestar falta e "Checar palavra dita" (avisa se parece o radical; o juiz decide)
- [x] **REG-07** Top 5 documentado no tutorial
- [x] **REG-08** P&V: limites 2 a 6 alinhados
- [x] **REG-09** Unidade em destaque no Limite
- [x] **REG-10** Top 5 compara por aproximação

## D. Dados e perguntas

- [x] **DAD-01** Bancos do programa importados (1.435 itens) com origem
- [x] **DAD-02** Esquema único (`data/bankSchema.ts`): todos os bancos cabem em id, jogo, enunciado e origem, validado em teste
- [ ] 👤 **DAD-03** Conferir no vídeo
- [x] **DAD-04** Mímica 226 · Mega Resenha 165 · Quem sou eu 159 (meta: 20)
- [x] **DAD-05** Selo "IA / Banco pronto" + escolha da origem no setup: misto, só banco pronto ou só IA

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
- [x] **COD-02** Cada card renderiza uma cena só (compacta ou larga, escolhida pela proporção)

## G. Arte (adiada: "vamos melhorar depois")

- [x] **ART-01** Tag `arte-boa-0711` e mestres em `_master/` (a pasta `public/assets` caiu de 9 MB para 0,8 MB)
- [ ] ⏸️ **ART-02** Voltar ao visual de 07/11
- [ ] ⏸️ **ART-03** Animação por camadas (já existem cenas animadas do lobby)
- [x] ⏸️ **ART-04** Kit de ícones (1ª versão feita; você quer refazer)
- [x] ⏸️ **ART-05** Logo em SVG (1ª versão feita)
- [x] ⏸️ **ART-06** `RetroWindow` (1ª versão feita)
- [ ] ⏸️ **ART-07** Arte dos formatos novos (hoje são SVGs simples)
- [x] **ART-08** Artes em WebP (3,4 MB → 0,5 MB)

---

## Decisões do dono

| # | Decisão | Situação |
|---|---|---|
| 1 | Onde hospedar | Resolvido: site e IA na Vercel; salas por MQTT/Supabase. Em aberto só o broker próprio (INF-04) |
| 2 | Manter Perguntas e Verdades | Mantido no Fliperama |
| 3 | Abordagem de animação | Adiada com a arte |
| 4 | Ordem dos jogos novos | Feita (só Ritmo pulado) |
| 5 | Modo "programa" como padrão | **Decidido:** o modo do programa (estilo CazéTV) é o padrão |

## Além do backlog (feito nesta jornada)

Lobby com 6 jogos por página · 14 jogos · IA com status real e reserva sem IA (banco de 2.300 temas) · memória anti-repetição (30 mil itens) e mistura banco + IA · pontos por jogador nos jogos de equipe · auditoria dos bancos com testes de integridade · telas grandes divididas · CI com testes.
