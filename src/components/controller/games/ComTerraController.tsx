import React from 'react';
import type { ComTerraState, GameRoom, Player } from '../../../types/game';
import { CTSeat } from '../../comterra/CTSeat';
import { CTSummary } from '../../comterra/CTSummary';
import { BPSeat } from '../../comterra/BPViews';
import '../../comterra/comterra.css';

interface ComTerraControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  onNextRound?: () => void;
}

/** Com Terra no celular: o lugar do jogador (tabuleiro, loja e adversarios em abas). */
export const ComTerraController: React.FC<ComTerraControllerProps> = ({ room, player, onUpdateRoom, onNextRound }) => {
  const ct = room.comTerra;
  if (!ct) return null;
  const onUpdate = (fn: (prev: ComTerraState) => ComTerraState) =>
    onUpdateRoom((prev) => ({ ...prev, comTerra: prev.comTerra ? fn(prev.comTerra) : undefined }));
  // sem TV (modo so celular), quem comanda a sala encerra a partida pelo proprio aparelho
  const isLeader = Boolean(player.isVip) || Boolean(player.isMasterControl) || room.players[0]?.id === player.id;
  const canFinish = room.connectionMode === 'multi' && isLeader && !!onNextRound;

  return (
    <div className="ct-phone ct-box" data-testid="controller-ct-view">
      {ct.phase === 'SUMMARY' ? (
        <CTSummary state={ct} players={room.players} onFinish={canFinish ? onNextRound : undefined} />
      ) : (
        ct.bp ? (
          <BPSeat state={ct} players={room.players} playerId={player.id} onUpdate={onUpdate} />
        ) : (
          <CTSeat state={ct} players={room.players} playerId={player.id} onUpdate={onUpdate} />
        )
      )}
    </div>
  );
};
