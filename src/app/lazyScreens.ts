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
