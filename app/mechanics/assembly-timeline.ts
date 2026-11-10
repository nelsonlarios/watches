// 2012 Rolex launch dossier, p. 10. This is the movement count, not a
// complete-watch count or the number of objects in our illustrative model.
export const CALIBRE_9001_COMPONENTS = 380;
export const ASSEMBLY = { convergence: 3, count: 20, beauty: 29 } as const;
export type AssemblyFamily =
  | "case"
  | "back"
  | "bracelet"
  | "crown"
  | "movement"
  | "month"
  | "dial"
  | "index"
  | "reference"
  | "hand"
  | "bezel"
  | "crystal";
const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const landing: Record<AssemblyFamily, number> = {
  movement: 13,
  back: 14,
  bracelet: 15.4,
  month: 15.9,
  case: 16.5,
  crown: 17,
  dial: 17.6,
  reference: 18,
  index: 18.3,
  hand: 18.9,
  bezel: 19.4,
  crystal: 20,
};
export function assemblyPose(
  family: AssemblyFamily,
  index: number,
  time: number,
  home: { x: number; y: number },
) {
  const end = Math.min(
    ASSEMBLY.count,
    landing[family] +
      (family === "bracelet"
        ? (index % 9) * 0.12
        : family === "index"
          ? (index % 5) * 0.05
          : 0),
  );
  const start = Math.max(ASSEMBLY.convergence, end - 8.5 - (index % 4) * 0.6);
  const flight = 1 - smooth((time - start) / (end - start));
  const angle = index * 2.3999632297 + Math.max(0, time) * 0.045 * flight;
  const radius = 3.1 + (index % 7) * 0.29;
  return {
    flight,
    end,
    x: (Math.cos(angle) * radius - home.x * 0.35) * flight,
    y: (Math.sin(angle) * radius * 0.57 - home.y * 0.45) * flight,
    z: (1.1 + (index % 6) * 0.53) * flight,
    rx: Math.sin(angle * 1.3) * 0.9 * flight,
    ry: Math.cos(angle * 0.7) * 1.1 * flight,
    rz: ((index % 2 ? 1 : -1) * 1.8 + angle * 0.09) * flight,
  };
}
