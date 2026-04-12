/**
 * BT.13 — Unit tests for BattleStateMachine
 *
 * Tests: all phase transitions, invalid transitions, timeout,
 * disconnect, role swapping, game over conditions, branch/category selection.
 */

import {
  createBattle,
  handleTimeout,
  handleDisconnect,
  selectBranch,
  selectCategory,
  chooseDifficulty,
  submitAnswer,
  submitDefense,
  nextPhase,
  isGameOver,
  getResult,
} from '../../dist/battle/state-machine';

import {
  BattlePhase,
  BattleMode,
  Difficulty,
  DefenseType,
  Branch,
} from '../../dist/battle/types';

import { MAX_HP, ROUNDS_PER_BATTLE, SPARRING_ROUNDS } from '../../dist/constants';

// ── Helpers ──────────────────────────────────────────────────

const p1 = { id: 'p1', name: 'Player 1' };
const p2 = { id: 'p2', name: 'Player 2' };
const categories = ['Математика', 'Логика'];
const fixedId = () => 'test-battle-id';
const fixedRng = (min: number, _max: number) => min; // deterministic gold damage

function createTestBattle(mode = BattleMode.SIEGE) {
  return createBattle(p1, p2, mode, categories, { idGenerator: fixedId, damageRng: fixedRng });
}

/** Helper: advance state through branch select → attack phase */
function toAttackPhase(state: ReturnType<typeof createBattle>) {
  return selectBranch(state, Branch.STRATEGY);
}

/** Helper: advance to defense phase (correct answer) */
function toDefensePhase(state: ReturnType<typeof createBattle>) {
  let s = toAttackPhase(state);
  s = chooseDifficulty(s, 'p1', Difficulty.BRONZE);
  s = submitAnswer(s, 'p1', 0, true);
  return s;
}

// ── Suite ─────────────────────────────────────────────────────

describe('BattleStateMachine', () => {
  // ── 1. createBattle ────────────────────────────────────────

  describe('createBattle', () => {
    it('should create a SIEGE battle with correct initial state', () => {
      const state = createTestBattle();

      expect(state.id).toBe('test-battle-id');
      expect(state.phase).toBe(BattlePhase.BRANCH_SELECT);
      expect(state.mode).toBe(BattleMode.SIEGE);
      expect(state.player1.hp).toBe(MAX_HP);
      expect(state.player2.hp).toBe(MAX_HP);
      expect(state.player1.score).toBe(0);
      expect(state.player2.score).toBe(0);
      expect(state.currentRound).toBe(1);
      expect(state.totalRounds).toBe(ROUNDS_PER_BATTLE);
      expect(state.rounds).toEqual([]);
      expect(state.currentAttackerId).toBe('p1');
      expect(state.currentDefenderId).toBe('p2');
      expect(state.branches).toHaveLength(5);
    });

    it('should create a SPARRING battle with 3 rounds', () => {
      const state = createBattle(p1, p2, BattleMode.SPARRING, categories, { idGenerator: fixedId });
      expect(state.totalRounds).toBe(SPARRING_ROUNDS);
    });

    it('should throw if no categories or branches', () => {
      expect(() => createBattle(p1, p2, BattleMode.SIEGE, [], {}, [])).toThrow(
        'At least one category or branch is required',
      );
    });

    it('should use all 5 branches by default', () => {
      const state = createTestBattle();
      expect(state.branches).toContain(Branch.STRATEGY);
      expect(state.branches).toContain(Branch.LOGIC);
      expect(state.branches).toContain(Branch.ERUDITION);
      expect(state.branches).toContain(Branch.RHETORIC);
      expect(state.branches).toContain(Branch.INTUITION);
    });
  });

  // ── 2. selectBranch ────────────────────────────────────────

  describe('selectBranch', () => {
    it('should transition BRANCH_SELECT → ROUND_ATTACK', () => {
      const state = createTestBattle();
      const next = selectBranch(state, Branch.LOGIC);

      expect(next.phase).toBe(BattlePhase.ROUND_ATTACK);
      expect(next.selectedBranch).toBe(Branch.LOGIC);
    });

    it('should throw on invalid branch', () => {
      const state = createBattle(p1, p2, BattleMode.SIEGE, categories, { idGenerator: fixedId }, [Branch.STRATEGY]);
      expect(() => selectBranch(state, Branch.RHETORIC)).toThrow('Invalid branch');
    });

    it('should throw if not in BRANCH_SELECT phase', () => {
      const state = toAttackPhase(createTestBattle());
      expect(() => selectBranch(state, Branch.LOGIC)).toThrow('Cannot select branch');
    });
  });

  // ── 3. selectCategory (backward compat) ────────────────────

  describe('selectCategory', () => {
    it('should route branch-like categories to selectBranch', () => {
      const state = createTestBattle();
      const next = selectCategory(state, 'STRATEGY');

      expect(next.phase).toBe(BattlePhase.ROUND_ATTACK);
      expect(next.selectedBranch).toBe(Branch.STRATEGY);
    });

    it('should accept regular categories', () => {
      const state = createTestBattle();
      const next = selectCategory(state, 'Математика');

      expect(next.phase).toBe(BattlePhase.ROUND_ATTACK);
      expect(next.selectedCategory).toBe('Математика');
    });

    it('should throw on invalid category', () => {
      const state = createTestBattle();
      expect(() => selectCategory(state, 'NonExistent')).toThrow('Invalid category');
    });
  });

  // ── 4. chooseDifficulty ────────────────────────────────────

  describe('chooseDifficulty', () => {
    it('should add round entry with chosen difficulty', () => {
      const state = toAttackPhase(createTestBattle());
      const next = chooseDifficulty(state, 'p1', Difficulty.SILVER);

      expect(next.rounds).toHaveLength(1);
      expect(next.rounds[0]!.difficulty).toBe(Difficulty.SILVER);
      expect(next.rounds[0]!.attackerId).toBe('p1');
    });

    it('should throw if non-attacker chooses', () => {
      const state = toAttackPhase(createTestBattle());
      expect(() => chooseDifficulty(state, 'p2', Difficulty.BRONZE)).toThrow('not the current attacker');
    });

    it('should throw if not in ROUND_ATTACK phase', () => {
      const state = createTestBattle();
      expect(() => chooseDifficulty(state, 'p1', Difficulty.BRONZE)).toThrow('Cannot choose difficulty');
    });
  });

  // ── 5. submitAnswer ────────────────────────────────────────

  describe('submitAnswer', () => {
    it('correct answer → ROUND_DEFENSE', () => {
      let state = toAttackPhase(createTestBattle());
      state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);
      state = submitAnswer(state, 'p1', 0, true);

      expect(state.phase).toBe(BattlePhase.ROUND_DEFENSE);
      expect(state.rounds[0]!.attackerCorrect).toBe(true);
      expect(state.rounds[0]!.damageDealt).toBe(10); // BRONZE damage
    });

    it('wrong answer → ROUND_RESULT (skip defense)', () => {
      let state = toAttackPhase(createTestBattle());
      state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);
      state = submitAnswer(state, 'p1', 2, false);

      expect(state.phase).toBe(BattlePhase.ROUND_RESULT);
      expect(state.rounds[0]!.attackerCorrect).toBe(false);
      expect(state.rounds[0]!.damageDealt).toBe(0);
    });

    it('should throw if non-attacker submits', () => {
      let state = toAttackPhase(createTestBattle());
      state = chooseDifficulty(state, 'p1', Difficulty.BRONZE);
      expect(() => submitAnswer(state, 'p2', 0, true)).toThrow('not the current attacker');
    });

    it('should throw if difficulty not chosen yet', () => {
      const state = toAttackPhase(createTestBattle());
      // No chooseDifficulty call — rounds is empty
      expect(() => submitAnswer(state, 'p1', 0, true)).toThrow();
    });
  });

  // ── 6. submitDefense ───────────────────────────────────────

  describe('submitDefense', () => {
    it('ACCEPT should apply damage to defender', () => {
      const state = toDefensePhase(createTestBattle());
      const next = submitDefense(state, 'p2', DefenseType.ACCEPT, true);

      expect(next.phase).toBe(BattlePhase.ROUND_RESULT);
      // Defender (p2) takes damage, attacker (p1) gets score
      expect(next.player2.hp).toBe(MAX_HP - 10);
      expect(next.player1.score).toBe(10);
    });

    it('successful DISPUTE should reflect damage to attacker', () => {
      const state = toDefensePhase(createTestBattle());
      const next = submitDefense(state, 'p2', DefenseType.DISPUTE, true);

      expect(next.phase).toBe(BattlePhase.ROUND_RESULT);
      // Damage reflected: attacker (p1) takes damage
      expect(next.player1.hp).toBe(MAX_HP - 10);
      expect(next.player2.score).toBe(10);
      // Defender is unharmed
      expect(next.player2.hp).toBe(MAX_HP);
    });

    it('failed DISPUTE should apply damage to defender', () => {
      const state = toDefensePhase(createTestBattle());
      const next = submitDefense(state, 'p2', DefenseType.DISPUTE, false);

      expect(next.player2.hp).toBe(MAX_HP - 10);
      expect(next.player1.hp).toBe(MAX_HP);
    });

    it('successful COUNTER should reflect 2x damage to attacker', () => {
      const state = toDefensePhase(createTestBattle());
      const next = submitDefense(state, 'p2', DefenseType.COUNTER, true);

      // 2x damage reflected: attacker takes 20
      expect(next.player1.hp).toBe(MAX_HP - 20);
      expect(next.player2.score).toBe(20);
    });

    it('failed COUNTER should apply normal damage to defender', () => {
      const state = toDefensePhase(createTestBattle());
      const next = submitDefense(state, 'p2', DefenseType.COUNTER, false);

      expect(next.player2.hp).toBe(MAX_HP - 10);
    });

    it('should throw if non-defender submits', () => {
      const state = toDefensePhase(createTestBattle());
      expect(() => submitDefense(state, 'p1', DefenseType.ACCEPT, true)).toThrow('not the current defender');
    });

    it('should throw if not in ROUND_DEFENSE phase', () => {
      const state = createTestBattle();
      expect(() => submitDefense(state, 'p2', DefenseType.ACCEPT, true)).toThrow('Cannot submit defense');
    });
  });

  // ── 7. handleTimeout ───────────────────────────────────────

  describe('handleTimeout', () => {
    it('attack timeout → ROUND_RESULT with 0 damage', () => {
      const state = toAttackPhase(createTestBattle());
      const next = handleTimeout(state);

      expect(next.phase).toBe(BattlePhase.ROUND_RESULT);
      expect(next.timedOutRound).toBe(1);
      expect(next.rounds[0]!.damageDealt).toBe(0);
      expect(next.rounds[0]!.attackerCorrect).toBe(false);
    });

    it('defense timeout → auto-accept, ROUND_RESULT', () => {
      const state = toDefensePhase(createTestBattle());
      const next = handleTimeout(state);

      expect(next.phase).toBe(BattlePhase.ROUND_RESULT);
      // Auto-accept: damage passes through to defender
      expect(next.player2.hp).toBeLessThan(MAX_HP);
    });

    it('should throw if not in attack or defense phase', () => {
      const state = createTestBattle(); // BRANCH_SELECT
      expect(() => handleTimeout(state)).toThrow('Cannot timeout');
    });
  });

  // ── 8. handleDisconnect ────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should set phase to FINAL_RESULT', () => {
      const state = createTestBattle();
      const next = handleDisconnect(state, 'p1');

      expect(next.phase).toBe(BattlePhase.FINAL_RESULT);
      expect(next.abandonedBy).toBe('p1');
    });

    it('should set disconnected player HP to 0', () => {
      const state = createTestBattle();
      const next = handleDisconnect(state, 'p1');

      expect(next.player1.hp).toBe(0);
      expect(next.player2.hp).toBe(MAX_HP);
    });

    it('should set player2 HP to 0 when p2 disconnects', () => {
      const state = createTestBattle();
      const next = handleDisconnect(state, 'p2');

      expect(next.player2.hp).toBe(0);
      expect(next.player1.hp).toBe(MAX_HP);
    });

    it('should be no-op if already FINAL_RESULT', () => {
      let state = createTestBattle();
      state = handleDisconnect(state, 'p1');
      const same = handleDisconnect(state, 'p2');

      // Should not change — already ended
      expect(same.abandonedBy).toBe('p1');
    });

    it('should set endedAt', () => {
      const state = createTestBattle();
      const next = handleDisconnect(state, 'p1');

      expect(next.endedAt).toBeDefined();
    });
  });

  // ── 9. nextPhase (round advancing) ─────────────────────────

  describe('nextPhase', () => {
    function playOneRound(state: ReturnType<typeof createBattle>): ReturnType<typeof createBattle> {
      let s = selectBranch(state, Branch.STRATEGY);
      s = chooseDifficulty(s, s.currentAttackerId!, Difficulty.BRONZE);
      s = submitAnswer(s, s.currentAttackerId!, 0, false); // wrong → skip defense → ROUND_RESULT
      return s;
    }

    it('ROUND_RESULT round 1 → BRANCH_SELECT round 2 (same attacker)', () => {
      let state = createTestBattle();
      state = playOneRound(state);
      expect(state.phase).toBe(BattlePhase.ROUND_RESULT);

      const next = nextPhase(state);
      expect(next.phase).toBe(BattlePhase.BRANCH_SELECT);
      expect(next.currentRound).toBe(2);
      expect(next.currentAttackerId).toBe('p1'); // rounds 1-2: p1 attacks
    });

    it('ROUND_RESULT round 2 → SWAP_ROLES → BRANCH_SELECT round 3', () => {
      let state = createTestBattle();
      // Round 1
      state = playOneRound(state);
      state = nextPhase(state);
      // Round 2
      state = playOneRound(state);
      expect(state.currentRound).toBe(2);

      const swapped = nextPhase(state);
      expect(swapped.phase).toBe(BattlePhase.SWAP_ROLES);
      expect(swapped.currentRound).toBe(3);
      expect(swapped.currentAttackerId).toBe('p2'); // rounds 3-4: p2 attacks

      const next = nextPhase(swapped);
      expect(next.phase).toBe(BattlePhase.BRANCH_SELECT);
    });

    it('should reach FINAL_RESULT after 5 rounds', () => {
      let state = createTestBattle();

      for (let i = 0; i < ROUNDS_PER_BATTLE; i++) {
        state = playOneRound(state);
        if (i < ROUNDS_PER_BATTLE - 1) {
          state = nextPhase(state);
          if (state.phase === BattlePhase.SWAP_ROLES) {
            state = nextPhase(state);
          }
        }
      }

      const final = nextPhase(state);
      expect(final.phase).toBe(BattlePhase.FINAL_RESULT);
      expect(final.endedAt).toBeDefined();
    });

    it('should throw if already FINAL_RESULT', () => {
      let state = createTestBattle();
      state = handleDisconnect(state, 'p1');
      expect(() => nextPhase(state)).toThrow('Battle is already over');
    });

    it('should throw from non-advanceable phases', () => {
      const state = createTestBattle(); // BRANCH_SELECT
      expect(() => nextPhase(state)).toThrow('Cannot advance');
    });
  });

  // ── 10. isGameOver ─────────────────────────────────────────

  describe('isGameOver', () => {
    it('should return true when player HP reaches 0', () => {
      let state = createTestBattle();
      state = { ...state, player1: { ...state.player1, hp: 0 } };
      expect(isGameOver(state)).toBe(true);
    });

    it('should return false when both players have HP', () => {
      const state = createTestBattle();
      expect(isGameOver(state)).toBe(false);
    });

    it('should return true after last round', () => {
      let state = createTestBattle();
      state = {
        ...state,
        currentRound: ROUNDS_PER_BATTLE,
        phase: BattlePhase.ROUND_RESULT,
      };
      expect(isGameOver(state)).toBe(true);
    });
  });

  // ── 11. getResult ──────────────────────────────────────────

  describe('getResult', () => {
    it('should determine winner by score', () => {
      let state = createTestBattle();
      state = {
        ...state,
        phase: BattlePhase.FINAL_RESULT,
        player1: { ...state.player1, score: 30 },
        player2: { ...state.player2, score: 10 },
      };

      const result = getResult(state);
      expect(result.winnerId).toBe('p1');
      expect(result.player1Score).toBe(30);
      expect(result.player2Score).toBe(10);
    });

    it('should return null winnerId for draw', () => {
      let state = createTestBattle();
      state = {
        ...state,
        phase: BattlePhase.FINAL_RESULT,
        player1: { ...state.player1, score: 20 },
        player2: { ...state.player2, score: 20 },
      };

      const result = getResult(state);
      expect(result.winnerId).toBeNull();
    });

    it('should throw if battle is not over', () => {
      const state = createTestBattle();
      expect(() => getResult(state)).toThrow('Battle is not over');
    });

    it('should include ratingChange', () => {
      let state = createTestBattle();
      state = {
        ...state,
        phase: BattlePhase.FINAL_RESULT,
        player1: { ...state.player1, score: 30 },
        player2: { ...state.player2, score: 10 },
      };

      const result = getResult(state, { player1Rating: 1000, player2Rating: 1000 });
      expect(result.ratingChange).toBeDefined();
      expect(typeof result.ratingChange).toBe('number');
      // Winner should gain positive rating
      expect(result.ratingChange).toBeGreaterThan(0);
    });
  });

  // ── 12. HP clamp to 0 (never negative) ─────────────────────

  describe('HP clamp', () => {
    it('HP should never go below 0 after massive damage', () => {
      let state = createTestBattle();
      // Set very low HP
      state = { ...state, player2: { ...state.player2, hp: 5 } };
      let s = toAttackPhase(state);
      s = chooseDifficulty(s, 'p1', Difficulty.SILVER);
      s = submitAnswer(s, 'p1', 0, true);
      // Defense: ACCEPT → 20 damage to player with 5 HP
      s = submitDefense(s, 'p2', DefenseType.ACCEPT, true);

      expect(s.player2.hp).toBe(0);
      expect(s.player2.hp).toBeGreaterThanOrEqual(0);
    });
  });
});
