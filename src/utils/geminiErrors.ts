/**
 * Classificacao dos erros do Gemini e do status da IA mostrado na interface.
 *
 * Contexto (diagnostico de 10/11/2026): com o saldo pre-pago zerado a API responde HTTP 402
 * ("Your prepayment credits are depleted"). O servidor so tratava 404 e 429, entao o 402 caia no `catch` geral,
 * a rota devolvia temas fixos sem avisar e o status mostrava sempre "IA Gemini Conectada".
 */
export type GeminiErrorKind = 'no_credit' | 'auth' | 'quota' | 'not_found' | 'timeout' | 'other';

export function classifyGeminiError(err: unknown): GeminiErrorKind {
  const raw = typeof err === 'string' ? err : (err as { message?: unknown })?.message;
  const msg = String(raw ?? '').toLowerCase();
  if (!msg) return 'other';
  if (
    msg.includes('402') ||
    msg.includes('prepayment') ||
    msg.includes('credits are depleted') ||
    msg.includes('payment required') ||
    msg.includes('billing')
  ) {
    return 'no_credit';
  }
  if (
    msg.includes('403') ||
    msg.includes('permission_denied') ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('unauthenticated') ||
    msg.includes('401')
  ) {
    return 'auth';
  }
  if (msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) return 'quota';
  if (msg.includes('404') || msg.includes('not found') || msg.includes('not_found')) return 'not_found';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  return 'other';
}

/** Erros que nao adianta repetir no mesmo modelo: passa direto ao proximo. */
export function isTerminalForModel(kind: GeminiErrorKind): boolean {
  return kind === 'no_credit' || kind === 'auth' || kind === 'quota' || kind === 'not_found';
}

/** Por quanto tempo o modelo fica de lado depois do erro (ms). Credito e permissao: 1 hora; quota: poucos segundos. */
export function blockMsFor(kind: GeminiErrorKind): number {
  if (kind === 'no_credit' || kind === 'auth' || kind === 'not_found') return 60 * 60 * 1000;
  if (kind === 'quota') return 8 * 1000;
  return 0;
}

export type AiHealthState = 'unknown' | 'ok' | 'no_key' | 'no_credit' | 'auth' | 'error';

export const AI_HEALTH_TTL_MS = 5 * 60 * 1000;

export function healthFromError(kind: GeminiErrorKind): AiHealthState {
  if (kind === 'no_credit') return 'no_credit';
  if (kind === 'auth') return 'auth';
  return 'error';
}

export interface AiStatusPayload {
  connected: boolean;
  hasServerKey: boolean;
  /** motivo quando a IA nao esta valendo: no_key | no_credit | auth | error */
  reason?: AiHealthState;
  statusLabel: string;
}

/** O que o endpoint /api/ai-status devolve para cada estado de saude da IA. */
export function aiStatusPayload(state: AiHealthState, hasKey: boolean): AiStatusPayload {
  if (!hasKey || state === 'no_key') {
    return { connected: false, hasServerKey: false, reason: 'no_key', statusLabel: '🟡 Sem chave do Gemini: usando os bancos prontos' };
  }
  switch (state) {
    case 'no_credit':
      return { connected: false, hasServerKey: true, reason: 'no_credit', statusLabel: '🔴 IA sem crédito: usando os bancos prontos' };
    case 'auth':
      return { connected: false, hasServerKey: true, reason: 'auth', statusLabel: '🔴 Chave do Gemini recusada: usando os bancos prontos' };
    case 'error':
      return { connected: false, hasServerKey: true, reason: 'error', statusLabel: '🟡 IA indisponível no momento: usando os bancos prontos' };
    default:
      return { connected: true, hasServerKey: true, statusLabel: '🟢 IA Gemini Conectada (Gerando temas em tempo real)' };
  }
}
