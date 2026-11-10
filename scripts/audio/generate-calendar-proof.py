"""Synthesize and conform the exact calendar-storyboard-v3 voice column.

Dependencies: edge-tts==7.3.1, mutagen==1.48.1, imageio-ffmpeg==0.8.1.
Sonia voice matches the earlier studies. Speech is synthesized as eleven real
fragments; PCM silence supplies the deliberate visual holds. No empty SSML or
fabricated speech events are used. Only calendar-proof assets are written.
"""

import argparse
import asyncio
import json
import re
import subprocess
import tempfile
import wave as wave_codec
from pathlib import Path

import edge_tts
import imageio_ffmpeg
from mutagen.mp3 import MP3


ROOT = Path(__file__).resolve().parents[2]
STORYBOARD = ROOT.parent / "research" / "calendar-storyboard-v3.md"
OUT = ROOT / "public" / "audio" / "calendar-proof"
VOICE = "en-GB-SoniaNeural"
RATE = "-12%"
PITCH = "-8Hz"
SHOT_NAMES = [
    "midnight-surprise",
    "slow-motion-replay",
    "ordinary-finger",
    "extra-finger-reveal",
    "correction-step",
    "ordinary-completion",
    "rolling-satellite",
    "new-orientation",
    "may-gap",
    "may-single-step",
    "watch-return",
]


def read_storyboard():
    rows = re.findall(
        r"^\| (\d+)–(\d+) s \| .*? \| “(.*?)” \|$",
        STORYBOARD.read_text(),
        re.M,
    )
    assert len(rows) == len(SHOT_NAMES) == 11
    return [
        {"id": index, "shot": SHOT_NAMES[index], "start": float(start), "end": float(end), "text": text}
        for index, (start, end, text) in enumerate(rows)
    ]


def read_cues(path):
    cues = []
    for line in path.read_text().splitlines():
        item = json.loads(line)
        if item["type"] in ("SentenceBoundary", "WordBoundary"):
            start = item["offset"] / 10_000_000
            end = start + item["duration"] / 10_000_000
            cues.append({"start": start, "end": end, "text": item["text"]})
    return cues


def checked_cues(audio, metadata, text):
    length = MP3(audio).info.length
    cues = read_cues(metadata)
    normalize = lambda value: re.sub(r"\W+", " ", value.casefold()).strip()
    assert cues and length > 0
    assert normalize(" ".join(cue["text"] for cue in cues)) == normalize(text)
    # The provider occasionally extends the final boundary a few milliseconds
    # beyond the last MP3 frame and overlaps neighbouring sentence metadata.
    for index, cue in enumerate(cues):
        assert 0 <= cue["start"] < cue["end"] <= length + 0.04
        cue["end"] = min(cue["end"], length)
        if index + 1 < len(cues):
            cue["end"] = min(cue["end"], cues[index + 1]["start"])
        assert cue["start"] < cue["end"]
    return length, cues


def stamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


async def synthesize(rows):
    semaphore = asyncio.Semaphore(3)
    fragments_dir = OUT / "fragments"
    fragments_dir.mkdir(parents=True, exist_ok=True)

    async def render(row):
        async with semaphore:
            stem = f"{row['id']:02d}-{row['shot']}"
            audio = fragments_dir / f"{stem}.mp3"
            metadata = fragments_dir / f"{stem}.jsonl"
            if audio.exists() and metadata.exists():
                try:
                    length, cues = checked_cues(audio, metadata, row["text"])
                    print(f"Reused complete {row['shot']}: {length:.3f}s", flush=True)
                    return {**row, "rawFile": f"/audio/calendar-proof/fragments/{stem}.mp3", "rawDuration": length, "rawCues": cues}
                except Exception:
                    pass
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(
                        row["text"], VOICE, rate=RATE, pitch=PITCH, boundary="SentenceBoundary"
                    ).save(str(audio), str(metadata))
                    length, cues = checked_cues(audio, metadata, row["text"])
                    assert audio.stat().st_size > 1000
                    result = {**row, "rawFile": f"/audio/calendar-proof/fragments/{stem}.mp3", "rawDuration": length, "rawCues": cues}
                    print(f"Synthesized {row['shot']}: {length:.3f}s for {row['end']-row['start']:.0f}s shot", flush=True)
                    return result
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 * (attempt + 1))

    fragments = await asyncio.gather(*(render(row) for row in rows))
    (OUT / "raw-fragments.json").write_text(json.dumps(fragments, indent=2) + "\n")
    return fragments


def assemble(fragments):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    global_cues = []
    shot_cues = []
    previous_end = 0
    with tempfile.TemporaryDirectory(prefix="sky-dweller-calendar-proof-") as temp:
        temp_path = Path(temp)
        parts = []
        for fragment in fragments:
            head_hold = 0.15
            minimum_tail_hold = 0.15
            trim_end = min(fragment["rawDuration"], fragment["rawCues"][-1]["end"] + 0.10)
            # Preserve natural speech, borrowing available visual holds. Only
            # the affected shot boundaries move; later roomy shots absorb it.
            start = max(fragment["start"], previous_end)
            end = max(fragment["end"], start + head_hold + trim_end + minimum_tail_hold)
            if fragment["id"] == len(fragments) - 1:
                end = min(68.0, max(66.0, end))
            window = end - start
            available = window - head_hold - minimum_tail_hold
            speed = max(1.0, trim_end / available)
            if speed > 1.08:
                raise ValueError(f"{fragment['shot']} needs {speed:.3f}x speech; adjust the shot timing instead.")
            speed = round(speed, 6)
            source = ROOT / "public" / fragment["rawFile"].lstrip("/")
            wave = temp_path / f"part-{fragment['id']:02d}.wav"
            sample_count = round(window * 24000)
            filters = (
                f"aresample=24000,atrim=end={trim_end:.6f},asetpts=PTS-STARTPTS,atempo={speed:.6f},"
                f"adelay=150,apad=whole_len={sample_count},atrim=end_sample={sample_count},asetpts=N/SR/TB"
            )
            subprocess.run(
                [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", filters,
                 "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(wave)],
                check=True,
            )
            with wave_codec.open(str(wave)) as pcm:
                assert pcm.getframerate() == 24000 and pcm.getnframes() == sample_count
            parts.append(wave)
            for cue in fragment["rawCues"]:
                global_cues.append({
                    "start": round(start + head_hold + cue["start"] / speed, 3),
                    "end": round(start + head_hold + cue["end"] / speed, 3),
                    "text": cue["text"],
                    "shot": fragment["shot"],
                    "fragmentId": fragment["id"],
                })
            shot_cues.append({
                "id": fragment["id"], "shot": fragment["shot"],
                "start": round(start, 3), "end": round(end, 3), "text": fragment["text"],
                "storyboardStart": fragment["start"], "storyboardEnd": fragment["end"],
                "speechStart": round(start + head_hold + fragment["rawCues"][0]["start"] / speed, 3),
                "speechEnd": round(start + head_hold + fragment["rawCues"][-1]["end"] / speed, 3),
                "playbackRate": speed,
                "rawDuration": round(fragment["rawDuration"], 3),
                "rawFile": fragment["rawFile"],
            })
            previous_end = end
            print(f"Conformed {fragment['shot']}: {window:.3f}s window, {speed:.3f}x speech", flush=True)

        concat = temp_path / "concat.txt"
        concat.write_text("\n".join(f"file '{part.as_posix()}'" for part in parts) + "\n")
        output_audio = OUT / "narration.mp3"
        subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
             "-i", str(concat), "-c:a", "libmp3lame", "-b:a", "96k", "-ar", "24000", "-ac", "1", str(output_audio)],
            check=True,
        )

    length = round(MP3(OUT / "narration.mp3").info.length, 3)
    timeline_length = round(shot_cues[-1]["end"], 3)
    assert 63 <= length <= 68
    assert all(0 <= cue["start"] < cue["end"] <= length for cue in global_cues)
    text = " ".join(fragment["text"] for fragment in fragments)
    manifest = {
        "schemaVersion": 1,
        "generatedAt": "2026-11-10",
        "title": "One midnight. Two advances.",
        "provider": "Microsoft Edge online neural speech via edge-tts 7.3.1",
        "voice": {"id": VOICE, "label": "Sonia", "language": "en-GB", "gender": "female", "rate": RATE, "pitch": PITCH},
        "aiGenerated": True,
        "direction": "Warm, assured, low-register feminine narration with deliberate visual pauses.",
        "file": "/audio/calendar-proof/narration.mp3",
        "duration": length,
        "timelineDuration": timeline_length,
        "totalDuration": length,
        "text": text,
        "cues": global_cues,
        "fragments": shot_cues,
        "chapters": [{"id": 0, "title": "One midnight. Two advances.", "file": "/audio/calendar-proof/narration.mp3", "duration": length, "text": text, "cues": global_cues}],
    }
    serialized = json.dumps(manifest, indent=2) + "\n"
    (OUT / "narration.json").write_text(serialized)
    blocks = ["WEBVTT", ""]
    for index, cue in enumerate(global_cues, 1):
        blocks.extend([str(index), f"{stamp(cue['start'])} --> {stamp(cue['end'])}", cue["text"], ""])
    (OUT / "narration.vtt").write_text("\n".join(blocks) + "\n")
    (OUT / "transcript.txt").write_text(
        "ONE MIDNIGHT. TWO ADVANCES.\nAI-generated female narration\n\n"
        + "\n\n".join(f"{fragment['start']:g}–{fragment['end']:g}s · {fragment['shot']}\n{fragment['text']}" for fragment in shot_cues)
        + "\n"
    )
    print(f"Complete: {length:.3f}s encoded, {timeline_length:.3f}s designed timeline", flush=True)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["all", "synthesize", "assemble"], default="all")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.phase in ("all", "synthesize"):
        fragments = await synthesize(read_storyboard())
    else:
        fragments = json.loads((OUT / "raw-fragments.json").read_text())
    if args.phase in ("all", "assemble"):
        assemble(fragments)


if __name__ == "__main__":
    asyncio.run(main())
