/**
 * Detecta se o servidor próprio (Express: /api/* e /ws) existe neste host.
 *
 * No site publicado na Vercel só o front-end estático é servido, então essas rotas respondem 404.
 * Em vez de cada módulo insistir e poluir o console, a presença da API é verificada UMA vez por sessão
 * (/api/health), o resultado fica em memória + sessionStorage e todos os módulos consultam a mesma resposta.
 * Em falha de rede (fetch rejeitado) assume-se "disponível" sem gravar, para tentar de novo depois.
 *
 * A resposta precisa ser JSON (o `server.ts` devolve `{ status: 'ok' }`): hospedagens estáticas com fallback de SPA
 * respondem 200 com `index.html` para qualquer rota, e isso NÃO significa que a API existe.
 */
const STORAGE_KEY = 'rb_api_available_v2';

const ROOMS_KEY = 'rb_api_rooms_v2';

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;
// Salas em tempo real (/ws, /api/rooms): na Vercel so a IA existe (funcoes sem estado), entao o health avisa `rooms: false`.
let roomsCached: boolean | null = null;

function readStored(): boolean | null {
  try {
    const v = window.sessionStorage?.getItem(STORAGE_KEY);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

function store(value: boolean) {
  cached = value;
  try {
    window.sessionStorage?.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // ignore (modo privado / storage bloqueado)
  }
}

function storeRooms(value: boolean) {
  roomsCached = value;
  try {
    window.sessionStorage?.setItem(ROOMS_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Marca a API como ausente (ex.: um módulo recebeu 404 em /api/*). */
export function markApiUnavailable() {
  store(false);
}

/** Resolve true se o servidor próprio responde neste host. Uma única requisição por sessão. */
/** A resposta de /api/health e do nosso servidor? (2xx e JSON; 404 ou HTML de fallback de SPA = nao). */
export function looksLikeApiHealth(res: { ok?: boolean; status?: number; headers?: { get?: (n: string) => string | null } }): boolean {
  if (!res || res.ok === false || (typeof res.status === 'number' && (res.status < 200 || res.status >= 300))) return false;
  const type = res.headers?.get?.('content-type') ?? '';
  return /json/i.test(type);
}

/**
 * Envia JSON por POST ao servidor proprio SO se ele existir neste host (fire-and-forget).
 * Sem isso, cada mudanca de estado no site estatico geraria um POST /api/rooms/... com 404.
 * O corpo e serializado na hora, antes de esperar a sondagem.
 */
export function postToApi(path: string, body: unknown): void {
  // (usa isRoomApiAvailable: so envia estado de sala quando o servidor mantem salas)
  let payload: string;
  try {
    payload = JSON.stringify(body);
  } catch {
    return;
  }
  void isRoomApiAvailable().then((available) => {
    if (!available || typeof fetch === 'undefined') return;
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {
      // offline: ignora
    });
  });
}

/** Servidor com salas em tempo real (/ws e /api/rooms)? Falso na Vercel (so IA) e em site estatico. */
export async function isRoomApiAvailable(): Promise<boolean> {
  if (!(await isApiAvailable())) return false;
  if (roomsCached === null) {
    try {
      const v = window.sessionStorage?.getItem(ROOMS_KEY);
      roomsCached = v === '0' ? false : true;
    } catch {
      roomsCached = true;
    }
  }
  return roomsCached;
}

export function isApiAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return Promise.resolve(false);
  if (cached === null) cached = readStored();
  if (cached !== null) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch('/api/health', { cache: 'no-store' })
      .then(async (res) => {
        const ok = looksLikeApiHealth(res);
        store(ok);
        if (ok) {
          let rooms = true;
          try {
            const body = await (res as Response).json();
            if (body && body.rooms === false) rooms = false;
          } catch {
            // sem corpo legivel: assume servidor completo
          }
          storeRooms(rooms);
        }
        return ok;
      })
      .catch(() => true) // falha de rede: não conclui nada, tenta de novo na próxima consulta
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
