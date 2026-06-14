// Tiny observable store. Components subscribe; anything that calls set() triggers a re-render.
// Keeps state in exactly one place instead of scattered globals.
const state = {
    tokens: 0,
    activeStake: null,
    projectedPayout: null, // MultiplierBreakdown for the active stake
    player: null,          // PlayerSummary
    blocklist: [],
};

const listeners = new Set();

export const store = {
    get: () => state,

    set(patch) {
        Object.assign(state, patch);
        listeners.forEach((fn) => fn(state));
    },

    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },

    /** Fold a server response (which may carry tokens/activeStake/player) into the store. */
    applyServer(data = {}) {
        const patch = {};
        if ('totalTokens' in data) patch.tokens = data.totalTokens;
        if ('newBalance' in data) patch.tokens = data.newBalance;
        if ('activeStake' in data) patch.activeStake = data.activeStake;
        if ('projectedPayout' in data) patch.projectedPayout = data.projectedPayout;
        if ('player' in data && data.player) patch.player = data.player;
        this.set(patch);
    },
};
