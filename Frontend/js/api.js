// Thin, typed-ish wrapper around the Doom-Gate REST API. Every network call lives here so the
// rest of the app never touches fetch() directly.
import { API_BASE } from './config.js';

async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }

    if (!res.ok) {
        const message = data?.error || data?.detail || data?.title || `Request failed (${res.status})`;
        throw new Error(message);
    }
    return data;
}

export const api = {
    // Casino
    getState: () => request('/casino/state'),
    stake: (stakeAmount, durationMinutes) =>
        request('/casino/stake', { method: 'POST', body: { stakeAmount, durationMinutes } }),
    claim: () => request('/casino/claim', { method: 'POST' }),
    liquidate: () => request('/casino/liquidate', { method: 'POST' }),

    // Quiz / rescue
    generateQuiz: () => request('/quiz/generate'),
    submitQuiz: (quizId, selectedIndex) =>
        request('/quiz/submit', { method: 'POST', body: { quizId, selectedIndex } }),

    // Focus guard
    focusConfig: () => request('/focus/config'),
    reportDistraction: (app, source = 'browser') =>
        request('/focus/report', { method: 'POST', body: { app, source } }),

    // Player / progression
    achievements: () => request('/player/achievements'),
    leaderboard: () => request('/player/leaderboard'),
    dailyBonus: () => request('/player/daily-bonus', { method: 'POST' }),
};
