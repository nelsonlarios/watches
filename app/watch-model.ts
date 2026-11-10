import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import type { Font } from "three/addons/loaders/FontLoader.js";
export const TAU = Math.PI * 2;
export function disk(radius: number, depth: number, mat: T.Material) {
  const m = new T.Mesh(new T.CylinderGeometry(radius, radius, depth, 128), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}
export function annulus(
  inner: number,
  outer: number,
  depth: number,
  mat: T.Material,
  bevel = 0.008,
) {
  const s = new T.Shape();
  s.absarc(0, 0, outer, 0, TAU, false);
  const h = new T.Path();
  h.absarc(0, 0, inner, 0, TAU, true);
  s.holes.push(h);
  return new T.Mesh(
    new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 128,
    }),
    mat,
  );
}
export function texture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 2048,
) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function cog(
  radius: number,
  teeth: number,
  depth: number,
  mat: T.Material,
) {
  const s = new T.Shape();
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * TAU,
      r = radius + (i % 4 === 1 || i % 4 === 2 ? 0.035 : 0);
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const h = new T.Path();
  h.absarc(0, 0, radius * 0.13, 0, TAU, true);
  s.holes.push(h);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4,
      p = new T.Path();
    p.absarc(
      Math.cos(a) * radius * 0.55,
      Math.sin(a) * radius * 0.55,
      radius * 0.18,
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
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 24,
    }),
    mat,
  );
}
function crownEmblem(mat: T.Material) {
  const group = new T.Group();
  const p = new T.Shape();
  p.moveTo(-0.12, -0.07);
  p.quadraticCurveTo(0, -0.11, 0.12, -0.07);
  p.lineTo(0.17, 0.11);
  p.lineTo(0.08, 0.015);
  p.lineTo(0.085, 0.16);
  p.lineTo(0.03, 0.03);
  p.lineTo(0, 0.185);
  p.lineTo(-0.03, 0.03);
  p.lineTo(-0.085, 0.16);
  p.lineTo(-0.08, 0.015);
  p.lineTo(-0.17, 0.11);
  p.closePath();
  const hole = new T.Path();
  hole.absellipse(0, -0.065, 0.075, 0.018, 0, TAU, true, 0);
  p.holes.push(hole);
  group.add(
    new T.Mesh(
      new T.ExtrudeGeometry(p, {
        depth: 0.015,
        bevelEnabled: true,
        bevelSize: 0.005,
        bevelThickness: 0.005,
        bevelSegments: 2,
      }),
      mat,
    ),
  );
  [
    [-0.17, 0.11],
    [-0.085, 0.16],
    [0, 0.185],
    [0.085, 0.16],
    [0.17, 0.11],
  ].forEach(([x, y]) => {
    const b = disk(0.024, 0.02, mat);
    b.position.set(x, y, 0.01);
    group.add(b);
  });
  return group;
}
export function makeWatch(font: Font) {
  const root = new T.Group(),
    layers: Record<string, T.Group> = {};
  const polished = new T.MeshPhysicalMaterial({
    color: 0xe6e5df,
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
  });
  const brushed = new T.MeshStandardMaterial({
    color: 0xaeb1aa,
    metalness: 1,
    roughness: 0.33,
  });
  const gold = new T.MeshStandardMaterial({
    color: 0xd8b16c,
    metalness: 0.94,
    roughness: 0.23,
  });
  const brushing = texture((c, s) => {
    c.fillStyle = "#d6d6d6";
    c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x++) {
      const v = 160 + Math.floor((Math.sin(x * 7.417) * 0.5 + 0.5) * 80);
      c.strokeStyle = `rgb(${v},${v},${v})`;
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, s);
      c.stroke();
    }
  });
  brushing.colorSpace = T.NoColorSpace;
  brushed.roughnessMap = brushing;
  brushed.bumpMap = brushing;
  brushed.bumpScale = 0.0012;
  const black = new T.MeshStandardMaterial({
    color: 0x050706,
    roughness: 0.35,
    metalness: 0.1,
  });
  const ivory = new T.MeshStandardMaterial({
    color: 0xe7e0cb,
    roughness: 0.54,
    metalness: 0.14,
  });
  const lume = new T.MeshStandardMaterial({
    color: 0xe3e1cf,
    roughness: 0.45,
    metalness: 0.06,
  });
  function layer(name: string, z = 0) {
    const g = new T.Group();
    g.position.z = z;
    root.add(g);
    layers[name] = g;
    return g;
  }
  const body = layer("body");
  const profile = [
    [1.75, -0.59],
    [1.92, -0.59],
    [2.015, -0.51],
    [2.055, -0.29],
    [2.075, -0.05],
    [2.055, 0.18],
    [1.84, 0.29],
    [1.75, 0.29],
    [1.75, -0.59],
  ].map(([x, y]) => new T.Vector2(x, y));
  const shell = new T.Mesh(new T.LatheGeometry(profile, 160), polished);
  shell.rotation.x = Math.PI / 2;
  body.add(shell);
  const back = disk(1.88, 0.12, brushed);
  back.position.z = -0.62;
  body.add(back);
  const backrim = annulus(1.65, 1.87, 0.06, polished);
  backrim.position.z = -0.72;
  body.add(backrim);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const s = new T.Shape();
      s.moveTo(sx * 0.7, sy * 1.35);
      s.bezierCurveTo(
        sx * 1.13,
        sy * 1.27,
        sx * 1.44,
        sy * 1.37,
        sx * 1.4,
        sy * 1.67,
      );
      s.quadraticCurveTo(sx * 1.27, sy * 2.13, sx * 1.14, sy * 2.4);
      s.lineTo(sx * 0.88, sy * 2.43);
      s.quadraticCurveTo(sx * 0.84, sy * 1.83, sx * 0.7, sy * 1.35);
      s.closePath();
      const lug = new T.Mesh(
        new T.ExtrudeGeometry(s, {
          depth: 0.45,
          bevelEnabled: true,
          bevelThickness: 0.07,
          bevelSize: 0.065,
          bevelSegments: 5,
        }),
        polished,
      );
      lug.position.z = -0.3;
      body.add(lug);
    }
  const bracelet = new T.Group();
  body.add(bracelet);
  for (const sy of [-1, 1])
    for (let row = 0; row < 9; row++) {
      const y = sy * (2.34 + row * 0.365),
        z = -0.19 - row * row * 0.017;
      for (let column = -1; column <= 1; column++) {
        const linkGeometry = new RoundedBoxGeometry(
          column === 0 ? 0.98 : 0.57,
          0.342,
          0.24,
          6,
          0.035,
        );
        const vertices = linkGeometry.attributes.position;
        for (let v = 0; v < vertices.count; v++) {
          if (vertices.getZ(v) > 0) {
            const bow =
              Math.pow(Math.cos((vertices.getY(v) / 0.342) * Math.PI), 2) *
              0.065;
            vertices.setZ(v, vertices.getZ(v) + bow);
          }
        }
        linkGeometry.computeVertexNormals();
        const link = new T.Mesh(
          linkGeometry,
          column === 0 ? polished : brushed,
        );
        link.position.set(column * 0.79, y, z);
        link.rotation.x = -sy * row * 0.045;
        bracelet.add(link);
      }
    }
  const crown = new T.Group();
  crown.position.set(2.14, 0, -0.02);
  body.add(crown);
  const stem = disk(0.18, 0.25, polished);
  stem.rotation.z = Math.PI / 2;
  crown.add(stem);
  const cap = disk(0.27, 0.3, polished);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = 0.16;
  crown.add(cap);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU,
      t = new T.Mesh(
        new RoundedBoxGeometry(0.26, 0.026, 0.026, 2, 0.008),
        polished,
      );
    t.position.set(0.16, Math.sin(a) * 0.27, Math.cos(a) * 0.27);
    t.rotation.x = -a;
    crown.add(t);
  }
  const crownLogo = crownEmblem(polished);
  crownLogo.scale.setScalar(0.65);
  crownLogo.rotation.y = Math.PI / 2;
  crownLogo.position.x = 0.32;
  crown.add(crownLogo);
  const dial = layer("dial", 0.32);
  const dialMap = texture((c, s) => {
    c.fillStyle = "#e4dfcf";
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.strokeStyle = "#363b32";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      c.lineWidth = i % 5 === 0 ? 3.1 : 2.1;
      c.beginPath();
      c.moveTo(Math.sin(a) * s * 0.474, -Math.cos(a) * s * 0.474);
      c.lineTo(
        Math.sin(a) * s * (i % 5 === 0 ? 0.451 : 0.458),
        -Math.cos(a) * s * (i % 5 === 0 ? 0.451 : 0.458),
      );
      c.stroke();
    }
    c.fillStyle = "#1b241c";
    c.textAlign = "center";
    c.font = `${s * 0.058}px Georgia`;
    c.fillText("ROLEX", 0, -s * 0.283);
    c.font = `${s * 0.012}px Arial`;
    c.fillText("SWISS       MADE", 0, s * 0.472);
  });
  const dialMat = new T.MeshStandardMaterial({
    map: dialMap,
    roughness: 0.52,
    metalness: 0.08,
  });
  // The month indications are actual openings, with a separate ring below.
  const dialOutline = new T.Shape();
  dialOutline.absarc(0, 0, 1.77, 0, TAU, false);
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * TAU,
      hole = new T.Path();
    const corners = [
      [-0.05, -0.1175],
      [-0.05, 0.1175],
      [0.05, 0.1175],
      [0.05, -0.1175],
    ];
    corners.forEach(([x, y], index) => {
      const px = Math.sin(a) * 1.64 + x * Math.cos(a) + y * Math.sin(a);
      const py = Math.cos(a) * 1.64 - x * Math.sin(a) + y * Math.cos(a);
      if (index) hole.lineTo(px, py);
      else hole.moveTo(px, py);
    });
    hole.closePath();
    dialOutline.holes.push(hole);
  }
  const dialGeometry = new T.ExtrudeGeometry(dialOutline, {
    depth: 0.035,
    bevelEnabled: false,
    curveSegments: 160,
  });
  dialGeometry.translate(0, 0, -0.035);
  const dialVertices = dialGeometry.attributes.position,
    dialUV = dialGeometry.attributes.uv;
  for (let i = 0; i < dialVertices.count; i++)
    dialUV.setXY(
      i,
      dialVertices.getX(i) / 3.54 + 0.5,
      dialVertices.getY(i) / 3.54 + 0.5,
    );
  dial.add(new T.Mesh(dialGeometry, dialMat));
  const emblem = crownEmblem(polished);
  emblem.position.set(0, 1.24, 0.025);
  emblem.scale.setScalar(0.92);
  dial.add(emblem);
  const romans = [
    "",
    "I",
    "II",
    "",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
  ];
  for (let h = 1; h < 12; h++) {
    if (h === 3) continue;
    const numeral = romans[h];
    const geo = new TextGeometry(numeral, {
      font,
      size: 0.29,
      depth: 0.035,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: 0.009,
      bevelSize: 0.009,
      bevelSegments: 3,
    });
    geo.computeBoundingBox();
    const b = geo.boundingBox!;
    geo.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
    const m = new T.Mesh(geo, polished);
    const a = (h / 12) * TAU;
    m.position.set(Math.sin(a) * 1.39, Math.cos(a) * 1.39, 0.015);
    m.rotation.z = -a;
    dial.add(m);
  }
  const monthRing = layer("monthRing", 0.22);
  monthRing.add(annulus(1.49, 1.77, 0.035, ivory));
  const sectorShape = new T.Shape(),
    a0 = Math.PI / 2 - (25 * Math.PI) / 360,
    a1 = Math.PI / 2 + (25 * Math.PI) / 360;
  sectorShape.absarc(0, 0, 1.76, a0, a1, false);
  sectorShape.lineTo(Math.cos(a1) * 1.51, Math.sin(a1) * 1.51);
  sectorShape.absarc(0, 0, 1.51, a1, a0, true);
  sectorShape.closePath();
  const sector = new T.Mesh(
    new T.ExtrudeGeometry(sectorShape, {
      depth: 0.006,
      bevelEnabled: false,
      curveSegments: 32,
    }),
    new T.MeshBasicMaterial({ color: 0x080a06, side: T.DoubleSide }),
  );
  sector.position.z = 0.052;
  monthRing.add(sector);
  // Tooth counts below are a coherent teaching layout, not production counts.
  for (let i = 0; i < 84; i++) {
    const a = (i / 84) * TAU,
      t = new T.Mesh(new T.BoxGeometry(0.055, 0.045, 0.04), polished);
    t.position.set(Math.cos(a) * 1.49, Math.sin(a) * 1.49, 0.013);
    t.rotation.z = a;
    monthRing.add(t);
  }
  const monthTrain = new T.Group();
  monthTrain.position.z = 0.2;
  root.add(monthTrain);
  monthTrain.visible = false;
  const dateSector = new T.Group();
  monthTrain.add(dateSector);
  dateSector.add(annulus(0.92, 1.04, 0.035, brushed));
  for (let i = 1; i <= 7; i++) {
    const a = (-i * TAU) / 60,
      t = new T.Mesh(new T.BoxGeometry(0.06, 0.055, 0.05), polished);
    t.position.set(Math.cos(a) * 1.065, Math.sin(a) * 1.065, 0.025);
    t.rotation.z = a;
    dateSector.add(t);
  }
  const monthIdler = cog((1.065 * 12) / 60, 12, 0.055, gold);
  monthIdler.position.set(1.065 + (1.065 * 12) / 60, 0, 0.005);
  monthTrain.add(monthIdler);
  const windowHalo = new T.Mesh(
    new T.TorusGeometry(0.165, 0.0035, 8, 64),
    new T.MeshBasicMaterial({
      color: 0xdfbf7d,
      transparent: true,
      opacity: 0.8,
    }),
  );
  windowHalo.position.z = 0.07;
  dial.add(windowHalo);
  windowHalo.visible = false;
  const refCenter = new T.Group();
  refCenter.position.set(0, -0.37, 0.052);
  dial.add(refCenter);
  refCenter.add(annulus(1.095, 1.15, 0.018, polished));
  const referenceDisc = new T.Group();
  referenceDisc.position.z = 0.024;
  refCenter.add(referenceDisc);
  const refMap = texture((c, s) => {
    c.fillStyle = "#e9e7d9";
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.fillStyle = "#101611";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${s * 0.059}px Arial`;
    for (let h = 0; h < 24; h++) {
      c.save();
      c.rotate((h / 24) * TAU);
      if (h % 2 === 0) c.fillText(h === 0 ? "24" : String(h), 0, -s * 0.447);
      else {
        c.beginPath();
        c.arc(0, -s * 0.447, s * 0.0065, 0, TAU);
        c.fill();
      }
      c.restore();
    }
  });
  const refMesh = new T.Mesh(
    new T.RingGeometry(0.96, 1.099, 160),
    new T.MeshStandardMaterial({
      map: refMap,
      metalness: 0.25,
      roughness: 0.34,
    }),
  );
  referenceDisc.add(refMesh);
  const innerMap = texture((c, s) => {
    c.fillStyle = "#d9d7c6";
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.globalAlpha = 0.1;
    c.strokeStyle = "#727c70";
    for (let i = 0; i < 1800; i++) {
      const a = (i / 1800) * TAU;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = "#1b231b";
    c.textAlign = "center";
    c.font = `${s * 0.072}px Arial`;
    c.fillText("SKY-DWELLER", 0, s * 0.07);
    c.font = `${s * 0.047}px Arial`;
    c.fillText("OYSTER PERPETUAL", 0, s * 0.126);
    c.font = `${s * 0.036}px Arial`;
    c.fillText("SUPERLATIVE CHRONOMETER", 0, s * 0.175);
    c.fillText("OFFICIALLY CERTIFIED", 0, s * 0.218);
  });
  const innerFace = new T.Mesh(
    new T.CircleGeometry(0.963, 160),
    new T.MeshStandardMaterial({
      map: innerMap,
      metalness: 0.3,
      roughness: 0.43,
    }),
  );
  innerFace.position.z = 0.03;
  refCenter.add(innerFace);
  const triangle = new T.Shape();
  triangle.moveTo(-0.11, 0.9);
  triangle.lineTo(0.11, 0.9);
  triangle.lineTo(0, 0.78);
  triangle.closePath();
  const triHole = new T.Path();
  triHole.moveTo(-0.075, 0.88);
  triHole.lineTo(0, 0.81);
  triHole.lineTo(0.075, 0.88);
  triHole.closePath();
  triangle.holes.push(triHole);
  const triangleMesh = new T.Mesh(
    new T.ShapeGeometry(triangle),
    new T.MeshStandardMaterial({ color: 0xa92227, roughness: 0.4 }),
  );
  triangleMesh.position.z = 0.105;
  dial.add(triangleMesh);
  const dateCanvas = document.createElement("canvas");
  dateCanvas.width = 384;
  dateCanvas.height = 256;
  const dc = dateCanvas.getContext("2d")!,
    dateMap = new T.CanvasTexture(dateCanvas);
  dateMap.colorSpace = T.SRGBColorSpace;
  const dateFace = new T.Mesh(
    new T.PlaneGeometry(0.42, 0.32),
    new T.MeshBasicMaterial({ map: dateMap }),
  );
  dateFace.position.set(1.32, 0, 0.11);
  dial.add(dateFace);
  const dateRim = new T.Mesh(
    new RoundedBoxGeometry(0.49, 0.39, 0.023, 3, 0.035),
    polished,
  );
  dateRim.position.set(1.32, 0, 0.085);
  dial.add(dateRim);
  let lastDate = -1;
  function setDate(n: number) {
    if (n === lastDate) return;
    lastDate = n;
    dc.fillStyle = "#f0eee1";
    dc.fillRect(0, 0, 384, 256);
    dc.fillStyle = "#090e0a";
    dc.font = "218px Arial";
    dc.textAlign = "center";
    dc.textBaseline = "middle";
    dc.fillText(String(n), 192, 145);
    dateMap.needsUpdate = true;
  }
  const bezel = layer("bezel", 0.33);
  bezel.add(annulus(1.78, 2.1, 0.06, polished, 0.012));
  const positions: number[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU,
      b = ((i + 1) / 60) * TAU,
      m = (a + b) / 2;
    const v = [
      new T.Vector3(Math.sin(a) * 1.8, Math.cos(a) * 1.8, 0.17),
      new T.Vector3(Math.sin(b) * 1.8, Math.cos(b) * 1.8, 0.17),
      new T.Vector3(Math.sin(m) * 2.1, Math.cos(m) * 2.1, 0.115),
      new T.Vector3(Math.sin(a) * 2.1, Math.cos(a) * 2.1, 0.035),
      new T.Vector3(Math.sin(b) * 2.1, Math.cos(b) * 2.1, 0.035),
    ];
    for (const tri of [
      [0, 1, 2],
      [0, 2, 3],
      [1, 4, 2],
    ])
      for (const j of tri) positions.push(v[j].x, v[j].y, v[j].z);
  }
  const fg = new T.BufferGeometry();
  fg.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  fg.computeVertexNormals();
  bezel.add(new T.Mesh(fg, polished));
  const rehaut = layer("rehaut", 0.37);
  rehaut.add(annulus(1.72, 1.8, 0.08, polished));
  const rehautMap = texture((c, s) => {
    c.translate(s / 2, s / 2);
    c.fillStyle = "#879083";
    c.font = `${s * 0.021}px Georgia`;
    c.textAlign = "center";
    for (let i = 0; i < 10; i++) {
      c.save();
      c.rotate((i / 10) * TAU);
      c.fillText("R O L E X", 0, -s * 0.478);
      c.restore();
    }
  });
  const rehautPrint = new T.Mesh(
    new T.RingGeometry(1.73, 1.8, 160),
    new T.MeshStandardMaterial({
      map: rehautMap,
      transparent: true,
      metalness: 0.8,
      roughness: 0.25,
    }),
  );
  rehautPrint.position.z = 0.095;
  rehaut.add(rehautPrint);
  const hands = layer("hands", 0.48);
  function hand(length: number, width: number) {
    const g = new T.Group(),
      s = new T.Shape();
    s.moveTo(-width * 0.45, -0.26);
    s.lineTo(-width * 0.48, length - 0.16);
    s.lineTo(-width * 0.22, length);
    s.lineTo(width * 0.22, length);
    s.lineTo(width * 0.48, length - 0.16);
    s.lineTo(width * 0.45, -0.26);
    s.closePath();
    g.add(
      new T.Mesh(
        new T.ExtrudeGeometry(s, {
          depth: 0.025,
          bevelEnabled: true,
          bevelSize: 0.009,
          bevelThickness: 0.008,
          bevelSegments: 3,
        }),
        polished,
      ),
    );
    const inlay = new T.Mesh(
      new T.BoxGeometry(width * 0.42, length * 0.65, 0.01),
      lume,
    );
    inlay.position.set(0, length * 0.49, 0.04);
    g.add(inlay);
    return g;
  }
  const hour = hand(1.06, 0.17),
    minute = hand(1.53, 0.12);
  hour.position.z = 0.02;
  minute.position.z = 0.08;
  hands.add(hour, minute);
  const second = new T.Group();
  const needle = new T.Mesh(new T.BoxGeometry(0.014, 2.1, 0.016), polished);
  needle.position.y = 0.58;
  second.add(needle);
  const tail = new T.Mesh(new T.BoxGeometry(0.035, 0.31, 0.02), polished);
  tail.position.y = -0.32;
  second.add(tail);
  second.position.z = 0.15;
  hands.add(second);
  const pin = disk(0.065, 0.075, polished);
  pin.position.z = 0.195;
  hands.add(pin);
  const crystal = layer("crystal", 0.72);
  const glass = new T.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.015,
    transmission: 0.98,
    thickness: 0.055,
    ior: 1.77,
    transparent: true,
    opacity: 0.055,
    depthWrite: false,
    clearcoat: 1,
  });
  crystal.add(disk(1.77, 0.055, glass));
  const lens = new T.Mesh(
    new T.SphereGeometry(1, 64, 32),
    new T.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.01,
      transmission: 0.9,
      thickness: 0.14,
      ior: 1.77,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      clearcoat: 1,
    }),
  );
  lens.scale.set(0.3, 0.22, 0.105);
  lens.position.set(1.32, 0, 0.1);
  crystal.add(lens);
  const rotor = layer("rotor", -0.3);
  const rotorShape = new T.Shape();
  rotorShape.absarc(0, 0, 1.53, 0, Math.PI, false);
  rotorShape.lineTo(-0.32, 0);
  rotorShape.absarc(0, 0, 0.32, Math.PI, 0, true);
  rotorShape.closePath();
  const rotorMesh = new T.Mesh(
    new T.ExtrudeGeometry(rotorShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.028,
      bevelThickness: 0.02,
      bevelSegments: 3,
      curveSegments: 100,
    }),
    brushed,
  );
  rotor.add(rotorMesh);
  rotor.add(disk(0.22, 0.12, polished));
  rotor.visible = false;
  const energy = layer("energy", 0.02);
  const barrel = new T.Group();
  barrel.position.set(-0.62, 0.25, 0);
  energy.add(barrel);
  barrel.add(annulus(0.6, 0.65, 0.13, gold));
  const sp: T.Vector3[] = [];
  for (let i = 0; i <= 1000; i++) {
    const a = (i / 1000) * TAU * 9,
      r = 0.04 + (i / 1000) * 0.54;
    sp.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.1));
  }
  barrel.add(
    new T.Mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(sp), 1000, 0.012, 4, false),
      brushed,
    ),
  );
  const balance = new T.Group();
  balance.position.set(0.67, -0.6, 0.07);
  energy.add(balance);
  balance.add(annulus(0.4, 0.46, 0.045, gold));
  for (let i = 0; i < 3; i++) {
    const spoke = new T.Mesh(new T.BoxGeometry(0.036, 0.83, 0.026), polished);
    spoke.rotation.z = (i * Math.PI) / 3;
    balance.add(spoke);
  }
  const coil: T.Vector3[] = [];
  for (let i = 0; i < 500; i++) {
    const a = (i / 500) * TAU * 7,
      r = 0.04 + (i / 500) * 0.31;
    coil.push(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0.07));
  }
  balance.add(
    new T.Line(
      new T.BufferGeometry().setFromPoints(coil),
      new T.LineBasicMaterial({ color: 0x2465b7 }),
    ),
  );
  const ax = disk(0.05, 0.1, polished);
  ax.position.z = 0.09;
  balance.add(ax);
  energy.visible = false;
  setDate(30);
  return {
    root,
    layers,
    body,
    dial,
    bezel,
    hands,
    crystal,
    referenceDisc,
    hour,
    minute,
    second,
    crown,
    rotor,
    energy,
    balance,
    dateFace,
    monthRing,
    monthTrain,
    monthIdler,
    dateSector,
    windowHalo,
    setDate,
    polished,
    brushed,
    gold,
  };
}
