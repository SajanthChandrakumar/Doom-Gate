// Owns the live countdown: the numeric clock and the SVG progress ring. Knows nothing about
// betting rules — give it a stake and a "done" callback and it ticks.

const RING_CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 in the SVG

let intervalId = null;

function parseStart(stake) {
    // The server sends UTC; make sure it's parsed as UTC even if the 'Z' is missing.
    const raw = stake.startTime.endsWith('Z') ? stake.startTime : `${stake.startTime}Z`;
    return new Date(raw).getTime();
}

export function startTimer(stake, { onComplete } = {}) {
    stopTimer();
    let firedComplete = false;

    const endTime = parseStart(stake) + stake.targetDurationMinutes * 60000;
    const totalMs = stake.targetDurationMinutes * 60000;

    const tick = () => {
        const remaining = endTime - Date.now();
        const clockEl = document.getElementById('time-left');
        const ringEl = document.getElementById('ring-bar');

        if (remaining <= 0) {
            if (clockEl) clockEl.textContent = '00:00';
            if (ringEl) ringEl.style.strokeDashoffset = RING_CIRCUMFERENCE;
            stopTimer();
            if (!firedComplete) { firedComplete = true; onComplete?.(); }
            return;
        }

        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        if (clockEl) clockEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

        if (ringEl) {
            const fraction = Math.max(0, Math.min(1, remaining / totalMs));
            ringEl.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);
            // Heat up the ring colour as time runs out.
            ringEl.style.stroke = remaining < 60000 ? 'var(--danger)'
                : remaining < totalMs * 0.25 ? 'var(--warning)'
                : 'var(--accent)';
        }
    };

    tick();
    intervalId = setInterval(tick, 1000);
}

export function stopTimer() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
