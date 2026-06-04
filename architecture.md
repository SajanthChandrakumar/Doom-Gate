# Doom-Gate: Focus Casino Architecture

This document describes the high-level architecture of the Doom-Gate: Focus Casino application.

## System Components

The application is divided into two primary components: a streamlined Backend API and a Vanilla JavaScript Frontend.

### 1. Backend (C# ASP.NET Core Minimal API)

The backend is built as a highly consolidated Minimal API using .NET 8. It handles the core gambling logic, state management, and external AI integrations directly within `Program.cs`.

- API Framework: ASP.NET Core Minimal APIs
- Language: C#
- State Management: In-Memory static variables managing the user's `Wallet` and `ActiveStake`
- AI Integration: Direct HTTP integration with the Google Gemini REST API via HttpClient for the "Last Chance" quiz
- Primary Endpoints:
  - GET /api/casino/state: Retrieves the user's total tokens and current active stake (if any).
  - POST /api/casino/stake: Accepts a stake amount and duration, deducting tokens and initiating the focus session.
  - POST /api/casino/liquidate: Destroys the active stake completely if the user loses focus.
  - POST /api/casino/claim: Validates the elapsed time and rewards the user with a 2x multiplier if successful.
  - GET /api/quiz/generate: Requests a JSON-formatted computer-science quiz from Gemini AI.
  - POST /api/quiz/submit: Validates the user's answer. A correct answer rescues the stake (with a 10% penalty), while a wrong answer triggers immediate liquidation.

### 2. Frontend (Vanilla JavaScript)

The frontend is a lightweight client built without heavy frameworks to ensure maximum performance and simplicity.

- Technologies: HTML5, CSS3, Vanilla JavaScript
- Styling: Custom CSS variables for a dark-mode neon casino theme
- State Synchronization: Interacts asynchronously with the C# backend to display token counts, active stakes, countdown timers, and AI-generated rescue quizzes.
- Component Logic: Separated into clear functional blocks inside app.js (Initialization, Casino API Calls, Timer Management, UI Rendering).

## Data Flow (Staking & Rescue Mechanism)

1. The user places a bet on the Frontend.
2. The Frontend calls POST /api/casino/stake.
3. The Backend verifies funds, creates an `ActiveStake`, and starts the timer.
4. If the user maintains focus until the timer ends, they call POST /api/casino/claim and double their bet.
5. If the user loses focus, they can attempt a rescue by requesting a quiz.
6. The Frontend calls GET /api/quiz/generate on the Backend.
7. The Backend calls the Gemini REST API, generates a question, securely stores the correct answer in memory, and returns the options.
8. The Frontend calls POST /api/quiz/submit with the user's answer.
9. The Backend verifies the answer. Success deducts a 10% penalty but saves the stake; failure instantly liquidates the stake.
