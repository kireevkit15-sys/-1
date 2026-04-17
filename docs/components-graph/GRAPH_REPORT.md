# Graph Report - apps/web/components  (2026-04-17)

## Corpus Check
- Corpus is ~26,916 words - fits in a single context window. You may not need a graph.

## Summary
- 214 nodes · 242 edges · 61 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Learning Content Cards|Learning Content Cards]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Web Misc (c13)|Web Misc (c13)]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Battle UI|Battle UI]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Learning Content Cards|Learning Content Cards]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Feed Cards|Feed Cards]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_Barrier Flow|Barrier Flow]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Battle UI|Battle UI]]
- [[_COMMUNITY_Battle UI|Battle UI]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Learning Content Cards|Learning Content Cards]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_UI Primitives|UI Primitives]]
- [[_COMMUNITY_Layout & Navigation|Layout & Navigation]]

## God Nodes (most connected - your core abstractions)
1. `ChallengeCard (feed)` - 9 edges
2. `CaseCard (feed)` - 7 edges
3. `ForgeCard (feed)` - 7 edges
4. `SparringCard (feed)` - 7 edges
5. `BookCard (learning)` - 7 edges
6. `ExplanationCard (learning)` - 7 edges
7. `QuestionEditor (admin)` - 6 edges
8. `QuestionSourceIndicator (battle)` - 6 edges
9. `ArenaCard (feed)` - 6 edges
10. `InsightCard (feed)` - 6 edges

## Surprising Connections (you probably didn't know these)
- `CaseCard (feed)` --semantically_similar_to--> `ExampleCard (learning)`  [INFERRED] [semantically similar]
  apps/web/components/feed/CaseCard.tsx → apps/web/components/learning/ExampleCard.tsx
- `InsightCard (feed)` --semantically_similar_to--> `BookCard (learning)`  [INFERRED] [semantically similar]
  apps/web/components/feed/InsightCard.tsx → apps/web/components/learning/BookCard.tsx
- `InsightCard (feed)` --semantically_similar_to--> `ExplanationCard (learning)`  [INFERRED] [semantically similar]
  apps/web/components/feed/InsightCard.tsx → apps/web/components/learning/ExplanationCard.tsx
- `WisdomCard (feed)` --semantically_similar_to--> `BookCard (learning)`  [INFERRED] [semantically similar]
  apps/web/components/feed/WisdomCard.tsx → apps/web/components/learning/BookCard.tsx
- `ExplainCard (learning)` --semantically_similar_to--> `AiChat (learn)`  [INFERRED] [semantically similar]
  apps/web/components/learning/ExplainCard.tsx → apps/web/components/learn/AiChat.tsx

## Hyperedges (group relationships)
- **All Feed cards (shared feed-card pattern)** — ArenaCard, CaseCard, ChallengeCard, ForgeCard, InsightCard, SparringCard, WisdomCard [EXTRACTED 1.00]
- **All Learning ritual cards (F22/F23 ritual stages)** — AlternativeCard, BattleUnlockCard, BookCard, ConnectionsCard, ContradictionCard, EvidenceCard, ExampleCard, ExplainCard, ExplanationCard, HookCard [EXTRACTED 1.00]
- **Navigation layer (BottomNav/SideNav/SwipeNav/PageTransition/RightSidebar)** — BottomNav, SideNav, SwipeNavigation, PageTransition, RightSidebar [EXTRACTED 1.00]
- **4-stage barrier flow** —  [INFERRED 0.95]
- **UI primitives** —  [INFERRED 1.00]
- **All learning content cards** —  [INFERRED 0.90]

## Communities

### Community 0 - "Barrier Flow"
Cohesion: 0.12
Nodes (29): ApplyStage, ApplyVerdict, BarrierOutcome, BarrierProgress, BarrierStep, Button, ButtonTest, Card (+21 more)

### Community 1 - "Barrier Flow"
Cohesion: 0.33
Nodes (16): AlternativeCard (learning), BattleUnlockCard (learning), BookCard (learning), ConnectionsCard (learning), ContradictionCard (learning), EvidenceCard (learning), ExampleCard (learning), ExplainCard (learning) (+8 more)

### Community 2 - "Feed Cards"
Cohesion: 0.33
Nodes (15): ArenaCard (feed), CaseCard (feed), ChallengeCard (feed), ForgeCard (feed), InsightCard (feed), SparringCard (feed), WisdomCard (feed), Concept: STRATEGY/LOGIC/ERUDITION/RHETORIC/INTUITION coloring (+7 more)

### Community 3 - "Layout & Navigation"
Cohesion: 0.16
Nodes (15): AiChat (learn), BottomNav (layout), DifficultyPicker (battle), PageTransition (layout), QuestionEditor (admin), RightSidebar (layout), SideNav (layout), SideNavTest (+7 more)

### Community 4 - "UI Primitives"
Cohesion: 0.17
Nodes (13): BeforeInstallPromptEvent, EmptyState, EmptyStateType, InstallBanner, Localstorage, NetworkError, ReactCreateContext, SwipeToDismiss (+5 more)

### Community 5 - "Feed Cards"
Cohesion: 0.4
Nodes (0): 

### Community 6 - "Barrier Flow"
Cohesion: 0.8
Nodes (4): finalize(), handleSend(), makeId(), requestChallenge()

### Community 7 - "UI Primitives"
Cohesion: 0.5
Nodes (0): 

### Community 8 - "Learning Content Cards"
Cohesion: 0.67
Nodes (2): handleKeyDown(), send()

### Community 9 - "Barrier Flow"
Cohesion: 0.5
Nodes (0): 

### Community 10 - "Barrier Flow"
Cohesion: 0.5
Nodes (0): 

### Community 11 - "Feed Cards"
Cohesion: 0.67
Nodes (4): PhilosophyCard, ScienceCard, ThreadCard, WisdomLearningCard

### Community 12 - "Feed Cards"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Web Misc (c13)"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "UI Primitives"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "UI Primitives"
Cohesion: 1.0
Nodes (2): BattleUnlockCard(), pluralize()

### Community 16 - "UI Primitives"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "UI Primitives"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "UI Primitives"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Barrier Flow"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "UI Primitives"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "UI Primitives"
Cohesion: 1.0
Nodes (2): SwipeToDismiss(), todayKey()

### Community 22 - "UI Primitives"
Cohesion: 0.67
Nodes (3): Skeleton, SkeletonCard, SkeletonStats

### Community 23 - "Battle UI"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Feed Cards"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Feed Cards"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Feed Cards"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Feed Cards"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Barrier Flow"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Learning Content Cards"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Feed Cards"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Barrier Flow"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Barrier Flow"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Battle UI"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Battle UI"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Learning Content Cards"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "UI Primitives"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Layout & Navigation"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **4 isolated node(s):** `PageTransition (layout)`, `Lib: learning API (getStatus)`, `Lib: learning/levels (getLevelName)`, `UI: Button`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Battle UI`** (2 nodes): `QuestionSourceIndicator.tsx`, `QuestionSourceIndicator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Cards`** (2 nodes): `ArenaCard.tsx`, `branchFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Cards`** (2 nodes): `CaseCard.tsx`, `getBranch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `ChallengeCard.tsx`, `formatTime()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Cards`** (2 nodes): `InsightCard.tsx`, `InsightCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Cards`** (2 nodes): `WisdomCard.tsx`, `branchFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (2 nodes): `PageTransition.tsx`, `PageTransition()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (2 nodes): `RightSidebar.tsx`, `load()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (2 nodes): `SideNav.tsx`, `isActive()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (2 nodes): `SwipeNavigation.tsx`, `SwipeNavigation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `BookCard.tsx`, `BookmarkIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Barrier Flow`** (2 nodes): `ConnectionsCard.tsx`, `NetworkIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `ExampleCard.tsx`, `ExampleCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `HookCard.tsx`, `HookCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Learning Content Cards`** (2 nodes): `LevelIcon.tsx`, `LevelIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `PhilosophyCard.tsx`, `ColumnIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `QuizCard.tsx`, `handleChoose()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Feed Cards`** (2 nodes): `WisdomLearningCard.tsx`, `WisdomLearningCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Barrier Flow`** (2 nodes): `RecallStage.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Barrier Flow`** (2 nodes): `ResultScreen.tsx`, `ResultScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `ShareButton.tsx`, `ShareButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `EmptyState.tsx`, `EmptyState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `InstallBanner.tsx`, `InstallBanner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `NetworkError.tsx`, `NetworkError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (2 nodes): `ThemeToggle.tsx`, `handleToggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle UI`** (1 nodes): `QuestionEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Battle UI`** (1 nodes): `DifficultyPicker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (1 nodes): `BottomNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `QuestionCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `EvidenceCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Learning Content Cards`** (1 nodes): `RitualShell.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `ThreadCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `Toast.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `Button.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Primitives`** (1 nodes): `Card.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout & Navigation`** (1 nodes): `SideNav.test.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ArenaCard (feed)` connect `Feed Cards` to `Layout & Navigation`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `QuestionSourceIndicator (battle)` connect `Barrier Flow` to `Layout & Navigation`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ChallengeCard (feed)` (e.g. with `CaseCard (feed)` and `QuestionCard (learn)`) actually correct?**
  _`ChallengeCard (feed)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PageTransition (layout)`, `Lib: learning API (getStatus)`, `Lib: learning/levels (getLevelName)` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Barrier Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._