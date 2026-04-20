'use client';

import { PlayerState } from '@/lib/gameState';
import { useBattle } from '@/hooks/useBattle';
import { STAGES } from '@/lib/gameData';
import { BattleTopHud } from '@/components/battle/BattleTopHud';
import { BattleArena } from '@/components/battle/BattleArena';
import { BattleBottomGrid } from '@/components/battle/BattleBottomGrid';
import { BattleControlsBar } from '@/components/battle/BattleControlsBar';
import { BattleStateData } from '@/components/battle/BattleArena';
import { ElementalGuide } from '@/components/ui/ElementalGuide';
import { useState } from 'react';

interface BattleScreenProps {
  state: PlayerState;
  stageId: number;
  onEnd: (victory: boolean) => void;
  onBack?: () => void;
}

export default function BattleScreen({ state, stageId, onEnd }: BattleScreenProps) {
  const stage = STAGES.find(s => s.id === stageId);
  const [showElementGuide, setShowElementGuide] = useState(false);

  const {
    playerUnits,
    enemyUnits,
    turnCount,
    turnState,
    combatLog,
    executeTurn,
    handleUnitClick,
    screenShake,
    floatingTexts,
    inventoryItems,
    selectedItem,
    setSelectedItem,
  } = useBattle(state, stageId, onEnd);

  const battleState: BattleStateData = {
    playerUnits,
    enemyUnits,
    turnState,
    combatLog,
    bbHitEffect: null,
    selectedItem,
    handleUnitClick,
    screenShake,
    floatingTexts,
  };

  const controlsData = {
    ...battleState,
    inventoryItems: inventoryItems || [],
    setSelectedItem,
    executeTurn,
    playerUnits,
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0a14]">
      {/* Top HUD - minimal ~40px */}
      <BattleTopHud 
        zel={stage?.zelReward || 0}
        gems={0}
        turnCount={turnCount}
        battlePhase={turnState}
        onMenuClick={() => setShowElementGuide(true)}
        menuLabel="ELEMENT"
      />

      {/* Battle Arena - takes most space */}
      <BattleArena battleState={battleState} />

      {/* Unit Status Row - horizontal compact ~80px */}
      <BattleBottomGrid 
        playerUnits={playerUnits}
        enemyUnits={enemyUnits}
        turnState={turnState}
        onUnitClick={handleUnitClick}
      />

      {/* Control Bar - minimal ~50px */}
      <BattleControlsBar battleState={controlsData} />

      <ElementalGuide isOpen={showElementGuide} onClose={() => setShowElementGuide(false)} />
    </div>
  );
}
