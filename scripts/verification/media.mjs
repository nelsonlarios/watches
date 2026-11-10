import assert from "node:assert/strict";
import fs from "node:fs/promises";
import ts from "../../node_modules/typescript/lib/typescript.js";
const source = await fs.readFile(
  new URL("../../app/film-media.ts", import.meta.url),
  "utf8",
);
const moduleURL =
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText,
  ).toString("base64");
const { createFilmMediaCache, waitForFilmMetadata } = await import(moduleURL);
let finish,
  requests = 0;
const cache = createFilmMediaCache(() => {
  requests++;
  return new Promise((resolve) => {
    finish = resolve;
  });
});
const first = cache.get("/score.mp3"),
  second = cache.get("/score.mp3");
assert.equal(first, second, "prefetch and play share the same pending asset");
finish(new Response(new Blob(["complete media bytes"])));
const url = await first;
assert.equal(requests, 1);
assert.ok(url.startsWith("blob:"));
assert.equal(await (await fetch(url)).text(), "complete media bytes");
assert.equal(await cache.get("/score.mp3"), url);
cache.dispose();
await assert.rejects(fetch(url), "disposed object URLs are revoked");
await assert.rejects(cache.get("/score.mp3"), { name: "AbortError" });
let attempts = 0;
const retry = createFilmMediaCache(async () =>
  ++attempts === 1
    ? new Response("fail", { status: 500 })
    : new Response("audio"),
);
await assert.rejects(retry.get("/voice.mp3"));
assert.ok((await retry.get("/voice.mp3")).startsWith("blob:"));
assert.equal(attempts, 2, "failed fetch does not poison retry");
retry.dispose();
const pending = createFilmMediaCache(
  (_, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener("abort", () =>
        reject(new DOMException("Cancelled", "AbortError")),
      );
    }),
);
const interrupted = pending.get("/next.mp3");
pending.dispose();
await assert.rejects(interrupted, { name: "AbortError" });
class AudioProbe extends EventTarget {
  readyState = 0;
}
const audio = new AudioProbe(),
  request = new AbortController();
const metadata = waitForFilmMetadata(audio, request.signal);
request.abort();
await assert.rejects(metadata, { name: "AbortError" });
const ready = waitForFilmMetadata(audio, new AbortController().signal);
audio.readyState = 1;
audio.dispatchEvent(new Event("loadedmetadata"));
await ready;
console.log(
  "PASS: complete media Blob resources; deduplicated fetch; failed-load retry; object-URL revocation; cancelled fetch/metadata preparation.",
);
