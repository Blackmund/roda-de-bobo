# Roda de Bobo — Party Games Retro OS

Jogos de auditório para a TV (host) e para os celulares (controle), inspirados no programa Roda de Bobo da CazéTV. Interface em estilo "Retro OS", com dois visuais de lobby (padrão e CazéTV).

## Jogos

| Jogo | Formato | Jogadores |
|---|---|---|
| Limite | individual, palpite numérico sem estourar, com cartas de poder | 2–8 |
| Duvido | equipes, leilão de quantos itens do tema cada uma cita | 2–8 |
| Proibido | duplas, explicar a palavra sem falar as 5 proibidas (juiz pode contestar a falta) | 2–8 |
| Nota | individual, deduzir a nota secreta do narrador | 2–8 |
| Tem ou Não Tem | o Top 5: equipes descobrem as respostas mais votadas | 2–8 |
| Perguntas e Verdades | duelo de cartas (2 jogam por vez; os demais assistem) | 2–6 |

### Regras da casa × regras do programa
No setup de cada jogo que existe no programa há o seletor **Modo de regras**. "Regras do programa" aplica rodadas, tempo e parâmetros fiéis à atração (ex.: Duvido com 9 temas e vitória em 5; Limite com 10 rodadas e sem bônus por cravar o número). "Regras da casa" mantém as adaptações mais flexíveis. Os presets ficam em `src/config/rulesets.ts`.

## Rodar localmente

Pré-requisito: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

O servidor (`server.ts`, Express + Vite) sobe em `http://localhost:3000` e também atende a API de IA e o tempo real (WebSocket).

| Comando | O que faz |
|---|---|
| `npm run dev` / `npm start` | servidor local com Vite |
| `npm run build` | build de produção em `dist/` |
| `npm run lint` | checagem de tipos (`tsc --noEmit`) |
| `npm test` | testes (`node:test` via `tsx`) |

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `GEMINI_API_KEY` | geração de rodadas e temas por IA (opcional; sem ela o site usa os bancos prontos) |
| `VITE_API_URL` | endereço do servidor quando o front e a API ficam em hosts diferentes |
| `PORT` | porta do servidor (padrão 3000) |

## Dados e perguntas

- Bancos prontos por jogo em `src/utils/*GoldenDatabase.ts` (+ `src/data/extra/*.json`, carregados em segundo plano por `src/data/extraBanks.ts`).
- Banco do programa (172 itens, com vídeo e minuto de origem) em `src/data/showQuestions.json`.
- Itens marcados `aConferir` ainda precisam ser checados antes de serem tratados como fato.

## Deploy

- **Vercel (estático):** publica o front. As rotas `/api/*` e `/ws` não existem lá; o app detecta isso uma vez por sessão (`src/utils/apiAvailability.ts`) e usa os bancos prontos, sem repetir chamadas que dão 404.
- **Servidor completo** (IA e tempo real): rode `server.ts` em um host Node (Cloud Run, Render, Fly) e aponte `VITE_API_URL` para ele.

## Testes e CI

`npm test` roda os testes em `src/tests/` e `src/utils/__tests__/`. O workflow `.github/workflows/ci.yml` roda tipos, testes e build a cada push e pull request.
