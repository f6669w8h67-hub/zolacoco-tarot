import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mock, test } from "node:test";
import { ADVANCE_DELAY_MS, createAdvancer } from "../lib/delayed-advance.ts";

// Healing room: answer → next question after 220ms, never after she has moved on (step-6 spec, B3).
function room(start = { room: "emotion", step: 0 }) {
  const moves = [];
  const state = { ...start };
  const advancer = createAdvancer({ apply: (next) => { moves.push(next); state.step = next; advancer.sync(state.room, state.step); } });
  advancer.sync(state.room, state.step);
  const to = (roomName, step) => { state.room = roomName; state.step = step; advancer.sync(roomName, step); };
  return { advancer, moves, state, to };
}

test("picking an answer moves on after 220ms, keeping the short pause", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves } = room();
    assert.equal(ADVANCE_DELAY_MS, 220);
    assert.equal(advancer.advance(1), true);
    mock.timers.tick(219);
    assert.deepEqual(moves, []);
    mock.timers.tick(1);
    assert.deepEqual(moves, [1]);
    assert.equal(advancer.pending, false);
  } finally { mock.timers.reset(); }
});

test("going back right after answering stays where she went back to", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves, state, to } = room({ room: "relationship", step: 2 });
    advancer.advance(3);
    to("relationship", 1); // ← 上一步 within 220ms
    mock.timers.tick(500);
    assert.deepEqual(moves, []);
    assert.equal(state.step, 1);
  } finally { mock.timers.reset(); }
});

test("switching rooms right after answering: the new room is untouched", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves, to } = room();
    advancer.advance(1);
    advancer.newFlow(); to("lobby", 0); // ← 回到房間
    advancer.newFlow(); to("sleep", 0);
    mock.timers.tick(500);
    assert.deepEqual(moves, []);
  } finally { mock.timers.reset(); }
});

test("rapid taps within 220ms move forward once", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves } = room({ room: "sleep", step: 2 });
    assert.equal(advancer.advance(3), true);
    assert.equal(advancer.advance(3), false);
    assert.equal(advancer.advance(3), false);
    mock.timers.tick(220);
    assert.deepEqual(moves, [3]);
  } finally { mock.timers.reset(); }
});

test("starting again right after answering keeps the fresh start, even on the same room and step", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves, state } = room({ room: "strength", step: 0 });
    advancer.advance(1);
    advancer.newFlow(); // 重新開始 → go(room): same room, step 0 again
    mock.timers.tick(500);
    assert.deepEqual(moves, []);
    assert.equal(state.step, 0);
  } finally { mock.timers.reset(); }
});

test("leaving the page cancels the waiting move", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves } = room();
    advancer.advance(1);
    advancer.cancel(); // unmount cleanup
    mock.timers.tick(500);
    assert.deepEqual(moves, []);
  } finally { mock.timers.reset(); }
});

test("hopping between rooms many times never jumps a room forward", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { advancer, moves, to } = room();
    for (const name of ["emotion", "relationship", "sleep", "strength", "emotion"]) {
      advancer.newFlow(); to(name, name === "relationship" ? 1 : 0);
      advancer.advance(2);
      mock.timers.tick(100);
    }
    advancer.newFlow(); to("lobby", 0);
    mock.timers.tick(1000);
    assert.deepEqual(moves, []);
    // and a normal answer afterwards still works
    advancer.newFlow(); to("emotion", 0);
    advancer.advance(1);
    mock.timers.tick(220);
    assert.deepEqual(moves, [1]);
  } finally { mock.timers.reset(); }
});

test("the healing room uses the advancer for every answer and starts a new flow on each room change", async () => {
  const page = await readFile(new URL("../app/healing-room/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /setTimeout\(\(\)=>setStep/);
  assert.equal((page.match(/advancer\.advance\(/g) || []).length, 5);
  assert.match(page, /function go\(next:Room\)\{advancer\.newFlow\(\);/);
  assert.match(page, /useEffect\(\(\)=>\{advancer\.sync\(room,step\)\},\[room,step,advancer\]\);/);
  assert.match(page, /useEffect\(\(\)=>\(\)=>advancer\.cancel\(\),\[advancer\]\);/);
});
