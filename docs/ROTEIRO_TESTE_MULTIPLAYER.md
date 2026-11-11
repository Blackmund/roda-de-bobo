# Roteiro de teste do multiplayer (INF-03)

Objetivo: confirmar de ponta a ponta TV + 2 celulares no site publicado e registrar latência e falhas.
Site: https://roda-de-bobo.vercel.app (o multiplayer usa MQTT público; a Vercel só serve a IA).

## Medição automática (já feita, sem celulares)

`node scripts/mqtt-latency.mjs 40 150` simula TV e celular na mesma sala e mede cada broker.

| Broker | Conexão | Perda | Latência (mediana / p95 / máx) | Mensagem retida |
|---|---|---|---|---|
| broker.emqx.io (principal) | 1,8 s | 0 % | 195 / 207 / 291 ms | ok |
| broker.hivemq.com (reserva) | 6,3 s | 0 % | 217 / 222 / 231 ms | ok |
| test.mosquitto.org (reserva) | 2,3 s | 0 % | 229 / 232 / 236 ms | ok |

Medido em 11/11/2026, de um computador (Windows) em rede doméstica. Latência ~200 ms é o piso do trajeto até o broker;
o Wi-Fi do celular soma a isso. HiveMQ demorou 6 s só para conectar: serve de reserva, não de principal.

## Teste com aparelhos reais (precisa de você)

Material: 1 TV ou computador (anfitrião) + 2 celulares. Pode ser em redes diferentes (Wi-Fi e 4G): é o caso que mais importa.

1. **Criar a sala.** TV abre o site e cria a sala. Anote o código de 6 letras e a hora.
2. **Entrar.** Celular 1 escaneia o QR; celular 2 digita o código. Anote quanto demorou até aparecer na TV. *Esperado: menos de 5 s.*
3. **Rodada completa de cada jogo** (Nota, Tem ou Não Tem, Duvido, Limite, Proibido, Mímica, Quem sou eu): o celular responde e a TV reage.
   Anote, por jogo: tempo entre tocar no celular e a TV reagir, e qualquer toque perdido. *Esperado: menos de 1 s.*
4. **Tela apagada.** Bloqueie o celular 1 por 30 s e desbloqueie. Ele volta sozinho para a sala? *Esperado: sim, sem digitar o código.*
5. **Queda de rede.** No celular 2, ative o modo avião por 10 s e desative. *Esperado: reconecta e recebe o estado atual.*
6. **Entrar no meio da partida.** Um terceiro celular entra com a rodada em andamento. *Esperado: vê o estado atual (mensagem retida).*
7. **Recarregar a TV** (F5) no meio da rodada. *Esperado: volta para a mesma partida.*

## Registro

| Teste | Passou? | Tempo medido | Observação |
|---|---|---|---|
| 2 Entrar (celular 1) | | | |
| 2 Entrar (celular 2) | | | |
| 3 Nota | | | |
| 3 Tem ou Não Tem | | | |
| 3 Duvido | | | |
| 3 Limite | | | |
| 3 Proibido | | | |
| 3 Mímica | | | |
| 3 Quem sou eu | | | |
| 4 Tela apagada | | | |
| 5 Queda de rede | | | |
| 6 Entrada tardia | | | |
| 7 Recarregar a TV | | | |

Se algo falhar, anote o jogo, o aparelho/navegador e o horário: o código da sala e a hora bastam para reproduzir.

## Segurança do canal (INF-04)

O código da sala já é gerado com `crypto.getRandomValues` (32 símbolos, sem O/0/I/1). O que **não** dá para resolver só no código:
os brokers públicos não têm autenticação, então quem souber o código de uma sala consegue ler e publicar nela, e quem assinar
`roda-de-bobo-v2/room/#` enxerga todas as salas. Para fechar isso é preciso um broker seu (ou Supabase Realtime com RLS).
O app já aceita `VITE_MQTT_BROKER_URL`, `VITE_MQTT_USERNAME` e `VITE_MQTT_PASSWORD`: ao ter um broker com usuário e senha,
basta definir essas variáveis na Vercel e fazer um novo deploy. Como são variáveis `VITE_`, elas vão para o navegador:
use credenciais só desse broker, com permissão restrita ao prefixo `roda-de-bobo-v2/room/`.
