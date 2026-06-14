# Doom-Gate: Focus Casino

Doom-Gate is a digital-wellbeing app disguised as a high-stakes casino. You **bet tokens on your
own ability to stay focused**. Survive the timer and your tokens multiply. Reach for social media
and the **Focus Guard** strikes your stake — on iOS it can even relay app launches from Screen Time
to liquidate you the moment you open Instagram.

Tokens are virtual and can only be earned by focusing, so the whole "addictive" loop (streaks, XP,
multipliers, achievements, daily bonuses, confetti) is pointed at one healthy goal: stay off the
distractions.

## Features

- 🎰 **Focus betting** — stake tokens for a chosen duration; claim a multiplied payout if you last.
- 🛡️ **Focus Guard** — leaving the tab, or opening a blocklisted app on iOS, strikes your stake.
  Two-strike policy: strike one forces a rescue quiz, strike two liquidates you.
- 🧠 **Last Chance rescue** — answer an AI-generated (Gemini) quiz to save a breached stake for a fee.
  Falls back to a built-in question bank when no API key is set, so it always works.
- 📈 **Progression** — XP, levels with rank titles, daily streaks, a scaling daily bonus, token-paying
  achievements and a leaderboard.
- ✨ **Juice** — confetti, WebAudio sound, animated counters and a heating-up countdown ring.

## Architecture

Cleanly layered, no spaghetti. See [architecture.md](architecture.md) for the full picture.

- **Backend** — ASP.NET Core Minimal API (.NET 8), split into `Models/`, `Services/`, `Endpoints/`.
- **Frontend** — Vanilla JS ES modules (`Frontend/js/`), no framework, no build step.

## Quick Start

### 1. Requirements
- .NET 8.0 SDK or newer
- (Optional) A Gemini API key — without one, the rescue quiz uses a local question bank.

### 2. Configure (optional)
Set a Gemini key only if you want AI-generated rescue quizzes:

```bash
export GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

### 3. Run the backend
```bash
cd Backend
dotnet run
```
The API starts on `http://localhost:5000` (Swagger UI at `/swagger` in development).

### 4. Run the frontend
The frontend uses ES modules, so it **must be served over HTTP** (opening `index.html` from the
file system won't work):

```bash
cd Frontend
python3 -m http.server 3000
```
Then open `http://localhost:3000`.

## Block social apps on iOS (Screen Time relay)

A web app can't kill a native app — but iOS can tell Doom-Gate the moment you open one:

1. **Shortcuts → Automation → New Personal Automation**.
2. Trigger: **App → Is Opened**, and pick Instagram, TikTok, etc.
3. Action: **Get Contents of URL** → `POST http://<your-host>:5000/api/focus/report`,
   request body (JSON): `{ "app": "instagram", "source": "ios-shortcut" }`.
4. Enable **Run Immediately**.

Now, while a stake is live, opening that app pings Doom-Gate and strikes your stake. (The in-app
**Simulate a breach** buttons let you test the flow without iOS.)

## API summary

| Method | Route | Purpose |
|--------|-------|---------|
| GET  | `/api/casino/state`        | Tokens, active stake, projected payout, player summary |
| POST | `/api/casino/stake`        | Place a focus bet |
| POST | `/api/casino/claim`        | Claim a completed session |
| POST | `/api/casino/liquidate`    | Give up the active stake |
| GET  | `/api/quiz/generate`       | Generate a rescue quiz |
| POST | `/api/quiz/submit`         | Answer a rescue quiz |
| GET  | `/api/focus/config`        | The distraction blocklist |
| POST | `/api/focus/report`        | Relay a distraction (browser or iOS Shortcut) |
| GET  | `/api/player/achievements` | Badge catalogue + unlock status |
| POST | `/api/player/daily-bonus`  | Claim the daily bonus |
| GET  | `/api/player/leaderboard`  | You vs. rival bots |
