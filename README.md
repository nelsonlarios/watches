# Saros — The Traveller’s Little Universe

A cinematic, narrated web prototype inspired by the Rolex Sky-Dweller. Built with the Sites Vinext starter, React, and Three.js.

## Experience

- A six-chapter film with 93.456 seconds of generated female narration, synchronized captions, seeking, pause/resume, and replay.
- A procedural Everose and blue-green watch study, exploded assembly, patent-inspired annual-calendar cutaway, local/reference time demonstrations, Ring Command selection and crown interaction, and a luminous night reveal.
- Responsive desktop/mobile composition, drag rotation, keyboard controls, reduced ambient motion, transcript, sources, and three voice auditions.
- Local MP3 assets: no speech API call or browser voice installation is required during playback. Narration and the procedural ambient score start after the visitor presses play.

## Run

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5198
```

```sh
npx tsc --noEmit
npm run build
```

## Main files

- `app/experience.tsx`: guided playback owner, media clock, captions, chapter controls, time/calendar demonstrations.
- `app/watch-scene.tsx`: procedural geometry, physically lit materials, assembly transforms, orbiting calendar schematic, pointer rotation, resource disposal.
- `app/globals.css`: composition, responsive layout, typography, and controls.
- `public/audio/narration.json`: generated narration metadata, scripts, actual durations, and sentence cues.
- `scripts/audio/generate.py`: reproducible narration generator; dependencies in the adjacent requirements file.

## Accuracy boundary

The exterior and internal geometry are illustrative reconstructions. This is not an authenticated calibre 9002 CAD assembly or a workshop assembly guide. The Saros schematic uses the example 123/36 tooth relationship from Rolex patent EP1596261B1; it does not claim those are production 9002 tooth counts. The fixed gear remains stationary, and satellite rotation follows the external epicyclic relationship. Calendar demonstrations distinguish 30- and 31-day months; February requires annual correction. Local-hour changes preserve reference time; forward midnight crossings advance the date.

Research was prepared separately in `../research/sky-dweller-feasibility.md`. Official references are linked in the experience’s “Behind the story” dialog. The project is independent and is not endorsed by Rolex.

## Voice

Microsoft neural speech, `en-GB-SoniaNeural`, generated with edge-tts 7.3.1 at -12% rate and -8Hz pitch. All nine MP3s were decoded and checked for a non-silent, non-clipped signal. Listening quality and the desired sensual character remain subjective review points.

## Verification

TypeScript check and production build pass. Browser checks covered a full six-chapter playback to completion, caption/audio alignment, assembly separation, both month-boundary demonstrations, independent local time, bezel selection and crown adjustments, end seeking, and desktop/mobile layouts. Audio generation checks verified actual durations and caption bounds. The browser console showed no application errors during these checks.
