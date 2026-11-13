import { lazy } from 'react';

// Telas de jogo e componentes pesados são carregados sob demanda (code-splitting)
// para reduzir o bundle inicial e acelerar o primeiro carregamento no celular/TV.
export const ScreenLimite = lazy(() =>
  import('../components/host/ScreenLimite').then((m) => ({ default: m.ScreenLimite }))
);
export const ScreenDuvido = lazy(() =>
  import('../components/host/ScreenDuvido').then((m) => ({ default: m.ScreenDuvido }))
);
export const ScreenComoEuPinto = lazy(() =>
  import('../components/host/ScreenComoEuPinto').then((m) => ({ default: m.ScreenComoEuPinto }))
);
export const ScreenComTerra = lazy(() =>
  import('../components/host/ScreenComTerra').then((m) => ({ default: m.ScreenComTerra }))
);
export const ScreenAdedanha = lazy(() =>
  import('../components/host/ScreenAdedanha').then((m) => ({ default: m.ScreenAdedanha }))
);
export const ScreenEstadios = lazy(() =>
  import('../components/host/ScreenEstadios').then((m) => ({ default: m.ScreenEstadios }))
);
export const ScreenRespostasSemPerguntas = lazy(() =>
  import('../components/host/ScreenRespostasSemPerguntas').then((m) => ({ default: m.ScreenRespostasSemPerguntas }))
);
export const ScreenRepetente = lazy(() =>
  import('../components/host/ScreenRepetente').then((m) => ({ default: m.ScreenRepetente }))
);
export const ScreenMegaResenha = lazy(() =>
  import('../components/host/ScreenMegaResenha').then((m) => ({ default: m.ScreenMegaResenha }))
);
export const ScreenQuemSouEu = lazy(() =>
  import('../components/host/ScreenQuemSouEu').then((m) => ({ default: m.ScreenQuemSouEu }))
);
export const ScreenMimica = lazy(() =>
  import('../components/host/ScreenMimica').then((m) => ({ default: m.ScreenMimica }))
);
export const ScreenProibido = lazy(() =>
  import('../components/host/ScreenProibido').then((m) => ({ default: m.ScreenProibido }))
);
export const ScreenNota = lazy(() =>
  import('../components/host/ScreenNota').then((m) => ({ default: m.ScreenNota }))
);
export const ScreenTemOuNaoTem = lazy(() =>
  import('../components/host/ScreenTemOuNaoTem').then((m) => ({ default: m.ScreenTemOuNaoTem }))
);
export const ScreenPerguntasEVerdades = lazy(() =>
  import('../components/host/ScreenPerguntasEVerdades').then((m) => ({
    default: m.ScreenPerguntasEVerdades
  }))
);
/** Baixa de antemao o codigo da tela de um jogo (sem montar nada), para a partida abrir sem "carregando". */
const GAME_SCREEN_LOADERS: Record<string, () => Promise<unknown>> = {
  limite: () => import('../components/host/ScreenLimite'),
  duvido: () => import('../components/host/ScreenDuvido'),
  proibido: () => import('../components/host/ScreenProibido'),
  nota: () => import('../components/host/ScreenNota'),
  'tem-ou-nao-tem': () => import('../components/host/ScreenTemOuNaoTem'),
  'perguntas-e-verdades': () => import('../components/host/ScreenPerguntasEVerdades'),
  mimica: () => import('../components/host/ScreenMimica'),
  'quem-sou-eu': () => import('../components/host/ScreenQuemSouEu'),
  'onde-estou': () => import('../components/host/ScreenQuemSouEu'),
  'mega-resenha': () => import('../components/host/ScreenMegaResenha'),
  repetente: () => import('../components/host/ScreenRepetente'),
  'respostas-sem-perguntas': () => import('../components/host/ScreenRespostasSemPerguntas'),
  estadios: () => import('../components/host/ScreenEstadios'),
  adedanha: () => import('../components/host/ScreenAdedanha'),
  'como-eu-pinto': () => import('../components/host/ScreenComoEuPinto'),
  'com-terra': () => import('../components/host/ScreenComTerra')
};
export function preloadGameScreen(gameId: string | null | undefined): void {
  const load = gameId ? GAME_SCREEN_LOADERS[gameId] : undefined;
  if (load) void load().catch(() => undefined);
}

// UX-07: o simulador de controles e ferramenta de desenvolvimento; so aparece em dev ou com ?dev na URL.
export const SHOW_DEV_TOOLS = (() => {
  try {
    return Boolean(import.meta.env.DEV) || new URLSearchParams(window.location.search).has('dev');
  } catch {
    return false;
  }
})();

export const DevControlsDrawer = lazy(() =>
  import('../components/dev/DevControlsDrawer').then((m) => ({ default: m.DevControlsDrawer }))
);
export const ComparePlayersModal = lazy(() =>
  import('../components/ComparePlayersModal').then((m) => ({ default: m.ComparePlayersModal }))
);
