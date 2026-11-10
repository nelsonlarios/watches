import * as T from "three";
import {
  assemblyPose,
  type AssemblyFamily,
} from "./mechanics/assembly-timeline";

export type ModelledPart = {
  object: T.Object3D;
  family: AssemblyFamily;
  id: string;
};
export function makeAssemblyController(parts: ModelledPart[]) {
  const homes = parts.map(({ object, ...part }) => ({
    ...part,
    object,
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  }));
  const tumble = new T.Quaternion(),
    euler = new T.Euler(),
    offset = new T.Vector3();
  return {
    // Reset before the scene sets hands, balance and reference-time rotations.
    // This also restores the watch when leaving or seeking out of the finale.
    reset() {
      for (const h of homes) {
        h.object.position.copy(h.position);
        h.object.quaternion.copy(h.quaternion);
        h.object.scale.copy(h.scale);
      }
    },
    apply(time: number) {
      homes.forEach((h, index) => {
        const p = assemblyPose(h.family, index, time, h.position);
        if (p.flight === 0) return;
        h.object.position.add(offset.set(p.x, p.y, p.z));
        tumble.setFromEuler(euler.set(p.rx, p.ry, p.rz));
        h.object.quaternion.multiply(tumble);
      });
    },
  };
}
