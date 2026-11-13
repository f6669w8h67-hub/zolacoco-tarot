import assert from "node:assert/strict";
import test from "node:test";
import { MUSIC_BLOCKED_NOTICE, initialMusic, musicStep } from "../lib/astro-music.ts";

// Background music on 探索妳的星盤 (PR #29 review, B1): a cancelled or abandoned request must never
// turn into sound later, and the button only says 暫停音樂 when the player is really playing.
const run = (events, start = initialMusic) => events.reduce(({ state, sent }, event) => {
  const step = musicStep(state, event);
  return { state: step.state, sent: [...sent, ...step.commands] };
}, { state: start, sent: [] });

test("nothing is created or played before the first tap", () => {
  assert.deepEqual(initialMusic, { phase: "off", mounted: false, ready: false, frame: 0, request: 0, notice: "" });
  const { state, sent } = run([{ type: "ready", frame: 0 }, { type: "playing", frame: 0 }]);
  assert.equal(state.mounted, false);
  assert.equal(state.phase, "off");
  assert.deepEqual(sent, []);
});

test("first tap creates the player; play is sent only once it is ready; the button flips only when it really plays", () => {
  let { state, sent } = run([{ type: "tap" }]);
  assert.deepEqual([state.phase, state.mounted, state.ready, state.frame, state.request], ["loading", true, false, 1, 1]);
  assert.deepEqual(sent, [], "no play before the player can hear it");
  ({ state, sent } = run([{ type: "ready", frame: 1 }], state));
  assert.deepEqual(sent, ["play"]);
  assert.equal(state.phase, "loading", "still 音樂準備中 until the player reports playing");
  ({ state, sent } = run([{ type: "ready", frame: 1 }], state));
  assert.deepEqual(sent, [], "a second ready does not send play twice");
  ({ state } = run([{ type: "playing", frame: 1 }], state));
  assert.equal(state.phase, "playing");
});

test("cancel while loading: the player is removed, and its late ready or playing changes nothing", () => {
  const { state, sent } = run([
    { type: "tap" },
    { type: "tap" }, // changed her mind before the player was ready
    { type: "ready", frame: 1 },
    { type: "playing", frame: 1 },
  ]);
  assert.deepEqual([state.phase, state.mounted, state.ready], ["off", false, false]);
  assert.deepEqual(sent, [], "never asked to play");
});

test("cancel after play was sent but before it started: pause follows, and a late start is paused again", () => {
  const { state, sent } = run([
    { type: "tap" },
    { type: "ready", frame: 1 }, // -> play
    { type: "tap" }, // cancel while buffering -> pause
    { type: "playing", frame: 1 }, // the player starts anyway -> pause again
  ]);
  assert.equal(state.phase, "off");
  assert.deepEqual(sent, ["play", "pause", "pause"]);
});

test("ready only after the six-second wait: notice shown, player removed, no sound later", () => {
  let { state, sent } = run([{ type: "tap" }]);
  const request = state.request;
  ({ state, sent } = run([
    { type: "timeout", request },
    { type: "ready", frame: 1 }, // the old player finally answers
    { type: "playing", frame: 1 },
  ], state));
  assert.deepEqual([state.phase, state.mounted, state.notice], ["blocked", false, MUSIC_BLOCKED_NOTICE]);
  assert.deepEqual(sent, []);
});

test("trying again after a block makes a fresh player, and the old one's reports are ignored", () => {
  let { state } = run([{ type: "tap" }]);
  ({ state } = run([{ type: "timeout", request: state.request }], state));
  let sent;
  ({ state, sent } = run([{ type: "tap" }, { type: "ready", frame: 1 }, { type: "playing", frame: 1 }], state));
  assert.deepEqual([state.phase, state.mounted, state.frame, state.notice], ["loading", true, 2, ""]);
  assert.deepEqual(sent, [], "frame 1 is gone");
  ({ state, sent } = run([{ type: "ready", frame: 2 }, { type: "playing", frame: 2 }], state));
  assert.equal(state.phase, "playing");
  assert.deepEqual(sent, ["play"]);
});

test("pause while playing, then play again: same player, play sent at once, an old timer cannot block it", () => {
  let { state } = run([{ type: "tap" }, { type: "ready", frame: 1 }, { type: "playing", frame: 1 }]);
  const firstRequest = state.request;
  let sent;
  ({ state, sent } = run([{ type: "tap" }], state));
  assert.deepEqual([state.phase, state.mounted], ["off", true]);
  assert.deepEqual(sent, ["pause"]);
  ({ state, sent } = run([{ type: "paused", frame: 1 }, { type: "tap" }], state));
  assert.deepEqual([state.phase, state.request], ["loading", firstRequest + 1]);
  assert.deepEqual(sent, ["play"]);
  ({ state, sent } = run([{ type: "timeout", request: firstRequest }, { type: "playing", frame: 1 }], state));
  assert.equal(state.phase, "playing", "the first request's timer is stale");
  assert.deepEqual(sent, []);
});

test("a pause from the player itself (for example a phone call) turns the button back", () => {
  const { state } = run([{ type: "tap" }, { type: "ready", frame: 1 }, { type: "playing", frame: 1 }, { type: "paused", frame: 1 }]);
  assert.equal(state.phase, "off");
});
