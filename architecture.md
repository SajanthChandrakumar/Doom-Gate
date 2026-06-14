# Doom-Gate: Focus Casino — Architecture

Doom-Gate is a digital-wellbeing app disguised as a casino. You **stake tokens on your own
ability to stay focused**. Survive the timer and your tokens multiply; reach for social media and
the **Focus Guard** strikes your stake. Tokens are virtual and can only be earned by focusing, so
every reward reinforces the behaviour the app exists to encourage.

This document describes the layered architecture introduced in the clean rewrite.

## System Components

```
Backend (ASP.NET Core Minimal API)            Frontend (Vanilla JS, ES modules)
┌─────────────────────────────┐               ┌──────────────────────────────┐
│ Program.cs (composition root)│               │ index.html / style.css       │
│  ├─ Endpoints/   (HTTP layer)│  ◀── REST ──▶ │ js/                          │
│  ├─ Services/    (game logic)│   JSON/CORS   │  ├─ app.js      (wiring)     │
│  └─ Models/      (data)      │               │  ├─ api.js      (fetch)      │
└─────────────────────────────┘               │  ├─ store.js    (state)      │
                                               │  ├─ ui.js       (render)     │
                                               │  ├─ timer.js    (countdown)  │
                                               │  ├─ focusGuard.js (detection)│
                                               │  └─ effects.js  (juice)      │
                                               └──────────────────────────────┘
```

## Backend (C# / .NET 8)

A thin Minimal API. `Program.cs` does nothing but compose: register services, configure CORS and
the Gemini `HttpClient`, then call `app.MapDoomGateEndpoints()`. Everything else is layered.

### Models (`Backend/Models/`)
Plain data — no behaviour.
- `GameModels.cs` — `Wallet`, `ActiveStake`, `PlayerProfile`, `Achievement`.
- `QuizModels.cs` — `QuizSession`, `QuizData`, and the Gemini REST response shapes.
- `Dtos.cs` — request/response records (`StakeRequest`, `DistractionReport`, `CasinoStateResponse`,
  `MultiplierBreakdown`, `PlayerSummary`) and the `ServiceResult` envelope.

### Services (`Backend/Services/`)
All game rules live here. Endpoints stay one line each.
- `GameState` — the single in-memory source of truth (wallet, active stake, profile). All access
  is serialised through `Mutate`/`Read`, so services never touch locks.
- `GamificationService` — levels/XP, streaks, the transparent payout multiplier, achievements,
  the daily bonus and the leaderboard. Stateless; operates on the profile/wallet passed in.
- `CasinoService` — the betting lifecycle: place, claim, liquidate. Delegates all progression
  side-effects to `GamificationService`.
- `FocusGuardService` — turns a distraction signal into a consequence (the two-strike system).
- `QuizService` — the "Last Chance" rescue: generates a question (Gemini when a key is configured,
  otherwise a built-in bank) and validates answers. The correct index never leaves the server.

### Endpoints (`Backend/Endpoints/`)
One extension class per concern, each mapping routes to a service. `EndpointExtensions.ToHttp()`
converts a domain `ServiceResult` into an HTTP response, so success/error handling is uniform.

| Group        | Routes |
|--------------|--------|
| Casino       | `GET /api/casino/state`, `POST /api/casino/stake`, `POST /api/casino/claim`, `POST /api/casino/liquidate` |
| Quiz         | `GET /api/quiz/generate`, `POST /api/quiz/submit` |
| Focus Guard  | `GET /api/focus/config`, `POST /api/focus/report` |
| Player       | `GET /api/player/profile`, `GET /api/player/achievements`, `POST /api/player/daily-bonus`, `GET /api/player/leaderboard` |

## Frontend (Vanilla JS, ES modules)

No framework, no build step — just ES modules served over HTTP. Each module owns one concern and
the dependency direction is one-way: `app.js` wires everything; nothing imports `app.js`.

- `config.js` — tunables (API base URL, grace periods).
- `api.js` — the only place `fetch()` is called.
- `store.js` — a tiny observable store; `set()` triggers a re-render via subscribers.
- `ui.js` — pure DOM rendering driven by store state.
- `timer.js` — the countdown clock and SVG progress ring.
- `focusGuard.js` — the browser detector (Page Visibility API).
- `effects.js` — toasts, confetti, WebAudio sound, animated counters.
- `app.js` — subscribes the store to the UI and wires every user action.

## The Focus Guard (the "block social media" feature)

The guard receives distraction signals from two relays and applies a forgiving **two-strike**
policy while a stake is live:

1. **Browser relay** — `focusGuard.js` watches the Page Visibility API. Leave the tab for longer
   than the grace period and it `POST`s `{ "app": "tab-blur" }` to `/api/focus/report`.
2. **iOS Screen Time relay** — an iOS *personal automation* ("When Instagram is opened") runs a
   Shortcut that `POST`s `{ "app": "instagram", "source": "ios-shortcut" }` to the same endpoint.
   This is how Doom-Gate "blocks" native social apps: iOS itself detects the app launch and relays
   it; the server then strikes the active stake.

**Strike 1** forces a Last Chance quiz (rescue or lose). **Strike 2** in the same session
liquidates the stake immediately. Winning a session after resisting a breach earns the *Iron Will*
badge.

## Engagement loop (why it's sticky)

Deliberately *pro-social* gamification — the same toolkit habit-forming apps use, pointed at a
healthy goal:
- **Escalating multipliers** — longer focus and longer streaks pay more (shown itemised before you bet).
- **XP & levels** with rank titles (Distractible → Focus Deity).
- **Daily streaks** with a variable daily bonus that scales with progression.
- **Achievements** that pay out tokens on unlock.
- **Leaderboard** against friendly rival bots.
- **Juice** — confetti, sound, animated counters and a heating-up timer ring.

## Data Flow (staking & rescue)

1. Player places a bet → `POST /api/casino/stake`. The server deducts tokens, locks in a multiplier
   and creates the `ActiveStake`.
2. The Focus Guard arms automatically. If the player stays focused, `POST /api/casino/claim` pays
   out `stake × multiplier` and applies XP/streak/achievement rewards.
3. If a distraction is reported, `FocusGuardService` issues a strike. The first strike opens a
   rescue quiz (`GET /api/quiz/generate` → `POST /api/quiz/submit`); a correct answer saves the
   stake for a 10% fee, a wrong answer (or a second strike) liquidates it.
