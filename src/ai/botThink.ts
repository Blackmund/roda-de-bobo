/**
 * "Cabeca" da IA para o que precisa de conhecimento em texto (palavras, palpites, dicas).
 * Pergunta ao Gemini pelo servidor (/api/bot-think); sem IA disponivel, cai nos dados locais do jogo.
 */
export type BotThinkKind =
  | 'adedanha' // respostas por categoria comecando com a letra
  | 'repetente' // palavras mais provaveis para um tema (da mais obvia para a menos)
  | 'respostas' // chute da resposta de uma pergunta com palavras escondidas
  | 'wrong' // respostas plausiveis porem erradas para uma pergunta (para errar de forma crivel)
  | 'nota-clue' // uma dica que indica uma nota numa escala
  | 'proibido-clues' // dicas para a palavra sem usar as proibidas
  | 'list'; // itens validos de uma categoria (Duvido)

const cache = new Map<string, Promise<string[]>>();

export function botThink(kind: BotThinkKind, input: Record<string, unknown>, timeoutMs = 7000): Promise<string[]> {
  const key = kind + '|' + JSON.stringify(input);
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      const res = await fetch('/api/bot-think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, input }),
        signal: ctrl?.signal
      });
      if (timer) clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.items) ? data.items.map((s: unknown) => String(s || '').trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  })();
  cache.set(key, p);
  // nao guarda falhas para sempre
  p.then((items) => {
    if (!items.length) cache.delete(key);
  });
  return p;
}
