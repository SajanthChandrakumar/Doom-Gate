// All the "juice": toasts, confetti, sound and number tweening. Pure presentation, no app logic.

// --- Toasts -----------------------------------------------------------------
const stack = () => document.getElementById('toast-stack');

export function toast(title, body = '', variant = '') {
    const el = document.createElement('div');
    el.className = `toast ${variant ? `is-${variant}` : ''}`;
    el.innerHTML = `<span class="toast__title"></span><span class="toast__body"></span>`;
    el.querySelector('.toast__title').textContent = title;
    el.querySelector('.toast__body').textContent = body;
    stack().appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity .4s, transform .4s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        setTimeout(() => el.remove(), 400);
    }, 4200);
}

// --- Sound (WebAudio, no asset files) ---------------------------------------
let audioCtx = null;
function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function tone(freq, durationMs, type = 'sine', gain = 0.06) {
    try {
        const ac = ctx();
        const osc = ac.createOscillator();
        const vol = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        vol.gain.value = gain;
        osc.connect(vol).connect(ac.destination);
        osc.start();
        vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000);
        osc.stop(ac.currentTime + durationMs / 1000);
    } catch { /* audio not allowed yet */ }
}

export const sfx = {
    bet: () => tone(440, 120, 'triangle'),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 160, 'triangle', 0.08), i * 90)),
    lose: () => [330, 220, 130].forEach((f, i) => setTimeout(() => tone(f, 200, 'sawtooth', 0.07), i * 110)),
    coin: () => { tone(880, 70, 'square', 0.05); setTimeout(() => tone(1320, 90, 'square', 0.05), 70); },
    alarm: () => [880, 660, 880, 660].forEach((f, i) => setTimeout(() => tone(f, 140, 'square', 0.07), i * 150)),
};

// --- Animated number counter ------------------------------------------------
export function animateCount(el, to, durationMs = 700) {
    if (!el) return;
    const from = Number(el.dataset.value || el.textContent.replace(/\D/g, '')) || 0;
    if (from === to) { el.textContent = to.toLocaleString(); return; }
    const start = performance.now();
    function frame(now) {
        const t = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(from + (to - from) * eased);
        el.textContent = value.toLocaleString();
        if (t < 1) requestAnimationFrame(frame);
        else el.dataset.value = to;
    }
    el.dataset.value = to;
    requestAnimationFrame(frame);
}

// --- Confetti ---------------------------------------------------------------
const COLORS = ['#6d8bff', '#b07bff', '#ffce4d', '#34e0a1', '#ff5e72'];

export function confetti(durationMs = 1600) {
    const canvas = document.getElementById('confetti');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    const c = canvas.getContext('2d');
    c.scale(dpr, dpr);

    const pieces = Array.from({ length: 140 }, () => ({
        x: Math.random() * innerWidth,
        y: -20 - Math.random() * innerHeight * 0.3,
        r: 4 + Math.random() * 6,
        vy: 3 + Math.random() * 4,
        vx: -2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
    }));

    const start = performance.now();
    function frame(now) {
        const elapsed = now - start;
        c.clearRect(0, 0, innerWidth, innerHeight);
        pieces.forEach((p) => {
            p.x += p.vx; p.y += p.vy; p.rot += p.vr;
            c.save();
            c.translate(p.x, p.y); c.rotate(p.rot);
            c.fillStyle = p.color;
            c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
            c.restore();
        });
        if (elapsed < durationMs) requestAnimationFrame(frame);
        else c.clearRect(0, 0, innerWidth, innerHeight);
    }
    requestAnimationFrame(frame);
}
