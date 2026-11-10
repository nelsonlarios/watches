/**
 * Evidence-bounded Saros demonstrator for the original (2012) calibre 9001.
 *
 * PRODUCTION: Rolex's launch dossier, p. 6, specifies FOUR correction fingers.
 * PATENT EXAMPLE: EP1596261B1 [0020–0034] specifies 123 / 36 teeth and FIVE
 * program teeth. It also describes the correction-then-ordinary jump sequence.
 * DERIVATION: retaining that ratio with program slots 8–11 gives precisely the
 * four production correction months. This is a consistent explanatory model,
 * NOT a verified production gear count, tooth profile, or CAD reconstruction.
 *
 * All angles are in turns, positive in the direction of the date ring's motion.
 * Zero is calibrated to the inward contact ray at the date-30 inspection point;
 * it is not an assertion about the orientation of the assembled movement.
 */

const TAU = Math.PI * 2;
const EPSILON = 1e-9;

export const SAROS_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const SAROS_MODEL = {
  datePositions: 31,
  programPositions: 12,
  fixedWheelTeeth: 123,
  satelliteTeeth: 36,
  programFingerSlots: [8, 9, 10, 11] as readonly number[],
  planetTurnsPerCarrierTurn: 1 + 123 / 36,
  relativePlanetTurnsPerCarrierTurn: 123 / 36,
  productionCorrectionFingerCount: 4,
  geometryEvidence: "patent-derived explanatory configuration",
  productionToothCountsVerified: false,
  exactContactProfilesVerified: false,
  sourceUrls: {
    production: "https://www.thewatch.co.il/image/users/190146/ftp/my_files/ROLEX/Sky-Dweller_EN.pdf",
    patent: "https://patents.google.com/patent/EP1596261B1/en",
    fourFingerVariant: "https://patents.google.com/patent/US20190179264A1/en",
  },
} as const;

export type CalendarState = Readonly<{
  /** Integer serial month: January = 0, December = 11, following January = 12. */
  monthIndex: number;
  /** The mechanical display has all 31 positions, including in February. */
  date: number;
}>;

export type ProgramFinger = Readonly<{
  slot: number;
  localTurns: number;
  absoluteTurns: number;
  angleRadians: number;
  /** Signed angular distance from the fixed inspection/contact ray. */
  contactRayErrorTurns: number;
}>;

export type CalendarGeometry = Readonly<{
  monthOfYear: number;
  monthName: typeof SAROS_MONTH_NAMES[number];
  carrierTurns: number;
  carrierAngleRadians: number;
  satelliteAbsoluteTurns: number;
  satelliteAbsoluteAngleRadians: number;
  satelliteRelativeTurns: number;
  satelliteRelativeAngleRadians: number;
  dateRingSteps: number;
  /** Fractional date position suitable for a continuously rotating date ring. */
  datePosition: number;
  monthPhaseTurns: number;
  monthPhaseSlot: number;
  carrierContactRayErrorTurns: number;
  carrierAtInspectionPoint: boolean;
  fingers: readonly ProgramFinger[];
  /** Non-null only when BOTH the orbiting pivot and a finger are aligned. */
  alignedFingerSlot: number | null;
}>;

export type DateJumpStep = Readonly<{
  kind: "correction" | "ordinary";
  fromDate: number;
  toDate: number;
  /** Normalized slow-motion sweep, not measured milliseconds or cam degrees. */
  sweepStart: number;
  sweepEnd: number;
}>;

export type DateJumpPlan = Readonly<{
  before: CalendarState;
  after: CalendarState;
  inspection: CalendarGeometry;
  correctionFingerSlot: number | null;
  extraStep: boolean;
  ordinarySteps: 1;
  totalSteps: 1 | 2;
  steps: readonly DateJumpStep[];
  /** Includes the physically traversed 31 during a double jump. */
  sequence: readonly number[];
}>;

export type DateJumpFrame = Readonly<{
  progress: number;
  phase: "correction-sweep" | "ordinary-sweep" | "settled";
  activeContact: "correction-finger" | "ordinary-finger" | null;
  correctionFingerMisses: boolean;
  camState: "released" | "jump-complete";
  springState: "delivering-jump-energy" | "jump-complete";
  completedSteps: number;
  indexedDate: number;
  dateStepOffset: number;
  geometry: CalendarGeometry;
}>;

/**
 * Editorial time expansion: the two engagements are consecutive and share one
 * spring/cam release. Equal halves are for inspection, not production timing.
 * Actual flank-contact widths, cam angles, and spring forces are not published
 * in the cited launch dossier. Do not present these numbers as measured data.
 */
export const JUMP_INSPECTION_WINDOWS = {
  correctionSweep: [0, 0.5] as const,
  ordinarySweep: [0.5, 1] as const,
  evidence: "normalized explanatory timing; contact order follows EP1596261B1",
} as const;

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function signedTurnDistance(turns: number): number {
  return modulo(turns + 0.5, 1) - 0.5;
}

function assertState(state: CalendarState): void {
  if (!Number.isSafeInteger(state.monthIndex)) {
    throw new RangeError("monthIndex must be a safe integer (January = 0).");
  }
  if (!Number.isInteger(state.date) || state.date < 1 || state.date > 31) {
    throw new RangeError("The mechanical date must be an integer from 1 to 31.");
  }
}

function assertProgress(progress: number): void {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError("Normalized progress must be between 0 and 1.");
  }
}

function dateAfterSteps(date: number, steps: number): number {
  return modulo(date - 1 + steps, SAROS_MODEL.datePositions) + 1;
}

/** Setting a month also establishes its correct gear phase; no independent flag. */
export function setCalendarDate(monthIndex: number, date = 30): CalendarState {
  const state = { monthIndex, date };
  assertState(state);
  return state;
}

/**
 * External epicyclic rolling law, with the central wheel fixed:
 * Ns(ωsun − ωcarrier) + Np(ωplanet − ωcarrier) = 0.
 * Therefore ωplanet = (1 + Ns/Np)ωcarrier = 53/12 ωcarrier.
 *
 * The carrier is the date ring. A complete revolution always traverses 31
 * positions. A short month takes two of those positions in one midnight jump;
 * it does not shrink the ring or alter its gear ratio.
 */
export function getCalendarGeometry(
  state: CalendarState,
  dateStepOffset = 0,
): CalendarGeometry {
  assertState(state);
  if (!Number.isFinite(dateStepOffset)) {
    throw new RangeError("dateStepOffset must be finite.");
  }
  const carrierTurns = state.monthIndex + (state.date - 30 + dateStepOffset) / 31;
  const satelliteAbsoluteTurns = carrierTurns * SAROS_MODEL.planetTurnsPerCarrierTurn;
  const satelliteRelativeTurns = carrierTurns * SAROS_MODEL.relativePlanetTurnsPerCarrierTurn;
  const displayedMonthIndex = state.monthIndex
    + Math.floor((state.date - 1 + dateStepOffset) / SAROS_MODEL.datePositions);
  const carrierContactRayErrorTurns = signedTurnDistance(carrierTurns);
  const carrierAtInspectionPoint = Math.abs(carrierContactRayErrorTurns) < EPSILON;
  const fingers = SAROS_MODEL.programFingerSlots.map((slot): ProgramFinger => {
    const localTurns = slot / SAROS_MODEL.programPositions;
    const absoluteTurns = satelliteAbsoluteTurns + localTurns;
    return {
      slot,
      localTurns,
      absoluteTurns,
      angleRadians: modulo(absoluteTurns, 1) * TAU,
      contactRayErrorTurns: signedTurnDistance(absoluteTurns),
    };
  });
  const alignedFinger = carrierAtInspectionPoint
    ? fingers.find((finger) => Math.abs(finger.contactRayErrorTurns) < EPSILON)
    : undefined;
  // The month phase is an inspection sample on date 30, NOT a separate gear.
  const monthPhaseTurns = modulo(displayedMonthIndex * SAROS_MODEL.planetTurnsPerCarrierTurn, 1);
  return {
    monthOfYear: modulo(displayedMonthIndex, 12),
    monthName: SAROS_MONTH_NAMES[modulo(displayedMonthIndex, 12)],
    carrierTurns,
    carrierAngleRadians: modulo(carrierTurns, 1) * TAU,
    satelliteAbsoluteTurns,
    satelliteAbsoluteAngleRadians: modulo(satelliteAbsoluteTurns, 1) * TAU,
    satelliteRelativeTurns,
    satelliteRelativeAngleRadians: modulo(satelliteRelativeTurns, 1) * TAU,
    dateRingSteps: state.monthIndex * 31 + state.date - 30 + dateStepOffset,
    datePosition: modulo(state.date - 1 + dateStepOffset, 31),
    monthPhaseTurns,
    monthPhaseSlot: modulo(Math.round(monthPhaseTurns * 12), 12),
    carrierContactRayErrorTurns,
    carrierAtInspectionPoint,
    fingers,
    alignedFingerSlot: alignedFinger?.slot ?? null,
  };
}

/** Geometric test at the same date-ring position in any chosen month. */
export function inspectMonth(monthIndex: number): CalendarGeometry {
  return getCalendarGeometry(setCalendarDate(monthIndex, 30));
}

/**
 * No month-length table is consulted. A correction can occur only when the
 * orbiting satellite reaches the inspection ray AND one of its four fingers
 * occupies that ray. The ordinary finger always supplies one date step.
 */
export function planDateJump(state: CalendarState): DateJumpPlan {
  const before = setCalendarDate(state.monthIndex, state.date);
  const inspection = getCalendarGeometry(before);
  const correctionFingerSlot = inspection.alignedFingerSlot;
  const extraStep = correctionFingerSlot !== null;
  const totalSteps = extraStep ? 2 : 1;
  const finalDate = dateAfterSteps(before.date, totalSteps);
  const monthAdvance = Math.floor((before.date - 1 + totalSteps) / 31);
  const steps: DateJumpStep[] = [];
  if (extraStep) {
    steps.push({
      kind: "correction", fromDate: before.date,
      toDate: dateAfterSteps(before.date, 1), sweepStart: 0, sweepEnd: 0.5,
    });
  }
  steps.push({
    kind: "ordinary", fromDate: dateAfterSteps(before.date, extraStep ? 1 : 0),
    toDate: finalDate, sweepStart: 0.5, sweepEnd: 1,
  });
  return {
    before,
    after: setCalendarDate(before.monthIndex + monthAdvance, finalDate),
    inspection,
    correctionFingerSlot,
    extraStep,
    ordinarySteps: 1,
    totalSteps,
    steps,
    sequence: [before.date, ...steps.map((step) => step.toDate)],
  };
}

/**
 * Inspect one spring-powered jump in slow motion. On a non-correction day the
 * correction finger passes the gap during the first sweep. During a double
 * jump, its contact advances 30→31; the ordinary finger then advances 31→1.
 * Interpolation is a viewing convention, not a tooth-flank collision solution.
 */
export function sampleDateJump(plan: DateJumpPlan, progress: number): DateJumpFrame {
  assertProgress(progress);
  const correctionProgress = Math.min(progress * 2, 1);
  const ordinaryProgress = Math.max(progress * 2 - 1, 0);
  const dateStepOffset = (plan.extraStep ? correctionProgress : 0) + ordinaryProgress;
  const completedSteps = (plan.extraStep && progress >= 0.5 ? 1 : 0)
    + (progress === 1 ? 1 : 0);
  const phase = progress === 1 ? "settled"
    : progress < 0.5 ? "correction-sweep" : "ordinary-sweep";
  const activeContact = progress === 1 ? null
    : progress < 0.5 ? (plan.extraStep ? "correction-finger" : null)
      : "ordinary-finger";
  return {
    progress,
    phase,
    activeContact,
    correctionFingerMisses: progress < 0.5 && !plan.extraStep,
    camState: progress < 1 ? "released" : "jump-complete",
    springState: progress < 1 ? "delivering-jump-energy" : "jump-complete",
    completedSteps,
    indexedDate: dateAfterSteps(plan.before.date, completedSteps),
    dateStepOffset,
    geometry: getCalendarGeometry(plan.before, dateStepOffset),
  };
}

export function advanceDate(state: CalendarState): CalendarState {
  return planDateJump(state).after;
}

/**
 * The 24-hour driving wheel winds the jump mechanism. Cam/ramp and spring
 * force curves are unspecified, so this exposes stages, not fictitious energy.
 */
export function sampleDailyWinding(progress: number) {
  assertProgress(progress);
  return {
    drivingWheelTurns: progress,
    camState: progress < 1 ? "winding-ramp" as const : "ramp-end" as const,
    springState: progress < 1 ? "storing-energy" as const : "ready-to-release" as const,
    jumpReleased: false as const,
  };
}
