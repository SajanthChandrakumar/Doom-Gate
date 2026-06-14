// All DOM rendering lives here. Other modules change the store or fetch data; this module turns
// that state into pixels. No fetch(), no game rules — just presentation.
import { animateCount } from './effects.js';

const $ = (id) => document.getElementById(id);

// Mirror of the server's multiplier maths, used only for the pre-bet preview. The server stays
// authoritative on the real payout.
export function estimateMultiplier(duration, player) {
    const streak = player?.currentStreakDays ?? 0;
    const level = player?.level ?? 1;
    const durationBonus = Math.min((duration || 0) / 30, 1.5);
    const streakBonus = Math.min(streak * 0.1, 1.0);
    const levelBonus = Math.min((level - 1) * 0.05, 0.5);
    const total = Math.round((2 + durationBonus + streakBonus + levelBonus) * 100) / 100;
    return { base: 2, durationBonus, streakBonus, levelBonus, total };
}

// --- HUD --------------------------------------------------------------------
export function renderHud(state) {
    const { player } = state;
    animateCount($('token-count'), state.tokens);

    if (!player) return;
    $('level-num').textContent = player.level;
    $('level-title').textContent = player.title;
    const xpPct = player.xpForNextLevel ? (player.xpIntoLevel / player.xpForNextLevel) * 100 : 0;
    $('xp-fill').style.width = `${Math.min(100, xpPct)}%`;

    $('streak-days').textContent = player.currentStreakDays;
    $('streak').classList.toggle('is-cold', player.currentStreakDays === 0);

    $('daily-bonus').classList.toggle('hidden', !player.dailyBonusAvailable);
}

// --- Stake area -------------------------------------------------------------
export function renderStakeArea(state) {
    const active = state.activeStake;
    $('stake-card').classList.toggle('hidden', !!active);
    $('active-card').classList.toggle('hidden', !active);

    if (!active) return;

    $('active-amount').textContent = active.stakedAmount.toLocaleString();
    const payout = state.projectedPayout;
    if (payout) {
        $('active-payout').textContent = payout.potentialPayout.toLocaleString();
        $('active-mult').textContent = `${payout.total.toFixed(2)}×`;
    }

    const strikes = active.distractionsThisSession || 0;
    $('strikes').textContent = strikes > 0 ? `${'🔴'.repeat(strikes)}${'⚪'.repeat(Math.max(0, 2 - strikes))}` : '';
}

export function renderPreview(state) {
    const amount = Number($('stake-amount').value) || 0;
    const duration = Number($('stake-duration').value) || 0;
    const est = estimateMultiplier(duration, state.player);
    const payout = Math.round(amount * est.total);

    $('preview-payout').textContent = payout.toLocaleString();
    $('preview-mult').textContent = `${est.total.toFixed(2)}×`;

    const rows = [
        ['Base', est.base],
        ['Duration', est.durationBonus],
        ['Streak', est.streakBonus],
        ['Level', est.levelBonus],
    ].filter(([, v]) => v > 0);
    $('preview-breakdown').innerHTML = rows
        .map(([k, v]) => `<li>${k} +${v.toFixed(2)}</li>`)
        .join('');
}

// --- Focus Guard ------------------------------------------------------------
export function renderGuard(state) {
    const armed = !!state.activeStake;
    const status = $('guard-status');
    status.textContent = armed ? 'Armed' : 'Disarmed';
    status.classList.toggle('is-armed', armed);

    if (state.blocklist.length && !$('blocklist').dataset.rendered) {
        $('blocklist').innerHTML = state.blocklist
            .filter((a) => a !== 'tab-blur')
            .map((a) => `<span>${a}</span>`)
            .join('');
        $('blocklist').dataset.rendered = '1';
    }
}

// --- Trophies + leaderboard -------------------------------------------------
export function renderTrophies(achievements) {
    $('trophies').innerHTML = achievements
        .map((a) => `<div class="trophy ${a.unlocked ? 'is-unlocked' : ''}"
            title="${a.name} — ${a.description}${a.unlocked ? '' : ` (+${a.rewardTokens} tokens)`}">${a.icon}</div>`)
        .join('');
}

export function renderLeaderboard(entries) {
    $('leaderboard').innerHTML = entries
        .map((e) => `<li class="${e.isYou ? 'is-you' : ''}">
            <span class="rank">${e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</span>
            <span class="name">${e.name}</span>
            <span class="score">${e.tokens.toLocaleString()}</span>
        </li>`)
        .join('');
}

// --- Quiz modal -------------------------------------------------------------
export function openQuiz() {
    $('quiz-modal').classList.remove('hidden');
    $('quiz-question').textContent = 'Loading AI question…';
    $('quiz-options').innerHTML = '';
    $('quiz-feedback').textContent = '';
}

export function closeQuiz() {
    $('quiz-modal').classList.add('hidden');
}

export function renderQuiz(question, options, onSelect) {
    $('quiz-question').textContent = question;
    const grid = $('quiz-options');
    grid.innerHTML = '';
    options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.onclick = () => onSelect(i, btn);
        grid.appendChild(btn);
    });
}

export function setQuizFeedback(text, color) {
    const el = $('quiz-feedback');
    el.textContent = text;
    el.style.color = color || 'var(--text)';
}

export function lockQuizOptions(selectedBtn, outcome) {
    document.querySelectorAll('.quiz-option').forEach((b) => {
        b.disabled = true;
    });
    if (selectedBtn) selectedBtn.classList.add(outcome === 'saved' ? 'correct' : 'wrong');
}
