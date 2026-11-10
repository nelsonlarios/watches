"""Generate the researched historical prologue with real sentence timings.

Dependencies: edge-tts==7.3.1, mutagen==1.48.1.
The research document owns the spoken text. This script only writes the
public/audio/prologue assets, retaining the provider's unmodified MP3/JSONL.
"""

import asyncio
import json
import re
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "docs" / "history-prologue.md"
OUT = ROOT / "public" / "audio" / "prologue"
VOICE = "en-GB-SoniaNeural"
RATE = "-12%"
PITCH = "-8Hz"
TITLE = "A century becomes a mechanism"
MOMENTS = [
    "opening-world",
    "oyster-1926",
    "perpetual-1931",
    "gmt-master-1955",
    "sky-dweller-2012",
    "calibre-9001",
    "eclipse-name",
    "celestial-mechanism",
    "invitation",
]
SOURCES = [
    [],
    ["https://www.rolex.com/en-gb/about-rolex/history/1926-1945"],
    ["https://www.rolex.com/en-gb/about-rolex/history/1926-1945",
     "https://www.rolex.org/perpetual/making-history-with-rolex"],
    ["https://www.rolex.com/en-gb/about-rolex/history/1953-1967",
     "https://www.rolex.com/en-us/watches/gmt-master-ii/time-zone-to-time-zone"],
    ["https://www.rolex.com/en-gb/about-rolex/history/2000-2013"],
    ["https://www.thewatch.co.il/image/users/190146/ftp/my_files/ROLEX/Sky-Dweller_EN.pdf#page=2"],
    ["https://eclipse.gsfc.nasa.gov/SEsaros/SEsaros.html"],
    ["https://www.thewatch.co.il/image/users/190146/ftp/my_files/ROLEX/Sky-Dweller_EN.pdf#page=6"],
    [],
]


def normalize(value):
    return re.sub(r"\W+", " ", value.casefold()).strip()


def stamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    secs, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"


def script_paragraphs():
    block = SCRIPT.read_text().split("## Narration", 1)[1].split("## Four milestone captions", 1)[0]
    paragraphs = [line[2:].strip() for line in block.splitlines() if line.startswith("> ")]
    assert len(paragraphs) == len(MOMENTS) == len(SOURCES) == 9
    assert 120 <= len(" ".join(paragraphs).split()) <= 140
    return paragraphs


def read_cues(metadata, duration, text):
    cues = []
    for line in metadata.read_text().splitlines():
        event = json.loads(line)
        if event["type"] == "SentenceBoundary":
            start = event["offset"] / 10_000_000
            end = start + event["duration"] / 10_000_000
            cues.append({"start": round(start, 3), "end": round(end, 3), "text": event["text"]})
    assert cues and normalize(" ".join(cue["text"] for cue in cues)) == normalize(text)
    for index, cue in enumerate(cues):
        # Preserve original JSONL; only normalise slight provider end overlaps
        # in the website manifest, as in the calendar-proof narration pipeline.
        assert 0 <= cue["start"] < cue["end"] <= duration + 0.05
        cue["end"] = min(cue["end"], round(duration, 3))
        if index + 1 < len(cues):
            cue["end"] = min(cue["end"], cues[index + 1]["start"])
        assert cue["start"] < cue["end"]
    return cues


def align_moments(paragraphs, cues):
    moments = []
    cursor = 0
    for index, paragraph in enumerate(paragraphs):
        matching = []
        target = normalize(paragraph)
        while cursor < len(cues):
            candidate = cues[cursor]
            assembled = normalize(" ".join(cue["text"] for cue in [*matching, candidate]))
            assert target.startswith(assembled), (paragraph, assembled)
            matching.append(candidate)
            cursor += 1
            if assembled == target:
                break
        assert matching and normalize(" ".join(cue["text"] for cue in matching)) == target
        moments.append({
            "id": MOMENTS[index], "text": paragraph,
            "start": matching[0]["start"], "end": matching[-1]["end"],
            "sources": SOURCES[index],
        })
    assert cursor == len(cues)
    return moments


async def main():
    paragraphs = script_paragraphs()
    text = " ".join(paragraphs)
    OUT.mkdir(parents=True, exist_ok=True)
    audio = OUT / "narration.mp3"
    metadata = OUT / "narration.jsonl"
    complete = False
    if audio.exists() and metadata.exists():
        try:
            duration = MP3(audio).info.length
            cues = read_cues(metadata, duration, text)
            complete = True
            print("Reusing verified matching narration", flush=True)
        except (AssertionError, ValueError, KeyError, json.JSONDecodeError):
            pass
    if not complete:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(
                    text, VOICE, rate=RATE, pitch=PITCH, boundary="SentenceBoundary"
                ).save(str(audio), str(metadata))
                duration = MP3(audio).info.length
                cues = read_cues(metadata, duration, text)
                break
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 * (attempt + 1))

    assert audio.stat().st_size > 1000 and 45 <= duration <= 70, duration
    moments = align_moments(paragraphs, cues)
    manifest = {
        "schemaVersion": 1,
        "generatedAt": "2026-11-10",
        "title": TITLE,
        "text": text,
        "file": "/audio/prologue/narration.mp3",
        "duration": round(duration, 3),
        "cues": cues,
        "moments": moments,
        "milestones": [
            {**moments[1], "year": 1926, "title": "Oyster", "caption": "A sealed case protects the movement."},
            {**moments[2], "year": 1931, "title": "Perpetual", "caption": "Motion becomes stored energy."},
            {**moments[3], "year": 1955, "title": "GMT-Master", "caption": "Two time zones. One wrist."},
            {**moments[4], "year": 2012, "title": "Sky-Dweller", "caption": "Two time zones meet the annual calendar."},
        ],
        "provider": "Microsoft Edge online neural speech via edge-tts 7.3.1",
        "aiGenerated": True,
        "voice": {"id": VOICE, "language": "en-GB", "gender": "female", "rate": RATE, "pitch": PITCH},
        "sourceScript": "docs/history-prologue.md",
        "scriptWordCount": len(text.split()),
    }
    (OUT / "narration.json").write_text(json.dumps(manifest, indent=2) + "\n")
    blocks = ["WEBVTT", ""]
    for index, cue in enumerate(cues, 1):
        blocks.extend([str(index), f"{stamp(cue['start'])} --> {stamp(cue['end'])}", cue["text"], ""])
    (OUT / "narration.vtt").write_text("\n".join(blocks) + "\n")
    transcript = f"{TITLE.upper()}\nAI-generated female narration · Sonia\n\n"
    transcript += "\n\n".join(
        f"{stamp(moment['start'])}–{stamp(moment['end'])} · {moment['id']}\n{moment['text']}"
        for moment in moments
    )
    (OUT / "transcript.txt").write_text(transcript + "\n")
    print(f"Complete: {duration:.3f}s, {len(cues)} sentence cues, {len(text.split())} words", flush=True)
    for moment in moments:
        print(f"{moment['start']:.3f}–{moment['end']:.3f} {moment['id']}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
