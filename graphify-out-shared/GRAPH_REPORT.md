# Graph Report - packages/shared  (2026-04-17)

## Corpus Check
- Corpus is ~19,863 words - fits in a single context window. You may not need a graph.

## Summary
- 198 nodes · 214 edges · 58 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Card System|Card System]]
- [[_COMMUNITY_Stats Calculator|Stats Calculator]]
- [[_COMMUNITY_Stats Calculator|Stats Calculator]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Card System|Card System]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Shared Misc (c20)|Shared Misc (c20)]]
- [[_COMMUNITY_Shared Misc (c21)|Shared Misc (c21)]]
- [[_COMMUNITY_Shared Misc (c22)|Shared Misc (c22)]]
- [[_COMMUNITY_Shared Misc (c23)|Shared Misc (c23)]]
- [[_COMMUNITY_Shared Misc (c24)|Shared Misc (c24)]]
- [[_COMMUNITY_Shared Misc (c25)|Shared Misc (c25)]]
- [[_COMMUNITY_Shared Misc (c26)|Shared Misc (c26)]]
- [[_COMMUNITY_Shared Misc (c27)|Shared Misc (c27)]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Shared Misc (c30)|Shared Misc (c30)]]
- [[_COMMUNITY_Shared Misc (c31)|Shared Misc (c31)]]
- [[_COMMUNITY_Shared Misc (c32)|Shared Misc (c32)]]
- [[_COMMUNITY_Shared Misc (c33)|Shared Misc (c33)]]
- [[_COMMUNITY_Shared Misc (c34)|Shared Misc (c34)]]
- [[_COMMUNITY_Shared Misc (c35)|Shared Misc (c35)]]
- [[_COMMUNITY_Shared Misc (c36)|Shared Misc (c36)]]
- [[_COMMUNITY_Shared Misc (c37)|Shared Misc (c37)]]
- [[_COMMUNITY_Shared Misc (c38)|Shared Misc (c38)]]
- [[_COMMUNITY_Shared Misc (c39)|Shared Misc (c39)]]
- [[_COMMUNITY_Shared Misc (c40)|Shared Misc (c40)]]
- [[_COMMUNITY_Shared Misc (c41)|Shared Misc (c41)]]
- [[_COMMUNITY_Shared Misc (c42)|Shared Misc (c42)]]
- [[_COMMUNITY_Shared Misc (c43)|Shared Misc (c43)]]
- [[_COMMUNITY_Stats Calculator|Stats Calculator]]
- [[_COMMUNITY_Shared Misc (c45)|Shared Misc (c45)]]
- [[_COMMUNITY_Shared Misc (c46)|Shared Misc (c46)]]
- [[_COMMUNITY_Shared Misc (c47)|Shared Misc (c47)]]
- [[_COMMUNITY_Stats Calculator|Stats Calculator]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Card System|Card System]]
- [[_COMMUNITY_Feed System|Feed System]]
- [[_COMMUNITY_Battle Engine|Battle Engine]]
- [[_COMMUNITY_Level Progression|Level Progression]]
- [[_COMMUNITY_Card System|Card System]]
- [[_COMMUNITY_Level Progression|Level Progression]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]

## God Nodes (most connected - your core abstractions)
1. `Test suite — battle state machine (BT.13)` - 10 edges
2. `Shared public barrel (index.ts)` - 8 edges
3. `computeAdaptations() — L22.3 rule engine` - 8 edges
4. `enum Difficulty` - 7 edges
5. `createBattle()` - 7 edges
6. `enum Branch (5 branches) — canonical` - 7 edges
7. `analyzeDetermination() — L22.1` - 7 edges
8. `buildLearningPath() — L22.2 (path-builder.ts)` - 7 edges
9. `Test suite — battle scoring (BT.14)` - 7 edges
10. `validateQuestion()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `enum Difficulty` --semantically_similar_to--> `type DifficultyTier (BRONZE/SILVER/GOLD)`  [INFERRED] [semantically similar]
  packages/shared/src/battle/types.ts → packages/shared/src/learning/types.ts
- `enum Difficulty` --semantically_similar_to--> `enum CardRarity (BRONZE/SILVER/GOLD)`  [INFERRED] [semantically similar]
  packages/shared/src/battle/types.ts → packages/shared/src/cards/types.ts
- `enum Branch (5 branches) — canonical` --semantically_similar_to--> `type LearningBranch (5 string literals)`  [INFERRED] [semantically similar]
  packages/shared/src/questions/types.ts → packages/shared/src/learning/types.ts
- `computeEngagement() — L22.4` --semantically_similar_to--> `getBranchLevels()`  [INFERRED] [semantically similar]
  packages/shared/src/learning/metrics.ts → packages/shared/src/stats/calculator.ts
- `buildLearningPath() public (topological-sort.ts, relation-based)` --semantically_similar_to--> `buildLearningPath() — L22.2 (path-builder.ts)`  [INFERRED] [semantically similar]
  packages/shared/src/learning/topological-sort.ts → packages/shared/src/learning/path-builder.ts

## Hyperedges (group relationships)
- **Full siege/sparring battle flow** — state_machine_createBattle, state_machine_selectBranch, state_machine_chooseDifficulty, state_machine_submitAnswer, state_machine_submitDefense, state_machine_nextPhase, state_machine_isGameOver, state_machine_getResult, scoring_calculateDamage, scoring_calculateDefenseResult, scoring_calculateXpGained, scoring_calculateRatingChange, battle_types_BattlePhase, battle_types_BattleState [EXTRACTED 0.95]
- **Determination → path build → adaptation loop** — determination_analyzeDetermination, path_builder_buildLearningPath, path_builder_topologicalSort_internal, path_builder_interleaveBranches, topo_sort_topologicalSort_public, metrics_computeEngagement, metrics_computeConceptConfidence, adaptation_computeAdaptations, adaptation_computeMasteryDelta, learning_types_ConceptNode, learning_types_DeterminationResult, learning_types_AdaptationAction [EXTRACTED 0.95]
- **Five-branch taxonomy shared across battle/questions/stats/learning/cards** — questions_Branch, stats_StatName, learning_types_LearningBranch, stats_determineThinkerClass, cards_CardDefinition, feed_CampaignData, battle_types_BattleRound [INFERRED 0.85]

## Communities

### Community 0 - "Battle Engine"
Cohesion: 0.11
Nodes (24): interface BattleRound, enum BotLevel, enum DefenseType, DAMAGE table (BRONZE/SILVER/GOLD), ELO_DEFAULT_RATING (1000), ELO_K_FACTOR (32), XP table (per-difficulty + WIN_BONUS), calculateDamage() (+16 more)

### Community 1 - "Battle Engine"
Cohesion: 0.13
Nodes (18): enum Difficulty, enum BotPersonality (5 personas), interface CardBattleState, interface CardDefinition, enum CardRarity (BRONZE/SILVER/GOLD), enum CardType (ATTACK/DEFENSE/TACTIC/BUFF), BOT_CONFIGS per personality, interface CampaignData (+10 more)

### Community 2 - "Learning Engine"
Cohesion: 0.17
Nodes (15): CROSS_BRANCH_BONUS matrix, analyzeDetermination() — L22.1, deriveDeliveryStyle() helper, Rationale: options weighted 3/2/1/0 → strongest branch = startZone, weakest = painPoint, interface ConceptNode (with prerequisiteIds), interface DeterminationResult (startZone/painPoint/style), buildLearningPath() — L22.2 (path-builder.ts), interleaveBranches() — front-load startZone, delay painPoint (+7 more)

### Community 3 - "Battle Engine"
Cohesion: 0.31
Nodes (12): chooseDifficulty(), createBattle(), getAttackerForRound(), getResult(), handleDisconnect(), handleTimeout(), isGameOver(), nextPhase() (+4 more)

### Community 4 - "Learning Engine"
Cohesion: 0.24
Nodes (10): computeAdaptations() — L22.3 rule engine, Rationale: 4 rules — Interesting→more, Mastered→faster, Boring→minimum, Weak→differently, suggestNewStyle() rotation helper, ADAPTIVE thresholds (0.6/0.8), type AdaptationAction (REORDER/ADD_DEPTH/SKIP/REPEAT/CHANGE_STYLE), interface ConceptConfidence, interface EngagementSignals, computeConceptConfidence() weighted (40/30/20/10) (+2 more)

### Community 5 - "Card System"
Cohesion: 0.31
Nodes (7): checkDuplicateSimple() — Jaccard, checkDuplicateSimple(), jaccardSimilarity() helper, jaccardSimilarity(), tokenize(), validateBatch(), validateQuestion()

### Community 6 - "Stats Calculator"
Cohesion: 0.33
Nodes (9): enum ThinkerClass (base+hybrid+polymath), interface UserStatsData (5-stat vector), determineThinkerClass(), getBranchLevels(), getStatsRadar(), Rationale: all=0 → POLYMATH; spread<5% → POLYMATH; dominant≥5% → base; top2 close → hybrid, xpToLevel() floor(sqrt(xp/100)), xpToNextLevel() (+1 more)

### Community 7 - "Stats Calculator"
Cohesion: 0.52
Nodes (5): determineThinkerClass(), getBranchLevels(), getStatsRadar(), xpToLevel(), xpToNextLevel()

### Community 8 - "Battle Engine"
Cohesion: 0.33
Nodes (2): toAttackPhase(), toDefensePhase()

### Community 9 - "Battle Engine"
Cohesion: 0.33
Nodes (7): enum BattleMode (SIEGE/SPARRING), enum BattlePhase, interface BattlePlayer, interface BattleState, MAX_HP (100), ROUNDS_PER_BATTLE (5), createBattle()

### Community 10 - "Battle Engine"
Cohesion: 0.53
Nodes (4): calculateDamage(), calculateDefenseResult(), calculateRatingChange(), calculateXpGained()

### Community 11 - "Battle Engine"
Cohesion: 0.5
Nodes (2): getToDefensePhase(), makeBattle()

### Community 12 - "Learning Engine"
Cohesion: 0.67
Nodes (2): computeAdaptations(), suggestNewStyle()

### Community 13 - "Learning Engine"
Cohesion: 0.83
Nodes (3): buildLearningPath(), interleaveBranches(), topologicalSort()

### Community 14 - "Learning Engine"
Cohesion: 1.0
Nodes (2): analyzeDetermination(), deriveDeliveryStyle()

### Community 15 - "Learning Engine"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Learning Engine"
Cohesion: 1.0
Nodes (2): buildLearningPath(), topologicalSort()

### Community 17 - "Battle Engine"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Card System"
Cohesion: 0.67
Nodes (3): interface DailyFeedData, union FeedCardContent (insight|challenge|case|sparring|forge|wisdom|arena), enum FeedCardType (7 types)

### Community 19 - "Learning Engine"
Cohesion: 1.0
Nodes (2): SRS_INTERVALS [1,3,7,14,30] (feed), SRS_INTERVALS [1,3,7,14,30] (learning)

### Community 20 - "Shared Misc (c20)"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Shared Misc (c21)"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Shared Misc (c22)"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Shared Misc (c23)"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Shared Misc (c24)"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Shared Misc (c25)"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Shared Misc (c26)"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Shared Misc (c27)"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Battle Engine"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Battle Engine"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Shared Misc (c30)"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Shared Misc (c31)"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Shared Misc (c32)"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Shared Misc (c33)"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Shared Misc (c34)"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Shared Misc (c35)"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Shared Misc (c36)"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Shared Misc (c37)"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Shared Misc (c38)"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Shared Misc (c39)"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Shared Misc (c40)"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Shared Misc (c41)"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Shared Misc (c42)"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Shared Misc (c43)"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Stats Calculator"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Shared Misc (c45)"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Shared Misc (c46)"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Shared Misc (c47)"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Stats Calculator"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Battle Engine"
Cohesion: 1.0
Nodes (1): interface BattleResult

### Community 50 - "Card System"
Cohesion: 1.0
Nodes (1): CARD_RATIO (insight 30% / challenge 20% / others)

### Community 51 - "Feed System"
Cohesion: 1.0
Nodes (1): FEED_XP rewards

### Community 52 - "Battle Engine"
Cohesion: 1.0
Nodes (1): CARD_BATTLE constants (hp/energy/deck)

### Community 53 - "Level Progression"
Cohesion: 1.0
Nodes (1): LEVEL_SCALE (1.0..1.75)

### Community 54 - "Card System"
Cohesion: 1.0
Nodes (1): CRAFT_RECIPES (3 bronze→silver, 3 silver→gold)

### Community 55 - "Level Progression"
Cohesion: 1.0
Nodes (1): LEVEL_ORDER (Sleeping..Master)

### Community 56 - "Learning Engine"
Cohesion: 1.0
Nodes (1): BARRIER_WEIGHTS (recall/connect/apply/defend)

### Community 57 - "Learning Engine"
Cohesion: 1.0
Nodes (1): MAX_PATH_DAYS = 30

## Ambiguous Edges - Review These
- `enum BotLevel` → `calculateRatingChange() — ELO`  [AMBIGUOUS]
  packages/shared/src/battle/scoring.ts · relation: conceptually_related_to

## Knowledge Gaps
- **43 isolated node(s):** `MAX_HP (100)`, `ROUNDS_PER_BATTLE (5)`, `ELO_DEFAULT_RATING (1000)`, `enum BattleMode (SIEGE/SPARRING)`, `interface BattlePlayer` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Learning Engine`** (2 nodes): `SRS_INTERVALS [1,3,7,14,30] (feed)`, `SRS_INTERVALS [1,3,7,14,30] (learning)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c20)`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c21)`** (1 nodes): `jest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c22)`** (1 nodes): `constants.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c23)`** (1 nodes): `constants.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c24)`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c25)`** (1 nodes): `index.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c26)`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c27)`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle Engine`** (1 nodes): `scoring.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle Engine`** (1 nodes): `state-machine.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c30)`** (1 nodes): `types.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c31)`** (1 nodes): `types.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c32)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c33)`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c34)`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c35)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c36)`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c37)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c38)`** (1 nodes): `constants.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c39)`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c40)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c41)`** (1 nodes): `types.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c42)`** (1 nodes): `types.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c43)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Calculator`** (1 nodes): `calculator.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c45)`** (1 nodes): `types.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c46)`** (1 nodes): `types.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Misc (c47)`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats Calculator`** (1 nodes): `calculator.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle Engine`** (1 nodes): `interface BattleResult`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card System`** (1 nodes): `CARD_RATIO (insight 30% / challenge 20% / others)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed System`** (1 nodes): `FEED_XP rewards`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle Engine`** (1 nodes): `CARD_BATTLE constants (hp/energy/deck)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Level Progression`** (1 nodes): `LEVEL_SCALE (1.0..1.75)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card System`** (1 nodes): `CRAFT_RECIPES (3 bronze→silver, 3 silver→gold)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Level Progression`** (1 nodes): `LEVEL_ORDER (Sleeping..Master)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Learning Engine`** (1 nodes): `BARRIER_WEIGHTS (recall/connect/apply/defend)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Learning Engine`** (1 nodes): `MAX_PATH_DAYS = 30`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `enum BotLevel` and `calculateRatingChange() — ELO`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Shared public barrel (index.ts)` connect `Learning Engine` to `Battle Engine`, `Battle Engine`, `Learning Engine`, `Stats Calculator`, `Battle Engine`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `createBattle()` connect `Battle Engine` to `Battle Engine`, `Learning Engine`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Test suite — battle state machine (BT.13)` connect `Battle Engine` to `Battle Engine`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `computeAdaptations() — L22.3 rule engine` (e.g. with `computeConceptConfidence() weighted (40/30/20/10)` and `ADAPTIVE thresholds (0.6/0.8)`) actually correct?**
  _`computeAdaptations() — L22.3 rule engine` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `enum Difficulty` (e.g. with `interface BattleRound` and `type DifficultyTier (BRONZE/SILVER/GOLD)`) actually correct?**
  _`enum Difficulty` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MAX_HP (100)`, `ROUNDS_PER_BATTLE (5)`, `ELO_DEFAULT_RATING (1000)` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._