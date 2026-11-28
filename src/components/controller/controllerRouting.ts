import type { GameRoom } from '../../types/game';

export type ControllerViewTarget =
  | 'pad'
  | 'join'
  | 'lobby-controller'
  | 'master-remote'
  | 'game-controller';

export interface ResolveControllerViewInput {
  isPadMode: boolean;
  hasPlayer: boolean;
  forceJoinScreen: boolean;
  roomScreen: GameRoom['screen'];
  isMasterRemoteMode: boolean;
}

/**
 * Determines which top-level screen the mobile controller should render.
 * Lobby/setup/rules always stay on ScreenMobileController (which includes the
 * full VIP Host control panel), while MasterRemoteController only takes over
 * during active gameplay (`playing`).
 */
export function resolveControllerViewTarget(
  input: ResolveControllerViewInput
): ControllerViewTarget {
  if (input.isPadMode) return 'pad';
  if (!input.hasPlayer || input.forceJoinScreen) return 'join';
  if (
    input.roomScreen === 'mode-select' ||
    input.roomScreen === 'lobby' ||
    input.roomScreen === 'game-setup' ||
    input.roomScreen === 'rules'
  ) {
    return 'lobby-controller';
  }
  if (input.isMasterRemoteMode && input.roomScreen === 'playing') {
    return 'master-remote';
  }
  return 'game-controller';
}
