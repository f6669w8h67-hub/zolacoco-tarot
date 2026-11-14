// The healing room moves to the next question 220ms after she picks an answer, so the choice can be
// seen first. Those moves used to be bare setTimeouts, so going back, switching rooms or starting
// again within the 220ms could still jump her forward (ChatGPT review of PR #28, step-6 spec B3).
//
// Rules: one pending move at a time (rapid taps move once); any step or room change, restart or
// unmount cancels it; and when it fires it still checks that room, step and flow version are the ones
// it was scheduled from.

export type FlowPoint = { room: string; step: number; version: number };

export const ADVANCE_DELAY_MS = 220;

export function createAdvancer({ apply, delay = ADVANCE_DELAY_MS }: { apply: (next: number) => void; delay?: number }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let at: FlowPoint = { room: "", step: 0, version: 0 };
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  return {
    /** Call after every render where room or step changed; a waiting move is dropped. */
    sync(room: string, step: number) {
      if (room === at.room && step === at.step) return;
      at = { ...at, room, step };
      cancel();
    },
    /** Entering a room, going back to the lobby or starting again: a fresh flow. */
    newFlow() {
      at = { ...at, version: at.version + 1 };
      cancel();
    },
    /** Schedules a move to `next`; returns false when one is already waiting. */
    advance(next: number) {
      if (timer !== undefined) return false;
      const from = at;
      timer = setTimeout(() => {
        timer = undefined;
        if (at.room === from.room && at.step === from.step && at.version === from.version) apply(next);
      }, delay);
      return true;
    },
    cancel,
    get pending() {
      return timer !== undefined;
    },
    get position(): FlowPoint {
      return at;
    },
  };
}

export type Advancer = ReturnType<typeof createAdvancer>;
