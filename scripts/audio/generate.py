"""Generate the original Sky-Dweller prototype narration.

Run in an isolated environment with edge-tts==7.3.1 and mutagen==1.48.1.
No credentials are stored or needed. Audio is generated through Microsoft Edge's
online speech service; generated files are served locally by the website.
"""

import asyncio
import json
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3


OUT = Path(__file__).resolve().parents[2] / "public" / "audio"
VOICE = "en-GB-SoniaNeural"
RATE = "-12%"
PITCH = "-8Hz"

CHAPTERS = [
    (
        "The awakening",
        "Come closer. Beyond the hands, beneath the sapphire, a little universe "
        "is waiting. Tonight, we will follow its heartbeat... and watch a "
        "traveller's companion come to life.",
    ),
    (
        "A living heartbeat",
        "A sweep of the rotor winds the mainspring, storing the energy of your "
        "movement. That energy travels through the gears. The balance and its "
        "blue hairspring give the watch its rhythm.",
    ),
    (
        "The celestial calendar",
        "Meet Saros. Inspired by the sky, its orbiting gears remember the "
        "changing months. Thirty days, or thirty-one: the calendar knows the "
        "difference. Only February asks for your help, with a correction on "
        "the first of March.",
    ),
    (
        "Two worlds, one journey",
        "Every traveller carries two worlds. The central hands follow local "
        "time. The twenty-four-hour disc keeps a reference time, perhaps the "
        "place you call home. Change the local hour... and home stays with you.",
    ),
    (
        "The secret of the ring",
        "Now, turn the bezel. Calendar. Local time. Reference time. Each "
        "position selects a different function. The crown makes the "
        "adjustment. A simple gesture opens a remarkably intricate mechanical world.",
    ),
    (
        "A universe, assembled",
        "And now, everything finds its place. Wheels, bridges, hands, and "
        "light. A universe of tiny decisions becomes one extraordinary watch. "
        "The Sky-Dweller. Ready for wherever your story takes you next.",
    ),
]

AUDITIONS = [
    ("sonia", "en-GB-SoniaNeural", "Velvet British", "-12%", "-8Hz"),
    ("jenny", "en-US-JennyNeural", "Warm American", "-12%", "-10Hz"),
    ("aria", "en-US-AriaNeural", "Intimate American", "-15%", "-6Hz"),
]
AUDITION_TEXT = (
    "Come closer. A little universe is waking up. Let me show you its secrets."
)


def duration(path):
    return round(MP3(path).info.length, 3)


def read_cues(path):
    cues = []
    for line in path.read_text().splitlines():
        item = json.loads(line)
        if item["type"] in ("SentenceBoundary", "WordBoundary"):
            start = item["offset"] / 10_000_000
            end = start + item["duration"] / 10_000_000
            cues.append({"start": round(start, 3), "end": round(end, 3), "text": item["text"]})
    return cues


async def synthesize(stem, text, voice=VOICE, rate=RATE, pitch=PITCH):
    audio = OUT / f"{stem}.mp3"
    metadata = OUT / f"{stem}.jsonl"
    await edge_tts.Communicate(
        text, voice, rate=rate, pitch=pitch, boundary="SentenceBoundary"
    ).save(str(audio), str(metadata))
    assert audio.stat().st_size > 1000
    record = {"file": f"/audio/{stem}.mp3", "duration": duration(audio), "cues": read_cues(metadata)}
    print(f"Generated {stem}: {record['duration']}s", flush=True)
    return record


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(3)

    async def chapter(index, title, text):
        async with semaphore:
            item = await synthesize(f"chapter-{index}", text)
            return {"id": index, "title": title, "text": text, **item}

    chapters = await asyncio.gather(
        *(chapter(i, title, text) for i, (title, text) in enumerate(CHAPTERS))
    )
    auditions = []
    for name, voice, label, rate, pitch in AUDITIONS:
        audio = OUT / f"audition-{name}.mp3"
        if name == "sonia" and audio.exists():
            item = {"file": f"/audio/audition-{name}.mp3", "duration": duration(audio)}
        else:
            item = await synthesize(f"audition-{name}", AUDITION_TEXT, voice, rate, pitch)
        auditions.append({"id": name, "voice": voice, "label": label, **item})
    manifest = {
        "generatedAt": "2026-11-10",
        "provider": "Microsoft Edge online neural speech via edge-tts 7.3.1",
        "voice": {"id": VOICE, "label": "Sonia", "language": "en-GB", "gender": "female", "rate": RATE, "pitch": PITCH},
        "direction": "Warm, low, intimate storytelling; softly paced and curious.",
        "aiGenerated": True,
        "totalDuration": round(sum(c["duration"] for c in chapters), 3),
        "chapters": chapters,
        "auditions": auditions,
    }
    (OUT / "narration.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (OUT.parent.parent / "app" / "narration.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (OUT / "transcript.txt").write_text(
        "SKY-DWELLER — THE TRAVELLER'S LITTLE UNIVERSE\nAI-generated narration\n\n"
        + "\n\n".join(f"{i + 1}. {title}\n{text}" for i, (title, text) in enumerate(CHAPTERS))
        + "\n"
    )
    print(f"Total narration: {manifest['totalDuration']}s", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
