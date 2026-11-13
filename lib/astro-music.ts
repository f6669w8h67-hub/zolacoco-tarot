// Background music for 探索妳的星盤, as a small state machine so the races around a hidden YouTube
// player can be tested without a browser.
//
// Rules (ChatGPT review of PR #29, B1):
// - nothing plays until she taps; the player is created on the first tap, without autoplay;
// - playVideo is sent only when the player is ready AND she still wants music;
// - cancelling while it loads, or giving up after the wait, removes the player, so a late start
//   can never make a sound; any "playing" report she did not ask for is answered with a pause;
// - the button says 暫停音樂 only after the player reports that it is really playing.

export type MusicPhase = "off" | "loading" | "playing" | "blocked";
export type MusicCommand = "play" | "pause";

export type MusicState = {
  phase: MusicPhase;
  mounted: boolean; // is the player iframe in the page
  ready: boolean; // has the current player said it is ready for commands
  frame: number; // id of the current player; reports from an earlier one are ignored
  request: number; // id of the current "please play" request; its wait timer carries this id
  notice: string;
};

export type MusicEvent =
  | { type: "tap" }
  | { type: "ready"; frame: number }
  | { type: "playing"; frame: number }
  | { type: "paused"; frame: number }
  | { type: "timeout"; request: number };

export const MUSIC_WAIT_MS = 6000;
export const MUSIC_BLOCKED_NOTICE = "音樂沒有開始播放，可能被瀏覽器擋下了。請確認手機不是靜音，再按一次播放。";
export const initialMusic: MusicState = { phase: "off", mounted: false, ready: false, frame: 0, request: 0, notice: "" };

const unmounted = (state: MusicState): MusicState => ({ ...state, mounted: false, ready: false });

export function musicStep(state: MusicState, event: MusicEvent): { state: MusicState; commands: MusicCommand[] } {
  switch (event.type) {
    case "tap": {
      if (state.phase === "playing") return { state: { ...state, phase: "off" }, commands: ["pause"] };
      if (state.phase === "loading") {
        // Cancel. A ready player is paused (a play may already be on its way); one that is still
        // loading is removed, so it cannot start later on its own.
        const next = { ...state, phase: "off" as const };
        return state.ready ? { state: next, commands: ["pause"] } : { state: unmounted(next), commands: [] };
      }
      const asking = { ...state, phase: "loading" as const, notice: "", request: state.request + 1 };
      if (!state.mounted) return { state: { ...asking, mounted: true, ready: false, frame: state.frame + 1 }, commands: [] };
      return { state: asking, commands: state.ready ? ["play"] : [] };
    }
    case "ready": {
      if (event.frame !== state.frame || !state.mounted || state.ready) return { state, commands: [] };
      const next = { ...state, ready: true };
      return { state: next, commands: state.phase === "loading" ? ["play"] : [] };
    }
    case "playing": {
      if (event.frame !== state.frame || !state.mounted) return { state, commands: [] };
      if (state.phase === "loading") return { state: { ...state, phase: "playing", notice: "" }, commands: [] };
      if (state.phase === "playing") return { state, commands: [] };
      return { state, commands: ["pause"] }; // she did not ask for this: silence it
    }
    case "paused": {
      if (event.frame !== state.frame || state.phase !== "playing") return { state, commands: [] };
      return { state: { ...state, phase: "off" }, commands: [] };
    }
    case "timeout": {
      if (event.request !== state.request || state.phase !== "loading") return { state, commands: [] };
      return { state: unmounted({ ...state, phase: "blocked", notice: MUSIC_BLOCKED_NOTICE }), commands: [] };
    }
  }
}
