import fs from "node:fs";
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const first = read("public/audio/narration.json"),
  calendar = read("public/audio/calendar-proof/narration.json"),
  prologue = read("public/audio/prologue/narration.json"),
  months = read("public/audio/month-windows/narration.json"),
  assembly = read("public/audio/assembly-finale/narration.json");
const input = [
  prologue,
  first.chapters[0],
  first.chapters[1],
  calendar.chapters[0],
  months,
  first.chapters[3],
  first.chapters[4],
  assembly,
];
const names = [
  "A century of possibility",
  "The invitation",
  "Energy becomes time",
  "The secret of midnight",
  "Twelve windows. One year.",
  "Two worlds",
  "Ring Command",
  "A universe, assembled",
];
const chapters = input.map((c, i) => ({
  id: i,
  title: names[i],
  text: c.text,
  file: c.file,
  duration: c.duration,
  cues: c.cues,
}));
const film = {
  generatedAt: "2026-11-10",
  aiGenerated: true,
  voice: first.voice,
  totalDuration: Number(
    chapters.reduce((s, c) => s + c.duration, 0).toFixed(3),
  ),
  chapters,
};
fs.writeFileSync(
  "app/calendar-timing.json",
  JSON.stringify({ fragments: calendar.fragments }, null, 2) + "\n",
);
fs.writeFileSync(
  "app/prologue-timing.json",
  JSON.stringify(
    { moments: prologue.moments, milestones: prologue.milestones },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  "app/month-timing.json",
  JSON.stringify({ cues: months.cues }, null, 2) + "\n",
);
fs.writeFileSync(
  "app/film-narration.json",
  JSON.stringify(film, null, 2) + "\n",
);
console.log(`Composed eight-act film: ${film.totalDuration} seconds.`);
