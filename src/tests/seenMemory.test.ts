import test from 'node:test';
import assert from 'node:assert/strict';

// localStorage de mentira para testar a persistencia.
const ls = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => void ls.set(k, v),
    removeItem: (k: string) => void ls.delete(k)
  }
};

const mod = await import('../utils/seenMemory.ts');

test('seenMemory: ignora acento, caixa e pontuacao ao reconhecer o que ja foi visto', () => {
  mod.clearSeenMemory();
  assert.equal(mod.isSeen('Qual é o MAIOR estádio do Brasil?'), false);
  mod.markSeen('Qual é o MAIOR estádio do Brasil?');
  assert.equal(mod.isSeen('qual e o maior estadio do brasil'), true);
  assert.equal(mod.isSeen('Qual o menor estádio do Brasil?'), false);
});

test('seenMemory: pergunta reescrita com as mesmas palavras de conteudo conta como repetida', () => {
  mod.clearSeenMemory();
  mod.markSeen('Cite uma vilã clássica de novelas brasileiras que todo mundo lembra pela maldade');
  assert.equal(mod.looksRepeated('Diga uma vilã clássica das novelas brasileiras lembrada por toda maldade'), true);
  assert.equal(mod.looksRepeated('Cite um galã clássico de novelas brasileiras que fez todo mundo suspirar'), false);
  assert.equal(mod.looksRepeated('Qual estádio recebeu a final da Copa de 1950?'), false);
});

test('seenMemory: ordem = visto ha mais tempo primeiro; rever move para o fim', () => {
  mod.clearSeenMemory();
  mod.markSeen('alfa um');
  mod.markSeen('beta dois');
  mod.markSeen('gama tres');
  assert.ok(mod.seenOrder('alfa um') < mod.seenOrder('beta dois'));
  assert.equal(mod.seenOrder('nunca visto'), -1);
  mod.markSeen('alfa um');
  assert.ok(mod.seenOrder('alfa um') > mod.seenOrder('gama tres'), 'revisto vira o mais recente');
  assert.equal(mod.seenCount(), 3);
});

test('seenMemory: persiste no localStorage e volta apos recarregar', () => {
  mod.clearSeenMemory();
  mod.markSeen('Pergunta persistida sobre futebol');
  mod.flushSeenMemory();
  mod.reloadSeenMemoryForTests();
  assert.equal(mod.isSeen('pergunta persistida sobre futebol'), true);
  assert.equal(mod.seenCount(), 1);
});

test('seenMemory: guarda dezenas de milhares e so esquece o mais antigo depois do teto', () => {
  mod.clearSeenMemory();
  const total = mod.SEEN_MAX + 50;
  for (let i = 0; i < total; i++) mod.markSeen(`item numero ${i} unico`);
  assert.equal(mod.seenCount(), mod.SEEN_MAX);
  assert.equal(mod.isSeen('item numero 0 unico'), false, 'o mais antigo foi esquecido');
  assert.equal(mod.isSeen(`item numero ${total - 1} unico`), true);
  assert.equal(mod.isSeen('item numero 100 unico'), true);
  mod.flushSeenMemory();
  const bytes = (ls.get('rb_seen_v1') || '').length;
  assert.ok(bytes < 400_000, `memoria ocupa ${bytes} bytes (esperado < 400 KB)`);
  mod.clearSeenMemory();
});

test('seenMemory: chaves de conteudo por jogo (proibido por palavra, duvido por categoria)', () => {
  mod.clearSeenMemory();
  const round = [{ palavra_alvo: 'MARACANAZO' }, { palavra_alvo: 'GOL DE MAO' }];
  assert.equal(mod.contentRepeated('proibido', round), false);
  mod.markContentSeen('proibido', round);
  assert.equal(mod.contentRepeated('proibido', [{ palavra_alvo: 'Maracanazo' }]), true);
  assert.equal(mod.contentRepeated('proibido', [{ palavra_alvo: 'OUTRA' }]), false);
  mod.markContentSeen('duvido', { categoria_secreta: 'Jogadores campeoes da Bola de Ouro' });
  assert.equal(mod.contentRepeated('duvido', { categoria_secreta: 'jogadores campeões da bola de ouro!' }), true);
  mod.clearSeenMemory();
});
