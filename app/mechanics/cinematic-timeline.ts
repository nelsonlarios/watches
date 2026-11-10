import {
  getCalendarGeometry,
  setCalendarDate,
  planDateJump,
  sampleDateJump,
  SAROS_MODEL,
} from "./calendar-kinematics";
export function smooth(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}
const initial = setCalendarDate(3, 30);
// Both date advances are selected by the same geometric contact test as the
// full-year demonstrator. The film supplies viewing time, not month lengths.
const aprilJump = planDateJump(initial);
const mayInspection = setCalendarDate(aprilJump.after.monthIndex, 30);
const mayJump = planDateJump(mayInspection);
export function calendarFrame(t: number) {
  let steps = 0,
    date = initial.date,
    month = initial.monthIndex;
  if (t < 5) {
    const p = smooth(2.8, 3.03, t),
      f = sampleDateJump(aprilJump, p);
    steps = f.dateStepOffset;
    if (p >= 0.5) {
      date = aprilJump.after.date;
      month = aprilJump.after.monthIndex;
    }
  } else if (t < 22) {
    steps = 0;
  } else if (t < 29) {
    const f = sampleDateJump(aprilJump, 0.5 * smooth(22.4, 28.1, t));
    steps = f.dateStepOffset;
    date = f.indexedDate;
  } else if (t < 35) {
    const f = sampleDateJump(aprilJump, 0.5 + 0.5 * smooth(29.2, 33.1, t));
    steps = f.dateStepOffset;
    date = f.indexedDate;
    if (t >= 33.1) month = aprilJump.after.monthIndex;
  } else if (t < 51) {
    steps =
      aprilJump.totalSteps +
      (SAROS_MODEL.datePositions - aprilJump.totalSteps) *
        smooth(36.8, 49.5, t);
    date =
      ((initial.date - 1 + Math.floor(steps)) % SAROS_MODEL.datePositions) + 1;
    month = mayInspection.monthIndex;
  } else if (t < 57) {
    const f = sampleDateJump(mayJump, 0.5 * smooth(51.5, 55.8, t));
    steps = SAROS_MODEL.datePositions + f.dateStepOffset;
    date = f.indexedDate;
    month = mayInspection.monthIndex;
  } else {
    const f = sampleDateJump(mayJump, 0.5 + 0.5 * smooth(57.2, 59.3, t));
    steps = SAROS_MODEL.datePositions + f.dateStepOffset;
    date = f.indexedDate;
    month = mayInspection.monthIndex;
  }
  return { steps, date, month, geometry: getCalendarGeometry(initial, steps) };
}
