import { normalizeSeenText } from './seenMemory';

// Perguntas retiradas do jogo, inclusive quando a IA muda a redação.
const retiredTopics = [
  ['desastre|tragedia|catastrofe', 'historic'],
  ['brinquedo|acessorio', 'infancia|infantil', 'saudade|falta|nostalgia'],
  ['cientista', 'genial|genio|inteligencia|inteligente'],
  ['giria', 'legal|bacana|maneiro'],
  ['mochila', 'trabalho|escola', 'carrega|essencial|leva']
];

export function isRetiredTemQuestion(question: string): boolean {
  const words = normalizeSeenText(question).split(' ');
  return retiredTopics.some((topic) =>
    topic.every((group) => group.split('|').some((prefix) => words.some((word) => word.startsWith(prefix))))
  );
}
