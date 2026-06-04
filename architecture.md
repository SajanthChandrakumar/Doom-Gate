# Doom-Gate Architecture

This document describes the high-level architecture of the Doom-Gate application.

## System Components

The application is divided into two primary components: the Backend API and the Vanilla JavaScript Frontend.

### 1. Backend (C# ASP.NET Core)

The backend is built as a Minimal API using .NET 8. It handles business logic, state management, and external API integrations.

- API Framework: ASP.NET Core Minimal APIs
- Language: C#
- State Management: In-Memory Singleton (for prototype purposes)
- AI Integration: Direct HTTP integration with the Google Gemini REST API via HttpClient
- Primary Endpoints:
  - GET /api/state: Retrieves the user's focus tokens and unlocked nodes.
  - POST /api/shop/unlock: Processes a node purchase if the user has sufficient tokens.
  - GET /api/quiz/generate: Requests a JSON-formatted quiz question from Gemini AI.
  - POST /api/quiz/submit: Validates the user's answer against the securely stored correct answer.

### 2. Frontend (Vanilla JavaScript)

The frontend is a lightweight client built without heavy frameworks.

- Technologies: HTML5, CSS3, Vanilla JavaScript
- Styling: Custom CSS variables for a dark-mode neon theme
- State Synchronization: Interacts asynchronously with the C# backend to display token counts, tech tree progression, and AI-generated quizzes.
- Component Logic: Separated into clear functional blocks inside app.js (Initialization, API Calls, UI Rendering).

## Data Flow

1. The user requests a quiz on the Frontend.
2. The Frontend calls GET /api/quiz/generate on the Backend.
3. The Backend constructs a prompt and calls the Gemini REST API.
4. Gemini returns the quiz data in JSON format.
5. The Backend parses the JSON, stores the correct answer in memory (mapped to a unique quiz ID), and sends the question and options back to the Frontend.
6. The user selects an option and submits it.
7. The Frontend calls POST /api/quiz/submit with the selected index and quiz ID.
8. The Backend verifies the answer, updates the user's token balance, and responds with the result.
