# Doom-Gate: Focus Command Center

Doom-Gate is an Anti-Doomscrolling City Builder. Build a neon metropolis by staying focused and passing neural challenges.

## Overview

The application features a modern architecture utilizing C# ASP.NET Core for the backend and a lightweight Vanilla JavaScript frontend.

## Quick Start

### 1. Requirements

- .NET 8.0 SDK or newer
- An active Gemini API Key

### 2. Configure Environment

In the root directory, create a .env file or configure the application settings to include your API key. Alternatively, you can use environment variables:

export GEMINI_API_KEY="YOUR_API_KEY_HERE"

### 3. Run the Backend

Navigate to the Backend directory and run the application:

cd Backend
dotnet run

The server will start locally, typically on http://localhost:5000.

### 4. Run the Frontend

The frontend is a pure HTML/CSS/JS application. You do not need a complex build tool to run it.
You can open the Frontend/index.html file in your browser directly, or serve it using any local HTTP server. For example:

cd Frontend
python3 -m http.server 3000

Then open http://localhost:3000 in your browser.
