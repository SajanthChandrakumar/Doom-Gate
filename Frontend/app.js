// Base URL for the C# API
// Assuming the ASP.NET Core API is running locally on port 5000 
// Ensure the port matches what the dotnet console prints (usually http://localhost:5000 or http://localhost:5001)
const API_BASE = 'http://localhost:5000/api';

// DOM Elements
const tokenCountEl = document.getElementById('token-count');
const techTreeEl = document.getElementById('tech-tree');
const btnGenerateQuiz = document.getElementById('btn-generate-quiz');
const quizContainer = document.getElementById('quiz-container');
const quizQuestionEl = document.getElementById('quiz-question');
const quizOptionsEl = document.getElementById('quiz-options');
const quizFeedbackEl = document.getElementById('quiz-feedback');

// State
let userTokens = 0;
let unlockedNodes = [];
let currentQuizId = null;

// Available Shop Nodes for Prototype
const shopNodes = [
    { id: 'root', title: 'Root Node', cost: 0 },
    { id: 'speed_upgrade', title: 'Speed Upgrade I', cost: 50 },
    { id: 'shield_boost', title: 'Shield Boost', cost: 100 },
    { id: 'plasma_canon', title: 'Plasma Canon', cost: 200 }
];

// --- Initialization ---
async function init() {
    await fetchState();
    renderTechTree();
}

// --- API Calls ---
async function fetchState() {
    try {
        const res = await fetch(`${API_BASE}/state`);
        if (!res.ok) throw new Error('Failed to fetch state');
        const data = await res.json();
        
        userTokens = data.focusTokens;
        unlockedNodes = data.unlockedNodes;
        
        updateTokenDisplay();
    } catch (err) {
        console.error('API Error:', err);
        tokenCountEl.innerText = 'Error connecting to API';
    }
}

async function unlockNode(nodeId, cost) {
    try {
        const res = await fetch(`${API_BASE}/shop/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId, cost })
        });
        
        const data = await res.json();
        if (data.success) {
            userTokens = data.remainingTokens;
            unlockedNodes.push(nodeId);
            updateTokenDisplay();
            renderTechTree();
        } else {
            alert(data.error || 'Failed to unlock');
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

async function generateQuiz() {
    btnGenerateQuiz.disabled = true;
    btnGenerateQuiz.innerText = 'Generating (AI)...';
    quizFeedbackEl.innerText = '';
    quizContainer.classList.add('hidden');
    
    try {
        const res = await fetch(`${API_BASE}/quiz/generate`);
        const data = await res.json();
        
        if (data.error || data.detail) {
            throw new Error(data.error || data.detail || 'API Error');
        }
        
        currentQuizId = data.quizId;
        renderQuiz(data.question, data.options);
    } catch (err) {
        console.error('Quiz Error:', err);
        quizFeedbackEl.innerText = `Error: ${err.message}. Make sure C# backend is running.`;
        quizFeedbackEl.style.color = 'var(--danger)';
    } finally {
        btnGenerateQuiz.disabled = false;
        btnGenerateQuiz.innerText = 'Generate AI Quiz';
    }
}

async function submitQuiz(selectedIndex) {
    quizOptionsEl.innerHTML = ''; // disable further clicks
    quizFeedbackEl.innerText = 'Submitting...';
    
    try {
        const res = await fetch(`${API_BASE}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: currentQuizId, selectedIndex })
        });
        
        const data = await res.json();
        
        if (data.error) {
            quizFeedbackEl.innerText = data.error;
            quizFeedbackEl.style.color = 'var(--danger)';
            return;
        }
        
        userTokens = data.tokens;
        updateTokenDisplay();
        
        if (data.status === 'unlocked') {
            quizFeedbackEl.innerText = 'Correct! +10 Tokens';
            quizFeedbackEl.style.color = 'var(--success)';
        } else {
            quizFeedbackEl.innerText = 'Wrong! -5 Tokens';
            quizFeedbackEl.style.color = 'var(--danger)';
        }
        
        currentQuizId = null;
        setTimeout(() => {
            quizContainer.classList.add('hidden');
            quizFeedbackEl.innerText = '';
        }, 3000);
        
    } catch (err) {
        console.error('Submit Error:', err);
        quizFeedbackEl.innerText = 'Error submitting quiz.';
    }
}

// --- UI Rendering ---
function updateTokenDisplay() {
    tokenCountEl.innerText = userTokens;
}

function renderTechTree() {
    techTreeEl.innerHTML = '';
    
    shopNodes.forEach(node => {
        const isUnlocked = unlockedNodes.includes(node.id);
        const canAfford = userTokens >= node.cost;
        
        const card = document.createElement('div');
        card.className = `node-card ${isUnlocked ? 'node-unlocked' : ''}`;
        
        card.innerHTML = `
            <div>
                <h3>${node.title}</h3>
                <div class="node-cost">${node.cost} Tokens</div>
            </div>
        `;
        
        if (isUnlocked) {
            const status = document.createElement('div');
            status.className = 'status-label';
            status.innerText = 'Unlocked';
            card.appendChild(status);
        } else {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerText = 'Unlock';
            btn.disabled = !canAfford;
            btn.onclick = () => unlockNode(node.id, node.cost);
            card.appendChild(btn);
        }
        
        techTreeEl.appendChild(card);
    });
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
    
    quizContainer.classList.remove('hidden');
}

// --- Event Listeners ---
btnGenerateQuiz.addEventListener('click', generateQuiz);

// Run
init();
