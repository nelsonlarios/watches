"use client";
import { useEffect, useRef } from "react";
import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export type SceneState = {
  chapter: number;
  phase: number;
  playing: boolean;
  separation: number;
  localOffset: number;
  referenceOffset: number;
  displayDate: number;
  crownTurns: number;
  selector: number;
  dateStep: number;
  month: number;
  night: boolean;
  reset: number;
  reducedMotion: boolean;
};
const TAU = Math.PI * 2;
const smooth = (a: number, b: number, x: number) =>
  T.MathUtils.smoothstep(x, a, b);
function cylinder(r: number, h: number, mat: T.Material, n = 80) {
  const m = new T.Mesh(new T.CylinderGeometry(r, r, h, n), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}
function ring(inner: number, outer: number, depth: number, mat: T.Material) {
  const s = new T.Shape();
  s.absarc(0, 0, outer, 0, TAU, false);
  const h = new T.Path();
  h.absarc(0, 0, inner, 0, TAU, true);
  s.holes.push(h);
  return new T.Mesh(
    new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
      curveSegments: 64,
    }),
    mat,
  );
}
function gear(r: number, n: number, depth: number, mat: T.Material) {
  const s = new T.Shape();
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * TAU,
      d = r * (i % 4 === 1 || i % 4 === 2 ? 1 : 0.95);
    if (!i) s.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    else s.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  s.closePath();
  const h = new T.Path();
  h.absarc(0, 0, r * 0.19, 0, TAU, true);
  s.holes.push(h);
  if (r > 0.35)
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5,
        p = new T.Path();
      p.absarc(
        Math.cos(a) * r * 0.58,
        Math.sin(a) * r * 0.58,
        r * 0.16,
        0,
        TAU,
        true,
      );
      s.holes.push(p);
    }
  return new T.Mesh(
    new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.007,
      bevelThickness: 0.007,
      bevelSegments: 1,
      curveSegments: 16,
    }),
    mat,
  );
}
function canvasTexture(
  draw: (c: CanvasRenderingContext2D, s: number) => void,
  size = 2048,
) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function dialTexture() {
  return canvasTexture((c, s) => {
    c.translate(s / 2, s / 2);
    const r = s / 2,
      g = c.createRadialGradient(-r * 0.32, r * 0.4, 0, 0, 0, r);
    g.addColorStop(0, "#28616b");
    g.addColorStop(0.6, "#123c45");
    g.addColorStop(1, "#071c27");
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.fill();
    c.save();
    c.globalAlpha = 0.075;
    c.strokeStyle = "#a8d9db";
    c.lineWidth = 0.7;
    for (let i = 0; i < 1600; i++) {
      const a = (i / 1600) * TAU;
      c.beginPath();
      c.moveTo(Math.sin(a) * 30, Math.cos(a) * 30);
      c.lineTo(Math.sin(a) * r, Math.cos(a) * r);
      c.stroke();
    }
    c.restore();
    c.fillStyle = "#e8d8bd";
    c.textAlign = "center";
    c.font = "bold 63px Georgia";
    c.fillText("ROLEX", 0, -s * 0.272);
    c.font = "25px Arial";
    c.letterSpacing = "3px";
    c.fillText("OYSTER PERPETUAL", 0, -s * 0.24);
    c.font = "31px Arial";
    c.fillText("SKY-DWELLER", 0, s * 0.278);
    c.font = "16px Arial";
    c.fillText("SUPERLATIVE CHRONOMETER", 0, s * 0.301);
    c.fillText("OFFICIALLY CERTIFIED", 0, s * 0.318);
    c.font = "15px Arial";
    c.fillText("SWISS       MADE", 0, s * 0.468);
    c.strokeStyle = "#d4bc99";
    for (let i = 0; i < 60; i++) {
      const a = (i * TAU) / 60;
      c.lineWidth = i % 5 === 0 ? 4 : 2;
      c.beginPath();
      c.moveTo(Math.sin(a) * r * 0.921, -Math.cos(a) * r * 0.921);
      c.lineTo(
        Math.sin(a) * r * (i % 5 === 0 ? 0.879 : 0.9),
        -Math.cos(a) * r * (i % 5 === 0 ? 0.879 : 0.9),
      );
      c.stroke();
    }
    c.fillStyle = "#e8d8bd";
    c.beginPath();
    c.moveTo(-43, -s * 0.333);
    c.lineTo(-59, -s * 0.375);
    c.lineTo(-28, -s * 0.356);
    c.lineTo(-26, -s * 0.395);
    c.lineTo(0, -s * 0.36);
    c.lineTo(26, -s * 0.395);
    c.lineTo(28, -s * 0.356);
    c.lineTo(59, -s * 0.375);
    c.lineTo(43, -s * 0.333);
    c.closePath();
    c.fill();
    c.fillStyle = "#d94a37";
    c.beginPath();
    c.moveTo(0, -s * 0.153);
    c.lineTo(-26, -s * 0.181);
    c.lineTo(26, -s * 0.181);
    c.fill();
  });
}
export default function WatchScene({
  state,
  onReady,
  onError,
}: {
  state: React.RefObject<SceneState>;
  onReady: () => void;
  onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let frame = 0,
      disposed = false;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0, 12.6);
    const pmrem = new T.PMREMGenerator(renderer),
      env = new RoomEnvironment(),
      envMap = pmrem.fromScene(env, 0.04);
    scene.environment = envMap.texture;
    scene.environmentIntensity = 1.7;
    env.dispose();
    pmrem.dispose();
    const ambientLight = new T.AmbientLight(0xd5e4ef, 1.4);
    scene.add(ambientLight);
    const key = new T.DirectionalLight(0xffe1be, 4);
    key.position.set(-4, 5, 8);
    scene.add(key);
    const blue = new T.DirectionalLight(0x80b9df, 3);
    blue.position.set(5, -1, 5);
    scene.add(blue);
    const rim = new T.DirectionalLight(0xf4c095, 3);
    rim.position.set(2, 5, -2);
    scene.add(rim);
    const gold = new T.MeshStandardMaterial({
        color: "#ba8c69",
        metalness: 1,
        roughness: 0.22,
      }),
      bright = new T.MeshStandardMaterial({
        color: "#ebc29c",
        metalness: 1,
        roughness: 0.16,
      }),
      brush = new T.MeshStandardMaterial({
        color: "#b28c72",
        metalness: 1,
        roughness: 0.37,
      }),
      steel = new T.MeshStandardMaterial({
        color: "#b1bac2",
        metalness: 1,
        roughness: 0.3,
      }),
      brass = new T.MeshStandardMaterial({
        color: "#d3ab64",
        metalness: 0.92,
        roughness: 0.3,
      }),
      dark = new T.MeshStandardMaterial({
        color: "#1c252b",
        metalness: 0.86,
        roughness: 0.28,
      }),
      ruby = new T.MeshStandardMaterial({
        color: "#9d1a52",
        roughness: 0.14,
        metalness: 0.15,
      }),
      lume = new T.MeshStandardMaterial({
        color: "#e0e7d8",
        emissive: "#61cde3",
        emissiveIntensity: 0.02,
        metalness: 0.15,
        roughness: 0.32,
      });
    const watch = new T.Group();
    scene.add(watch);
    const layers: Record<
      string,
      { group: T.Group; base: T.Vector3; drift: T.Vector3 }
    > = {};
    function layer(
      name: string,
      base: [number, number, number],
      drift: [number, number, number],
    ) {
      const group = new T.Group();
      group.position.set(...base);
      watch.add(group);
      layers[name] = {
        group,
        base: group.position.clone(),
        drift: new T.Vector3(...drift),
      };
      return group;
    }
    const body = layer("body", [0, 0, -0.3], [-0.25, -0.5, -0.6]);
    body.add(ring(1.8, 2.12, 0.48, gold));
    const back = cylinder(1.99, 0.16, brush);
    back.position.z = -0.1;
    body.add(back);
    const backRing = ring(1.82, 1.97, 0.08, bright);
    backRing.position.z = -0.24;
    body.add(backRing);
    for (const side of [-1, 1])
      for (const sx of [-1, 1]) {
        const lug = new T.Mesh(
          new RoundedBoxGeometry(0.46, 0.9, 0.34, 3, 0.09),
          gold,
        );
        lug.position.set(sx * 1.0, side * 1.91, 0.12);
        lug.rotation.z = sx * side * 0.18;
        body.add(lug);
      }
    const crown = new T.Group();
    crown.position.set(2.2, 0, 0.17);
    body.add(crown);
    const crow = cylinder(0.23, 0.38, gold, 64);
    crow.rotation.z = Math.PI / 2;
    crown.add(crow);
    for (let i = 0; i < 36; i++) {
      const a = (i * TAU) / 36,
        tooth = new T.Mesh(new T.BoxGeometry(0.34, 0.025, 0.027), bright);
      tooth.position.set(0, Math.sin(a) * 0.23, Math.cos(a) * 0.23);
      tooth.rotation.x = -a;
      crown.add(tooth);
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 8; i++) {
        const y = side * (2.28 + i * 0.35),
          z = -0.05 - i * i * 0.022;
        for (let j = -1; j <= 1; j++) {
          const link = new T.Mesh(
            new RoundedBoxGeometry(j === 0 ? 0.67 : 0.52, 0.325, 0.2, 3, 0.035),
            j === 0 ? bright : brush,
          );
          link.position.set(j * 0.6, y, z);
          link.rotation.x = side * i * 0.065;
          body.add(link);
          const bevel = new T.Mesh(
            new T.BoxGeometry(j === 0 ? 0.65 : 0.5, 0.019, 0.06),
            gold,
          );
          bevel.position.set(j * 0.6, y - 0.139, z + 0.08);
          body.add(bevel);
        }
      }
    const movement = layer("movement", [0, 0, 0.12], [0, 0, 0.1]);
    movement.add(cylinder(1.77, 0.1, steel));
    const rotators: { mesh: T.Object3D; rate: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399,
        radius = 0.43 + (i % 3) * 0.4,
        r = 0.2 + (i % 3) * 0.07,
        w = gear(r, 24 + i * 2, 0.045, i % 2 ? brass : steel);
      w.position.set(
        Math.cos(a) * radius,
        Math.sin(a) * radius,
        0.1 + (i % 3) * 0.04,
      );
      movement.add(w);
      rotators.push({ mesh: w, rate: (i % 2 ? 1 : -1) * 0.025 * (i + 1) });
    }
    const barrel = cylinder(0.53, 0.15, brush);
    barrel.position.set(-0.35, 0.65, 0.17);
    movement.add(barrel);
    const springPoints: T.Vector3[] = [];
    for (let i = 0; i <= 500; i++) {
      const a = (i / 500) * TAU * 7,
        r = 0.05 + (i / 500) * 0.41;
      springPoints.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.26));
    }
    const mainspring = new T.Line(
      new T.BufferGeometry().setFromPoints(springPoints),
      new T.LineBasicMaterial({ color: "#edc9a0" }),
    );
    mainspring.position.set(-0.35, 0.65, 0);
    movement.add(mainspring);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.399,
        screw = cylinder(0.057, 0.035, i % 3 ? bright : steel, 20);
      screw.position.set(
        Math.cos(a) * (1.5 - (i % 2) * 0.5),
        Math.sin(a) * (1.5 - (i % 2) * 0.5),
        0.25,
      );
      movement.add(screw);
      const slot = new T.Mesh(new T.BoxGeometry(0.07, 0.009, 0.009), dark);
      slot.position.copy(screw.position);
      slot.position.z += 0.021;
      slot.rotation.z = a;
      movement.add(slot);
    }
    const balance = new T.Group();
    balance.position.set(0.55, -0.75, 0.28);
    movement.add(balance);
    balance.add(ring(0.4, 0.46, 0.045, bright));
    for (let i = 0; i < 3; i++) {
      const spoke = new T.Mesh(new T.BoxGeometry(0.045, 0.85, 0.028), gold);
      spoke.rotation.z = (i * Math.PI) / 3;
      balance.add(spoke);
    }
    const coilPoints: T.Vector3[] = [];
    for (let i = 0; i < 550; i++) {
      const a = (i / 550) * TAU * 8,
        r = 0.02 + (i / 550) * 0.33;
      coilPoints.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.065));
    }
    const hairspring = new T.Line(
      new T.BufferGeometry().setFromPoints(coilPoints),
      new T.LineBasicMaterial({ color: "#459def" }),
    );
    balance.add(hairspring);
    const jewel = cylinder(0.08, 0.035, ruby, 24);
    jewel.position.z = 0.1;
    balance.add(jewel);
    const rotor = new T.Group();
    rotor.position.z = 0.34;
    movement.add(rotor);
    const rotorShape = new T.Shape();
    rotorShape.absarc(0, 0, 1.61, 0, Math.PI, false);
    rotorShape.lineTo(-0.4, 0);
    rotorShape.absarc(0, 0, 0.4, Math.PI, 0, true);
    rotorShape.closePath();
    rotor.add(
      new T.Mesh(
        new T.ExtrudeGeometry(rotorShape, {
          depth: 0.055,
          bevelEnabled: true,
          bevelSize: 0.018,
          bevelThickness: 0.018,
          bevelSegments: 2,
          curveSegments: 70,
        }),
        brush,
      ),
    );
    rotor.add(cylinder(0.23, 0.1, bright));
    const calendar = layer("calendar", [0, 0, 0.24], [-1.1, -0.3, 1.2]);
    calendar.add(gear(1.25, 123, 0.07, brass));
    const inner = cylinder(0.25, 0.1, steel);
    inner.position.z = 0.06;
    calendar.add(inner);
    const dateCarrier = new T.Group();
    calendar.add(dateCarrier);
    dateCarrier.add(ring(1.74, 1.97, 0.055, steel));
    const dateTexture = canvasTexture((c, s) => {
      c.translate(s / 2, s / 2);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#111c25";
      c.font = "46px Arial";
      for (let i = 0; i < 31; i++) {
        c.save();
        c.rotate((i * TAU) / 31);
        c.fillText(String(i + 1), 0, -s * 0.47);
        c.restore();
      }
    });
    const dateFace = new T.Mesh(
      new T.RingGeometry(1.75, 1.97, 124),
      new T.MeshStandardMaterial({
        map: dateTexture,
        transparent: true,
        metalness: 0.35,
        roughness: 0.6,
      }),
    );
    dateFace.position.z = 0.08;
    dateCarrier.add(dateFace);
    for (let i = 0; i < 31; i++) {
      const a = (i * TAU) / 31,
        tooth = new T.Mesh(new T.BoxGeometry(0.07, 0.08, 0.055), steel);
      tooth.position.set(Math.sin(a) * 1.73, Math.cos(a) * 1.73, 0.027);
      tooth.rotation.z = -a;
      dateCarrier.add(tooth);
    }
    const satellite = new T.Group();
    satellite.position.set(0, 1.616, 0.13);
    dateCarrier.add(satellite);
    satellite.add(gear(0.366, 36, 0.06, steel));
    const programWheel = new T.Group();
    programWheel.position.z = 0.075;
    satellite.add(programWheel);
    programWheel.add(cylinder(0.11, 0.04, bright, 32));
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 12,
        tooth = new T.Mesh(new T.BoxGeometry(0.06, 0.12, 0.04), bright);
      tooth.position.set(Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0.02);
      tooth.rotation.z = -a;
      programWheel.add(tooth);
    }
    const dial = layer("dial", [0, 0, 0.44], [2.7, 0.7, 1.3]);
    dial.add(
      new T.Mesh(
        new T.CircleGeometry(1.82, 160),
        new T.MeshStandardMaterial({
          map: dialTexture(),
          roughness: 0.38,
          metalness: 0.48,
        }),
      ),
    );
    const windows: T.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12,
        marker = new T.Mesh(new T.BoxGeometry(0.105, 0.29, 0.045), bright);
      marker.position.set(Math.sin(a) * 1.57, Math.cos(a) * 1.57, 0.04);
      marker.rotation.z = -a;
      if (i !== 3) {
        dial.add(marker);
        const fill = new T.Mesh(new T.BoxGeometry(0.053, 0.216, 0.012), lume);
        fill.position.set(0, 0, 0.029);
        marker.add(fill);
      }
      const w = new T.Mesh(
        new T.BoxGeometry(0.115, 0.057, 0.012),
        new T.MeshStandardMaterial({ color: "#050f14", roughness: 0.5 }),
      );
      w.position.set(Math.sin(a) * 1.74, Math.cos(a) * 1.74, 0.035);
      w.rotation.z = -a;
      dial.add(w);
      windows.push(w);
    }
    const referenceDisc = new T.Group();
    referenceDisc.position.set(0, -0.37, 0.055);
    dial.add(referenceDisc);
    referenceDisc.add(cylinder(1.075, 0.02, dark));
    referenceDisc.add(ring(1.06, 1.08, 0.012, gold));
    const refTex = canvasTexture((c, s) => {
      c.translate(s / 2, s / 2);
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#ddd8ca";
      c.font = "110px Arial";
      for (let i = 0; i < 24; i += 2) {
        c.save();
        c.rotate(((i - 10) * TAU) / 24);
        c.fillText(i === 0 ? "24" : String(i), 0, -s * 0.431);
        c.restore();
      }
      c.fillStyle = "#a8b9bb";
      for (let i = 1; i < 24; i += 2) {
        const a = ((i - 10) * TAU) / 24;
        c.beginPath();
        c.arc(Math.sin(a) * s * 0.432, -Math.cos(a) * s * 0.432, 7, 0, TAU);
        c.fill();
      }
    });
    const refFace = new T.Mesh(
      new T.CircleGeometry(1.055, 100),
      new T.MeshStandardMaterial({
        map: refTex,
        transparent: true,
        roughness: 0.45,
        metalness: 0.35,
      }),
    );
    refFace.position.z = 0.024;
    referenceDisc.add(refFace);
    const arrowShape = new T.Shape();
    arrowShape.moveTo(0, 0);
    arrowShape.lineTo(-0.065, 0.085);
    arrowShape.lineTo(0.065, 0.085);
    arrowShape.closePath();
    const arrow = new T.Mesh(
      new T.ShapeGeometry(arrowShape),
      new T.MeshBasicMaterial({ color: "#d54b39" }),
    );
    arrow.position.set(0, 0.74, 0.14);
    dial.add(arrow);
    const dateWindow = new T.Mesh(
      new T.PlaneGeometry(0.44, 0.3),
      new T.MeshBasicMaterial({ color: "#ede9dd" }),
    );
    dateWindow.position.set(1.38, 0, 0.1);
    dial.add(dateWindow);
    const dateCanvas = document.createElement("canvas");
    dateCanvas.width = 256;
    dateCanvas.height = 160;
    const dateCtx = dateCanvas.getContext("2d")!,
      dateMap = new T.CanvasTexture(dateCanvas);
    dateMap.colorSpace = T.SRGBColorSpace;
    const datePrint = new T.Mesh(
      new T.PlaneGeometry(0.4, 0.25),
      new T.MeshBasicMaterial({ map: dateMap }),
    );
    datePrint.position.set(1.38, 0, 0.106);
    dial.add(datePrint);
    let lastDate = "";
    const bezel = layer("bezel", [0, 0, 0.42], [0, 0, 2.7]);
    bezel.add(ring(1.83, 2.15, 0.02, gold));
    const flutePos: number[] = [];
    for (let i = 0; i < 120; i++) {
      const a = (i * TAU) / 120,
        b = ((i + 1) * TAU) / 120,
        m = (a + b) / 2,
        p = [
          new T.Vector3(Math.sin(a) * 1.86, Math.cos(a) * 1.86, 0.17),
          new T.Vector3(Math.sin(b) * 1.86, Math.cos(b) * 1.86, 0.17),
          new T.Vector3(Math.sin(m) * 2.15, Math.cos(m) * 2.15, 0.16),
          new T.Vector3(Math.sin(a) * 2.15, Math.cos(a) * 2.15, 0.075),
          new T.Vector3(Math.sin(b) * 2.15, Math.cos(b) * 2.15, 0.075),
        ];
      for (const tri of [
        [0, 2, 1],
        [0, 3, 2],
        [1, 2, 4],
      ])
        for (const n of tri) flutePos.push(p[n].x, p[n].y, p[n].z);
    }
    const fluteGeo = new T.BufferGeometry();
    fluteGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(flutePos, 3),
    );
    fluteGeo.computeVertexNormals();
    bright.side = T.DoubleSide;
    bezel.add(new T.Mesh(fluteGeo, bright));
    const hands = layer("hands", [0, 0, 0.66], [0, 0, 3.5]);
    function hand(length: number, width: number) {
      const group = new T.Group(),
        s = new T.Shape();
      s.moveTo(-width * 0.55, -0.25);
      s.lineTo(-width * 0.5, length * 0.72);
      s.lineTo(0, length);
      s.lineTo(width * 0.5, length * 0.72);
      s.lineTo(width * 0.55, -0.25);
      s.closePath();
      group.add(
        new T.Mesh(
          new T.ExtrudeGeometry(s, {
            depth: 0.03,
            bevelEnabled: true,
            bevelSize: 0.015,
            bevelThickness: 0.012,
            bevelSegments: 2,
          }),
          bright,
        ),
      );
      const inlay = new T.Mesh(
        new T.BoxGeometry(width * 0.44, length * 0.6, 0.015),
        lume,
      );
      inlay.position.set(0, length * 0.4, 0.05);
      group.add(inlay);
      return group;
    }
    const hour = hand(1.1, 0.16);
    hour.position.z = 0.025;
    hands.add(hour);
    const minute = hand(1.61, 0.105);
    minute.position.z = 0.105;
    hands.add(minute);
    const second = new T.Group(),
      needle = new T.Mesh(new T.BoxGeometry(0.019, 2.18, 0.019), bright);
    needle.position.y = 0.6;
    second.add(needle);
    const tail = ring(0.075, 0.09, 0.015, bright);
    tail.position.y = -0.38;
    second.add(tail);
    second.position.z = 0.18;
    hands.add(second);
    const pin = cylinder(0.09, 0.12, bright, 40);
    pin.position.z = 0.2;
    hands.add(pin);
    const crystal = layer("crystal", [0, 0, 0.83], [0, 0, 4.25]);
    const glass = new T.MeshPhysicalMaterial({
      color: "#bde2ed",
      roughness: 0.035,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      clearcoat: 1,
    });
    crystal.add(cylinder(1.83, 0.07, glass));
    const glassRim = ring(
      1.815,
      1.837,
      0.015,
      new T.MeshBasicMaterial({
        color: "#bfdee0",
        transparent: true,
        opacity: 0.2,
      }),
    );
    glassRim.position.z = 0.05;
    crystal.add(glassRim);
    const lens = new T.Mesh(
      new T.SphereGeometry(0.28, 40, 20),
      new T.MeshPhysicalMaterial({
        color: "#e2f3f4",
        roughness: 0.02,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        metalness: 0.1,
        clearcoat: 1,
      }),
    );
    lens.scale.set(1, 0.68, 0.4);
    lens.position.set(1.38, 0, 0.08);
    crystal.add(lens);
    const cosmos = new T.Group();
    scene.add(cosmos);
    for (let i = 0; i < 4; i++) {
      const pts: T.Vector3[] = [];
      for (let j = 0; j <= 220; j++) {
        const a = (j / 220) * TAU;
        pts.push(
          new T.Vector3(
            Math.cos(a) * (3 + i * 0.43),
            Math.sin(a) * (3 + i * 0.43),
            -1,
          ),
        );
      }
      const orbit = new T.LineLoop(
        new T.BufferGeometry().setFromPoints(pts),
        new T.LineBasicMaterial({
          color: i % 2 ? "#7d8a9d" : "#ac8762",
          transparent: true,
          opacity: i % 2 ? 0.09 : 0.13,
        }),
      );
      orbit.rotation.set(0.4 + i * 0.26, 0.2 + i * 0.3, 0.1);
      cosmos.add(orbit);
    }
    const positions: number[] = [];
    let seed = 31415;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (let i = 0; i < 650; i++)
      positions.push(
        (random() - 0.5) * 30,
        (random() - 0.5) * 19,
        -3 - random() * 16,
      );
    const stars = new T.Points(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(positions, 3),
      ),
      new T.PointsMaterial({
        color: "#e4d1ad",
        size: 0.022,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
      }),
    );
    scene.add(stars);
    let mobile = false;
    const size = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      mobile = w < 760;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.z = mobile ? 14.5 : 12.6;
      camera.updateProjectionMatrix();
    };
    const resize = new ResizeObserver(size);
    resize.observe(el);
    size();
    let dragging = false,
      lastX = 0,
      lastY = 0,
      dragX = 0,
      dragY = 0,
      lastReset = 0;
    const down = (e: PointerEvent) => {
        if (e.button !== 0) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        renderer.domElement.setPointerCapture(e.pointerId);
      },
      move = (e: PointerEvent) => {
        if (!dragging) return;
        dragY += (e.clientX - lastX) * 0.006;
        dragX = T.MathUtils.clamp(
          dragX + (e.clientY - lastY) * 0.006,
          -0.7,
          0.7,
        );
        lastX = e.clientX;
        lastY = e.clientY;
      },
      up = () => {
        dragging = false;
      };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    let last = performance.now(),
      t = 0,
      clock = 0;
    function animate(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = state.current!;
      t += s.reducedMotion ? 0 : dt;
      clock += s.playing ? dt : 0;
      const k = 1 - Math.exp(-dt * 3.5);
      if (s.reset !== lastReset) {
        lastReset = s.reset;
        dragX = dragY = 0;
      }
      let explode = 0;
      if (s.chapter === 1)
        explode = s.playing ? 0.7 * smooth(0.1, 0.6, s.phase) : s.separation;
      if (s.chapter === 5) explode = (1 - smooth(0.02, 0.65, s.phase)) * 0.8;
      const cm = s.chapter === 2;
      for (const [name, l] of Object.entries(layers)) {
        l.group.visible = !(
          cm &&
          ["body", "movement", "dial", "bezel", "hands", "crystal"].includes(
            name,
          )
        );
        l.group.position.lerp(
          l.base.clone().addScaledVector(l.drift, explode),
          k,
        );
      }
      calendar.visible = cm || explode > 0.18;
      movement.visible = !cm && explode > 0.18;
      rotor.visible = s.chapter === 1;
      rotor.rotation.z = s.playing ? Math.sin(s.phase * TAU) * 1.8 : -1.1;
      watch.position.x = T.MathUtils.lerp(
        watch.position.x,
        mobile ? 0 : 1.65,
        k,
      );
      watch.position.y = T.MathUtils.lerp(
        watch.position.y,
        mobile ? 0.45 : 0,
        k,
      );
      watch.rotation.x = T.MathUtils.lerp(
        watch.rotation.x,
        (explode > 0.05 ? -0.72 : 0.16) +
          dragX +
          (s.playing ? Math.sin(s.phase * Math.PI) * 0.1 : 0),
        k,
      );
      watch.rotation.y = T.MathUtils.lerp(
        watch.rotation.y,
        (cm ? -0.12 : -0.3) +
          dragY +
          (s.playing ? Math.sin(s.phase * Math.PI) * 0.22 : 0),
        k,
      );
      watch.rotation.z = T.MathUtils.lerp(
        watch.rotation.z,
        cm ? -0.22 : -0.19,
        k,
      );
      const scale = mobile
        ? cm
          ? 0.96
          : explode > 0.05
            ? 0.7
            : 0.85
        : cm
          ? 1.09
          : explode > 0.05
            ? 0.8
            : 1;
      watch.scale.lerp(new T.Vector3(scale, scale, scale), k);
      balance.rotation.z =
        Math.sin(t * TAU * (s.chapter === 1 ? 0.65 : 4)) * 0.7;
      hairspring.scale.setScalar(1 + Math.sin(t * TAU * 0.65) * 0.04);
      for (const r of rotators) r.mesh.rotation.z = t * r.rate;
      const dateStep =
        s.dateStep + (s.playing && cm ? smooth(0.2, 0.65, s.phase) * 2 : 0);
      dateCarrier.rotation.z = T.MathUtils.lerp(
        dateCarrier.rotation.z,
        (-dateStep * TAU) / 31,
        k,
      );
      satellite.rotation.z = (dateCarrier.rotation.z * 123) / 36;
      const offset =
        s.playing && s.chapter === 3
          ? Math.round(smooth(0.25, 0.7, s.phase) * 5)
          : s.localOffset;
      hour.rotation.z = T.MathUtils.lerp(
        hour.rotation.z,
        (-(10 + 10 / 60 + offset + s.referenceOffset) * TAU) / 12,
        k,
      );
      minute.rotation.z = (-10 * TAU) / 60;
      const filmTime =
        [0, 12.792, 25.584, 43.008, 58.488, 76.176][s.chapter] +
        s.phase * [12.792, 12.792, 17.424, 15.48, 17.688, 17.28][s.chapter];
      second.rotation.z = (-(33 + filmTime) * TAU) / 60;
      referenceDisc.rotation.z = (s.referenceOffset * TAU) / 24;
      bezel.rotation.z = T.MathUtils.lerp(
        bezel.rotation.z,
        s.chapter === 4
          ? ((s.playing ? Math.min(3, Math.floor(s.phase * 5)) : s.selector) *
              Math.PI) /
              6
          : 0,
        k,
      );
      crown.rotation.x = T.MathUtils.lerp(
        crown.rotation.x,
        s.playing && s.chapter === 4 ? t * 1.1 : s.crownTurns * 1.5,
        k,
      );
      const night = s.night || (s.chapter === 5 && s.playing && s.phase > 0.78);
      lume.emissiveIntensity = T.MathUtils.lerp(
        lume.emissiveIntensity,
        night ? 2 : 0.02,
        k,
      );
      key.intensity = T.MathUtils.lerp(key.intensity, night ? 0.25 : 4, k);
      scene.environmentIntensity = T.MathUtils.lerp(
        scene.environmentIntensity,
        night ? 0.08 : 1.7,
        k,
      );
      blue.intensity = T.MathUtils.lerp(blue.intensity, night ? 0.12 : 3, k);
      rim.intensity = T.MathUtils.lerp(rim.intensity, night ? 0.1 : 3, k);
      ambientLight.intensity = T.MathUtils.lerp(
        ambientLight.intensity,
        night ? 0.08 : 1.4,
        k,
      );
      const dateText = cm
        ? dateStep > 1.5
          ? "1"
          : dateStep > 0.5
            ? "31"
            : "30"
        : String(s.displayDate);
      if (lastDate !== dateText) {
        lastDate = dateText;
        dateCtx.fillStyle = "#eeeadd";
        dateCtx.fillRect(0, 0, 256, 160);
        dateCtx.fillStyle = "#17212a";
        dateCtx.textAlign = "center";
        dateCtx.textBaseline = "middle";
        dateCtx.font = "100px Arial";
        dateCtx.fillText(dateText, 128, 90);
        dateMap.needsUpdate = true;
      }
      windows.forEach((w, i) => {
        (w.material as T.MeshStandardMaterial).color.set(
          i === s.month % 12 ? "#c54832" : "#04121b",
        );
      });
      cosmos.position.set(mobile ? 0 : 1.65, 0, 0);
      cosmos.rotation.z = t * 0.012;
      cosmos.scale.setScalar(cm ? 1.12 : 1);
      stars.rotation.z = t * 0.001;
      renderer.render(scene, camera);
    }
    watch.position.set(mobile ? 0 : 1.65, mobile ? 0.45 : 0, 0);
    watch.rotation.set(0.16, -0.3, -0.19);
    frame = requestAnimationFrame(animate);
    onReady();
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const mats = new Set<T.Material>(),
        maps = new Set<T.Texture>();
      scene.traverse((o) => {
        const m = o as T.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material)
          for (const mat of Array.isArray(m.material)
            ? m.material
            : [m.material]) {
            mats.add(mat);
            for (const v of Object.values(mat))
              if (v instanceof T.Texture) maps.add(v);
          }
      });
      maps.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
      envMap.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [state, onReady, onError]);
  return (
    <div
      ref={host}
      className="watch-canvas"
      role="img"
      aria-label="Interactive three-dimensional Sky-Dweller study. Drag to rotate."
    />
  );
}
