/**
 * Detecta se o servidor próprio (Express: /api/* e /ws) existe neste host.
 *
 * No site publicado na Vercel só o front-end estático é servido, então essas rotas respondem 404.
 * Em vez de cada módulo insistir e poluir o console, a presença da API é verificada UMA vez por sessão
 * (/api/health), o resultado fica em memória + sessionStorage e todos os módulos consultam a mesma resposta.
 * Em falha de rede (não 404) assume-se "disponível" sem gravar, para tentar de novo depois.
 */
const STORAGE_KEY = 'rb_api_available_v1';

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

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

/** Marca a API como ausente (ex.: um módulo recebeu 404 em /api/*). */
export function markApiUnavailable() {
  store(false);
}

/** Resolve true se o servidor próprio responde neste host. Uma única requisição por sessão. */
export function isApiAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return Promise.resolve(false);
  if (cached === null) cached = readStored();
  if (cached !== null) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch('/api/health', { cache: 'no-store' })
      .then((res) => {
        const ok = res.status !== 404;
        store(ok);
        return ok;
      })
      .catch(() => true) // falha de rede: não conclui nada, tenta de novo na próxima consulta
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
