// Central configuration. Tweak here, not scattered through the app.
export const API_BASE = 'http://localhost:5000/api';

// How long the in-browser guard waits after you leave the tab before it reports a breach.
// Brief glances are forgiven; genuinely leaving is not.
export const TAB_BLUR_GRACE_MS = 6000;

// How often the HUD re-syncs with the server (covers daily-bonus rollover, etc.).
export const STATE_POLL_MS = 30000;
