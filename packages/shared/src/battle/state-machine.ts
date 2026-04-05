import {
  BattlePhase,
  BattleMode,
  BattleState,
  BattlePlayer,
  BattleRound,
  BattleResult,
  Difficulty,
  DefenseType,
} from './types';
import { calculateDamage, calculateDefenseResult, calculateXpGained, calculateRatingChange } from './scoring';
import { MAX_HP, ROUNDS_PER_BATTLE, SPARRING_ROUNDS, ROUND_TIME_LIMIT, ELO_DEFAULT_RATING } from '../constants';

let battleCounter = 0;

/**
 * Create a new battle between two players.
 */
export function createBattle(
  player1: Pick<BattlePlayer, 'id' | 'name' | 'avatarUrl'>,
  player2: Pick<BattlePlayer, 'id' | 'name' | 'avatarUrl'>,
  mode: BattleMode,
  categories: string[],
): BattleState {
  if (categories.length === 0) {
    throw new Error('At least one category is required');
  }

  const totalRounds = mode === BattleMode.SIEGE ? ROUNDS_PER_BATTLE : SPARRING_ROUNDS;
  battleCounter++;

  return {
    id: `battle_${battleCounter}_${Date.now()}`,
    phase: BattlePhase.CATEGORY_SELECT,
    mode,
    player1: {
      id: player1.id,
      name: player1.name,
      avatarUrl: player1.avatarUrl,
      score: 0,
      hp: MAX_HP,
    },
    player2: {
      id: player2.id,
      name: player2.name,
      avatarUrl: player2.avatarUrl,
      score: 0,
      hp: MAX_HP,
    },
    currentRound: 1,
    totalRounds,
    rounds: [],
    categories,
    currentAttackerId: player1.id,
    currentDefenderId: player2.id,
    timeLimit: ROUND_TIME_LIMIT,
    startedAt: Date.now(),
  };
}

/**
 * Select a category for the current round.
 */
export function selectCategory(state: BattleState, category: string): BattleState {
  if (state.phase !== BattlePhase.CATEGORY_SELECT) {
    throw new Error(`Cannot select category in phase ${state.phase}`);
  }

  if (!state.categories.includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }

  return {
    ...state,
    selectedCategory: category,
    phase: BattlePhase.ROUND_ATTACK,
  };
}

/**
 * Choose difficulty for the current round (attacker chooses).
 */
export function chooseDifficulty(state: BattleState, playerId: string, difficulty: Difficulty): BattleState {
  if (state.phase !== BattlePhase.ROUND_ATTACK) {
    throw new Error(`Cannot choose difficulty in phase ${state.phase}`);
  }

  if (playerId !== state.currentAttackerId) {
    throw new Error(`Player ${playerId} is not the current attacker`);
  }

  // Create a new round entry
  const newRound: BattleRound = {
    roundNumber: state.currentRound,
    attackerId: state.currentAttackerId!,
    defenderId: state.currentDefenderId!,
    difficulty,
    damageDealt: 0,
    pointsAwarded: 0,
  };

  return {
    ...state,
    rounds: [...state.rounds, newRound],
  };
}

/**
 * Submit the attacker's answer.
 */
export function submitAnswer(
  state: BattleState,
  playerId: string,
  answerIndex: number,
  isCorrect: boolean,
): BattleState {
  if (state.phase !== BattlePhase.ROUND_ATTACK) {
    throw new Error(`Cannot submit answer in phase ${state.phase}`);
  }

  if (playerId !== state.currentAttackerId) {
    throw new Error(`Player ${playerId} is not the current attacker`);
  }

  const currentRoundData = state.rounds[state.rounds.length - 1];
  if (!currentRoundData || currentRoundData.roundNumber !== state.currentRound) {
    throw new Error('Must choose difficulty before submitting an answer');
  }

  if (!currentRoundData.difficulty) {
    throw new Error('Must choose difficulty before submitting an answer');
  }

  const damage = calculateDamage(currentRoundData.difficulty, isCorrect);

  const updatedRound: BattleRound = {
    ...currentRoundData,
    attackerAnswer: answerIndex,
    attackerCorrect: isCorrect,
    damageDealt: damage,
  };

  const updatedRounds = [...state.rounds.slice(0, -1), updatedRound];

  // If attacker got it wrong, skip defense and go to round result
  if (!isCorrect) {
    return {
      ...state,
      rounds: updatedRounds,
      phase: BattlePhase.ROUND_RESULT,
    };
  }

  // Attacker correct: move to defense phase
  return {
    ...state,
    rounds: updatedRounds,
    phase: BattlePhase.ROUND_DEFENSE,
  };
}

/**
 * Submit the defender's defense action.
 */
export function submitDefense(
  state: BattleState,
  playerId: string,
  defenseType: DefenseType,
  success: boolean,
): BattleState {
  if (state.phase !== BattlePhase.ROUND_DEFENSE) {
    throw new Error(`Cannot submit defense in phase ${state.phase}`);
  }

  if (playerId !== state.currentDefenderId) {
    throw new Error(`Player ${playerId} is not the current defender`);
  }

  const currentRoundData = state.rounds[state.rounds.length - 1];
  if (!currentRoundData) {
    throw new Error('No current round data');
  }

  const { damage, reflected } = calculateDefenseResult(defenseType, success, currentRoundData.damageDealt);

  // Apply damage to the correct player
  let player1 = { ...state.player1 };
  let player2 = { ...state.player2 };

  if (reflected) {
    // Damage goes back to attacker
    if (state.currentAttackerId === player1.id) {
      player1 = { ...player1, hp: Math.max(0, player1.hp - damage) };
      player2 = { ...player2, score: player2.score + damage };
    } else {
      player2 = { ...player2, hp: Math.max(0, player2.hp - damage) };
      player1 = { ...player1, score: player1.score + damage };
    }
  } else {
    // Damage goes to defender
    if (state.currentDefenderId === player1.id) {
      player1 = { ...player1, hp: Math.max(0, player1.hp - damage) };
      player2 = { ...player2, score: player2.score + damage };
    } else {
      player2 = { ...player2, hp: Math.max(0, player2.hp - damage) };
      player1 = { ...player1, score: player1.score + damage };
    }
  }

  const updatedRound: BattleRound = {
    ...currentRoundData,
    defenseType,
    defenseSuccess: success,
    damageDealt: damage,
    pointsAwarded: damage,
  };

  const updatedRounds = [...state.rounds.slice(0, -1), updatedRound];

  return {
    ...state,
    player1,
    player2,
    rounds: updatedRounds,
    phase: BattlePhase.ROUND_RESULT,
  };
}

/**
 * Determine the attacker for a given round.
 * Siege flow:
 *   R1, R2: player1 attacks
 *   R3, R4: player2 attacks
 *   R5: whoever has lower score (is behind) attacks; ties go to player1
 */
function getAttackerForRound(
  roundNumber: number,
  totalRounds: number,
  player1: BattlePlayer,
  player2: BattlePlayer,
): { attackerId: string; defenderId: string } {
  if (roundNumber <= 2) {
    return { attackerId: player1.id, defenderId: player2.id };
  }
  if (roundNumber <= 4) {
    return { attackerId: player2.id, defenderId: player1.id };
  }
  // Round 5 (or last round): whoever is behind attacks
  if (player2.score > player1.score) {
    return { attackerId: player1.id, defenderId: player2.id };
  }
  if (player1.score > player2.score) {
    return { attackerId: player2.id, defenderId: player1.id };
  }
  // Tie: player1 attacks
  return { attackerId: player1.id, defenderId: player2.id };
}

/**
 * Advance to the next phase based on current state.
 */
export function nextPhase(state: BattleState): BattleState {
  switch (state.phase) {
    case BattlePhase.ROUND_RESULT: {
      // Check if game is over
      if (isGameOver(state)) {
        return {
          ...state,
          phase: BattlePhase.FINAL_RESULT,
          endedAt: Date.now(),
        };
      }

      const nextRound = state.currentRound + 1;

      // Check if roles need to swap (after round 2 and round 4)
      const currentRoundNum = state.currentRound;
      const needsSwap = currentRoundNum === 2 || currentRoundNum === 4;

      if (needsSwap) {
        const { attackerId, defenderId } = getAttackerForRound(
          nextRound,
          state.totalRounds,
          state.player1,
          state.player2,
        );
        return {
          ...state,
          phase: BattlePhase.SWAP_ROLES,
          currentRound: nextRound,
          currentAttackerId: attackerId,
          currentDefenderId: defenderId,
        };
      }

      // No swap needed, determine roles for next round and go to category select
      const { attackerId, defenderId } = getAttackerForRound(
        nextRound,
        state.totalRounds,
        state.player1,
        state.player2,
      );

      return {
        ...state,
        phase: BattlePhase.CATEGORY_SELECT,
        currentRound: nextRound,
        currentAttackerId: attackerId,
        currentDefenderId: defenderId,
        selectedCategory: undefined,
      };
    }

    case BattlePhase.SWAP_ROLES: {
      return {
        ...state,
        phase: BattlePhase.CATEGORY_SELECT,
        selectedCategory: undefined,
      };
    }

    case BattlePhase.FINAL_RESULT: {
      throw new Error('Battle is already over');
    }

    default:
      throw new Error(`Cannot advance from phase ${state.phase}`);
  }
}

/**
 * Check if the game is over.
 * Game ends when:
 * - All rounds are completed
 * - Any player's HP drops to 0
 */
export function isGameOver(state: BattleState): boolean {
  if (state.player1.hp <= 0 || state.player2.hp <= 0) {
    return true;
  }
  if (state.currentRound >= state.totalRounds && state.phase === BattlePhase.ROUND_RESULT) {
    return true;
  }
  return false;
}

/**
 * Get the final result of a completed battle.
 */
export function getResult(state: BattleState): BattleResult {
  if (state.phase !== BattlePhase.FINAL_RESULT && !isGameOver(state)) {
    throw new Error('Battle is not over yet');
  }

  let winnerId: string | null = null;
  if (state.player1.score > state.player2.score) {
    winnerId = state.player1.id;
  } else if (state.player2.score > state.player1.score) {
    winnerId = state.player2.id;
  }
  // null = draw

  const p1Won = winnerId === state.player1.id;
  const p2Won = winnerId === state.player2.id;

  const p1Xp = calculateXpGained(state.rounds, p1Won);
  const p2Xp = calculateXpGained(state.rounds, p2Won);

  const xpGained: Record<string, number> = {
    [state.player1.id]: p1Xp['battle'] ?? 0,
    [state.player2.id]: p2Xp['battle'] ?? 0,
  };

  const ratingChange = calculateRatingChange(
    ELO_DEFAULT_RATING,
    ELO_DEFAULT_RATING,
    p1Won,
  );

  return {
    winnerId,
    player1Score: state.player1.score,
    player2Score: state.player2.score,
    xpGained,
    ratingChange,
  };
}
