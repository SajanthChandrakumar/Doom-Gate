// The browser half of the Focus Guard. While armed (a stake is live) it watches the Page
// Visibility API: leave the tab for longer than the grace period and it relays a "tab-blur"
// breach to the server, which strikes the stake. The iOS half is a Shortcut that hits the same
// /api/focus/report endpoint when a blocked app is opened.
import { api } from './api.js';
import { TAB_BLUR_GRACE_MS } from './config.js';

let armed = false;
let breachHandler = null;
let blurTimer = null;

async function relay(app, source) {
    if (!armed) return;
    try {
        const result = await api.reportDistraction(app, source);
        if (result?.blocked && !result.idle) breachHandler?.(result);
    } catch (err) {
        console.error('Focus Guard relay failed:', err);
    }
}

function onVisibilityChange() {
    if (!armed) return;
    if (document.hidden) {
        clearTimeout(blurTimer);
        blurTimer = setTimeout(() => relay('tab-blur', 'browser'), TAB_BLUR_GRACE_MS);
    } else {
        clearTimeout(blurTimer);
    }
}

export const focusGuard = {
    init({ onBreach }) {
        breachHandler = onBreach;
        document.addEventListener('visibilitychange', onVisibilityChange);
    },

    arm() { armed = true; },

    disarm() {
        armed = false;
        clearTimeout(blurTimer);
    },

    /** Manually fire a breach for a named app — used by the "simulate breach" test buttons. */
    simulate(app) { return relay(app, 'manual-test'); },
};
