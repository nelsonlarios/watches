"""Generate the month-window explanation with real Sonia sentence boundaries.

Dependencies in /tmp/sky-dweller-audio-venv: edge-tts==7.3.1, mutagen==1.48.1.
Only public/audio/month-windows assets are written. The raw provider metadata
is retained; presentation cues clamp only tiny MP3/provider boundary overshoots.
"""

import asyncio
import json
import re
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "audio" / "month-windows"
VOICE = "en-GB-SoniaNeural"
RATE = "-12%"
PITCH = "-8Hz"
SENTENCES = [
    ("windows-intro", "Those twelve little windows tell you the month."),
    ("month-map", "One o’clock is January, two is February; December is at twelve."),
    ("april-window", "The dark window at four means April."),
    ("dial-lift", "Lift the dial: a separate month ring carries the dark sector beneath."),
    ("sector-through-window", "You see its colour through the opening."),
    ("drive-train", "A toothed section of the date ring drives this intermediate wheel, which turns the month ring."),
    ("monthly-station", "One station per month."),
    ("thirty-degrees", "Thirty degrees."),
    ("april-to-may", "As April thirtieth becomes May first, the dark sector leaves four and appears at five."),
    ("fixed-windows", "The windows stay still; the ring moves underneath."),
]
TEXT = " ".join(text for _, text in SENTENCES)


def normalize(text):
    return re.sub(r"\W+", " ", text.casefold()).strip()


def stamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def build_manifest():
    audio = OUT / "narration.mp3"
    duration = MP3(audio).info.length
    metadata = [json.loads(line) for line in (OUT / "narration.jsonl").read_text().splitlines()]
    boundaries = [item for item in metadata if item["type"] == "SentenceBoundary"]
    assert len(boundaries) == len(SENTENCES), "Unexpected sentence segmentation; inspect provider metadata."
    assert 30 <= duration <= 50, f"Unexpected narration duration: {duration:.3f}s"
    cues = []
    for index, (item, (shot, expected)) in enumerate(zip(boundaries, SENTENCES)):
        assert normalize(item["text"]) == normalize(expected), f"Sentence mismatch at {shot}."
        start = item["offset"] / 10_000_000
        end = start + item["duration"] / 10_000_000
        assert 0 <= start < end <= duration + 0.04, "Boundary exceeds small provider/MP3 tolerance."
        end = min(end, duration)
        if index + 1 < len(boundaries):
            end = min(end, boundaries[index + 1]["offset"] / 10_000_000)
        assert start < end
        cues.append({"id": index, "shot": shot, "start": round(start, 3), "end": round(end, 3), "text": item["text"]})
    assert normalize(" ".join(cue["text"] for cue in cues)) == normalize(TEXT)
    manifest = {
        "schemaVersion": 1,
        "title": "The twelve month windows",
        "text": TEXT,
        "file": "/audio/month-windows/narration.mp3",
        "duration": round(duration, 3),
        "provider": "Microsoft Edge online neural speech via edge-tts 7.3.1",
        "aiGenerated": True,
        "voice": {"id": VOICE, "label": "Sonia", "language": "en-GB", "gender": "female", "rate": RATE, "pitch": PITCH},
        "cues": cues,
    }
    (OUT / "narration.json").write_text(json.dumps(manifest, indent=2) + "\n")
    vtt = ["WEBVTT", ""]
    for index, cue in enumerate(cues, 1):
        vtt.extend([str(index), f"{stamp(cue['start'])} --> {stamp(cue['end'])}", cue["text"], ""])
    (OUT / "narration.vtt").write_text("\n".join(vtt) + "\n")
    (OUT / "transcript.txt").write_text(
        "THE TWELVE MONTH WINDOWS\nAI-generated female narration · Sonia\n\n"
        + TEXT + "\n\n"
        + "\n".join(f"{cue['start']:.3f}–{cue['end']:.3f}s · {cue['shot']}\n{cue['text']}\n" for cue in cues)
    )
    print(f"Complete: {duration:.3f}s, {len(TEXT.split())} words, {len(cues)} validated sentence cues", flush=True)
    for cue in cues:
        print(f"{cue['start']:6.3f}–{cue['end']:6.3f} {cue['shot']}", flush=True)


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(
                TEXT, VOICE, rate=RATE, pitch=PITCH, boundary="SentenceBoundary"
            ).save(str(OUT / "narration.mp3"), str(OUT / "narration.jsonl"))
            build_manifest()
            return
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2 * (attempt + 1))


if __name__ == "__main__":
    asyncio.run(main())
