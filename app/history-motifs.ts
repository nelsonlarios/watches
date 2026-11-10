import * as T from "three";
import { annulus, disk, cog, TAU } from "./watch-model";

// Narrative motifs illustrate principles, rather than inventing historic watches.
export function makeHistoryMotifs() {
  const root = new T.Group(),
    seal = new T.Group(),
    rotor = new T.Group(),
    world = new T.Group(),
    cosmos = new T.Group();
  root.add(seal, rotor, world, cosmos);
  const steel = new T.MeshPhysicalMaterial({
      color: 0xc7c7b7,
      metalness: 1,
      roughness: 0.23,
      clearcoat: 0.5,
    }),
    gold = new T.MeshStandardMaterial({
      color: 0xd1ab64,
      metalness: 1,
      roughness: 0.25,
    });
  seal.add(annulus(1.55, 1.85, 0.35, steel));
  const back = disk(1.7, 0.1, steel);
  back.position.z = -0.15;
  seal.add(back);
  const lid = annulus(1.55, 1.81, 0.1, steel);
  lid.position.z = 1;
  seal.add(lid);
  const glass = disk(
    1.55,
    0.03,
    new T.MeshPhysicalMaterial({
      color: 0xb9d1c1,
      transparent: true,
      opacity: 0.1,
      roughness: 0.03,
      clearcoat: 1,
    }),
  );
  glass.position.z = 1;
  seal.add(glass);
  const ripples: T.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const wave = new T.Mesh(
      new T.TorusGeometry(2.0 + i * 0.25, 0.006, 6, 160),
      new T.MeshBasicMaterial({
        color: 0x6e9b9c,
        transparent: true,
        opacity: 0.2 - i * 0.04,
      }),
    );
    wave.position.z = -0.2 - i * 0.02;
    seal.add(wave);
    ripples.push(wave);
  }
  const rs = new T.Shape();
  rs.absarc(0, 0, 1.8, 0, Math.PI, false);
  rs.lineTo(-0.35, 0);
  rs.absarc(0, 0, 0.35, Math.PI, 0, true);
  rs.closePath();
  rotor.add(
    new T.Mesh(
      new T.ExtrudeGeometry(rs, {
        depth: 0.13,
        bevelEnabled: true,
        bevelSize: 0.04,
        bevelThickness: 0.03,
        bevelSegments: 4,
        curveSegments: 96,
      }),
      steel,
    ),
  );
  rotor.add(disk(0.23, 0.22, gold));
  for (let i = 0; i < 3; i++) {
    const arc = new T.EllipseCurve(
        0,
        0,
        0.75 + i * 0.29,
        0.75 + i * 0.29,
        0.15,
        Math.PI - 0.15,
        false,
        0,
      ),
      points = arc.getPoints(120).map((v) => new T.Vector3(v.x, v.y, 0.15));
    rotor.add(
      new T.Line(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({ color: 0x586f5a }),
      ),
    );
  }
  world.add(
    new T.Mesh(
      new T.SphereGeometry(1.52, 64, 48),
      new T.MeshStandardMaterial({
        color: 0x0a2117,
        metalness: 0.4,
        roughness: 0.55,
      }),
    ),
  );
  const globeLines = new T.LineBasicMaterial({
    color: 0xb99c60,
    transparent: true,
    opacity: 0.42,
  });
  for (let i = 0; i < 12; i++) {
    const points: T.Vector3[] = [];
    for (let j = 0; j <= 160; j++) {
      const t = (j / 160) * TAU;
      points.push(new T.Vector3(Math.cos(t) * 1.54, Math.sin(t) * 1.54, 0));
    }
    const line = new T.LineLoop(
      new T.BufferGeometry().setFromPoints(points),
      globeLines,
    );
    line.rotation.y = (i * Math.PI) / 12;
    world.add(line);
  }
  for (let i = -3; i <= 3; i++) {
    const lat = (i * Math.PI) / 9,
      r = Math.cos(lat) * 1.54,
      points: T.Vector3[] = [];
    for (let j = 0; j <= 128; j++) {
      const t = (j / 128) * TAU;
      points.push(
        new T.Vector3(Math.cos(t) * r, Math.sin(lat) * 1.54, Math.sin(t) * r),
      );
    }
    world.add(
      new T.LineLoop(new T.BufferGeometry().setFromPoints(points), globeLines),
    );
  }
  const orbit = new T.Mesh(new T.TorusGeometry(2.0, 0.012, 8, 160), gold);
  orbit.rotation.x = 0.6;
  world.add(orbit);
  const sun = new T.Mesh(
    new T.SphereGeometry(0.9, 64, 48),
    new T.MeshStandardMaterial({
      color: 0xcfa85f,
      metalness: 1,
      roughness: 0.3,
      emissive: 0x4c3010,
      emissiveIntensity: 0.35,
    }),
  );
  cosmos.add(sun);
  const earth = new T.Mesh(
    new T.SphereGeometry(0.32, 40, 32),
    new T.MeshStandardMaterial({
      color: 0x254d43,
      metalness: 0.5,
      roughness: 0.4,
    }),
  );
  cosmos.add(earth);
  const moon = new T.Mesh(new T.SphereGeometry(0.1, 24, 16), steel);
  cosmos.add(moon);
  const orbitLine = new T.Mesh(
    new T.TorusGeometry(1.8, 0.005, 6, 160),
    new T.MeshBasicMaterial({
      color: 0x9e8958,
      transparent: true,
      opacity: 0.35,
    }),
  );
  orbitLine.rotation.x = 0.6;
  cosmos.add(orbitLine);
  const fixed = cog(1.4, 123, 0.13, steel),
    sat = new T.Group();
  sat.add(cog((1.4 * 36) / 123, 36, 0.1, gold));
  for (let i = 0; i < 4; i++) {
    const a = ((8 + i) / 12) * TAU,
      p = new T.Mesh(new T.BoxGeometry(0.18, 0.055, 0.06), gold);
    p.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.15);
    p.rotation.z = a;
    sat.add(p);
  }
  fixed.position.z = -0.08;
  sat.position.set(1.4 + (1.4 * 36) / 123, 0, 0.02);
  cosmos.add(fixed, sat);
  fixed.visible = sat.visible = false;
  root.position.x = 2;
  root.rotation.z = -0.15;
  return {
    root,
    seal,
    lid,
    glass,
    ripples,
    rotor,
    world,
    cosmos,
    sun,
    earth,
    moon,
    fixed,
    sat,
  };
}
