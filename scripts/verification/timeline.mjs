import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "../../node_modules/typescript/lib/typescript.js";
const root = new URL("../../", import.meta.url);
const moduleUrl = async (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  ).toString("base64");
const engineUrl = await moduleUrl(
  await fs.readFile(
    new URL("app/mechanics/calendar-kinematics.ts", root),
    "utf8",
  ),
);
let timeline = await fs.readFile(
  new URL("app/mechanics/cinematic-timeline.ts", root),
  "utf8",
);
timeline = timeline.replace(
  '"./calendar-kinematics"',
  JSON.stringify(engineUrl),
);
const { calendarFrame } = await import(await moduleUrl(timeline));
const { inspectMonth, planDateJump, setCalendarDate } = await import(engineUrl);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
for (const [t, steps, date, month] of [
  [0, 0, 30, 3],
  [4, 2, 1, 4],
  [6, 0, 30, 3],
  [28.2, 1, 31, 3],
  [33.2, 2, 1, 4],
  [35, 2, 1, 4],
  [49.5, 31, 30, 4],
  [56.9, 31, 30, 4],
  [59.4, 32, 31, 4],
]) {
  const f = calendarFrame(t);
  close(f.steps, steps);
  assert.equal(f.date, date);
  assert.equal(f.month, month);
}
// The explicit replay at5s rewinds. All other narrated phase boundaries stay continuous.
for (const t of [22, 29, 35, 51, 57, 60]) {
  const left = calendarFrame(t - 1e-7),
    right = calendarFrame(t + 1e-7);
  assert.ok(Math.abs(left.steps - right.steps) < 1e-5);
}
const apr = inspectMonth(3),
  may = calendarFrame(51).geometry;
close(may.carrierTurns - apr.carrierTurns, 1);
close(may.satelliteAbsoluteTurns - apr.satelliteAbsoluteTurns, 53 / 12);
assert.notEqual(apr.alignedFingerSlot, null);
assert.equal(may.alignedFingerSlot, null);
assert.deepEqual(planDateJump(setCalendarDate(3, 30)).sequence, [30, 31, 1]);
assert.deepEqual(planDateJump(setCalendarDate(4, 30)).sequence, [30, 31]);
// May's missed correction must not move the ring.
for (let t = 51; t < 57; t += 0.05) close(calendarFrame(t).steps, 31);
for (let t = 6; t <= 66; t += 0.02) {
  const g = calendarFrame(t).geometry;
  close(
    123 * -g.carrierTurns + 36 * (g.satelliteAbsoluteTurns - g.carrierTurns),
    0,
  );
}
const timing = JSON.parse(
  await fs.readFile(new URL("app/calendar-timing.json", root), "utf8"),
);
for (let i = 0; i < timing.fragments.length; i++) {
  const f = timing.fragments[i];
  assert.ok(f.end > f.start);
  if (i) {
    close(timing.fragments[i - 1].end, f.start);
    close(timing.fragments[i - 1].storyboardEnd, f.storyboardStart);
  }
}
const film = JSON.parse(
  await fs.readFile(new URL("app/film-narration.json", root), "utf8"),
);
close(
  film.totalDuration,
  film.chapters.reduce((n, c) => n + c.duration, 0),
);
assert.equal(film.chapters.length, 8);
for (const c of film.chapters) {
  const stat = await fs.stat(new URL("public" + c.file, root));
  assert.ok(stat.size > 1000);
  assert.ok(c.cues.length > 0);
  assert.ok(c.cues.every((cue) => cue.start >= 0 && cue.end <= c.duration));
}
console.log(
  "PASS: April double jump; May missed correction; continuous monthly orbit; no-slip satellite;11 conformed audio windows;8 complete audio chapters.",
);

const score = JSON.parse(
  await fs.readFile(
    new URL("public/audio/score/score-manifest.json", root),
    "utf8",
  ),
);
close(score.totalTimelineDuration, film.totalDuration);
let musicalTotal = 0;
for (const cue of score.cues) {
  musicalTotal += cue.timelineDuration;
  const stat = await fs.stat(new URL("public" + cue.file, root));
  assert.ok(stat.size > 1000);
  assert.ok(cue.peak < 1);
  for (const segment of cue.segments) {
    const ids = {
      history: 0,
      invitation: 1,
      energy: 2,
      calendar: 3,
      months: 4,
      "month-windows": 4,
      travel: 5,
      ring: 6,
      "ring-command": 6,
      assembly: 7,
    };
    close(segment.duration, film.chapters[ids[segment.act]].duration);
  }
}
close(musicalTotal, film.totalDuration);
console.log(
  "PASS: four complete orchestral segments conform to all eight voice acts and the244.680s film.",
);
