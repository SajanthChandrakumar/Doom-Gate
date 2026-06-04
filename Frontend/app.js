const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const tokenCountEl = document.getElementById('token-count');
const stakeFormEl = document.getElementById('stake-form');
const stakeAmountInput = document.getElementById('stake-amount');
const stakeDurationInput = document.getElementById('stake-duration');
const btnStake = document.getElementById('btn-stake');

const activeStakeContainer = document.getElementById('active-stake-container');
const activeAmountEl = document.getElementById('active-amount');
const timeLeftEl = document.getElementById('time-left');

const btnClaim = document.getElementById('btn-claim');
const btnDistracted = document.getElementById('btn-distracted');
const btnLastChance = document.getElementById('btn-last-chance');

const quizSection = document.getElementById('quiz-section');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const quizFeedbackEl = document.getElementById('quiz-feedback');

// State
let userTokens = 0;
let activeStake = null;
let currentQuizId = null;
let timerInterval = null;

// --- Initialization ---
async function init() {
    await fetchState();
}

// --- API Calls ---
async function fetchState() {
    try {
        const res = await fetch(`${API_BASE}/casino/state`);
        const data = await res.json();
        
        userTokens = data.totalTokens;
        activeStake = data.activeStake;
        
        updateUI();
    } catch (err) {
        console.error('API Error:', err);
    }
}

async function placeStake() {
    const amount = parseInt(stakeAmountInput.value);
    const duration = parseInt(stakeDurationInput.value);
    
    if (!amount || !duration || amount <= 0 || duration <= 0) {
        alert("Enter valid amount and duration.");
        return;
    }
    
    btnStake.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/casino/stake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stakeAmount: amount, durationMinutes: duration })
        });
        
        const data = await res.json();
        if (data.success) {
            userTokens = data.newBalance;
            activeStake = data.activeStake;
            updateUI();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error('Stake Error:', err);
    } finally {
        btnStake.disabled = false;
    }
}

async function liquidateStake() {
    try {
        const res = await fetch(`${API_BASE}/casino/liquidate`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'liquidated') {
            userTokens = data.newBalance;
            activeStake = null;
            alert("Stake liquidated. You lost the bet.");
            updateUI();
        }
    } catch (err) {
        console.error('Liquidate Error:', err);
    }
}

async function claimWinnings() {
    try {
        const res = await fetch(`${API_BASE}/casino/claim`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === 'won') {
            userTokens = data.newBalance;
            activeStake = null;
            alert(`You won ${data.winnings} tokens!`);
            updateUI();
        } else if (data.error) {
            alert(data.error);
        }
    } catch (err) {
        console.error('Claim Error:', err);
    }
}

async function triggerLastChance() {
    btnLastChance.disabled = true;
    quizSection.classList.remove('hidden');
    quizQuestionEl.innerText = "Loading AI question...";
    quizOptionsEl.innerHTML = "";
    quizFeedbackEl.innerText = "";
    
    try {
        const res = await fetch(`${API_BASE}/quiz/generate`);
        const data = await res.json();
        
        if (data.error || data.detail) {
            throw new Error(data.error || data.detail);
        }
        
        currentQuizId = data.quizId;
        renderQuiz(data.question, data.options);
    } catch (err) {
        console.error('Quiz Gen Error:', err);
        quizFeedbackEl.innerText = `Error: ${err.message}`;
    }
}

async function submitQuiz(selectedIndex) {
    quizOptionsEl.innerHTML = ''; 
    quizFeedbackEl.innerText = 'Submitting...';
    
    try {
        const res = await fetch(`${API_BASE}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: currentQuizId, selectedIndex })
        });
        
        const data = await res.json();
        
        if (data.status === 'saved') {
            activeStake = data.currentStake;
            quizFeedbackEl.innerText = `Correct! Stake saved (Penalty applied: ${data.penalty})`;
            quizFeedbackEl.style.color = '#10b981';
            setTimeout(() => {
                quizSection.classList.add('hidden');
                updateUI();
            }, 3000);
        } else if (data.status === 'liquidated') {
            activeStake = null;
            userTokens = data.newBalance;
            quizFeedbackEl.innerText = `Wrong! Immediate Liquidation.`;
            quizFeedbackEl.style.color = '#ef4444';
            setTimeout(() => {
                quizSection.classList.add('hidden');
                updateUI();
            }, 3000);
        } else {
            quizFeedbackEl.innerText = data.error || 'Error submitting quiz';
        }
        
    } catch (err) {
        console.error('Submit Error:', err);
        quizFeedbackEl.innerText = 'Error submitting quiz.';
    }
}

// --- UI Rendering ---
function updateUI() {
    tokenCountEl.innerText = userTokens;
    
    if (activeStake) {
        stakeFormEl.classList.add('hidden');
        activeStakeContainer.classList.remove('hidden');
        activeAmountEl.innerText = activeStake.stakedAmount;
        btnLastChance.disabled = false;
        
        startTimer();
    } else {
        stakeFormEl.classList.remove('hidden');
        activeStakeContainer.classList.add('hidden');
        quizSection.classList.add('hidden');
        stopTimer();
    }
}

function renderQuiz(question, options) {
    quizQuestionEl.innerText = question;
    quizOptionsEl.innerHTML = '';
    
    options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => submitQuiz(index);
        quizOptionsEl.appendChild(btn);
    });
}

function startTimer() {
    stopTimer();
    
    timerInterval = setInterval(() => {
        if (!activeStake) return stopTimer();
        
        // Correctly parse time handling UTC
        // Ensure activeStake.startTime is parsed as UTC
        const startTimeStr = activeStake.startTime.endsWith('Z') ? activeStake.startTime : activeStake.startTime + 'Z';
        const startTime = new Date(startTimeStr).getTime();
        const endTime = startTime + (activeStake.targetDurationMinutes * 60000);
        const now = Date.now();
        
        const remainingMs = endTime - now;
        
        if (remainingMs <= 0) {
            timeLeftEl.innerText = "00:00 (Ready to Claim!)";
            btnClaim.disabled = false;
            stopTimer();
        } else {
            const m = Math.floor(remainingMs / 60000);
            const s = Math.floor((remainingMs % 60000) / 1000);
            timeLeftEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            btnClaim.disabled = true;
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// --- Event Listeners ---
btnStake.addEventListener('click', placeStake);
btnDistracted.addEventListener('click', liquidateStake);
btnClaim.addEventListener('click', claimWinnings);
btnLastChance.addEventListener('click', triggerLastChance);

// Run
init();
