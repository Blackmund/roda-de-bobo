/**
 * INF-03: mede latencia e perda nos brokers MQTT publicos usados pelo multiplayer (sem precisar de celulares).
 *
 * Simula a TV (assina) e um celular (publica) na mesma sala de teste e envia N mensagens.
 * Uso:  node scripts/mqtt-latency.mjs [N=40] [intervaloMs=150]
 * Obs.: os dois clientes rodam nesta maquina, entao mede rede + broker, nao o Wi-Fi do celular.
 */
import mqtt from 'mqtt';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081'
];
const N = Number(process.argv[2]) || 40;
const GAP = Number(process.argv[3]) || 150;

const connect = (url) =>
  new Promise((resolve, reject) => {
    const t0 = Date.now();
    const c = mqtt.connect(url, { connectTimeout: 8000, reconnectPeriod: 0, clientId: 'rb-test-' + Math.random().toString(16).slice(2, 10) });
    const timer = setTimeout(() => {
      c.end(true);
      reject(new Error('timeout de conexao (8 s)'));
    }, 9000);
    c.once('connect', () => {
      clearTimeout(timer);
      resolve({ client: c, ms: Date.now() - t0 });
    });
    c.once('error', (e) => {
      clearTimeout(timer);
      c.end(true);
      reject(e);
    });
  });

const pct = (arr, p) => arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor((arr.length * p) / 100))];

async function testBroker(url) {
  const topic = `roda-de-bobo-v2/teste/${Math.random().toString(36).slice(2, 10)}`;
  let tv;
  let phone;
  try {
    tv = await connect(url);
    phone = await connect(url);
  } catch (e) {
    return { url, erro: e.message };
  }
  const lat = [];
  const got = new Set();
  await new Promise((res, rej) => tv.client.subscribe(topic, { qos: 0 }, (err) => (err ? rej(err) : res())));
  tv.client.on('message', (_t, payload) => {
    try {
      const m = JSON.parse(payload.toString());
      if (!got.has(m.i)) {
        got.add(m.i);
        lat.push(Date.now() - m.t);
      }
    } catch {
      // ignora
    }
  });
  await new Promise((r) => setTimeout(r, 400));
  for (let i = 0; i < N; i++) {
    phone.client.publish(topic, JSON.stringify({ i, t: Date.now() }), { qos: 0 });
    await new Promise((r) => setTimeout(r, GAP));
  }
  await new Promise((r) => setTimeout(r, 2000));
  // mensagem retida (o estado da sala que a TV publica para quem entra depois)
  let retidaOk = false;
  try {
    tv.client.publish(topic + '/estado', JSON.stringify({ ok: 1 }), { qos: 0, retain: true });
    await new Promise((r) => setTimeout(r, 500));
    const late = await connect(url);
    retidaOk = await new Promise((res) => {
      const to = setTimeout(() => res(false), 3000);
      late.client.on('message', () => {
        clearTimeout(to);
        res(true);
      });
      late.client.subscribe(topic + '/estado');
    });
    tv.client.publish(topic + '/estado', '', { retain: true }); // limpa
    late.client.end(true);
  } catch {
    // segue
  }
  tv.client.end(true);
  phone.client.end(true);
  return {
    url,
    conexaoMs: Math.max(tv.ms, phone.ms),
    enviadas: N,
    recebidas: got.size,
    perdaPct: Math.round(((N - got.size) / N) * 100),
    latenciaMs: lat.length ? { mediana: pct(lat, 50), p95: pct(lat, 95), max: Math.max(...lat) } : null,
    retidaOk
  };
}

console.log(`Medindo ${BROKERS.length} brokers: ${N} mensagens, 1 a cada ${GAP} ms\n`);
for (const url of BROKERS) {
  const r = await testBroker(url);
  console.log(JSON.stringify(r));
}
process.exit(0);
