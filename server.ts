import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel, HarmCategory, HarmBlockThreshold } from '@google/genai';
import {
  claimOrRegisterPlayerInRoom,
  triggerBuzzReadyInRoom
} from './src/utils/partyNetworkEngine.ts';
import { DEFAULT_GAME_CUSTOM_CONFIG } from './src/types/game.ts';
import {
  AI_HEALTH_TTL_MS,
  aiStatusPayload,
  blockMsFor,
  classifyGeminiError,
  healthFromError,
  isTerminalForModel,
  type AiHealthState
} from './src/utils/geminiErrors.ts';
import { pickThemes } from './src/utils/themeBank.ts';
import {
  selectFewShotLimiteExamples,
  buildLimitePrompt,
  type LimiteQuestion
} from './src/utils/limiteGoldenDatabase.ts';
import {
  selectFewShotDuvidoExamples,
  buildDuvidoPrompt,
  type DuvidoCategory
} from './src/utils/duvidoGoldenDatabase.ts';
import {
  selectFewShotProibidoExamples,
  buildProibidoPrompt,
  type ProibidoGoldenCard
} from './src/utils/proibidoGoldenDatabase.ts';
import {
  selectFewShotNotaExamples,
  buildNotaPrompt,
  type NotaPromptItem
} from './src/utils/notaGoldenDatabase.ts';
import {
  selectFewShotTemOuNaoTemExamples,
  buildTemOuNaoTemPrompt,
  type TemOuNaoTemQuestion
} from './src/utils/temOuNaoTemGoldenDatabase.ts';
import { isRelated } from './src/utils/similarText.ts';
import { findMomentImages } from './src/utils/momentImages.ts';
interface ServerSubAngleDefinition {
  id: number;
  label: string;
  semanticDomain: string;
  instruction: string;
}

// Configuração Permissiva de Segurança da API Gemini para Temas Adultos (+18, Gore/Terror, Humor Ácido, Sexo)
const PERMISSIVE_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE
  },
  {
    category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
    threshold: HarmBlockThreshold.BLOCK_NONE
  }
];

const SEMANTIC_SUB_ANGLES: ServerSubAngleDefinition[] = [
  {
    id: 1,
    label: 'Ângulo 1: Personagens, Figuras Históricas, Ídolos ou Profissionais',
    semanticDomain: 'DOMÍNIO HUMANO & BIOGRÁFICO (Pessoas, Ídolos, Profissionais, Vilões e Lendas)',
    instruction:
      'Foque exclusivamente em PESSOAS, personagens famosos, figuras históricas, ídolos, criadores, atletas, artistas ou profissionais marcantes dentro deste tema. PROIBIDO focar em objetos ou conceitos genéricos.'
  },
  {
    id: 2,
    label: 'Ângulo 2: Objetos Físicos, Ferramentas, Comidas ou Equipamentos',
    semanticDomain: 'DOMÍNIO MATERIAL & ARTEFATOS (Objetos Físicos, Comidas, Bebidas, Ferramentas e Equipamentos)',
    instruction:
      'Foque exclusivamente em OBJETOS FÍSICOS concretos, ferramentas, comidas, bebidas, instrumentos, roupas, acessórios ou equipamentos palpáveis ligados a este tema.'
  },
  {
    id: 3,
    label: 'Ângulo 3: Lugares Específicos, Construções, Países ou Cenários',
    semanticDomain: 'DOMÍNIO GEOGRÁFICO & ESPACIAL (Lugares, Arenas, Cidades, Construções e Cenários)',
    instruction:
      'Foque exclusivamente em LUGARES ESPECÍFICOS, cidades, países, arenas, ambientes, construções famosas, hábitats ou cenários icônicos deste universo.'
  },
  {
    id: 4,
    label: 'Ângulo 4: Eventos Marcantes, Recordes Bizarros, Gafes ou Bastidores',
    semanticDomain: 'DOMÍNIO HISTÓRICO & CURIOSIDADES EXTREMAS (Recordes, Gafes, Bastidores e Eventos)',
    instruction:
      'Foque exclusivamente em EVENTOS MARCANTES, recordes extremos, curiosidades surpreendentes de bastidores, histórias engraçadas, gafes famosas ou momentos históricos desse tema.'
  },
  {
    id: 5,
    label: 'Ângulo 5: Conceitos Específicos, Gírias, Regras, Manias ou Fenômenos',
    semanticDomain: 'DOMÍNIO CULTURAL & COMPORTAMENTAL (Gírias, Regras, Rituais, Manias e Fenômenos)',
    instruction:
      'Foque exclusivamente em GÍRIAS, expressões populares, regras específicas, manias, rituais, comportamentos ou fenômenos curiosos típicos desse tema.'
  },
  {
    id: 6,
    label: 'Ângulo 6: Nostalgia (Anos 80/90/2000) vs. Atualidade',
    semanticDomain: 'DOMÍNIO TEMPORAL & GERACIONAL (Nostalgia Anos 80/90/2000 vs. Tendências Atuais)',
    instruction:
      'Foque no contraste entre CLÁSSICOS NOSTÁLGICOS (anos 80, 90, 2000, infância) e tendências ultra-atuais dentro deste tema.'
  }
];

const FEW_SHOT_STYLE_GUIDE = {
  limite: [
    {
      pergunta: "Quantos episódios teve a série 'A Grande Família' somando todas as temporadas?",
      valor_exato: 485,
      unidade: 'episódios',
      curiosidade_explicacao: 'A Grande Família teve 14 temporadas e 485 episódios exibidos na TV Globo.'
    },
    {
      pergunta: 'Quantos metros de comprimento teve o maior sanduíche do mundo registrado no Guinness?',
      valor_exato: 735,
      unidade: 'metros',
      curiosidade_explicacao: 'O recorde mundial de maior sanduíche contava com 735 metros de comprimento.'
    }
  ],
  duvido: [
    'Clubes que disputam a atual temporada da Premier League',
    'Países do mundo que começam com a letra B',
    'Filmes dirigidos por Quentin Tarantino'
  ],
  proibido: [
    {
      palavra_alvo: 'ZICO',
      palavras_proibidas: ['FLAMENGO', 'GALINHO', 'MARACANÃ', 'FUTEBOL', '1981']
    },
    {
      palavra_alvo: 'ABACAXI',
      palavras_proibidas: ['FRUTA', 'COROA', 'ESPINHO', 'AMARELO', 'BOB ESPONJA']
    },
    {
      palavra_alvo: 'POLO AQUÁTICO',
      palavras_proibidas: ['ÁGUA', 'NATAÇÃO', 'PISCINA', 'BOLA', 'GOL']
    }
  ],
  nota: [
    'Qual estádio de futebol brasileiro?',
    'Qual comida vendida em estádio?',
    'Qual lugar para levar alguém no primeiro encontro (date)?',
    'Qual animal predador da natureza?'
  ],
  temOuNaoTem: [
    {
      pergunta: 'Diga um jogador que você lembra imediatamente quando o assunto é cobrança de pênalti',
      respostas: [
        { texto: 'Cristiano Ronaldo', votos: 70 },
        { texto: 'Henrique Dourado', votos: 10 },
        { texto: 'Neymar Jr.', votos: 10 },
        { texto: 'Gabigol', votos: 6 },
        { texto: 'Fábio Santos', votos: 4 }
      ]
    }
  ]
} as const;

function buildSessionMemoryPromptBlock(
  snapshot: any,
  currentTheme: string,
  activeSubAngle: ServerSubAngleDefinition,
  extraExcludedTerms: string[] = []
): string {
  const normCurrentTheme = String(currentTheme || '').trim().toLowerCase();
  const previousOtherThemes = (Array.isArray(snapshot?.usedThemes) ? snapshot.usedThemes : []).filter(
    (t: string) => String(t || '').trim().toLowerCase() !== normCurrentTheme
  );
  const themeKey = normCurrentTheme || 'default';
  const rejectedAngleIdsForTheme = (
    Array.isArray(snapshot?.usedSubAngleIdsByTheme?.[themeKey])
      ? snapshot.usedSubAngleIdsByTheme[themeKey]
      : []
  ).filter((id: number) => id !== activeSubAngle.id);
  const rejectedAngleLabels = SEMANTIC_SUB_ANGLES.filter((a) =>
    rejectedAngleIdsForTheme.includes(a.id)
  ).map((a) => a.label);

  const combinedKeywords = Array.from(
    new Set([
      ...(Array.isArray(snapshot?.usedTargetsAndKeywords) ? snapshot.usedTargetsAndKeywords : []),
      ...extraExcludedTerms
    ])
  ).slice(-90);

  const recentQuestions = (Array.isArray(snapshot?.usedQuestions) ? snapshot.usedQuestions : []).slice(-35);

  const embeddedSnapshot = {
    roundCounter: Number(snapshot?.roundCounter) || 0,
    activeTheme: currentTheme,
    rejectedPreviousThemes: previousOtherThemes.slice(-15),
    rejectedPreviousSubAngles: Array.from(
      new Set([
        ...(Array.isArray(snapshot?.usedSubAngles) ? snapshot.usedSubAngles.slice(-12) : []),
        ...rejectedAngleLabels
      ])
    ),
    mandatoryActiveSubAngle: {
      id: activeSubAngle.id,
      label: activeSubAngle.label,
      semanticDomain: activeSubAngle.semanticDomain || activeSubAngle.label
    },
    blockedKeywordsAndTargets: combinedKeywords,
    blockedQuestions: recentQuestions
  };

  return `
MEMÓRIA DE BLOQUEIO SEMÂNTICO (PROIBIÇÃO ABSOLUTA) & SNAPSHOT EXPLÍCITO DO SESSION_MEMORY:
\`\`\`json
${JSON.stringify(embeddedSnapshot, null, 2)}
\`\`\`

DIRETRIZES INVIOLÁVEIS DE BLOQUEIO SEMÂNTICO E PIVÔ DE DOMÍNIO (SESSION_MEMORY):
1. REJEIÇÃO DE TEMAS ANTERIORES: Ignore e rejeite 100% qualquer resquício dos temas anteriores (${JSON.stringify(embeddedSnapshot.rejectedPreviousThemes)}). O universo atual é EXCLUSIVAMENTE "${currentTheme}".
2. REJEIÇÃO ESTRITA DE SUB-ÂNGULOS ANTERIORES: Os sub-ângulos ${JSON.stringify(embeddedSnapshot.rejectedPreviousSubAngles)} JÁ FORAM USADOS e estão BLOQUEADOS nesta rodada.
3. PIVÔ OBRIGATÓRIO DE DOMÍNIO SEMÂNTICO: Faça um pivô radical para o domínio semântico atual -> [${activeSubAngle.semanticDomain || activeSubAngle.label}] (${activeSubAngle.label}: ${activeSubAngle.instruction}). Escolha um campo lexical, época, categoria de objetos/pessoas/lugares TOTALMENTE INDEPENDENTE e SEM RELAÇÃO SEMÂNTICA com as rodadas passadas.
4. PROIBIÇÃO ABSOLUTA DE TERMOS E PERGUNTAS USADAS: É ESTRITAMENTE PROIBIDO repetir, parafrasear ou usar derivados de qualquer item em \`blockedKeywordsAndTargets\` ou \`blockedQuestions\`.`;
}

function buildSemanticBlockInstruction(
  usedHistory: string[],
  snapshot?: any,
  currentTheme: string = 'Geral',
  activeSubAngle: ServerSubAngleDefinition = SEMANTIC_SUB_ANGLES[0]
): string {
  const effectiveSnapshot = snapshot || {
    usedThemes: [],
    usedSubAngles: [],
    usedSubAngleIdsByTheme: {},
    usedTargetsAndKeywords: usedHistory,
    usedQuestions: [],
    roundCounter: 0
  };
  return buildSessionMemoryPromptBlock(
    effectiveSnapshot,
    currentTheme,
    activeSubAngle,
    usedHistory
  );
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vercel: o app vira uma funcao (api/index.mjs) so com as rotas de IA; sem porta, sem Vite, sem salas em memoria.
const IS_SERVERLESS = Boolean(process.env.VERCEL);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Route WebSocket upgrades: /ws to app wss, safely handle socket errors
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {
    // Ignore socket errors during handshake/pre-warming
  });
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else if (process.env.DISABLE_HMR === 'true') {
      socket.destroy();
    }
  } catch {
    socket.destroy();
  }
});

// O estado da sala (histórico, decks, assinaturas de rodadas) pode ultrapassar o limite padrão de 100kb
// do express.json(), o que fazia o POST de sincronização falhar silenciosamente com 413.
app.use(express.json({ limit: '5mb' }));

// In-Memory Room Store
interface RoomStateStore {
  [roomId: string]: any;
}

const rooms: RoomStateStore = {};
// WebSocket connections per room
const roomClients = new Map<string, Set<WebSocket>>();
// SSE connections per room (for environments without WS upgrade)
const roomSSEClients = new Map<string, Set<express.Response>>();

// Evita vazamento de memória: salas sem clientes conectados e sem atividade há muito tempo são descartadas.
const ROOM_IDLE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const ROOM_SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(rooms)) {
    const hasClients =
      (roomClients.get(id)?.size || 0) > 0 || (roomSSEClients.get(id)?.size || 0) > 0;
    const lastActivity = Number(rooms[id]?.lastUpdated) || 0;
    if (!hasClients && now - lastActivity > ROOM_IDLE_TTL_MS) {
      delete rooms[id];
    }
  }
}, ROOM_SWEEP_INTERVAL_MS).unref();

// Serve SVG favicon directly for favicon.ico and favicon.svg requests
app.get(['/favicon.ico', '/favicon.svg'], (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'favicon.svg'), {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
});

let activeServerPort = Number(process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : 3000);

function getLocalNetworkInfo(port: number = activeServerPort) {
  const interfaces = os.networkInterfaces();
  const candidates: Array<{ ip: string; name: string; score: number }> = [];

  for (const [ifName, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    const lowerName = ifName.toLowerCase();
    for (const addr of addrs) {
      const family = String(addr.family);
      if ((family !== 'IPv4' && family !== '4') || addr.internal) continue;
      const ip = addr.address;
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) continue;

      let score = 0;
      if (ip.startsWith('192.168.')) score += 40;
      else if (ip.startsWith('10.')) score += 30;
      else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) score += 10;

      if (/(wi-?fi|wlan|wireless|ethernet|eth|en\d|lan)/i.test(lowerName)) {
        score += 50;
      }
      if (/(wsl|docker|vethernet|virtual|vbox|vmware|hyper-v|vpn|tailscale|ZeroTier|hamachi)/i.test(lowerName)) {
        score -= 100;
      }

      candidates.push({ ip, name: ifName, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const allIps = Array.from(new Set(candidates.map((c) => c.ip)));
  const lanIp = allIps[0] || null;

  return {
    lanIp,
    port,
    lanOrigin: lanIp ? `http://${lanIp}:${port}` : null,
    allIps
  };
}

app.get('/api/network-info', (_req, res) => {
  res.json(getLocalNetworkInfo(activeServerPort));
});

function ensureServerRoom(roomId: string) {
  const code = roomId.toUpperCase();
  if (!rooms[code]) {
    rooms[code] = {
      roomId: code,
      hostId: 'host_server',
      teamCount: 2,
      screen: 'mode-select',
      connectionMode: 'host',
      activeGame: null,
      theme: 'Animais e Vida Selvagem',
      activeSubtheme: '',
      usedRoundSignatures: [],
      customConfig: { ...DEFAULT_GAME_CUSTOM_CONFIG },
      roundNumber: 1,
      maxRounds: 5,
      timerConfig: 60,
      players: [],
      teams: {
        A: { id: 'A', name: 'Dupla Alfa', score: 0, members: [] },
        B: { id: 'B', name: 'Dupla Bravo', score: 0, members: [] },
        C: { id: 'C', name: 'Dupla Charlie', score: 0, members: [] },
        D: { id: 'D', name: 'Dupla Delta', score: 0, members: [] }
      },
      sessionStats: {
        totalMatches: 0,
        victoriesA: 0,
        victoriesB: 0,
        victoriesC: 0,
        victoriesD: 0,
        totalPointsA: 0,
        totalPointsB: 0,
        totalPointsC: 0,
        totalPointsD: 0,
        history: []
      },
      roundLog: [],
      lastUpdated: Date.now()
    };
  }
  return rooms[code];
}

function getRoomOnlineCount(roomId: string) {
  const wsCount = roomClients.get(roomId)?.size || 0;
  const sseCount = roomSSEClients.get(roomId)?.size || 0;
  return Math.max(1, wsCount + sseCount);
}

function broadcastRoomPresence(roomId: string) {
  const onlineCount = getRoomOnlineCount(roomId);
  const msg = JSON.stringify({
    type: 'ROOM_PRESENCE',
    roomId,
    onlineCount,
    timestamp: Date.now()
  });

  const clients = roomClients.get(roomId);
  if (clients) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  const sseClients = roomSSEClients.get(roomId);
  if (sseClients) {
    const sseMsg = `data: ${msg}\n\n`;
    sseClients.forEach((res) => {
      try {
        res.write(sseMsg);
      } catch {
        // ignore
      }
    });
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId')?.toUpperCase() || 'DEFAULT';

  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(ws);

  // Send current room state if exists
  if (rooms[roomId]) {
    ws.send(JSON.stringify({ type: 'ROOM_SYNC', state: rooms[roomId] }));
  }
  broadcastRoomPresence(roomId);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'UPDATE_STATE' && data.roomId && data.state) {
        const targetRoomId = String(data.roomId).toUpperCase();
        const existingRoom = rooms[targetRoomId];
        const currentTs = existingRoom?.lastUpdated || 0;
        const incomingTs = data.state?.lastUpdated || 0;
        if (incomingTs >= currentTs) {
          // Preserve existing players if an uninitialized client sends 0 players
          const mergedState = { ...data.state };
          if (
            existingRoom &&
            Array.isArray(existingRoom.players) &&
            existingRoom.players.length > 0 &&
            (!Array.isArray(mergedState.players) || mergedState.players.length === 0) &&
            mergedState.hostId !== existingRoom.hostId
          ) {
            mergedState.players = existingRoom.players;
          }
          rooms[targetRoomId] = mergedState;
          broadcastToRoom(targetRoomId, { type: 'ROOM_SYNC', state: mergedState }, ws);
        }
      } else if (data.type === 'DISPATCH_ACTION' && data.roomId) {
        const targetRoomId = String(data.roomId).toUpperCase();
        const action = data.action;
        if (action?.type === 'PLAYER_JOIN_REQUEST' && action.playerName) {
          const baseRoom = ensureServerRoom(targetRoomId);
          const { nextRoom } = claimOrRegisterPlayerInRoom(baseRoom, {
            clientId: action.clientId || `cli_${Date.now()}`,
            playerName: action.playerName,
            avatar: action.avatar,
            color: action.color,
            role: action.role || 'player',
            roomCode: targetRoomId,
            fixedPlayerId: action.fixedPlayerId
          });
          nextRoom.lastUpdated = Math.max(Date.now(), (baseRoom.lastUpdated || 0) + 1);
          rooms[targetRoomId] = nextRoom;
          broadcastToRoom(targetRoomId, { type: 'ROOM_SYNC', state: nextRoom });
        } else if (action?.type === 'PLAYER_ACTION' && action.actionType === 'BUZZ_READY' && action.playerId) {
          const baseRoom = ensureServerRoom(targetRoomId);
          const nextRoom = triggerBuzzReadyInRoom(baseRoom, action.playerId);
          nextRoom.lastUpdated = Math.max(Date.now(), (baseRoom.lastUpdated || 0) + 1);
          rooms[targetRoomId] = nextRoom;
          broadcastToRoom(targetRoomId, { type: 'ROOM_SYNC', state: nextRoom });
        }
        broadcastToRoom(targetRoomId, { type: 'ACTION', action: data.action });
      } else if (data.type === 'PING_PRESENCE') {
        broadcastRoomPresence(roomId);
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('error', () => {
    // Ignore client socket errors
  });

  ws.on('close', () => {
    const clients = roomClients.get(roomId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        roomClients.delete(roomId);
      } else {
        broadcastRoomPresence(roomId);
      }
    }
  });
});

function broadcastToRoom(roomId: string, payload: any, senderWs?: WebSocket) {
  // Send to WebSockets
  const clients = roomClients.get(roomId);
  if (clients) {
    const msg = JSON.stringify(payload);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== senderWs) {
        client.send(msg);
      }
    });
  }

  // Send to SSE clients
  const sseClients = roomSSEClients.get(roomId);
  if (sseClients) {
    const sseMsg = `data: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach((res) => {
      try {
        res.write(sseMsg);
      } catch {
        // ignore
      }
    });
  }
}

// Server-Sent Events (SSE) fallback endpoint for environments where WS upgrade is proxied/blocked
app.get('/api/rooms/:roomId/events', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  if (!roomSSEClients.has(roomId)) {
    roomSSEClients.set(roomId, new Set());
  }
  roomSSEClients.get(roomId)!.add(res);

  // Send initial room state if present
  const initialData = {
    type: 'ROOM_SYNC',
    state: rooms[roomId] || null,
    onlineCount: getRoomOnlineCount(roomId)
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);
  broadcastRoomPresence(roomId);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    const sseSet = roomSSEClients.get(roomId);
    if (sseSet) {
      sseSet.delete(res);
      if (sseSet.size === 0) {
        roomSSEClients.delete(roomId);
      }
    }
    broadcastRoomPresence(roomId);
  });
});

// REST fallback endpoints
app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const state = rooms[roomId] || null;
  const onlineCount = getRoomOnlineCount(roomId);

  // Polling condicional: se o cliente já possui a versão mais recente (?since=<lastUpdated>),
  // evita reenviar o estado inteiro da sala a cada 1,5s por dispositivo.
  const since = Number(req.query.since);
  if (state && Number.isFinite(since) && since > 0 && (Number(state.lastUpdated) || 0) <= since) {
    res.json({ state: null, unchanged: true, onlineCount });
    return;
  }

  res.json({ state, onlineCount });
});

app.post('/api/rooms/:roomId/state', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ success: false, error: 'Estado da sala inválido' });
    return;
  }
  const existingRoom = rooms[roomId];
  const currentTs = existingRoom?.lastUpdated || 0;
  const incomingTs = req.body?.lastUpdated || 0;
  if (incomingTs >= currentTs) {
    const mergedState = { ...req.body };
    if (
      existingRoom &&
      Array.isArray(existingRoom.players) &&
      existingRoom.players.length > 0 &&
      (!Array.isArray(mergedState.players) || mergedState.players.length === 0) &&
      mergedState.hostId !== existingRoom.hostId
    ) {
      mergedState.players = existingRoom.players;
    }
    rooms[roomId] = mergedState;
    broadcastToRoom(roomId, { type: 'ROOM_SYNC', state: mergedState });
  }
  res.json({ success: true, state: rooms[roomId] });
});

// Atomic endpoint for mobile controllers joining a room over LAN or Cloud Server
app.post('/api/rooms/:roomId/join', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const { clientId, playerName, avatar, color, role, fixedPlayerId } = req.body || {};
  if (!playerName || typeof playerName !== 'string') {
    res.status(400).json({ success: false, error: 'Nome do jogador é obrigatório' });
    return;
  }
  const baseRoom = ensureServerRoom(roomId);
  const { nextRoom, claimedPlayer } = claimOrRegisterPlayerInRoom(baseRoom, {
    clientId: String(clientId || `cli_${Date.now()}`),
    playerName: String(playerName).trim(),
    avatar: avatar ? String(avatar) : undefined,
    color: color ? String(color) : undefined,
    role: role === 'master' ? 'master' : 'player',
    roomCode: roomId,
    fixedPlayerId: fixedPlayerId ? String(fixedPlayerId) : undefined
  });
  nextRoom.lastUpdated = Math.max(Date.now(), (baseRoom.lastUpdated || 0) + 1);
  rooms[roomId] = nextRoom;
  broadcastToRoom(roomId, { type: 'ROOM_SYNC', state: nextRoom });
  res.json({ success: true, state: nextRoom, player: claimedPlayer });
});

// Atomic endpoint for mobile controller actions (e.g. BUZZ_READY)
app.post('/api/rooms/:roomId/action', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const { actionType, playerId } = req.body || {};
  const baseRoom = ensureServerRoom(roomId);
  if (actionType === 'BUZZ_READY' && playerId) {
    const nextRoom = triggerBuzzReadyInRoom(baseRoom, String(playerId));
    nextRoom.lastUpdated = Math.max(Date.now(), (baseRoom.lastUpdated || 0) + 1);
    rooms[roomId] = nextRoom;
    broadcastToRoom(roomId, { type: 'ROOM_SYNC', state: nextRoom });
  }
  res.json({ success: true, state: rooms[roomId] });
});

function getTemTotalRespondents(targetCount: number): number {
  const count = Math.min(10, Math.max(3, Math.round(targetCount || 5)));
  if (count <= 5) return 100;
  return 100 + (count - 5) * 20;
}

function stripPerguntamosPrefix(question: string): string {
  const cleaned = (question || '')
    .replace(/^perguntamos\s+a\s+\d+\s+pessoas\s*:\s*/i, '')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Helper to normalize Tem ou Não Tem votes so they strictly sum to totalRespondents in descending order
function normalizeVotesToTotal(
  items: Array<{ texto: string; sinonimos_aceitos: string[]; votos: number }>,
  targetCount: number
) {
  const totalTarget = getTemTotalRespondents(targetCount);
  const sliced = items.slice(0, targetCount);
  if (sliced.length === 0) return [];
  // Sort descending by initial votes
  sliced.sort((a, b) => (b.votos || 1) - (a.votos || 1));
  const rawTotal = sliced.reduce((acc, it) => acc + Math.max(1, it.votos || 1), 0);
  let remaining = totalTarget;
  const normalized = sliced.map((it, idx) => {
    if (idx === sliced.length - 1) {
      return { ...it, votos: Math.max(1, remaining) };
    }
    const minNeededForRest = sliced.length - 1 - idx;
    const rawShare = Math.round((Math.max(1, it.votos || 1) / rawTotal) * totalTarget);
    const clamped = Math.max(1, Math.min(remaining - minNeededForRest, rawShare));
    remaining -= clamped;
    return { ...it, votos: clamped };
  });
  normalized.sort((a, b) => b.votos - a.votos);
  return normalized;
}

function sanitizeCleanGameText(rawText: string, gameId?: string): string {
  let text = String(rawText || '').trim();
  if (!text) return '';

  // Remove wrapping quotes ("...", '...', “...”)
  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  // Remove fake template prefixes like "No universo de X (Y):" or "Sobre X:"
  text = text
    .replace(/^no\s+universo\s+de\s+[^:]+:\s*/i, '')
    .replace(/^sobre\s+[^:]+:\s*/i, '')
    .replace(/\([^)]*:\s*[^)]*\)\s*:?\s*/g, '')
    .trim();

  // Remove wrapping quotes again if they were inside
  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  if (gameId === 'nota') {
    // Strip any trailing rule explanations mentioning "nota"
    text = text
      .replace(
        /\s*(?:cujo\s+\w+\s+)?(?:que\s+represente|que\s+mere[cç]a|que\s+resume|correspondente\s+[aà]|de\s+acordo\s+com|com\s+essa|que\s+vale|representa(?:\s+exatamente)?(?:\s+o\s+n[ií]vel\s+d[ae])?)\s+(?:exatamente\s+)?(?:o\s+n[ií]vel\s+da\s+)?(?:a\s+)?(?:sua\s+|essa\s+)?nota(?:\s+que\s+voc[eê]\s+tirou)?(?:\s*\(?de\s*\d+\s*a\s*\d+\)?)?\??$/i,
        ''
      )
      .replace(/\s*:?\s*o\s+que\s+merece\s+exatamente\s+a\s+nota\s+que\s+voc[eê]\s+tirou\??$/i, '')
      .trim();

    if (/^cite\s+um(?:a)?\s+/i.test(text)) {
      text = text.replace(/^cite\s+um(?:a)?\s+/i, 'Qual ');
      if (!text.endsWith('?')) text += '?';
    }
  }

  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Cache models that hit quota/errors with TTL so subsequent requests don't waste time waiting on them
const unavailableModels = new Map<string, number>();

// Saude real da IA (402/403 nao ficam mais escondidos atras de um "Conectada" fixo).
let aiHealth: { state: AiHealthState; at: number } = { state: 'unknown', at: 0 };
function setAiHealth(state: AiHealthState) {
  if (aiHealth.state !== state) {
    console.warn(`[IA] estado: ${aiHealth.state} -> ${state}`);
  }
  aiHealth = { state, at: Date.now() };
}

// Helper to execute a single Gemini SDK call with a strict 5-second timeout and exponential backoff
async function callModelWithTimeoutAndBackoff<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 5000,
  maxRetries: number = 1,
  baseDelayMs: number = 300
): Promise<T> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`GEMINI_CALL_TIMEOUT_${timeoutMs}MS`));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      if (timer) clearTimeout(timer);
      return result;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      lastErr = err;
      const msg = String(err?.message || '');
      // Credito (402), permissao (403), quota (429) e 404 nao melhoram repetindo: vai direto ao proximo modelo
      if (isTerminalForModel(classifyGeminiError(err))) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// Helper to call Gemini with fast model order, 5.8s timeout, and minimal thinking overhead
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: string; config: any }) {
  const models = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview'
  ];
  const now = Date.now();
  let lastError: any = null;

  for (const model of models) {
    const blockedUntil = unavailableModels.get(model);
    if (blockedUntil && now < blockedUntil) continue;

    try {
      const fastConfig = {
        ...params.config,
        safetySettings: params.config?.safetySettings || PERMISSIVE_SAFETY_SETTINGS,
        ...(model === 'gemini-3-flash-preview'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
          : {})
      };

      const result = await callModelWithTimeoutAndBackoff(
        () =>
          ai.models.generateContent({
            model,
            contents: params.contents,
            config: fastConfig
          }),
        5800,
        model === 'gemini-3.1-flash-lite-preview' ? 1 : 0,
        250
      );
      setAiHealth('ok');
      return result;
    } catch (err: any) {
      lastError = err;
      const kind = classifyGeminiError(err);
      const blockMs = blockMsFor(kind);
      if (blockMs > 0) unavailableModels.set(model, Date.now() + blockMs);
      if (kind === 'no_credit' || kind === 'auth') {
        console.warn(`[IA] ${model} recusado (${kind}): ${String(err?.message || '').slice(0, 160)}`);
        setAiHealth(healthFromError(kind));
      }
      continue;
    }
  }
  // Todos os modelos de lado: mantem o diagnostico anterior (ex.: sem credito) em vez de trocar por um erro generico
  if (aiHealth.state === 'unknown' || aiHealth.state === 'ok') setAiHealth('error');
  throw lastError || new Error('All Gemini models unavailable');
}

// Health Check Endpoint for Cloud Run
app.get('/api/health', (_req, res) => {
  // Na Vercel (funcoes sem estado) so a IA existe: o cliente nao deve usar /ws nem /api/rooms.
  res.status(200).json({ status: 'ok', rooms: !IS_SERVERLESS });
});

// AI Status Endpoint for Settings / Config Modal
app.get('/api/ai-status', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '');
  if (!hasKey) return res.json(aiStatusPayload('no_key', false));

  // INF-09: status REAL. Uma chamada minima de teste, com o resultado guardado por 5 minutos.
  const fresh = aiHealth.state !== 'unknown' && Date.now() - aiHealth.at < AI_HEALTH_TTL_MS;
  if (!fresh) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey as string, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      await generateContentWithFallback(ai, {
        contents: 'Responda apenas: ok',
        config: { maxOutputTokens: 8, temperature: 0 }
      });
    } catch (err: any) {
      const kind = classifyGeminiError(err);
      // modelos de lado por erro anterior: mantem o diagnostico (so renova o relogio)
      if (aiHealth.state === 'no_credit' || aiHealth.state === 'auth') setAiHealth(aiHealth.state);
      else setAiHealth(healthFromError(kind));
    }
  }
  return res.json(aiStatusPayload(aiHealth.state, true));
});

// Gemini AI Dynamic Themes Generator Endpoint ("✨ Gerar Novos Temas com IA")
app.post('/api/generate-themes', async (req, res) => {
  const { excludeThemes = [] } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  // Reserva SEM IA: banco local de temas (2.300+ temas-base, ~53 mil combinacoes), sem repetir os ja usados.
  const localThemes = () => pickThemes({ count: 8, exclude: Array.isArray(excludeThemes) ? excludeThemes : [] });

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json({ themes: localThemes(), fallback: true, reason: 'no_key' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const randomEntropy = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const response = await generateContentWithFallback(ai, {
      contents: `Você é o diretor criativo do party game brasileiro "Roda de Bobo" (estilo CazéTV).
Semente de aleatoriedade: #${randomEntropy}.
Gere exatamente 8 temas INÉDITOS, criativos, divertidos, variados e altamente jogáveis para um grupo de amigos jogar na sala de estar.
Misture universos bem diferentes entre si (ex: cultura pop brasileira, cotidiano engraçado, esportes, comidas, nostalgia, cinema, música, ciência curiosa, perrengues da vida adulta).
PROIBIDO repetir qualquer um destes temas: ${JSON.stringify(excludeThemes.slice(-30))}.
Cada tema deve ser curto (3 a 6 palavras), direto e sem aspas.`,
      config: {
        temperature: 1.15,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['themes']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    if (Array.isArray(parsed.themes) && parsed.themes.length > 0) {
      const cleaned = parsed.themes
        .map((t: string) => sanitizeCleanGameText(t))
        .filter(Boolean)
        .slice(0, 8);
      if (cleaned.length >= 4) {
        return res.json({ themes: cleaned, fallback: false });
      }
    }
    return res.json({ themes: localThemes(), fallback: true, reason: 'empty' });
  } catch (err: any) {
    // 402/403 agora aparecem: reason diz POR QUE caiu no banco local (antes ficava mudo)
    const kind = classifyGeminiError(err);
    return res.status(200).json({ themes: localThemes(), fallback: true, reason: kind, error: err?.message });
  }
});

// Gemini AI Sub-Themes Generator Endpoint (Random Subthemes from a Central Theme)
app.post('/api/generate-subthemes', async (req, res) => {
  const { centralTheme } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  const baseTheme = (centralTheme || 'Cultura Pop e Curiosidades').trim();

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json({ subthemes: null, fallback: true });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const randomEntropy = Math.floor(Math.random() * 1000000);
    const response = await generateContentWithFallback(ai, {
      contents: `Tema Central escolhido: "${baseTheme}".
Semente de aleatoriedade: #${randomEntropy}.
Gere exatamente 6 recortes/subtemas curtos (3 a 6 palavras cada), criativos e 100% fiéis ao universo de "${baseTheme}".
REGRA OBRIGATÓRIA: NÃO repita o nome do tema antes de dois-pontos (NUNCA escreva "${baseTheme}: ..."). Escreva apenas o subtema limpo e direto.`,
      config: {
        temperature: 1.15,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subthemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['subthemes']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    if (Array.isArray(parsed.subthemes) && parsed.subthemes.length > 0) {
      const cleaned = parsed.subthemes
        .slice(0, 6)
        .map((s: string) => sanitizeCleanGameText(s));
      return res.json({ subthemes: cleaned, fallback: false });
    }
    return res.json({ subthemes: null, fallback: true });
  } catch (err: any) {
    return res.status(200).json({ subthemes: null, fallback: true, error: err?.message });
  }
});

// Gemini AI Procedural Generator Endpoint (Few-Shot Learning + Semantic Sub-Angle + Session Memory Block)
// Onde estou: a IA escolhe momentos marcantes (e algumas piadas/memes) do tema e o servidor acha uma foto de cada um.
app.post('/api/onde-estou-moments', async (req, res) => {
  const { theme: rawTheme, count: rawCount, exclude = [] } = req.body || {};
  const theme = String(rawTheme || '').trim();
  const isGeneral = !theme || /^(geral|assuntos diversos|cultura pop e curiosidades)$/i.test(theme);
  const count = Math.min(10, Math.max(2, Number(rawCount) || 6));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json({ moments: [], fallback: true, reason: 'no_key' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    const excludeList = (Array.isArray(exclude) ? exclude : []).slice(-40).map((s: unknown) => String(s));
    const response = await generateContentWithFallback(ai, {
      contents: `Você é o diretor criativo do party game brasileiro "Roda de Bobo" (estilo CazéTV, humor de mesa de bar).
No jogo "Onde estou?" cada jogador recebe, na testa, a FOTO de um momento famoso (um lance, um fato histórico, um meme) e descobre qual é com perguntas de sim ou não.
${isGeneral ? 'Tema: livre. Misture esporte (principalmente futebol), história e mundo, cultura pop, internet e memes brasileiros.' : `Tema: "${theme}". Todos os momentos precisam ter a ver com esse tema.`}
Gere exatamente ${count + 4} momentos DIFERENTES entre si, todos REAIS e muito conhecidos. Só inclua o que você tem CERTEZA ABSOLUTA que aconteceu, com o ano certo: nunca invente fato, data ou detalhe. Cada um precisa ter foto na Wikipédia ou no Commons (a pessoa, o time, o lugar ou o evento principal).
Inclua pelo menos ${Math.max(1, Math.round(count / 4))} piada ou meme engraçado conhecido do Brasil quando o tema permitir.
Para cada um:
- "legenda": o que a foto mostra, curta (até 75 caracteres), no estilo do programa, e com o ano entre parênteses no fim quando for um fato datado. Não dê spoilers desnecessários além disso.
- "categoria": 1 a 3 palavras.
- "wiki": título EXATO de um artigo da Wikipédia em português que tenha foto do momento ou da pessoa/lugar principal (ex.: "Maracanazo", "Zinedine Zidane").
- "wiki_en": título exato do artigo equivalente na Wikipédia em inglês.
- "busca": 3 palavras-chave (2 nomes/termos fortes + o ano), para achar a FOTO DO LANCE no Wikimedia Commons. Use o nome original da pessoa/lugar/coisa, sem verbos nem adjetivos (ex.: "Zidane Materazzi 2006", "Pelé Brazil 1970", "Brandenburg Gate 1989"). A busca exige TODAS as palavras no nome ou descrição do arquivo, então seja enxuto.
- "confirma": 2 a 4 palavras que o resumo do artigo CERTO da Wikipédia com certeza cita (ex.: "futebol", "jogador", "Copa do Mundo"), para eu descartar homônimos.
IMPORTANTE: se o nome tiver homônimo, use o título desambiguado em "wiki" (ex.: "Roberto Carlos (futebolista)", não o cantor).
NÃO repita nem pareça com: ${JSON.stringify(excludeList)}.
Semente de aleatoriedade: #${Date.now()}-${Math.floor(Math.random() * 1000000)}.`,
      config: {
        temperature: 1,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            momentos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  legenda: { type: Type.STRING },
                  categoria: { type: Type.STRING },
                  wiki: { type: Type.STRING },
                  wiki_en: { type: Type.STRING },
                  busca: { type: Type.STRING },
                  confirma: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['legenda', 'categoria', 'wiki', 'busca', 'confirma']
              }
            }
          },
          required: ['momentos']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    const raw: any[] = Array.isArray(parsed.momentos) ? parsed.momentos : [];
    const picked: any[] = [];
    for (const m of raw) {
      const legenda = sanitizeCleanGameText(String(m?.legenda || '')).slice(0, 90);
      if (!legenda || legenda.length < 8) continue;
      if (picked.some((p) => isRelated(p.legenda, legenda))) continue;
      if (excludeList.some((e: string) => isRelated(e, legenda))) continue;
      picked.push({
        nome: legenda,
        categoria: sanitizeCleanGameText(String(m?.categoria || 'Momentos')).slice(0, 30) || 'Momentos',
        wiki: String(m?.wiki || ''),
        wikiEn: String(m?.wiki_en || ''),
        busca: String(m?.busca || ''),
        confirma: Array.isArray(m?.confirma) ? m.confirma.map((x: unknown) => String(x)).slice(0, 5) : []
      });
    }
    // acha as fotos em lote (a Wikimedia limita pedidos em rajada)
    const urls = await findMomentImages(picked.map((p) => ({ wiki: p.wiki, wikiEn: p.wikiEn, busca: p.busca, confirma: p.confirma })));
    const withImg: any[] = [];
    picked.forEach((p, k) => {
      let img = urls[k] || undefined;
      // a mesma foto nao pode aparecer em dois jogadores
      if (img && withImg.some((w) => w.imagem === img)) img = undefined;
      withImg.push({ nome: p.nome, categoria: p.categoria, imagem: img });
    });
    // quem tem foto vem primeiro; sem foto so completa se faltar
    const sorted = [...withImg.filter((w) => w.imagem), ...withImg.filter((w) => !w.imagem)].slice(0, count);
    return res.json({ moments: sorted, fallback: sorted.length === 0 });
  } catch (err: any) {
    const kind = classifyGeminiError(err);
    return res.status(200).json({ moments: [], fallback: true, reason: kind, error: err?.message });
  }
});

app.post('/api/generate-round', async (req, res) => {
  const {
    gameId,
    theme: rawTheme,
    userTheme,
    subtheme,
    difficulty = 'normal',
    sessionMemory = [],
    sessionMemorySnapshot = null,
    randomSubAngle = null,
    customConfig,
    temItemsCount: topLevelTemItemsCount,
    randomSeed,
    excludeSignatures = [],
    excludeProibidoWords = []
  } = req.body || {};
  const theme = String(rawTheme || userTheme || 'Cultura Pop e Curiosidades').trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json({ data: null, extraRounds: [], fallback: true, error: 'GEMINI_API_KEY is not configured or placeholder.' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const temItemsCount = Math.min(10, Math.max(3, Number(customConfig?.temItemsCount ?? topLevelTemItemsCount) || 5));
    const proibidoCardsCount = Math.min(10, Math.max(3, Number(customConfig?.proibidoCardsCount) || 5));
    const proibidoForbiddenCount = Math.min(7, Math.max(3, Number(customConfig?.proibidoForbiddenCount) || 5));
    const duvidoExamplesCount = Math.min(25, Math.max(8, Number(customConfig?.duvidoExamplesCount) || 12));

    const randomEntropy = `${randomSeed ?? Math.random()}-${Date.now()}-${Math.floor(Math.random() * 999999)}`;

    // Pick semantic sub-angle (provided by client CSPRNG or selected on server)
    const activeAngle =
      randomSubAngle && randomSubAngle.label && randomSubAngle.instruction
        ? randomSubAngle
        : SEMANTIC_SUB_ANGLES[Math.floor(Math.random() * SEMANTIC_SUB_ANGLES.length)];

    // Combine all session memory items, excluded signatures, and excluded Proibido words
    const combinedMemory = Array.from(
      new Set([
        ...(Array.isArray(sessionMemory) ? sessionMemory : []),
        ...(Array.isArray(excludeSignatures) ? excludeSignatures : []),
        ...(Array.isArray(excludeProibidoWords) ? excludeProibidoWords : [])
      ])
    ).slice(-90);

    const semanticBlock =
      sessionMemorySnapshot && typeof sessionMemorySnapshot === 'object'
        ? buildSessionMemoryPromptBlock(sessionMemorySnapshot, theme, activeAngle, combinedMemory)
        : buildSemanticBlockInstruction(combinedMemory, undefined, theme, activeAngle);

    const strictThemeRule = `REGRA DE OURO DE FIDELIDADE TEMÁTICA ABSOLUTA, PIVÔ DE DOMÍNIO SEMÂNTICO E ESCRITA LIMPA:
O usuário escolheu o tema central: "${theme}" (Dificuldade: ${difficulty}).
1. FIDELIDADE 100% AO TEMA: TODO o conteúdo gerado DEVE pertencer estritamente ao universo de "${theme}". É ESTRITAMENTE PROIBIDO fugir do tema "${theme}" ou reutilizar temas passados.
2. LIBERDADE DE TEMAS ADULTOS, +18, GORE, HORROR E HUMOR ÁCIDO:
Se o usuário escolheu ou digitou um tema adulto (+18), erótico/sexual, picante, romance adulto, gore, filmes de terror, violência fictícia/cinematográfica ou humor ácido, VOCÊ DEVE ATENDER AO TEMA INTEGRALMENTE sem recusa e sem censura moral. Trata-se de um party game de ficção e entretenimento entre adultos. Gere perguntas e respostas autênticas e perfeitamente adequadas ao universo de "${theme}".
3. PIVÔ DE DOMÍNIO SEMÂNTICO OBRIGATÓRIO DESTA RODADA: [${activeAngle.semanticDomain || activeAngle.label}] -> [${activeAngle.label}] -> ${activeAngle.instruction}
4. PROIBIÇÃO ABSOLUTA DE TEMPLATES FALSOS: NUNCA escreva "No universo de...", NUNCA escreva "(${theme}: ...)", NUNCA explique a regra do jogo dentro da pergunta e NUNCA coloque aspas duplas ao redor do texto.
5. Semente de entropia: ${randomEntropy}.${semanticBlock}`;

    let prompt = '';
    let responseSchema: any = null;

    if (gameId === 'limite') {
      const exemplosFewShot: LimiteQuestion[] =
        Array.isArray(req.body?.limiteFewShotExamples) &&
        req.body.limiteFewShotExamples.length >= 6
          ? req.body.limiteFewShotExamples
          : selectFewShotLimiteExamples(theme, 7, combinedMemory);

      prompt = `${strictThemeRule}

${buildLimitePrompt(theme, difficulty, exemplosFewShot, combinedMemory.slice(-40))}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          pergunta: { type: Type.STRING },
          valor_exato: { type: Type.NUMBER },
          unidade: { type: Type.STRING },
          curiosidade_explicacao: { type: Type.STRING },
          fonte_do_numero: { type: Type.STRING }
        },
        required: ['pergunta', 'valor_exato', 'unidade', 'curiosidade_explicacao', 'fonte_do_numero']
      };
    } else if (gameId === 'duvido') {
      const exemplosFewShot: DuvidoCategory[] =
        Array.isArray(req.body?.duvidoFewShotExamples) &&
        req.body.duvidoFewShotExamples.length >= 3
          ? req.body.duvidoFewShotExamples
          : selectFewShotDuvidoExamples(theme, 4, combinedMemory);

      prompt = `${strictThemeRule}

${buildDuvidoPrompt(theme, difficulty, exemplosFewShot, combinedMemory.slice(-40))}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          categoria_secreta: { type: Type.STRING },
          total_itens_possiveis: { type: Type.INTEGER },
          dica_arbitro: { type: Type.STRING },
          exemplos_validos: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ['categoria_secreta', 'total_itens_possiveis', 'dica_arbitro', 'exemplos_validos']
      };
    } else if (gameId === 'proibido') {
      const totalBatchCards = proibidoCardsCount + 1;
      const exemplosFewShot: ProibidoGoldenCard[] =
        Array.isArray(req.body?.proibidoFewShotExamples) &&
        req.body.proibidoFewShotExamples.length >= 4
          ? req.body.proibidoFewShotExamples
          : selectFewShotProibidoExamples(theme, 6, combinedMemory);

      prompt = `${strictThemeRule}

${buildProibidoPrompt(theme, totalBatchCards, difficulty, exemplosFewShot, combinedMemory.slice(-50))}`;
      responseSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ligacao_com_tema: { type: Type.STRING },
            palavra_alvo: { type: Type.STRING },
            palavras_proibidas: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['ligacao_com_tema', 'palavra_alvo', 'palavras_proibidas']
        }
      };
    } else if (gameId === 'nota') {
      const exemplosFewShot: NotaPromptItem[] =
        Array.isArray(req.body?.notaFewShotExamples) &&
        req.body.notaFewShotExamples.length >= 4
          ? req.body.notaFewShotExamples
          : selectFewShotNotaExamples(theme, 6, combinedMemory);

      prompt = `${strictThemeRule}

${buildNotaPrompt(theme, difficulty, exemplosFewShot, combinedMemory.slice(-40))}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          pergunta: { type: Type.STRING }
        },
        required: ['pergunta']
      };
    } else if (gameId === 'tem-ou-nao-tem') {
      const requestedItemsCount = Math.max(5, temItemsCount);
      const totalRespondents = getTemTotalRespondents(requestedItemsCount);
      const exemplosFewShot: TemOuNaoTemQuestion[] =
        Array.isArray(req.body?.temFewShotExamples) &&
        req.body.temFewShotExamples.length >= 3
          ? req.body.temFewShotExamples
          : selectFewShotTemOuNaoTemExamples(theme, 4, combinedMemory);

      prompt = `${strictThemeRule}

${buildTemOuNaoTemPrompt(
  theme,
  difficulty,
  exemplosFewShot,
  combinedMemory.slice(-40),
  requestedItemsCount,
  totalRespondents
)}`;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          pergunta: { type: Type.STRING },
          respostas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                posicao: { type: Type.INTEGER },
                texto: { type: Type.STRING },
                sinonimos_aceitos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                votos: { type: Type.INTEGER }
              },
              required: ['texto', 'sinonimos_aceitos', 'votos']
            }
          }
        },
        required: ['pergunta', 'respostas']
      };
    } else {
      return res.status(400).json({ error: 'Jogo inválido' });
    }

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        temperature: 1.15,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Post-process to guarantee clean text, exact item counts, deduplication, and vote normalization
    if (gameId === 'proibido' && Array.isArray(parsed)) {
      const blockedTargets = new Set(
        [
          ...(Array.isArray(excludeProibidoWords) ? excludeProibidoWords : []),
          ...(Array.isArray(sessionMemory) ? sessionMemory : [])
        ].map((w) => String(w || '').toUpperCase().trim())
      );
      const seenInBatch = new Set<string>();
      const cleanedAllCards: Array<{ palavra_alvo: string; palavras_proibidas: string[] }> = [];

      for (const card of parsed) {
        if (String(card?.ligacao_com_tema || '').trim().length < 4) continue;
        const target = sanitizeCleanGameText(String(card?.palavra_alvo || '')).toUpperCase();
        if (!target || seenInBatch.has(target) || blockedTargets.has(target)) {
          continue;
        }
        const nearUsed = (Array.isArray(excludeProibidoWords) ? excludeProibidoWords : []).some((w) => isRelated(target, String(w || '')));
        if (nearUsed || Array.from(seenInBatch).some((w) => isRelated(target, w))) {
          continue;
        }
        seenInBatch.add(target);
        const forbiddenRaw: unknown[] = Array.isArray(card?.palavras_proibidas) ? card.palavras_proibidas : [];
        const uniqueForbidden: string[] = Array.from(
          new Set<string>(
            forbiddenRaw
              .map((w: unknown) => sanitizeCleanGameText(String(w || '')).toUpperCase())
              .filter((w: string) => Boolean(w && w !== target))
          )
        ).slice(0, proibidoForbiddenCount);

        cleanedAllCards.push({
          palavra_alvo: target,
          palavras_proibidas: uniqueForbidden
        });
      }

      if (cleanedAllCards.length === 0) {
        return res.status(200).json({ data: null, extraRounds: [], fallback: true });
      }

      const firstRoundCards = cleanedAllCards.slice(0, proibidoCardsCount);
      const secondRoundCards = cleanedAllCards.slice(proibidoCardsCount, proibidoCardsCount * 2);
      const extraDecks =
        secondRoundCards.length >= Math.min(3, proibidoCardsCount) ? [secondRoundCards] : [];
      return res.json({
        data: firstRoundCards,
        extraRounds: extraDecks,
        subthemeUsed: activeAngle.label || subtheme || theme
      });
    }

    const rawRounds: any[] = Array.isArray(parsed?.rounds)
      ? parsed.rounds
      : parsed && typeof parsed === 'object'
      ? [parsed]
      : [];

    const processedRounds = rawRounds
      .map((item: any) => {
        if (!item || typeof item !== 'object') return null;
        if (gameId === 'tem-ou-nao-tem' && Array.isArray(item.respostas)) {
          const seenAns = new Set<string>();
          const uniqueRespostas: Array<{ texto: string; sinonimos_aceitos: string[]; votos: number }> = [];
          for (const r of item.respostas) {
            const raw = String(r?.texto || '').trim();
            const primary = raw.split('/')[0].split(/\s+ou\s+/i)[0].split(',')[0].trim();
            const cleanText = sanitizeCleanGameText(primary).toUpperCase();
            const normKey = cleanText
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim();
            if (!cleanText || !normKey || seenAns.has(normKey)) continue;
            seenAns.add(normKey);

            // Rescue secondary names into sinonimos_aceitos
            const extraAliases: string[] = [];
            const parts = raw.split(/[\/,]|\s+ou\s+/i);
            for (let p = 1; p < parts.length; p++) {
              const alt = sanitizeCleanGameText(parts[p]).toLowerCase().trim();
              if (alt && !extraAliases.includes(alt)) extraAliases.push(alt);
            }

            const existingSynonyms = Array.isArray(r?.sinonimos_aceitos)
              ? r.sinonimos_aceitos.map((s: any) => sanitizeCleanGameText(String(s || '')).toLowerCase()).filter(Boolean)
              : [];
            const mergedSynonyms = Array.from(new Set([...existingSynonyms, ...extraAliases]));

            uniqueRespostas.push({
              texto: cleanText,
              sinonimos_aceitos: mergedSynonyms,
              votos: Number(r?.votos) || 10
            });
          }
          if (uniqueRespostas.length < temItemsCount) {
            return null;
          }
          return {
            pergunta: sanitizeCleanGameText(stripPerguntamosPrefix(item.pergunta || ''), 'tem-ou-nao-tem'),
            rawRespostas: uniqueRespostas,
            respostas: normalizeVotesToTotal(uniqueRespostas, temItemsCount).map((ans, idx) => ({
              ...ans,
              posicao: idx + 1,
              texto: String(ans.texto).split('/')[0].split(/\s+ou\s+/i)[0].split(',')[0].trim().toUpperCase()
            }))
          };
        }
        if (gameId === 'nota' && item.pergunta) {
          return {
            pergunta: sanitizeCleanGameText(item.pergunta || '', 'nota')
          };
        }
        if (gameId === 'duvido' && item.categoria_secreta) {
          return {
            categoria_secreta: sanitizeCleanGameText(item.categoria_secreta || '', 'duvido'),
            total_itens_possiveis: Number(item.total_itens_possiveis) || 25,
            dica_arbitro: item.dica_arbitro ? String(item.dica_arbitro).trim() : undefined,
            exemplos_validos: Array.isArray(item.exemplos_validos)
              ? item.exemplos_validos.slice(0, Math.max(20, duvidoExamplesCount))
              : []
          };
        }
        if (gameId === 'limite' && item.pergunta) {
          const pergunta = sanitizeCleanGameText(item.pergunta || '', 'limite');
          const frases = pergunta.split(/[.!?]+\s+/).filter(Boolean).length;
          if (pergunta.length > 130 || frases > 2 || String(item.fonte_do_numero || '').trim().length < 3) return null;
          return {
            ...item,
            pergunta
          };
        }
        return null;
      })
      .filter(Boolean);

    if (processedRounds.length === 0) {
      return res.status(200).json({ data: null, extraRounds: [], fallback: true });
    }

    return res.json({
      data: processedRounds[0],
      extraRounds: processedRounds.slice(1),
      subthemeUsed: activeAngle.label || subtheme || theme
    });
  } catch (err: any) {
    return res.status(200).json({
      data: null,
      extraRounds: [],
      fallback: true,
      error: err?.message || 'Erro ao gerar conteúdo de IA'
    });
  }
});

// Mount Vite or static server
async function setupServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  let viteInstance: any = null;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    viteInstance = await createViteServer({
      clearScreen: false,
      server: {
        middlewareMode: true,
        port: 3000,
        strictPort: false,
        host: '0.0.0.0',
        allowedHosts: true as const,
        hmr: false,
        ws: false as const,
        watch: process.env.DISABLE_HMR === 'true' ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(viteInstance.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // App server tries PORT from env, then 3000, and falls back to next available port if port is occupied
  const initialPort = process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000;
  let currentPort = initialPort;
  let retries = 0;
  const maxRetries = 10;

  server.on('error', (err: NodeJS.ErrnoException) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && retries < maxRetries) {
      retries += 1;
      currentPort = currentPort + 1;
      console.warn(`[Roda de Bobo] Porta ${currentPort - 1} ocupada ou restrita (${err.code}). Tentando porta ${currentPort}...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {
          // ignore
        }
        server.listen(currentPort, '0.0.0.0');
      }, 200);
    } else {
      console.error('[Roda de Bobo] Server error:', err);
    }
  });

  const gracefulShutdown = () => {
    roomSSEClients.forEach((clients) => {
      clients.forEach((res) => {
        try {
          res.end();
        } catch {
          // ignore
        }
      });
    });
    roomSSEClients.clear();
    wss.clients.forEach((client) => {
      try {
        client.terminate();
      } catch {
        // ignore
      }
    });
    if (viteInstance) {
      viteInstance.close().catch(() => {});
    }
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 500).unref();
  };

  process.once('SIGTERM', gracefulShutdown);
  process.once('SIGINT', gracefulShutdown);

  const onListening = () => {
    activeServerPort = currentPort;
    const netInfo = getLocalNetworkInfo(currentPort);
    console.log(`[Roda de Bobo] Server running on http://localhost:${currentPort}`);
    if (netInfo.lanOrigin) {
      console.log(`[Roda de Bobo] Rede Local (Wi-Fi/LAN): ${netInfo.lanOrigin}`);
    }
  };

  server.once('listening', onListening);
  server.listen(initialPort, '0.0.0.0');
}

if (!IS_SERVERLESS) {
  setupServer();
}

export default app;

