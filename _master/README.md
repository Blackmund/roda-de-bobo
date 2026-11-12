# Mestres da arte (ART-01)

Originais em alta resolucao, **fora de `public/`** (nao vao para o site publicado).

- `cazetv/`: PNG e JPG das 6 artes do tema original. O site usa as versoes WebP geradas por `scripts/make-webp.mjs`
  (em `public/assets/cazetv/`); os `.svg` de la sao os animados e nao saem daqui.
- `aistudio/`: imagens de referencia criadas no AI Studio (nao usadas pelo codigo).

Tag `arte-boa-0711`: estado do repositorio com o visual de 07/11.

Para regenerar os WebP: `npm i --no-save sharp && node scripts/make-webp.mjs`.
