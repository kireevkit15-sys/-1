import {
  createBattle,
  selectCategory,
  chooseDifficulty,
  submitAnswer,
  submitDefense,
  nextPhase,
  isGameOver,
  getResult,
  handleTimeout,
  handleDisconnect,
} from '../../src/battle/state-machine';
import {
  BattlePhase,
  BattleMode,
  Difficulty,
  DefenseType,
  BattleState,
} from '../../src/battle/types';
import { MAX_HP } from '../../src/constants';

const player1 = { id: 'p1', name: 'Alice' };
const player2 = { id: 'p2', name: 'Bob' };
const categories = ['Logic', 'Strategy', 'Philosophy'];

function makeBattle(): BattleState {
  return createBattle(player1, player2, BattleMode.SIEGE, categories);
}

describe('createBattle', () => {
  it('should create a battle with correct initial state', () => {
    const state = makeBattle();

    expect(state.phase).toBe(BattlePhase.CATEGORY_SELECT);
    expect(state.mode).toBe(BattleMode.SIEGE);
    expect(state.player1.id).toBe('p1');
    expect(state.player2.id).toBe('p2');
    expect(state.player1.hp).toBe(MAX_HP);
    expect(state.player2.hp).toBe(MAX_HP);
    expect(state.player1.score).toBe(0);
    expect(state.player2.score).toBe(0);
    expect(state.currentRound).toBe(1);
    expect(state.totalRounds).toBe(5);
    expect(state.rounds).toEqual([]);
    expect(state.currentAttackerId).toBe('p1');
    expect(state.currentDefenderId).toBe('p2');
    expect(state.categories).toEqual(categories);
    expect(state.startedAt).toBeDefined();
  });

  it('should throw if no categories provided', () => {
    expect(() => createBattle(player1, player2, BattleMode.SIEGE, [])).toThrow(
      'At least one category is required',
    );
  });

  it('should create SPARRING mode with 3 rounds', () => {
    const state = createBattle(player1, player2, BattleMode.SPARRING, categories);
    expect(state.totalRounds).toBe(3);
  });
});

describe('selectCategory', () => {
  it('should select a valid category and advance to ROUND_ATTACK', () => {
    const state = makeBattle();
    const next = selectCategory(state, 'Logic');

    expect(next.selectedCategory).toBe('Logic');
    expect(next.phase).toBe(BattlePhase.ROUND_ATTACK);
  });

  it('should throw on invalid category', () => {
    const state = makeBattle();
    expect(() => selectCategory(state, 'InvalidCategory')).toThrow('Invalid category');
  });

  it('should throw if not in CATEGORY_SELECT phase', () => {
    const state = { ...makeBattle(), phase: BattlePhase.ROUND_ATTACK };
    expect(() => selectCategory(state, 'Logic')).toThrow('Cannot select category');
  });
});

describe('full attack round', () => {
  it('should handle choose difficulty -> correct answer -> damage calculated', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');

    // Choose difficulty
    state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0]!.difficulty).toBe(Difficulty.BRONZE);

    // Submit correct answer
    state = submitAnswer(state, 'p1', 2, true);
    expect(state.rounds[0]!.attackerCorrect).toBe(true);
    expect(state.rounds[0]!.attackerAnswer).toBe(2);
    expect(state.rounds[0]!.damageDealt).toBe(10); // BRONZE = 10
    expect(state.phase).toBe(BattlePhase.ROUND_DEFENSE);
  });

  it('should skip defense phase when attacker answers incorrectly', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.SILVER);
    state = submitAnswer(state, 'p1', 1, false);

    expect(state.rounds[0]!.attackerCorrect).toBe(false);
    expect(state.rounds[0]!.damageDealt).toBe(0);
    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
  });

  it('should throw if wrong player tries to answer', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);

    expect(() => submitAnswer(state, 'p2', 0, true)).toThrow('not the current attacker');
  });

  it('should throw if difficulty not chosen before answering', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');

    // No chooseDifficulty call
    expect(() => submitAnswer(state, 'p1', 0, true)).toThrow('Must choose difficulty');
  });
});

describe('defense mechanics', () => {
  function getToDefensePhase(): BattleState {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.SILVER);
    state = submitAnswer(state, 'p1', 0, true);
    expect(state.phase).toBe(BattlePhase.ROUND_DEFENSE);
    return state;
  }

  it('ACCEPT: damage passes through to defender', () => {
    let state = getToDefensePhase();
    state = submitDefense(state, 'p2', DefenseType.ACCEPT, true);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player2.hp).toBe(MAX_HP - 20); // SILVER = 20 to defender
    expect(state.player1.score).toBe(20);
    expect(state.player1.hp).toBe(MAX_HP); // attacker unharmed
  });

  it('DISPUTE success: damage reflected to attacker', () => {
    let state = getToDefensePhase();
    state = submitDefense(state, 'p2', DefenseType.DISPUTE, true);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player1.hp).toBe(MAX_HP - 20); // reflected to attacker
    expect(state.player2.hp).toBe(MAX_HP); // defender unharmed
    expect(state.player2.score).toBe(20);
  });

  it('DISPUTE fail: damage passes through to defender', () => {
    let state = getToDefensePhase();
    state = submitDefense(state, 'p2', DefenseType.DISPUTE, false);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player2.hp).toBe(MAX_HP - 20); // damage to defender
    expect(state.player1.hp).toBe(MAX_HP);
    expect(state.player1.score).toBe(20);
  });

  it('COUNTER success: double damage reflected to attacker', () => {
    let state = getToDefensePhase();
    state = submitDefense(state, 'p2', DefenseType.COUNTER, true);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player1.hp).toBe(MAX_HP - 40); // double damage reflected
    expect(state.player2.hp).toBe(MAX_HP); // defender unharmed
    expect(state.player2.score).toBe(40);
  });

  it('COUNTER fail: damage passes through to defender', () => {
    let state = getToDefensePhase();
    state = submitDefense(state, 'p2', DefenseType.COUNTER, false);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player2.hp).toBe(MAX_HP - 20);
    expect(state.player1.hp).toBe(MAX_HP);
  });

  it('should throw if wrong player tries to defend', () => {
    const state = getToDefensePhase();
    expect(() => submitDefense(state, 'p1', DefenseType.ACCEPT, true)).toThrow(
      'not the current defender',
    );
  });

  it('should throw if not in defense phase', () => {
    const state = makeBattle();
    expect(() => submitDefense(state, 'p2', DefenseType.ACCEPT, true)).toThrow(
      'Cannot submit defense',
    );
  });
});

describe('role swapping', () => {
  function completeRound(
    state: BattleState,
    attackerId: string,
    defenderId: string,
    difficulty: Difficulty = Difficulty.BRONZE,
    correct = true,
    defenseType: DefenseType = DefenseType.ACCEPT,
  ): BattleState {
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, attackerId, difficulty);
    state = submitAnswer(state, attackerId, 0, correct);
    if (correct) {
      state = submitDefense(state, defenderId, defenseType, true);
    }
    return state;
  }

  it('should swap roles after round 2', () => {
    let state = makeBattle();

    // Round 1: p1 attacks
    expect(state.currentAttackerId).toBe('p1');
    state = completeRound(state, 'p1', 'p2');
    state = nextPhase(state); // R1 -> R2 (no swap)
    expect(state.phase).toBe(BattlePhase.CATEGORY_SELECT);
    expect(state.currentAttackerId).toBe('p1'); // still p1
    expect(state.currentRound).toBe(2);

    // Round 2: p1 attacks
    state = completeRound(state, 'p1', 'p2');
    state = nextPhase(state); // R2 -> R3 (swap!)
    expect(state.phase).toBe(BattlePhase.SWAP_ROLES);
    expect(state.currentAttackerId).toBe('p2'); // swapped!
    expect(state.currentDefenderId).toBe('p1');
    expect(state.currentRound).toBe(3);

    // Advance past swap
    state = nextPhase(state);
    expect(state.phase).toBe(BattlePhase.CATEGORY_SELECT);
  });

  it('should swap roles again after round 4', () => {
    let state = makeBattle();

    // Play rounds 1-4
    state = completeRound(state, 'p1', 'p2');
    state = nextPhase(state); // -> R2
    state = completeRound(state, 'p1', 'p2');
    state = nextPhase(state); // -> R3 (swap)
    state = nextPhase(state); // past swap

    // Round 3: p2 attacks
    expect(state.currentAttackerId).toBe('p2');
    state = completeRound(state, 'p2', 'p1');
    state = nextPhase(state); // -> R4 (no swap)
    expect(state.currentAttackerId).toBe('p2');

    // Round 4: p2 attacks
    state = completeRound(state, 'p2', 'p1');
    state = nextPhase(state); // -> R5 (swap)
    expect(state.phase).toBe(BattlePhase.SWAP_ROLES);
    expect(state.currentRound).toBe(5);
  });
});

describe('game over detection', () => {
  it('should detect game over when all rounds are completed', () => {
    let state = makeBattle();

    // Play through 5 rounds with wrong answers (fast path)
    for (let i = 0; i < 5; i++) {
      if (state.phase === BattlePhase.SWAP_ROLES) {
        state = nextPhase(state);
      }
      state = selectCategory(state, 'Logic');
      state = chooseDifficulty(state, state.currentAttackerId!, Difficulty.BRONZE);
      state = submitAnswer(state, state.currentAttackerId!, 0, false);

      if (i < 4) {
        expect(isGameOver(state)).toBe(false);
        state = nextPhase(state);
        if (state.phase === BattlePhase.SWAP_ROLES) {
          state = nextPhase(state);
        }
      }
    }

    expect(state.currentRound).toBe(5);
    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(isGameOver(state)).toBe(true);
  });

  it('should detect game over when a player HP drops to 0', () => {
    let state = makeBattle();

    // Force player2 HP to 0
    state = {
      ...state,
      player2: { ...state.player2, hp: 0 },
      phase: BattlePhase.ROUND_RESULT,
    };

    expect(isGameOver(state)).toBe(true);
  });
});

describe('result calculation', () => {
  it('should return correct result with a winner', () => {
    let state = makeBattle();

    // Simulate: p1 scored 20, p2 scored 0
    state = {
      ...state,
      phase: BattlePhase.FINAL_RESULT,
      player1: { ...state.player1, score: 20 },
      player2: { ...state.player2, score: 0 },
      rounds: [
        {
          roundNumber: 1,
          attackerId: 'p1',
          defenderId: 'p2',
          difficulty: Difficulty.SILVER,
          damageDealt: 20,
          pointsAwarded: 20,
          attackerCorrect: true,
          defenseType: DefenseType.ACCEPT,
          defenseSuccess: true,
        },
      ],
      endedAt: Date.now(),
    };

    const result = getResult(state);
    expect(result.winnerId).toBe('p1');
    expect(result.player1Score).toBe(20);
    expect(result.player2Score).toBe(0);
    expect(result.xpGained['p1']).toBeGreaterThan(result.xpGained['p2']!);
    expect(result.ratingChange).toBeDefined();
  });

  it('should return null winnerId on a draw', () => {
    let state = makeBattle();
    state = {
      ...state,
      phase: BattlePhase.FINAL_RESULT,
      player1: { ...state.player1, score: 10 },
      player2: { ...state.player2, score: 10 },
      rounds: [],
      endedAt: Date.now(),
    };

    const result = getResult(state);
    expect(result.winnerId).toBeNull();
  });

  it('should throw if battle is not over', () => {
    const state = makeBattle();
    expect(() => getResult(state)).toThrow('Battle is not over yet');
  });
});

describe('illegal transitions', () => {
  it('should throw when selecting category in wrong phase', () => {
    const state = { ...makeBattle(), phase: BattlePhase.ROUND_DEFENSE };
    expect(() => selectCategory(state, 'Logic')).toThrow();
  });

  it('should throw when choosing difficulty in wrong phase', () => {
    const state = { ...makeBattle(), phase: BattlePhase.CATEGORY_SELECT };
    expect(() => chooseDifficulty(state, 'p1', Difficulty.BRONZE)).toThrow();
  });

  it('should throw when submitting answer in wrong phase', () => {
    const state = { ...makeBattle(), phase: BattlePhase.CATEGORY_SELECT };
    expect(() => submitAnswer(state, 'p1', 0, true)).toThrow();
  });

  it('should throw when advancing from FINAL_RESULT', () => {
    const state = { ...makeBattle(), phase: BattlePhase.FINAL_RESULT };
    expect(() => nextPhase(state)).toThrow('Battle is already over');
  });

  it('should throw when advancing from non-advanceable phase', () => {
    const state = { ...makeBattle(), phase: BattlePhase.ROUND_ATTACK };
    expect(() => nextPhase(state)).toThrow('Cannot advance from phase');
  });
});

describe('handleTimeout', () => {
  it('should auto-fail attack on timeout', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    // Attacker doesn't answer in time
    state = handleTimeout(state);

    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.timedOutRound).toBe(1);
    expect(state.rounds).toHaveLength(1);
    expect(state.rounds[0]!.attackerCorrect).toBe(false);
    expect(state.rounds[0]!.damageDealt).toBe(0);
  });

  it('should auto-accept defense on timeout', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.SILVER);
    state = submitAnswer(state, 'p1', 0, true);
    expect(state.phase).toBe(BattlePhase.ROUND_DEFENSE);

    // Defender doesn't respond in time
    state = handleTimeout(state);
    expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
    expect(state.player2.hp).toBe(MAX_HP - 20); // damage passes through
  });

  it('should throw if timeout called in wrong phase', () => {
    const state = makeBattle(); // CATEGORY_SELECT
    expect(() => handleTimeout(state)).toThrow('Cannot timeout in phase');
  });
});

describe('handleDisconnect', () => {
  it('should forfeit battle when player1 disconnects', () => {
    let state = makeBattle();
    state = handleDisconnect(state, 'p1');

    expect(state.phase).toBe(BattlePhase.FINAL_RESULT);
    expect(state.abandonedBy).toBe('p1');
    expect(state.player1.hp).toBe(0);
    expect(state.player2.hp).toBe(MAX_HP);
    expect(state.endedAt).toBeDefined();
  });

  it('should forfeit battle when player2 disconnects', () => {
    let state = makeBattle();
    state = handleDisconnect(state, 'p2');

    expect(state.phase).toBe(BattlePhase.FINAL_RESULT);
    expect(state.abandonedBy).toBe('p2');
    expect(state.player2.hp).toBe(0);
    expect(state.player1.hp).toBe(MAX_HP);
  });

  it('should be a no-op if battle is already over', () => {
    let state = { ...makeBattle(), phase: BattlePhase.FINAL_RESULT as BattlePhase };
    const result = handleDisconnect(state, 'p1');

    expect(result.phase).toBe(BattlePhase.FINAL_RESULT);
    expect(result.abandonedBy).toBeUndefined(); // unchanged
  });

  it('should work mid-round (during attack phase)', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.GOLD);
    // p2 disconnects during p1's attack
    state = handleDisconnect(state, 'p2');

    expect(state.phase).toBe(BattlePhase.FINAL_RESULT);
    expect(state.abandonedBy).toBe('p2');
  });
});

describe('BattleConfig', () => {
  it('should use custom idGenerator', () => {
    const state = createBattle(player1, player2, BattleMode.SIEGE, categories, {
      idGenerator: () => 'custom-id-123',
    });
    expect(state.id).toBe('custom-id-123');
  });
});

describe('scoring edge cases', () => {
  it('should handle silver damage correctly (20 per hit)', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.SILVER);
    state = submitAnswer(state, 'p1', 0, true);
    expect(state.rounds[0]!.damageDealt).toBe(20);
  });

  it('should handle gold damage correctly (30-35)', () => {
    let state = makeBattle();
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.GOLD);
    state = submitAnswer(state, 'p1', 0, true);
    const damage = state.rounds[0]!.damageDealt;
    expect(damage).toBeGreaterThanOrEqual(30);
    expect(damage).toBeLessThanOrEqual(35);
  });
});

describe('full battle simulation', () => {
  function playRound(
    state: BattleState,
    correct: boolean,
    defense: DefenseType = DefenseType.ACCEPT,
  ): BattleState {
    if (state.phase === BattlePhase.SWAP_ROLES) state = nextPhase(state);
    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, state.currentAttackerId!, Difficulty.BRONZE);
    state = submitAnswer(state, state.currentAttackerId!, 0, correct);
    if (correct) {
      state = submitDefense(state, state.currentDefenderId!, defense, true);
    }
    return state;
  }

  it('should complete a full 5-round siege battle', () => {
    let state = makeBattle();

    for (let i = 0; i < 5; i++) {
      state = playRound(state, true);
      if (i < 4) {
        state = nextPhase(state);
      }
    }

    expect(isGameOver(state)).toBe(true);
    state = nextPhase(state); // -> FINAL_RESULT
    expect(state.phase).toBe(BattlePhase.FINAL_RESULT);

    const result = getResult(state);
    expect(result.winnerId).not.toBeNull();
    expect(result.player1Score + result.player2Score).toBeGreaterThan(0);
  });

  it('should end early when HP hits 0', () => {
    let state = makeBattle();
    // Force low HP
    state = { ...state, player2: { ...state.player2, hp: 5 } };

    state = selectCategory(state, 'Logic');
    state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);
    state = submitAnswer(state, 'p1', 0, true);
    // 10 damage to player2 who has 5 HP
    state = submitDefense(state, 'p2', DefenseType.ACCEPT, true);

    expect(state.player2.hp).toBe(0);
    expect(isGameOver(state)).toBe(true);
  });
});
