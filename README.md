# Saros — A world on your wrist

An eight-act, **4:23.400** cinematic3D watch story. Original procedural models, AI female narration, researched history, a guided Saros calendar, an actual perforated month display, and an original sampled orchestral score. **No paid assets. No photographs are displayed as film scenes.**

The baseline is the **2012 Rolex Sky-Dweller326939 / calibre9001**, white gold, ivory Roman dial, Oyster bracelet. The exterior is a reconstruction guided by Rolex images, not authenticated factory CAD. Typography, surface profiles and concealed geometry remain approximations.

## Development and checks

```sh
npm run dev -- --host 127.0.0.1 --port 5198
npx tsc --noEmit
node scripts/verification/calendar.mjs
node scripts/verification/timeline.mjs
node scripts/verification/assembly.mjs
node scripts/verification/media.mjs
```

Existing owner-private Site identity remains in `.openai/hosting.json`. The Sites source helper builds and packages the exact committed source.

## The film

1. Historical prologue:1926Oyster,1931Perpetual,1955GMT-Master,2012Sky-Dweller; astronomy supplies the Saros name, not an eclipse-prediction function.
2. Invitation into the watch.
3. Energy and rhythm.
4. April30→May1: correction30→31, then ordinary31→1. The same assembly rolls continuously to May30; a gap gives only the normal advance.
5. Month windows: twelve genuine cutouts in the same dial, a separate contrasting sector beneath, the date-sector/intermediate/month-ring connection, net30° monthly travel, and the visible April→May result.
6. Independent local hour, with reference time retained.
7. Ring Command function selection.
8. A36-second component assembly: suspended parts, staged convergence, and a380-component calibre9001 reveal at20seconds with a matching orchestral arrival.

The main historical imagery consists of abstract principles, not invented replicas of historical watches. Month-drive tooth profiles/counts and exact placement are illustrative. The net ring-travel shot is separated from the dated visible indication; production step staging is not asserted. The final travel/setting/assembly chapters retain May1 after the month-display lesson.

## Precision

Rolex establishes four production Saros fingers for April, June, September and November. The early patent's123/36 rolling ratio, combined with four program positions, is a derived teaching configuration. It is not proof of production tooth counts. The extra step is calculated from gear orientation/contact, not a month-length lookup. February needs correction onMarch1. Contact paths, spring forces, clearances and expanded timing are not a factory collision model.

Sources and boundaries are available in the film's About panel and in `docs/`.

## Audio and music

Microsoft Sonia AI female voice, British English,−12% rate and−8Hz pitch. New history and month passages are61.176s and40.032s; the calendar is67.440s. Generated sentence cues drive captions and picture conformance. `scripts/audio/compose-film.mjs` combines all eight acts into the active manifest.

Four original orchestral cues cover the whole263.400-second film: heritage86.760s, calendar67.440s, voyage73.200s, assembly36.000s. Complete audio files are cached as local Blob resources so private-host HTTP seek restrictions cannot restart the music. Music is synchronized to the narration clock across chapter transitions and seeks. Speech gains are calibrated against Sonia; pauses allow the music to rise. The May-gap passage at51–57s of the calendar cue is silent.

The composition uses locally available sampled orchestral instruments, rendered through Apple AVAudioEngine. Only original rendered audio is served; sample banks are not redistributed. MIDI/event scores, render tools, credits and loudness measurements are retained in `scripts/audio/music/` and `public/audio/score/score-manifest.json`.

Gentilis font data is openly licensed; SIL licence included. Reference images are modelling/provenance aids. Rolex names and marks belong to their owners. Independent creative/educational study; no affiliation or endorsement.

The finale uses Rolex’s original2012launch dossier (p.10) for **380 components in calibre9001**. This is the movement count, not a total for the complete watch. The procedural model animates its represented components; it is not a380-part factory CAD reconstruction. Integral features stay on their host parts. Absolute-time poses restore the model on seek/replay or when leaving the chapter.
