# Original orchestral film score

Four original arrangements cover the 244.680-second eight-act film. The source
MIDI files and timestamped event scores are in this directory. Finished stereo
MP3s and their measured playback manifest are in `public/audio/score/`.

## Instrument sources

The native renderer loads the installed Apple Logic factory String Ensemble,
French Horns Legato, Full Brass Legato and Flute Solo Legato EXS24 instruments.
Apple documents the use of its included sample content in original film and
audio soundtracks: https://support.apple.com/en-us/101908

Additional performed instruments use FluidR3 by Frank Wen and contributors:
harp, celesta, choir, cello, contrabass, tremolo and pizzicato strings, timpani,
and orchestral percussion. The source archive was downloaded from MuseScore's
OSU mirror:
https://ftp.osuosl.org/pub/musescore/soundfont/fluid-soundfont.tar.gz

The original archive README declares a public-domain release on 25 December
2001. MuseScore's SoundFont documentation describes FluidR3 as MIT licensed:
https://musescore.org/en/handbook/2/soundfonts-and-sfz-files

No sample bank, factory instrument, isolated source sample or existing music
loop is redistributed. The site contains only the original composed and
rendered soundtrack. The temporary FluidR3 bank remains outside the checkout
at `/tmp/sky-dweller-orchestra/FluidR3_GM.sf2`.

## Rendering

The existing `/tmp/sky-dweller-audio-venv` contains `numpy`, `mido`, `mutagen`
and `imageio-ffmpeg`. Swift and AVFoundation are supplied by macOS. The native
renderer performs MIDI events into an offline AVAudioEngine, with sampled
instruments, stereo placement, hall reverb and gentle EQ. The Python master
stage applies the film's dynamic envelope, preserves the calendar's silent
gap, controls peak levels and encodes stereo 256 kbps MP3.

1. Run `compose-score.py` to write the original MIDI/event arrangements.
2. Compile `render-orchestra.swift` with `swiftc -O` to
   `/tmp/sky-dweller-orchestra/render-orchestra`.
3. Run `render-score.py --force-render` to render and measure all four cues.

Without `--force-render`, existing temporary WAV renders are reused. Use the
flag after changing notes, instrumentation, or the native renderer.

The manifest includes exact editorial durations, encoded durations, act
offsets, significant score markers, RMS, sample peak, true peak, integrated
LUFS, five-second dynamic measurements and a starting voice-ducking readout.
The calendar cue cuts to silence at 51 seconds and returns at 57 seconds.

The score is already shaped for its narrative moments. Voice ducking should
add a smooth gain transition rather than restart the score on every sentence.
The heritage and voyage assets continue through their internal act changes.
