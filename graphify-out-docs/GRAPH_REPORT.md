# Graph Report - docs  (2026-04-17)

## Corpus Check
- Corpus is ~31,896 words - fits in a single context window. You may not need a graph.

## Summary
- 112 nodes · 168 edges · 8 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Architecture & AI Integration|Architecture & AI Integration]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_MVP Features Roadmap|MVP Features Roadmap]]
- [[_COMMUNITY_Bondi Polish Plan|Bondi Polish Plan]]
- [[_COMMUNITY_PWA Polish & Rules|PWA Polish & Rules]]
- [[_COMMUNITY_Design Brief & Visual Style|Design Brief & Visual Style]]
- [[_COMMUNITY_Battle Engine Core|Battle Engine Core]]
- [[_COMMUNITY_Content Corpus|Content Corpus]]

## God Nodes (most connected - your core abstractions)
1. `Bondi Urgent Polish Plan` - 16 edges
2. `MVP 12-week Roadmap` - 15 edges
3. `Design Brief 2026-04-07` - 14 edges
4. `prisma/ schema & migrations` - 12 edges
5. `Role: Bondi (Frontend+Design)` - 11 edges
6. `Tech Stack` - 10 edges
7. `Role: Yashkin (Backend)` - 10 edges
8. `apps/api (NestJS)` - 7 edges
9. `Turborepo Monorepo` - 6 edges
10. `Battle State Machine` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Battle Mechanic: Osada (Siege)` --rationale_for--> `Feature: 1v1 Battle vs Bot/Human (P0)`  [INFERRED]
  docs/ARCHITECTURE.md → docs/ROADMAP.md
- `Block F5 — Masculine Aggression Visual Style` --semantically_similar_to--> `Masculine Tone (no pastels, no cute)`  [INFERRED] [semantically similar]
  docs/SPRINT.md → docs/DESIGN_BRIEF.md
- `Bondi Urgent Polish Plan` --references--> `Block F11 — Polish & Additional Features`  [INFERRED]
  docs/BONDI_URGENT_PLAN.md → docs/SPRINT.md
- `Nikita Session 2026-04-14: content system + SPRINT tasks` --references--> `Block BC — RAG & Content Pipeline (pgvector)`  [INFERRED]
  docs/WORKLOG.md → docs/SPRINT.md
- `Battle: 5 Phases (category/attack/defense/result/final)` --semantically_similar_to--> `Battle State Machine`  [INFERRED] [semantically similar]
  docs/DESIGN_BRIEF.md → docs/ARCHITECTURE.md

## Hyperedges (group relationships)
- **F5.x visual identity epic (masculine aggression)** — sprint_block_f5_visual, design_masculine_tone, bondi_rationale_no_presets, design_references [EXTRACTED 0.90]
- **Battle core system (state machine + scoring + gateway + 5 phases)** — architecture_state_machine, architecture_scoring, architecture_battle_gateway, architecture_battle_siege, design_battle_5phases [EXTRACTED 0.95]
- **Bondi stages form end-to-end polish pipeline** — bondi_stage0_prep, bondi_stage1_baseline, bondi_stage2_design_system, bondi_stage3_hot_path, bondi_stage4_second_wave, bondi_stage5_remaining, bondi_stage6_final_pass, bondi_stage7_report [EXTRACTED 1.00]

## Communities

### Community 0 - "Architecture & AI Integration"
Cohesion: 0.14
Nodes (21): AI Cost Control (Haiku/Sonnet), AI Module (Socratic), apps/api (NestJS), apps/web (Next.js PWA), WebSocket Battle Gateway, Bot Opponent Service, Claude API (Anthropic), Redis Matchmaking Service (+13 more)

### Community 1 - "Database Schema"
Cohesion: 0.14
Nodes (20): DB: AiDialogue, DB: Battle, DB: BattleRound, DB: Module, DB: UserModuleProgress, DB: Question, DB: User, DB: UserStats (+12 more)

### Community 2 - "MVP Features Roadmap"
Cohesion: 0.11
Nodes (19): Feature: 1v1 Battle vs Bot/Human (P0), Feature: Leaderboard (P2), Feature: Learning 2 Branches (P1), Feature: Radar-Chart Profile 5 Stats (P1), Feature: Streak Counter (P2), Feature: Telegram Login (P0), Feature: Daily Warmup 5Q (P0), Core Hypothesis: men return daily for intellectual battles (+11 more)

### Community 3 - "Bondi Polish Plan"
Cohesion: 0.18
Nodes (15): Micro-Pipeline B per page, Bondi Urgent Polish Plan, Rationale: fix design-system foundation before polishing pages, Rationale: one page = one branch = one PR, Skills Map by Stage, Stage 0 — Preparation & /impeccable teach, Stage 1 — Baseline Audit (/audit + /graphify + /critique), Stage 2 — Design System Unification (+7 more)

### Community 4 - "PWA Polish & Rules"
Cohesion: 0.17
Nodes (13): Rationale: no style presets (existing 'masculine aggression' would break), Game Rules (1 step = 1 commit, no presets), Block F10 — PWA & Mobile, Block F11 — Polish & Additional Features, Block F5 — Masculine Aggression Visual Style, Block F7 — Profile & Progress, Block F8 — Learning UI, Block F9 — Home & Navigation (+5 more)

### Community 5 - "Design Brief & Visual Style"
Cohesion: 0.27
Nodes (10): Animation list (HP, timer, damage, victory), Design Brief 2026-04-07, Figma deliverables + UI kit, Masculine Tone (no pastels, no cute), Navigation: 4 tabs (Home/Battle/Learn/Profile), Positioning: Serious Intellectual Platform, Design References (Valorant, Whoop, Revolut), Screen Set (login/home/battle/learn/profile/…) (+2 more)

### Community 6 - "Battle Engine Core"
Cohesion: 0.43
Nodes (7): Battle Mechanic: Osada (Siege), packages/shared (pure TS), Battle Scoring (XP + ELO), Battle State Machine, 3 Difficulty Levels (Bronze/Silver/Gold), Battle: 5 Phases (category/attack/defense/result/final), Block F6 — Battle UX

### Community 7 - "Content Corpus"
Cohesion: 0.29
Nodes (7): Team Worklog, CHD 13 concepts extracted, Hesse Glass Bead Game 25 concepts, Machiavelli 14 principles, 16 concepts, Markaryan 82 concepts extracted, Nikita Session 2026-04-14: content system + SPRINT tasks, Nikita Sessions 1-2: project init + CI

## Knowledge Gaps
- **35 isolated node(s):** `Serwist PWA Service Worker`, `Bot Opponent Service`, `DB: AiDialogue`, `AI Cost Control (Haiku/Sonnet)`, `PWA Configuration` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Role: Bondi (Frontend+Design)` connect `PWA Polish & Rules` to `Architecture & AI Integration`, `Bondi Polish Plan`, `Battle Engine Core`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `Bondi Urgent Polish Plan` connect `Bondi Polish Plan` to `PWA Polish & Rules`, `Design Brief & Visual Style`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Why does `MVP 12-week Roadmap` connect `MVP Features Roadmap` to `Architecture & AI Integration`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **What connects `Serwist PWA Service Worker`, `Bot Opponent Service`, `DB: AiDialogue` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture & AI Integration` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Database Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `MVP Features Roadmap` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._