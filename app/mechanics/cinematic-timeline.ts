import { getCalendarGeometry, setCalendarDate } from "./calendar-kinematics";
export function smooth(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}
const ease = smooth;
export function calendarFrame(t: number) {
  let steps = 0,
    date = 30,
    month = 3;
  if (t < 5) {
    steps = 2 * ease(2.8, 3.03, t);
    date = t < 2.9 ? 30 : 1;
    month = t < 2.9 ? 3 : 4;
  } else if (t < 22) {
    steps = 0;
  } else if (t < 29) {
    steps = ease(22.4, 28.1, t);
    date = steps < 0.98 ? 30 : 31;
  } else if (t < 35) {
    steps = 1 + ease(29.2, 33.1, t);
    date = steps < 1.98 ? 31 : 1;
    month = steps < 1.98 ? 3 : 4;
  } else if (t < 51) {
    steps = 2 + 29 * ease(36.8, 49.5, t);
    date = ((29 + Math.floor(steps)) % 31) + 1;
    month = 4;
  } else if (t < 57) {
    steps = 31;
    month = 4;
  } else {
    steps = 31 + ease(57.2, 59.3, t);
    date = steps < 31.98 ? 30 : 31;
    month = 4;
  }
  return {
    steps,
    date,
    month,
    geometry: getCalendarGeometry(setCalendarDate(3, 30), steps),
  };
}
