// Composition root for the frontend. Wires the store, UI, timer, focus guard and API together.
// Keep this file about *wiring*; the actual work lives in the imported modules.
import { api } from './api.js';
import { store } from './store.js';
import { focusGuard } from './focusGuard.js';
import { startTimer, stopTimer } from './timer.js';
import { toast, confetti, sfx } from './effects.js';
import * as ui from './ui.js';
import { STATE_POLL_MS } from './config.js';

const $ = (id) => document.getElementById(id);

// --- Render: store → DOM ----------------------------------------------------
let timerKey = null;

store.subscribe((state) => {
    ui.renderHud(state);
    ui.renderStakeArea(state);
    ui.renderGuard(state);
    ui.renderPreview(state);

    const active = state.activeStake;
    const key = active ? `${active.startTime}-${active.targetDurationMinutes}` : null;
    if (key === timerKey) return;
    timerKey = key;

    if (active) {
        $('btn-claim').disabled = true;
        focusGuard.arm();
        startTimer(active, {
            onComplete: () => {
                $('btn-claim').disabled = false;
                toast("Time's up!", 'Your focus held — claim your winnings 💰', 'success');
                sfx.coin();
            },
        });
    } else {
        focusGuard.disarm();
        stopTimer();
    }
});

// --- Server sync helpers ----------------------------------------------------
async function refreshState() {
    try { store.applyServer(await api.getState()); } catch (err) { console.error(err); }
}

function clearStake(data) {
    store.set({ activeStake: null, projectedPayout: null });
    store.applyServer(data);
}

function celebrate(unlocked = []) {
    if (!unlocked.length) return;
    confetti();
    unlocked.forEach((a, i) =>
        setTimeout(() => toast(`${a.icon} Achievement unlocked!`, `${a.name} — +${a.rewardTokens} tokens`, 'gold'), i * 350));
    refreshTrophies();
}

async function refreshTrophies() {
    try { ui.renderTrophies(await api.achievements()); } catch (err) { console.error(err); }
}
async function refreshLeaderboard() {
    try { ui.renderLeaderboard((await api.leaderboard()).entries); } catch (err) { console.error(err); }
}

// --- Actions ----------------------------------------------------------------
async function placeBet() {
    const amount = Number($('stake-amount').value);
    const duration = Number($('stake-duration').value);
    if (!amount || !duration || amount <= 0 || duration <= 0) {
        toast('Invalid bet', 'Enter a positive stake and duration.', 'danger');
        return;
    }

    $('btn-stake').disabled = true;
    try {
        const data = await api.stake(amount, duration);
        sfx.bet();
        store.applyServer(data);
        toast('Bet placed 🎯', `Focus for ${duration} min to win ${data.projectedPayout.potentialPayout.toLocaleString()}.`);
        celebrate(data.unlockedAchievements);
    } catch (err) {
        toast('Could not place bet', err.message, 'danger');
    } finally {
        $('btn-stake').disabled = false;
    }
}

async function claim() {
    try {
        const data = await api.claim();
        clearStake(data);
        confetti();
        sfx.win();
        toast(`You won ${data.winnings.toLocaleString()} tokens! 🤑`, `${data.multiplier.toFixed(2)}× multiplier banked.`, 'success');
        celebrate(data.unlockedAchievements);
        refreshLeaderboard();
    } catch (err) {
        toast('Cannot claim yet', err.message, 'danger');
    }
}

async function liquidate() {
    try {
        const data = await api.liquidate();
        clearStake(data);
        sfx.lose();
        toast('Stake liquidated 💀', 'Distraction wins this round. Streak reset.', 'danger');
    } catch (err) {
        toast('Error', err.message, 'danger');
    }
}

// --- Rescue quiz ------------------------------------------------------------
let currentQuizId = null;

async function startRescue() {
    ui.openQuiz();
    sfx.alarm();
    try {
        const data = await api.generateQuiz();
        currentQuizId = data.quizId;
        ui.renderQuiz(data.question, data.options, submitAnswer);
    } catch (err) {
        ui.setQuizFeedback(`Error: ${err.message}`, 'var(--danger)');
    }
}

async function submitAnswer(index, btn) {
    ui.setQuizFeedback('Submitting…');
    try {
        const data = await api.submitQuiz(currentQuizId, index);
        if (data.status === 'saved') {
            ui.lockQuizOptions(btn, 'saved');
            ui.setQuizFeedback(`Correct! Stake saved (−${data.penalty} fee).`, 'var(--success)');
            sfx.coin();
            celebrate(data.unlockedAchievements);
            setTimeout(async () => { ui.closeQuiz(); await refreshState(); }, 1800);
        } else {
            ui.lockQuizOptions(btn, 'wrong');
            ui.setQuizFeedback('Wrong! Instant liquidation.', 'var(--danger)');
            sfx.lose();
            setTimeout(() => { ui.closeQuiz(); clearStake(data); }, 1800);
        }
    } catch (err) {
        ui.setQuizFeedback(err.message, 'var(--danger)');
    }
}

// --- Focus Guard breach handling -------------------------------------------
async function onBreach(result) {
    await refreshState(); // pick up the new strike count / liquidation
    if (result.action === 'rescue') {
        toast('⚠️ Distraction detected!', result.message, 'danger');
        startRescue();
    } else if (result.action === 'liquidated') {
        sfx.lose();
        toast('💀 Liquidated', result.message, 'danger');
    }
}

// --- Daily bonus ------------------------------------------------------------
async function claimDailyBonus() {
    try {
        const data = await api.dailyBonus();
        store.applyServer(data);
        confetti(1000);
        sfx.coin();
        toast('🎁 Daily bonus!', `+${data.reward} tokens. See you tomorrow.`, 'gold');
    } catch (err) {
        toast('Bonus unavailable', err.message, 'danger');
    }
}

// --- Wiring -----------------------------------------------------------------
function wireEvents() {
    $('btn-stake').addEventListener('click', placeBet);
    $('btn-claim').addEventListener('click', claim);
    $('btn-distracted').addEventListener('click', liquidate);
    $('btn-rescue').addEventListener('click', startRescue);
    $('daily-bonus').addEventListener('click', claimDailyBonus);

    $('stake-amount').addEventListener('input', () => ui.renderPreview(store.get()));
    $('stake-duration').addEventListener('input', () => ui.renderPreview(store.get()));

    $('quick-picks').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const amt = chip.dataset.amount;
        $('stake-amount').value = amt === 'all' ? store.get().tokens : amt;
        ui.renderPreview(store.get());
    });

    document.querySelectorAll('[data-breach]').forEach((btn) =>
        btn.addEventListener('click', () => {
            if (!store.get().activeStake) {
                toast('No active stake', 'Place a bet first, then try to break focus.', 'gold');
                return;
            }
            focusGuard.simulate(btn.dataset.breach);
        }));
}

// --- Boot -------------------------------------------------------------------
async function init() {
    wireEvents();
    focusGuard.init({ onBreach });

    try {
        const cfg = await api.focusConfig();
        store.set({ blocklist: cfg.blocklist || [] });
    } catch (err) { console.error('Focus config failed:', err); }

    await refreshState();
    await Promise.all([refreshTrophies(), refreshLeaderboard()]);

    setInterval(refreshState, STATE_POLL_MS);
}

init();
