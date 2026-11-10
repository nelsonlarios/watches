"use client";
import { ACT } from "./film-config";
import { makeHistoryMotifs } from "./history-motifs";
import { useEffect, useRef } from "react";
import * as T from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

import { makeWatch, annulus, cog, disk, texture, TAU } from "./watch-model";
import { SAROS_MODEL } from "./mechanics/calendar-kinematics";
import { calendarFrame } from "./mechanics/cinematic-timeline";
export type CinemaState = {
  act: number;
  phase: number;
  time: number;
  playing: boolean;
  calendarTime: number;
  localOffset: number;
  selector: number;
  separation: number;
  reducedMotion: boolean;
  reset: number;
};
const ease = (a: number, b: number, t: number) =>
  T.MathUtils.smoothstep(t, a, b);
const mix = T.MathUtils.lerp;
function makeCalendar() {
  const root = new T.Group();
  const steel = new T.MeshPhysicalMaterial({
    color: 0xd8d8ca,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.5,
  });
  const gold = new T.MeshPhysicalMaterial({
    color: 0xd8b16f,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 0.3,
  });
  const dark = new T.MeshStandardMaterial({
    color: 0x0d1710,
    metalness: 0.8,
    roughness: 0.3,
  });
  const porcelain = new T.MeshStandardMaterial({
    color: 0xdedbc9,
    metalness: 0.25,
    roughness: 0.32,
  });
  const carrier = new T.Group();
  root.add(carrier);
  const rim = annulus(2.92, 3.35, 0.14, steel, 0.018);
  carrier.add(rim);
  const print = texture((c, s) => {
    c.fillStyle = "#e4dfce";
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.fillStyle = "#151b12";
    c.font = `${s * 0.028}px Arial`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (let i = 0; i < 31; i++) {
      c.save();
      c.rotate((-i / 31) * TAU + Math.PI / 2);
      c.fillText(String(((29 - i + 31) % 31) + 1), 0, -s * 0.468);
      c.restore();
    }
  });
  const enamel = new T.Mesh(
    new T.RingGeometry(3.02, 3.31, 192),
    new T.MeshStandardMaterial({
      map: print,
      transparent: true,
      roughness: 0.35,
      metalness: 0.24,
    }),
  );
  enamel.position.z = 0.16;
  carrier.add(enamel);
  for (let i = 0; i < 31; i++) {
    const a = (i / 31) * TAU,
      n = new T.Mesh(new T.BoxGeometry(0.17, 0.12, 0.13), steel);
    n.position.set(Math.cos(a) * 2.91, Math.sin(a) * 2.91, 0.07);
    n.rotation.z = a;
    carrier.add(n);
  }
  const arm = new T.Group();
  carrier.add(arm);
  const bridge = new T.Mesh(new T.BoxGeometry(0.85, 0.19, 0.13), steel);
  bridge.position.set(2.65, 0, -0.08);
  arm.add(bridge);
  const satellite = new T.Group();
  satellite.position.set(1.72 + (1.72 * 36) / 123, 0, 0.18);
  carrier.add(satellite);
  const planet = cog((1.72 * 36) / 123, 36, 0.11, gold);
  satellite.add(planet);
  const program = new T.Group();
  program.position.z = 0.16;
  satellite.add(program);
  program.add(disk(0.155, 0.09, steel));
  const programTeeth: T.Mesh[] = [];
  for (const slot of SAROS_MODEL.programFingerSlots) {
    const a = (slot / 12) * TAU + Math.PI,
      t = new T.Mesh(new T.BoxGeometry(0.26, 0.1, 0.1), gold);
    t.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.04);
    t.rotation.z = a;
    program.add(t);
    programTeeth.push(t);
  }
  const pivot = disk(0.075, 0.15, steel);
  pivot.position.z = 0.12;
  program.add(pivot);
  const tracking = new T.Mesh(
    new T.SphereGeometry(0.055, 16, 12),
    new T.MeshBasicMaterial({ color: 0xffe5a4 }),
  );
  tracking.position.set(0, 0.17, 0.13);
  program.add(tracking);
  const fixed = new T.Group();
  root.add(fixed);
  fixed.add(cog(1.72, 123, 0.15, steel));
  const hub = disk(0.35, 0.2, gold);
  hub.position.z = 0.15;
  fixed.add(hub);
  const screw = disk(0.15, 0.07, steel);
  screw.position.z = 0.28;
  fixed.add(screw);
  const slot = new T.Mesh(new T.BoxGeometry(0.21, 0.025, 0.01), dark);
  slot.position.z = 0.322;
  fixed.add(slot);
  for (let i = 0; i < 3; i++) {
    const groove = annulus(
      0.4 + i * 0.08,
      0.408 + i * 0.08,
      0.004,
      dark,
      0.001,
    );
    groove.position.z = 0.167;
    fixed.add(groove);
  }
  const driver = new T.Group();
  driver.position.set(3.45, -0.65, 0.29);
  root.add(driver);
  driver.add(disk(0.23, 0.16, steel));
  const center = disk(0.08, 0.2, gold);
  center.position.z = 0.03;
  driver.add(center);
  function finger(x: number, y: number) {
    const group = new T.Group();
    const d = new T.Vector3(x, y, 0),
      l = d.length();
    const arm = new T.Mesh(new T.BoxGeometry(0.09, l, 0.075), steel);
    arm.position.set(x / 2, y / 2, 0.04);
    arm.rotation.z = -Math.atan2(x, y);
    group.add(arm);
    const tip = new T.Mesh(new T.BoxGeometry(0.17, 0.08, 0.08), gold);
    tip.position.set(x, y, 0.04);
    group.add(tip);
    return { group, tip };
  }
  const correction = finger(-1.6, 0.65),
    ordinary = finger(-0.45, 0.65);
  driver.add(correction.group, ordinary.group);
  const keeper = new T.Group();
  keeper.position.set(-2.78, -1.0, 0.18);
  const blade = new T.Mesh(new T.BoxGeometry(0.5, 0.055, 0.08), steel);
  blade.rotation.z = -0.45;
  keeper.add(blade);
  keeper.add(disk(0.09, 0.11, gold));
  root.add(keeper);
  root.rotation.z = -0.06;
  return {
    root,
    carrier,
    arm,
    satellite,
    planet,
    program,
    fixed,
    driver,
    correction,
    ordinary,
    keeper,
    tracking,
    gold,
    steel,
  };
}
export default function CinematicScene({
  state,
  onReady,
  onError,
}: {
  state: React.RefObject<CinemaState>;
  onReady: () => void;
  onError: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false,
      raf = 0,
      renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(31, 1, 0.1, 70);
    camera.position.set(0, 0, 16);
    scene.add(new T.AmbientLight(0xc4c5b4, 0.32));
    const room = new T.Scene();
    room.background = new T.Color(0x42483e);
    const card = (
      width: number,
      height: number,
      x: number,
      y: number,
      z: number,
      intensity: number,
    ) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(width, height),
        new T.MeshBasicMaterial({
          color: new T.Color(intensity, intensity * 0.97, intensity * 0.88),
          side: T.DoubleSide,
        }),
      );
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      room.add(m);
    };
    card(3.5, 8, -4, 2, 5, 4);
    card(1.0, 9, 4, 0, 3, 5);
    card(6, 1, 0, 5, 1, 3);
    card(1.0, 7, 1, -2, -4, 3);
    card(5, 5, 0, -6, 1, 1.2);
    const pmrem = new T.PMREMGenerator(renderer),
      env = pmrem.fromScene(room, 0.025);
    scene.environment = env.texture;
    scene.environmentIntensity = 1.25;
    pmrem.dispose();
    room.traverse((o) => {
      const m = o as T.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as T.Material).dispose();
    });
    const key = new T.DirectionalLight(0xffedd1, 1.7);
    key.position.set(-4, 6, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.01;
    key.shadow.radius = 3;
    scene.add(key);
    const fill = new T.DirectionalLight(0x9db7ad, 0.65);
    fill.position.set(5, -2, 4);
    scene.add(fill);
    const rim = new T.DirectionalLight(0xffdda1, 1.8);
    rim.position.set(2, 4, -5);
    scene.add(rim);

    let watch: ReturnType<typeof makeWatch> | null = null;
    const cal = makeCalendar();
    cal.root.traverse((o) => {
      const m = o as T.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    scene.add(cal.root);
    cal.root.visible = false;
    const history = makeHistoryMotifs();
    scene.add(history.root);
    history.root.visible = false;
    let mobile = false;
    const size = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      mobile = w < 760;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(size);
    ro.observe(el);
    size();
    let dragX = 0,
      dragY = 0,
      dragging = false,
      lx = 0,
      ly = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      dragY += (e.clientX - lx) * 0.004;
      dragX = T.MathUtils.clamp(dragX + (e.clientY - ly) * 0.004, -0.35, 0.35);
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    let last = performance.now(),
      clock = 0,
      lastReset = 0;
    const dustPositions: number[] = [];
    let seed = 731;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 240; i++)
      dustPositions.push(
        (random() - 0.5) * 24,
        (random() - 0.5) * 16,
        -3 - random() * 12,
      );
    const dust = new T.Points(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(dustPositions, 3),
      ),
      new T.PointsMaterial({
        color: 0xd0b47c,
        size: 0.02,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    );
    scene.add(dust);
    const target = new T.Vector3();
    new FontLoader().load(
      "/fonts/gentilis_regular.typeface.json",
      (font) => {
        if (disposed) return;
        watch = makeWatch(font);
        watch.root.traverse((o) => {
          const m = o as T.Mesh;
          if (m.isMesh) {
            m.receiveShadow = true;
            m.castShadow = !(m.material as T.Material).transparent;
          }
        });
        scene.add(watch.root);
        onReady();
      },
      undefined,
      () => onError(),
    );
    function render(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(render);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = state.current!;
      if (!s.reducedMotion) clock += dt;
      const k = 1 - Math.exp(-dt * 5);
      if (s.reset !== lastReset) {
        dragX = dragY = 0;
        lastReset = s.reset;
      }
      const historyActive = s.act === ACT.history && (s.playing || s.time > 0);
      const historyMode =
        s.time < 5.213
          ? "world"
          : s.time < 12.685
            ? "seal"
            : s.time < 19.588
              ? "rotor"
              : s.time < 28.182
                ? "world"
                : s.time < 40.923
                  ? "watch"
                  : s.time < 54.801
                    ? "cosmos"
                    : "watch";
      const p = s.phase,
        ct = s.calendarTime,
        f = calendarFrame(ct),
        macro = s.act === ACT.calendar && ct >= 6.2 && ct < 61.7;
      let cameraZ = mobile ? 18.8 : 16.1,
        cameraX = 0,
        cameraY = 0,
        lookX = mobile ? 0 : -0.8,
        lookY = mobile ? 0.35 : 0;
      if (watch) {
        const w = watch;
        w.root.visible = !macro && (!historyActive || historyMode === "watch");
        let explode =
          s.act === ACT.energy
            ? s.playing
              ? 0.68 * ease(0.05, 0.45, p)
              : s.separation
            : s.act === ACT.assembly
              ? 0.9 * (1 - ease(0.08, 0.75, p))
              : s.separation;
        if (s.act === ACT.calendar) {
          explode =
            ct < 6.2
              ? ease(5, 6.2, ct) * 0.7
              : ct > 61.7
                ? (1 - ease(61.7, 65.6, ct)) * 0.7
                : 0;
        }
        const layerZ: Record<string, number> = {
          body: 0,
          monthRing: 0.22,
          rotor: -0.3,
          energy: 0.02,
          dial: 0.32,
          rehaut: 0.37,
          bezel: 0.33,
          hands: 0.48,
          crystal: 0.72,
        };
        const shift: Record<string, T.Vector3> = {
          body: new T.Vector3(0, 0, -0.6),
          monthRing: new T.Vector3(0, 0, 0),
          rotor: new T.Vector3(-0.15, 0.2, -1.0),
          energy: new T.Vector3(0, 0, 0.1),
          dial: new T.Vector3(0, 0, 1.35),
          rehaut: new T.Vector3(0, 0, 1.5),
          bezel: new T.Vector3(0, 0, 2.1),
          hands: new T.Vector3(0, 0, 2.7),
          crystal: new T.Vector3(0, 0, 3.3),
        };
        Object.entries(w.layers).forEach(([name, g]) => {
          g.position.lerp(
            new T.Vector3(0, 0, layerZ[name]).addScaledVector(
              shift[name],
              explode,
            ),
            k,
          );
        });
        w.energy.visible = s.act === ACT.energy;
        w.rotor.visible = s.act === ACT.energy;
        w.rotor.rotation.z = Math.sin(p * Math.PI * 2) * 1.0 - 0.5;
        w.balance.rotation.z = Math.sin(clock * TAU * 0.65) * 0.75;
        const hero =
          s.act === ACT.invitation || (s.act === ACT.history && !historyActive);
        const tilt = hero
          ? s.playing
            ? mix(-0.44, -0.07, ease(0, 1, p))
            : -0.23
          : s.act === ACT.assembly
            ? -0.29
            : -0.04;
        w.root.rotation.x = mix(
          w.root.rotation.x,
          (s.act === ACT.energy ? -0.65 : 0.13) + dragX,
          k,
        );
        w.root.rotation.y = mix(
          w.root.rotation.y,
          tilt +
            dragY +
            (hero && !s.reducedMotion ? Math.sin(clock * 0.15) * 0.055 : 0),
          k,
        );
        w.root.rotation.z = mix(
          w.root.rotation.z,
          s.act === ACT.energy ? -0.35 : -0.2,
          k,
        );
        w.root.position.x = mix(w.root.position.x, mobile ? 0 : 2.0, k);
        w.root.position.y = mix(w.root.position.y, mobile ? 0.5 : 0, k);
        w.root.scale.setScalar(s.act === ACT.energy ? 0.84 : 1.0);
        const off =
          s.act === ACT.travel
            ? s.playing
              ? Math.round(5 * ease(0.25, 0.7, p))
              : s.localOffset
            : 0;
        w.hour.rotation.z = (-(10 + 10 / 60 + off) * TAU) / 12;
        w.minute.rotation.z = (-10 * TAU) / 60;
        const selected =
          s.act === ACT.ring
            ? s.playing
              ? Math.min(3, Math.floor(p * 4))
              : s.selector
            : 0;
        const seconds = selected === 3 ? Math.min(s.time, 13.266) : s.time;
        w.second.rotation.z = (-(33 + seconds) * TAU) / 60;
        w.referenceDisc.rotation.z = ((10 + 10 / 60) * TAU) / 24;
        w.bezel.rotation.z = mix(
          w.bezel.rotation.z,
          s.act === ACT.ring
            ? ((s.playing ? Math.min(3, Math.floor(p * 4)) : s.selector) *
                Math.PI) /
                6
            : 0,
          k,
        );
        w.crown.rotation.x = s.act === ACT.ring ? p * TAU * 3 : 0;
        const date =
            s.act === ACT.calendar ? f.date : s.act >= ACT.travel ? 1 : 30,
          month =
            s.act === ACT.calendar ? f.month : s.act >= ACT.travel ? 4 : 3;
        w.setDate(date);
        w.monthRing.rotation.z = (-(month + 1) * TAU) / 12;
        w.dial.position.x = 0;
        w.body.visible = true;
        w.bezel.visible = true;
        w.layers.rehaut.visible = true;
        w.monthTrain.visible = false;
        w.windowHalo.visible = false;
        w.hands.visible = true;
        w.crystal.visible = true;
        w.dateFace.visible = true;
        if (s.act === ACT.months) {
          const mt = s.time,
            lift =
              mt < 29.631 ? ease(11.705, 15.5, mt) : 1 - ease(29.631, 31.3, mt),
            net = ease(25.767, 29.631, mt);
          w.body.visible = lift < 0.15;
          w.bezel.visible = lift < 0.15;
          w.layers.rehaut.visible = lift < 0.15;
          w.dial.position.z = 0.32 + 2.15 * lift;
          w.dial.position.x =
            -1.3 * (mobile ? 0.45 : 1) * lift * ease(19.503, 21.2, mt);
          w.hands.position.z = 0.48 + 2.05 * lift;
          w.crystal.position.z = 0.72 + 2.1 * lift;
          w.hands.visible = mt < 11.705 || mt >= 31.3;
          w.crystal.visible = w.hands.visible;
          w.dateFace.visible = mt < 19.503 || mt >= 29.631;
          w.monthTrain.visible = mt >= 19.503 && mt < 29.631;
          w.dateSector.rotation.z = (net * 42 * Math.PI) / 180;
          w.monthIdler.rotation.z = (-net * 210 * Math.PI) / 180;
          w.monthRing.rotation.z =
            mt < 29.631
              ? (-(4 + net) * TAU) / 12
              : (-(mt < 32.5 ? 4 : 5) * TAU) / 12;
          w.setDate(mt < 32.5 ? 30 : 1);
          let haloMonth =
            mt >= 3.324 && mt < 5.2
              ? 1
              : mt < 6.8 && mt >= 5.2
                ? 2
                : mt < 8.651 && mt >= 6.8
                  ? 12
                  : mt >= 8.651 && mt < 11.705
                    ? 4
                    : mt >= 35.966
                      ? 5
                      : 0;
          w.windowHalo.visible = haloMonth > 0;
          w.windowHalo.position.set(
            Math.sin((haloMonth * TAU) / 12) * 1.64,
            Math.cos((haloMonth * TAU) / 12) * 1.64,
            0.07,
          );
          w.root.rotation.x = -0.75 * lift + 0.04;
          w.root.rotation.y = -0.1;
          w.root.rotation.z = -0.08;
          cameraZ = mobile ? 13.5 : 11.4;
          cameraX = mobile ? 0 : 2.0;
          cameraY = 0;
          lookX = mobile ? 0 : 2.0;
          lookY = lift * 0.4;
        }
        if (historyActive && historyMode === "watch") {
          const reveal = ease(28.182, 31.4, s.time);
          w.root.scale.setScalar(0.9 + 0.1 * reveal);
        }
        if (s.act === ACT.calendar && !macro) {
          const close = ct < 5 ? 1 : 0;
          cameraZ = mobile ? 12.0 : 10.4;
          cameraX = mobile ? 1 : 2.3;
          lookX = (mobile ? 0 : 2) + 1.05 * close;
          lookY = 0.2;
        }
      }
      cal.root.visible = macro;
      if (macro) {
        const g = f.geometry;
        cal.carrier.rotation.z = g.carrierAngleRadians;
        cal.satellite.rotation.z = g.satelliteRelativeAngleRadians;
        cal.fixed.visible = ct >= 35;
        cal.planet.visible = ct >= 35;
        cal.program.visible = ct >= 16;
        cal.satellite.visible = ct >= 16;
        cal.arm.visible = ct >= 16;
        cal.driver.visible = ct >= 11;
        cal.correction.group.visible = ct >= 16;
        cal.ordinary.group.visible = true;
        cal.keeper.visible = ct >= 11;
        cal.tracking.visible = ct >= 35;
        const reveal = ease(35, 37, ct);
        cal.fixed.scale.setScalar(0.01 + 0.99 * reveal);
        cal.planet.scale.setScalar(0.01 + 0.99 * reveal);
        const correction = ct >= 22 && ct < 29,
          ordinary = (ct >= 29 && ct < 35) || ct >= 57;
        const sweep =
          ct >= 51 && ct < 57
            ? ease(51.5, 55.8, ct)
            : ct >= 22 && ct < 35
              ? ease(21.5, 33.3, ct)
              : 0;
        cal.driver.rotation.z = -sweep * 0.1;
        cal.gold.emissive.setHex(
          correction ? 0x654815 : ordinary ? 0x16180d : 0x000000,
        );
        cal.gold.emissiveIntensity = correction ? 0.34 : 0.1;
        cal.correction.tip.scale.setScalar(correction ? 1.12 : 1);
        cal.ordinary.tip.scale.setScalar(ordinary ? 1.1 : 1);
        cal.root.position.set(0, 0, 0);
        cal.root.rotation.x = mix(cal.root.rotation.x, ct >= 35 ? 0 : -0.38, k);
        cal.root.rotation.y = mix(cal.root.rotation.y, ct >= 35 ? 0 : 0.1, k);
        cal.root.rotation.z = mix(cal.root.rotation.z, 0, k);
        const close = (ct >= 16 && ct < 35) || (ct >= 51 && ct < 60);
        cameraZ = mobile ? (close ? 10.6 : 17.8) : close ? 7.0 : 15.2;
        cameraX = close ? 2.1 : 0;
        cameraY = close ? -0.25 : 0;
        lookX = close ? 2.1 : 0;
        lookY = close ? -0.25 : 0;
      }
      history.root.visible = historyActive && historyMode !== "watch";
      if (history.root.visible) {
        history.root.position.set(mobile ? 0 : 2.0, mobile ? 0.5 : 0, 0);
        history.root.rotation.x = 0.18;
        history.root.rotation.y = -0.16 + Math.sin(clock * 0.15) * 0.05;
        history.seal.visible = historyMode === "seal";
        history.rotor.visible = historyMode === "rotor";
        history.world.visible = historyMode === "world";
        history.cosmos.visible = historyMode === "cosmos";
        history.world.rotation.y = clock * 0.12;
        history.rotor.rotation.z =
          Math.sin((s.time - 12.685) * 0.8) * 1.4 - 0.6;
        const closure = 1 - ease(5.213, 8.5, s.time);
        history.lid.position.z = 0.4 + closure * 0.9;
        history.glass.position.z = 0.5 + closure * 0.9;
        history.ripples.forEach((r, i) => {
          r.scale.setScalar(1 + Math.sin(clock + i) * 0.05);
        });
        const orbit = (s.time - 40.923) * 0.35;
        history.earth.position.set(
          Math.cos(orbit) * 1.8,
          Math.sin(orbit) * 0.85,
          0.3,
        );
        history.moon.position
          .copy(history.earth.position)
          .add(
            new T.Vector3(
              Math.cos(orbit * 3) * 0.5,
              Math.sin(orbit * 3) * 0.3,
              0.1,
            ),
          );
        history.sun.visible =
          history.earth.visible =
          history.moon.visible =
            s.time < 45.185;
        history.fixed.visible = history.sat.visible = s.time >= 45.185;
        history.sat.rotation.z = clock * 0.32;
        cameraZ = mobile ? 15.5 : 13.0;
        cameraX = 0;
        cameraY = 0;
        lookX = mobile ? 0 : -0.6;
        lookY = 0;
      }
      if (s.act === ACT.invitation && s.playing)
        cameraZ -= Math.sin(p * Math.PI) * (mobile ? 1.4 : 2.1);
      dust.visible = !macro;
      dust.rotation.z = clock * 0.005;
      camera.position.lerp(target.set(cameraX, cameraY, cameraZ), k);
      camera.lookAt(lookX, lookY, 0);
      key.position.x = -4 + Math.sin(clock * 0.18) * 2;
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(render);
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
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
          for (const a of Array.isArray(m.material)
            ? m.material
            : [m.material]) {
            mats.add(a);
            Object.values(a).forEach((v) => {
              if (v instanceof T.Texture) maps.add(v);
            });
          }
      });
      maps.forEach((t) => t.dispose());
      mats.forEach((m) => m.dispose());
      env.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [state, onReady, onError]);
  return (
    <div
      className="cinema-canvas"
      ref={host}
      role="img"
      aria-label="Animated three-dimensional Sky-Dweller study, with a guided close-up of the Saros calendar. Drag to change the view."
    />
  );
}
