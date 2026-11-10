import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "../../node_modules/typescript/lib/typescript.js";

const sourceUrl = new URL(
  "../../app/mechanics/calendar-kinematics.ts",
  import.meta.url,
);
const source = await readFile(sourceUrl, "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const model = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const {
  SAROS_MODEL,
  SAROS_MONTH_NAMES,
  setCalendarDate,
  getCalendarGeometry,
  inspectMonth,
  planDateJump,
  sampleDateJump,
  advanceDate,
  sampleDailyWinding,
} = model;
const near = (a, b, label) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${label}: ${a} != ${b}`);
const signed = (x) => ((((x + 0.5) % 1) + 1) % 1) - 0.5;

// Independent calendar targets: these are assertions, never the model's inputs.
const correctionMonths = [3, 5, 8, 10];
const expectedResidues = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];
const hits = [];
let testedDailyStates = 0;
for (let month = 0; month < 12; month++) {
  const inspection = inspectMonth(month);
  assert.equal(inspection.monthName, SAROS_MONTH_NAMES[month]);
  assert.equal(inspection.monthPhaseSlot, expectedResidues[month]);
  const expectedCorrection = correctionMonths.includes(month);
  assert.equal(inspection.alignedFingerSlot !== null, expectedCorrection);
  if (inspection.alignedFingerSlot !== null) hits.push(month);
  for (let date = 1; date <= 31; date++) {
    testedDailyStates++;
    const state = setCalendarDate(month, date);
    const jump = planDateJump(state);
    assert.equal(jump.extraStep, expectedCorrection && date === 30);
    assert.equal(jump.ordinarySteps, 1);
    assert.equal(jump.totalSteps, jump.extraStep ? 2 : 1);
    assert.deepEqual(
      jump.sequence,
      jump.extraStep ? [30, 31, 1] : [date, date === 31 ? 1 : date + 1],
    );
    const frame = sampleDateJump(jump, 1);
    const after = getCalendarGeometry(jump.after);
    near(
      frame.geometry.carrierTurns,
      after.carrierTurns,
      "continuous ring position",
    );
    near(
      frame.geometry.satelliteAbsoluteTurns,
      after.satelliteAbsoluteTurns,
      "continuous satellite position",
    );
    assert.equal(frame.geometry.monthName, after.monthName);
    near(
      123 * -after.carrierTurns +
        36 * (after.satelliteAbsoluteTurns - after.carrierTurns),
      0,
      "no-slip rolling law",
    );
    near(
      after.satelliteRelativeTurns + after.carrierTurns,
      after.satelliteAbsoluteTurns,
      "local/world angles",
    );
    assert.equal(frame.indexedDate, jump.after.date);
    assert.equal(frame.activeContact, null);
  }
  // Every month still uses exactly 31 physical date-ring positions.
  let state = setCalendarDate(month, 1);
  let midnights = 0;
  let ringSteps = 0;
  while (state.monthIndex === month) {
    const jump = planDateJump(state);
    midnights++;
    ringSteps += jump.totalSteps;
    state = advanceDate(state);
    assert.ok(midnights <= 31);
  }
  assert.equal(midnights, expectedCorrection ? 30 : 31);
  assert.equal(ringSteps, 31);
  assert.equal(state.date, 1);
}
assert.deepEqual(hits, correctionMonths);

// The five-tooth PATENT pattern adds February, proving why it cannot silently
// substitute for Rolex's four-finger production account.
const patentFiveSlots = [7, 8, 9, 10, 11];
const patentHits = Array.from({ length: 12 }, (_, month) => month).filter(
  (month) => {
    const spin = inspectMonth(month).satelliteAbsoluteTurns;
    return patentFiveSlots.some(
      (slot) => Math.abs(signed(spin + slot / 12)) < 1e-8,
    );
  },
);
assert.deepEqual(patentHits, [1, 3, 5, 8, 10]);

// Verify no phantom correction, phase drift, or reversal over several years.
for (let month = -24; month <= 48; month++) {
  const first = inspectMonth(month);
  const next = inspectMonth(month + 1);
  near(
    next.satelliteAbsoluteTurns - first.satelliteAbsoluteTurns,
    53 / 12,
    "full monthly spin",
  );
  near(
    signed(next.monthPhaseTurns - first.monthPhaseTurns),
    5 / 12,
    "sampled monthly phase",
  );
  const annual = inspectMonth(month + 12);
  near(
    annual.satelliteAbsoluteTurns - first.satelliteAbsoluteTurns,
    53,
    "annual phase closure",
  );
  assert.equal(annual.alignedFingerSlot, first.alignedFingerSlot);
}

const april = planDateJump(setCalendarDate(3, 30));
assert.equal(sampleDateJump(april, 0.25).activeContact, "correction-finger");
assert.equal(sampleDateJump(april, 0.5).indexedDate, 31);
assert.equal(sampleDateJump(april, 0.5).activeContact, "ordinary-finger");
assert.equal(sampleDateJump(april, 0.75).dateStepOffset, 1.5);
const march = planDateJump(setCalendarDate(2, 30));
assert.equal(sampleDateJump(march, 0.25).correctionFingerMisses, true);
assert.equal(sampleDateJump(march, 0.25).dateStepOffset, 0);
assert.equal(sampleDateJump(march, 0.75).activeContact, "ordinary-finger");
assert.deepEqual(planDateJump(setCalendarDate(1, 28)).sequence, [28, 29]);
assert.deepEqual(planDateJump(setCalendarDate(1, 29)).sequence, [29, 30]);
assert.deepEqual(planDateJump(setCalendarDate(1, 30)).sequence, [30, 31]);
assert.equal(sampleDailyWinding(1).springState, "ready-to-release");
assert.throws(() => setCalendarDate(0, 0), RangeError);
assert.throws(() => setCalendarDate(1.5, 30), RangeError);
assert.throws(() => sampleDateJump(april, 1.1), RangeError);

console.log(
  `PASS: ${testedDailyStates} daily positions; all 12 geometric month signals; continuous 30→31→1; no-slip gears; 6-year phase checks; February limitation; five-tooth patent distinction.`,
);
console.table(
  SAROS_MONTH_NAMES.map((month, i) => ({
    month,
    sampledPhase: `${expectedResidues[i]}/12`,
    contactingSlot: inspectMonth(i).alignedFingerSlot ?? "gap",
    date30Jump: planDateJump(setCalendarDate(i, 30)).sequence.join(" → "),
  })),
);
assert.equal(SAROS_MODEL.productionToothCountsVerified, false);
