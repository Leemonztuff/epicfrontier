import { useState, useCallback } from 'react';
import { useGameState } from '@/lib/gameState';
import type { SummonResult, UnitInstance } from '@/lib/gameState';
import { BattleRewards } from '@/components/BattleRewardsModal';
import { STAGES } from '@/lib/gameData';
import { rpcFinishBattle, rpcSpendEnergy, rpcSummon } from '@/lib/gameApi';

export type Screen =
  | 'home'
  | 'units'
  | 'summon'
  | 'quest'
  | 'battle'
  | 'qrhunt'
  | 'fusion'
  | 'evolution'
  | 'arena'
  | 'shop'
  | 'craft'
  | 'guild'
  | 'randall'
  | 'friends'
  | 'settings';

export function useGameApp(userId?: string | null) {
  const gameState = useGameState({
    userId: userId || undefined,
    autoSave: true,
    saveInterval: 30000,
  });
  const {
    isLoaded,
    timeToNextEnergy,
    spendEnergy,
    refundEnergy,
    winBattle,
    addUnit,
    setTeamMember,
    spendGems,
    rollGacha: rollGachaLocal,
    equipItem,
    unequipItem,
    fuseUnits,
    updateState,
    processQrScan,
    evolveUnit,
    craftItem,
    purchaseShopUnit,
    purchaseShopEquipment,
    purchaseConsumable,
  } = gameState;

  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [battleStage, setBattleStage] = useState<number | null>(null);
  const [fusionTargetId, setFusionTargetId] = useState<string | null>(null);
  const [evolutionTargetId, setEvolutionTargetId] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [battleRewards, setBattleRewards] = useState<BattleRewards | null>(null);

  const useServerEngine = Boolean(userId);

  const triggerAlert = useCallback((message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  }, []);

  const startBattle = useCallback(
    (stageId: number) => {
      const run = async () => {
        const stage = STAGES.find(s => s.id === stageId);
        if (!stage) return;

        const energyCost = stage.energy ?? 1;
        let success = false;

        if (useServerEngine) {
          const rpc = await rpcSpendEnergy(energyCost);
          if (rpc.ok) {
            success = true;
            if (typeof rpc.energy === 'number') {
              updateState({ energy: rpc.energy });
            }
          }
        }

        if (!success) {
          success = spendEnergy(energyCost);
        }

        if (success) {
          setBattleStage(stageId);
          setCurrentScreen('battle');
        } else {
          triggerAlert(`Not enough energy! You need ${energyCost} ⚡ to start this quest.`);
        }
      };

      void run();
    },
    [spendEnergy, triggerAlert, updateState, useServerEngine]
  );

  const endBattle = useCallback(
    (victory: boolean) => {
      const completedStageId = battleStage;
      const run = async () => {
        if (completedStageId === null) {
          setCurrentScreen('home');
          setBattleStage(null);
          return;
        }

        const stage = STAGES.find(s => s.id === completedStageId);
        const stageCode = `stage_${String(completedStageId).padStart(3, '0')}`;
        let handledByServer = false;

        if (useServerEngine) {
          const rpc = await rpcFinishBattle(stageCode, victory);
          if (rpc.ok) {
            handledByServer = true;
            if (victory) {
              const zelReward = rpc.zel_reward || 0;
              const expReward = rpc.exp_reward || 0;

              updateState({
                zel: gameState.state.zel + zelReward,
                exp: gameState.state.exp + expReward,
              });

              setBattleRewards({
                zel: zelReward,
                exp: expReward,
                playerLeveledUp: false,
                leveledUpUnits: [],
                equipmentDropped: [],
                arenaScoreGain: 0,
              });
            }
          }
        }

        if (!handledByServer) {
          if (victory) {
            const rewards = winBattle(completedStageId);
            if (rewards) {
              setBattleRewards(rewards);
            }
          } else if (stage) {
            refundEnergy(stage.energy);
          }
        }

        setCurrentScreen('home');
        setBattleStage(null);
      };

      void run();
    },
    [battleStage, gameState.state.exp, gameState.state.zel, refundEnergy, updateState, useServerEngine, winBattle]
  );

  const dismissBattleRewards = useCallback(() => {
    setBattleRewards(null);
  }, []);

  const navigateToFusion = useCallback((id: string) => {
    setFusionTargetId(id);
    setCurrentScreen('fusion');
  }, []);

  const navigateToEvolution = useCallback((id: string) => {
    setEvolutionTargetId(id);
    setCurrentScreen('evolution');
  }, []);

  const navigate = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  const goBack = useCallback(() => {
    setCurrentScreen('home');
  }, []);

  const handlePurchase = useCallback(
    (price: number, currency: 'zel' | 'gems') => {
      const state = gameState.state;
      if (currency === 'zel' && state.zel >= price) {
        updateState({ zel: state.zel - price });
        return true;
      }
      if (currency === 'gems' && state.gems >= price) {
        updateState({ gems: state.gems - price });
        return true;
      }
      return false;
    },
    [gameState.state, updateState]
  );

  const rollGacha = useCallback(
    async (bannerId: string, count: number = 1): Promise<SummonResult[]> => {
      const serverBannerId = bannerId === 'standard' && count === 10 ? 'standard_multi' : 'standard_single';

      if (useServerEngine) {
        const rpc = await rpcSummon(serverBannerId);
        if (rpc.ok && rpc.results?.length) {
          const current = gameState.state;
          const newUnits: UnitInstance[] = rpc.results.map(r => ({
            instanceId: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            templateId: r.unit_id,
            level: 1,
            exp: 0,
            equipment: { weapon: null, armor: null, accessory: null },
            timesFused: 0,
          }));

          let star5Pulls = current.summonPity.star5Pulls;
          let star4Pulls = current.summonPity.star4Pulls;
          for (const result of rpc.results) {
            star5Pulls = result.rarity >= 5 ? 0 : star5Pulls + 1;
            star4Pulls = result.rarity >= 4 ? 0 : star4Pulls + 1;
          }

          updateState({
            gems: Math.max(0, current.gems - (rpc.cost_gems || 0)),
            inventory: [...current.inventory, ...newUnits],
            summonPity: {
              ...current.summonPity,
              star5Pulls,
              star4Pulls,
              totalPulls: current.summonPity.totalPulls + rpc.results.length,
            },
          });

          return rpc.results.map(result => ({
            templateId: result.unit_id,
            rarity: result.rarity,
            isNew: !result.duplicate,
            duplicate: result.duplicate,
            prismValue: 0,
            zelValue: 0,
          }));
        }
      }

      return rollGachaLocal(bannerId, count);
    },
    [gameState.state, rollGachaLocal, updateState, useServerEngine]
  );

  const setFusionTargetIdState = useCallback((id: string | null) => {
    setFusionTargetId(id);
  }, []);

  const setEvolutionTargetIdState = useCallback((id: string | null) => {
    setEvolutionTargetId(id);
  }, []);

  return {
    gameState,
    isLoaded,
    timeToNextEnergy,
    currentScreen,
    setCurrentScreen: navigate,
    battleStage,
    fusionTargetId,
    evolutionTargetId,
    setFusionTargetId: setFusionTargetIdState,
    setEvolutionTargetId: setEvolutionTargetIdState,
    setShowAlert,
    showAlert,
    alertMessage,
    battleRewards,
    startBattle,
    endBattle,
    dismissBattleRewards,
    navigateToFusion,
    navigateToEvolution,
    navigate,
    goBack,
    triggerAlert,
    handlePurchase,
    addUnit,
    setTeamMember,
    spendGems,
    rollGacha,
    equipItem,
    unequipItem,
    fuseUnits,
    processQrScan,
    evolveUnit,
    craftItem,
    purchaseShopUnit,
    purchaseShopEquipment,
    purchaseConsumable,
  };
}
