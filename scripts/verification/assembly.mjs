import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "../../node_modules/typescript/lib/typescript.js";
const root = new URL("../../", import.meta.url);
const threeURL = new URL("node_modules/three/build/three.module.js", root).href;
const compile = (text) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(text, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  ).toString("base64");
const timelineURL = compile(
  await fs.readFile(
    new URL("app/mechanics/assembly-timeline.ts", root),
    "utf8",
  ),
);
const { assemblyPose, ASSEMBLY, CALIBRE_9001_COMPONENTS } = await import(
  timelineURL
);
const controllerURL = compile(
  (await fs.readFile(new URL("app/assembly-controller.ts", root), "utf8"))
    .replace('"three"', JSON.stringify(threeURL))
    .replace('"./mechanics/assembly-timeline"', JSON.stringify(timelineURL)),
);
let source = await fs.readFile(new URL("app/watch-model.ts", root), "utf8");
source = source
  .replace('"./assembly-controller"', JSON.stringify(controllerURL))
  .replaceAll(/"three([^\"]*)"/g, (_, path) =>
    JSON.stringify(
      path
        ? new URL(
            "node_modules/three/examples/jsm" + path.replace("/addons", ""),
            root,
          ).href
        : threeURL,
    ),
  );
// Geometry needs a drawing surface for textures; drawing itself is browser QA.
const context = new Proxy({}, { get: (o, k) => o[k] ?? (() => {}) });
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};
const { makeWatch } = await import(compile(source));
const { FontLoader } = await import(
  new URL("node_modules/three/examples/jsm/loaders/FontLoader.js", root)
);
const font = new FontLoader().parse(
  JSON.parse(
    await fs.readFile(
      new URL("public/fonts/gentilis_regular.typeface.json", root),
      "utf8",
    ),
  ),
);
const watch = makeWatch(font);
const parts = [];
watch.root.traverse((o) => {
  if (o.name.startsWith("assembly:")) parts.push(o);
});
assert.ok(parts.length > 70, "all modelled component families are registered");
assert.ok(
  parts.length < CALIBRE_9001_COMPONENTS,
  "model count is not misrepresented as production count",
);
assert.equal(new Set(parts.map((p) => p.name)).size, parts.length);
for (const p of parts)
  assert.ok(
    !parts.some((a) => a !== p && a.getObjectById(p.id)),
    "no nested registration/double transforms",
  );
assert.equal(watch.bezel.children.length, 1, "flutes remain one bezel");
assert.equal(
  watch.monthRing.children.length,
  1,
  "integral teeth stay on month ring",
);
assert.equal(watch.crown.children.length, 39, "knurling stays on crown");
const home = () =>
  parts.map((p) => [
    p.position.toArray(),
    p.quaternion.toArray(),
    p.scale.toArray(),
  ]);
const baseline = home();
watch.assembly.apply(0);
assert.notDeepEqual(home(), baseline);
watch.assembly.reset();
watch.assembly.apply(12.5);
const midway = home();
watch.assembly.reset();
watch.assembly.apply(29);
watch.assembly.reset();
watch.assembly.apply(12.5);
assert.deepEqual(home(), midway, "backward seek reproduces the same assembly");
watch.assembly.reset();
watch.assembly.apply(ASSEMBLY.count);
assert.deepEqual(
  home(),
  baseline,
  "every registered part is home when the count is announced",
);
watch.assembly.reset();
watch.assembly.apply(5);
watch.assembly.reset();
assert.deepEqual(
  home(),
  baseline,
  "leaving a partially assembled chapter restores the watch",
);
for (const family of [
  "case",
  "back",
  "bracelet",
  "crown",
  "movement",
  "month",
  "dial",
  "index",
  "reference",
  "hand",
  "bezel",
  "crystal",
]) {
  for (let i = 0; i < 100; i++) {
    const p = assemblyPose(family, i, 20, { x: 0, y: 0 });
    assert.equal(p.flight, 0);
    assert.ok(p.end <= 20);
  }
}
const finale = JSON.parse(
  await fs.readFile(
    new URL("public/audio/assembly-finale/narration.json", root),
    "utf8",
  ),
);
assert.equal(finale.markers.countReveal, ASSEMBLY.count);
assert.equal(finale.subject.movementComponentCount, CALIBRE_9001_COMPONENTS);
assert.equal(finale.subject.countAppliesTo, "movement");
assert.equal(
  finale.cues.find((c) => c.passage === "movement-count").start,
  ASSEMBLY.count,
);
console.log(
  `PASS: ${parts.length} modelled components; integral features grouped; seek/replay deterministic; exact assembled endpoint at20s; chapter-exit restoration;380 explicitly scoped to movement.`,
);
