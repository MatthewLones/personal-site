/**
 * Shared UI components for puzzle timer, leaderboard, and name entry.
 * Each puzzle imports these helpers to wire up competitive features
 * without duplicating DOM/CSS logic.
 */

import {
  type GameSession,
  type LeaderboardEntry,
  startSession,
  getElapsed,
  formatTime,
  markHintUsed,
  submitScore,
  fetchLeaderboard,
} from './game-timer';

// ═══════════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════════

export interface PuzzleTimer {
  session: GameSession | null;
  timerEl: HTMLElement;
  intervalId: number | null;
  start: (game: string) => Promise<void>;
  stop: () => void;
  markHint: () => void;
  getSession: () => GameSession | null;
}

export function createPuzzleTimer(counterEl: HTMLElement): PuzzleTimer {
  // Insert timer element after the existing move counter
  const timerEl = document.createElement('span');
  timerEl.className = counterEl.className;
  timerEl.style.minWidth = '3.5em';
  timerEl.textContent = '';
  counterEl.parentElement?.appendChild(timerEl);

  const timer: PuzzleTimer = {
    session: null,
    timerEl,
    intervalId: null,

    async start(game: string) {
      timer.stop();
      timer.session = await startSession(game);
      timerEl.textContent = '0.0';
      timer.intervalId = window.setInterval(() => {
        if (timer.session?.running) {
          timerEl.textContent = formatTime(getElapsed(timer.session));
        }
      }, 100);
    },

    stop() {
      if (timer.intervalId !== null) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
      }
      if (timer.session) {
        timer.session.running = false;
        // Show final time
        timerEl.textContent = formatTime(getElapsed(timer.session));
      }
    },

    markHint() {
      if (timer.session) markHintUsed(timer.session);
    },

    getSession() {
      return timer.session;
    },
  };

  return timer;
}

// ═══════════════════════════════════════════════════════════
//  LEADERBOARD PANEL
// ═══════════════════════════════════════════════════════════

export function createLeaderboardPanel(
  controlsEl: HTMLElement,
  game: string,
  formatEntry: (entry: LeaderboardEntry, rank: number) => string,
): { toggle: () => void; refresh: () => void } {
  // Add toggle button to the mode bar
  const modeBar = controlsEl.querySelector('[class$="-mode-bar"]');
  const toggleBtn = document.createElement('button');
  toggleBtn.className = (modeBar?.querySelector('button') as HTMLElement)?.className || 'lb-btn';
  toggleBtn.textContent = 'leaderboard';
  toggleBtn.style.borderLeft = '1px solid var(--vf-arrow-color, #3a3020)';

  // Create a separate bar for the leaderboard button
  const lbBar = document.createElement('div');
  lbBar.className = modeBar?.className || '';
  lbBar.appendChild(toggleBtn);
  controlsEl.appendChild(lbBar);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'lb-panel';
  panel.style.cssText = `
    display: none;
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--vf-arrow-color, #3a3020);
    border-radius: 4px;
    max-height: 240px;
    overflow-y: auto;
    scrollbar-width: none;
    font-family: var(--controls-font);
    font-size: var(--controls-font-size);
    color: var(--vf-arrow-color, #3a3020);
    opacity: 0.7;
    min-width: 200px;
  `;

  // Insert panel after controls
  controlsEl.parentElement?.insertBefore(panel, controlsEl.nextSibling);

  let open = false;

  async function refresh() {
    panel.innerHTML = '<span style="opacity:0.5">loading...</span>';
    const entries = await fetchLeaderboard(game);
    if (entries.length === 0) {
      panel.innerHTML = '<span style="opacity:0.5">no scores yet</span>';
      return;
    }
    panel.innerHTML = entries
      .map((e, i) => {
        const rank = i + 1;
        return `<div style="display:flex;justify-content:space-between;padding:2px 0;${rank <= 3 ? 'font-weight:bold;' : ''}">${formatEntry(e, rank)}</div>`;
      })
      .join('');
  }

  function toggle() {
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    if (open) refresh();
  }

  toggleBtn.addEventListener('click', toggle);

  return { toggle, refresh };
}

// ═══════════════════════════════════════════════════════════
//  NAME ENTRY OVERLAY
// ═══════════════════════════════════════════════════════════

export interface NameEntryResult {
  name: string;
}

export function showNameEntry(
  anchorEl: HTMLElement,
  session: GameSession,
  extras: { moves?: number; tilesClicked?: number } = {},
): Promise<NameEntryResult | null> {
  return new Promise((resolve) => {
    const elapsed = getElapsed(session);
    const hintUsed = session.hintUsed;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'name-entry-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(44, 42, 34, 0.85);
      border-radius: 8px;
      z-index: 10;
    `;

    const timeDisplay = formatTime(elapsed);
    const hintNote = hintUsed
      ? '<div style="font-size:0.65rem;opacity:0.6;margin-top:4px;">hint used — won\'t appear on board</div>'
      : '';

    overlay.innerHTML = `
      <div style="color:#f0e8d8;font-family:var(--font-heading);font-size:1.1rem;margin-bottom:8px;">
        ${timeDisplay}
      </div>
      ${hintNote}
      <form style="display:flex;gap:6px;margin-top:8px;" autocomplete="off">
        <input
          type="text"
          maxlength="20"
          placeholder="your name"
          style="
            font-family:var(--controls-font);
            font-size:var(--controls-font-size);
            padding:4px 10px;
            border:1px solid rgba(240,232,216,0.3);
            border-radius:4px;
            background:rgba(255,255,255,0.08);
            color:#f0e8d8;
            outline:none;
            width:120px;
          "
        />
        <button
          type="submit"
          style="
            font-family:var(--controls-font);
            font-size:var(--controls-font-size);
            padding:4px 12px;
            border:1px solid rgba(240,232,216,0.3);
            border-radius:4px;
            background:rgba(240,232,216,0.15);
            color:#f0e8d8;
            cursor:pointer;
          "
        >submit</button>
      </form>
      <button
        class="name-entry-skip"
        style="
          font-family:var(--controls-font);
          font-size:0.65rem;
          color:rgba(240,232,216,0.4);
          background:none;
          border:none;
          cursor:pointer;
          margin-top:8px;
        "
      >skip</button>
    `;

    // Position relative to anchor
    const container = anchorEl.closest('.lo-container, .bfk-container, .peg-container') as HTMLElement;
    if (container) container.style.position = 'relative';
    const parent = container || anchorEl.parentElement!;
    parent.appendChild(overlay);

    const input = overlay.querySelector('input') as HTMLInputElement;
    const form = overlay.querySelector('form') as HTMLFormElement;
    const skipBtn = overlay.querySelector('.name-entry-skip') as HTMLButtonElement;

    // Focus input after a brief delay (let confetti be visible)
    setTimeout(() => input.focus(), 300);

    function cleanup() {
      overlay.remove();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;

      const submitBtn = form.querySelector('button') as HTMLButtonElement;
      submitBtn.textContent = '...';
      submitBtn.disabled = true;

      const result = await submitScore(session, name, extras);
      cleanup();

      if (result) {
        resolve({ name });
      } else {
        resolve({ name });
      }
    });

    skipBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
  });
}
