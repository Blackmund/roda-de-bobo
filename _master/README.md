# Mestres da arte (ART-01)

Originais em alta resolucao, **fora de `public/`** (nao vao para o site publicado).

- `cazetv/`: PNG e JPG das 6 artes do tema original. O site usa as versoes WebP geradas por `scripts/make-webp.mjs`
  (em `public/assets/cazetv/`); os `.svg` de la sao os animados e nao saem daqui.
- `aistudio/`: imagens de referencia criadas no AI Studio (nao usadas pelo codigo).

Tag `arte-boa-0711`: estado do repositorio com o visual de 07/11.

Para regenerar os WebP: `npm i --no-save sharp && node scripts/make-webp.mjs`.

## Bonecos dos cards (guardados em 12/11/2026)

Os 6 jogos classicos usavam estes bonecos nos cards do catalogo. Eles foram trocados por vinhetas no mesmo estilo dos
outros 8 jogos. Nada foi apagado:

- PNG originais: `_master/cazetv/`; WebP prontos para o site: `public/assets/cazetv/`.
- O codigo que mostrava os bonecos nos cards esta na tag `cards-bonecos-0711`
  (`git show cards-bonecos-0711:src/components/art/GameCardArt.tsx`).
