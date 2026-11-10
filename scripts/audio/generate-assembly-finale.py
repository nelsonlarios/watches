"""Sonia's four-part assembly finale, aligned to the film's key moments.

The 380 count applies to the original calibre 9001 movement. This script only
produces narration audio and timing data; it makes no CAD reconstruction claim.
"""

import asyncio
import json
import math
import subprocess
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np
from mutagen.mp3 import MP3

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/audio/assembly-finale'
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
RATE=24000
VOICE='en-GB-SoniaNeural'
PASSAGES=[
    ('components',.25,'Every wheel. Every spring. Every bridge and screw. Each has a place in this little universe.'),
    ('convergence',11.5,'And now... everything comes together.'),
    ('movement-count',20.0,'Three hundred and eighty components, united in calibre nine thousand and one.'),
    ('beauty',29.0,'One extraordinary watch. A world on your wrist.'),
]


def decode(path):
    r=subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-i',str(path),'-f','f32le','-acodec','pcm_f32le','-ac','1','-ar',str(RATE),'-'],check=True,capture_output=True)
    return np.frombuffer(r.stdout,dtype='<f4').copy()


def read_cues(path,length):
    cues=[]
    for line in path.read_text().splitlines():
        event=json.loads(line)
        if event['type']=='SentenceBoundary':
            start=event['offset']/10_000_000
            end=start+event['duration']/10_000_000
            assert 0<=start<end<=length+.04
            cues.append(dict(start=start,end=min(end,length),text=event['text']))
    for index,cue in enumerate(cues[:-1]):cue['end']=min(cue['end'],cues[index+1]['start'])
    return cues


def stamp(seconds):
    millis=round(seconds*1000);h,millis=divmod(millis,3600000);m,millis=divmod(millis,60000);s,millis=divmod(millis,1000)
    return f'{h:02d}:{m:02d}:{s:02d}.{millis:03d}'


async def main():
    fragments=OUT/'fragments';fragments.mkdir(parents=True,exist_ok=True)
    semaphore=asyncio.Semaphore(2)

    async def synthesize(index,item):
        name,target,text=item
        audio=fragments/f'{index:02d}-{name}.mp3';metadata=audio.with_suffix('.jsonl')
        async with semaphore:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text,VOICE,rate='-12%',pitch='-8Hz',boundary='SentenceBoundary').save(str(audio),str(metadata))
                    length=MP3(audio).info.length
                    cues=read_cues(metadata,length)
                    assert cues and audio.stat().st_size>1000
                    print(f'{name}: {length:.3f}s source, entrance {target:.3f}s',flush=True)
                    return dict(id=name,target=target,text=text,audio=audio,cues=cues,length=length)
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2)

    parts=await asyncio.gather(*(synthesize(i,p) for i,p in enumerate(PASSAGES)))
    final_end=parts[-1]['target']+parts[-1]['cues'][-1]['end']-parts[-1]['cues'][0]['start']+.35
    duration=max(36.0,math.ceil(final_end*100)/100)
    master=np.zeros(round(duration*RATE),dtype=np.float32)
    global_cues=[];passages=[]
    for i,part in enumerate(parts):
        offset=part['target']-part['cues'][0]['start']
        speech_end=offset+part['cues'][-1]['end']
        if i+1<len(parts) and speech_end+.1>parts[i+1]['target']:
            raise ValueError(f"Natural speech in {part['id']} overruns the next entrance; conform picture instead of squeezing voice.")
        samples=decode(part['audio'])
        start=round(offset*RATE)
        assert start>=0
        stop=min(len(master),start+len(samples))
        master[start:stop]+=samples[:stop-start]
        for cue in part['cues']:
            global_cues.append(dict(start=round(offset+cue['start'],3),end=round(offset+cue['end'],3),text=cue['text'],passage=part['id']))
        passages.append(dict(id=part['id'],text=part['text'],start=part['target'],end=round(speech_end,3),
                             sourceFile='/audio/assembly-finale/fragments/'+part['audio'].name,sourceDuration=round(part['length'],3)))
    assert np.max(np.abs(master))<.95
    audio=OUT/'narration.mp3'
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-f','f32le','-ar',str(RATE),'-ac','1','-i','pipe:0',
                    '-c:a','libmp3lame','-b:a','128k','-write_xing','1','-metadata','title=A universe, assembled',str(audio)],
                   input=master.astype('<f4').tobytes(),check=True)
    decoded=decode(audio)
    decoded_duration=len(decoded)/RATE
    assert abs(decoded_duration-duration)<.001
    assert all(0<=cue['start']<cue['end']<=duration for cue in global_cues)
    manifest=dict(title='A universe, assembled',text=' '.join(p[2] for p in PASSAGES),file='/audio/assembly-finale/narration.mp3',duration=duration,
                  decodedDuration=decoded_duration,encodedDuration=round(MP3(audio).info.length,3),aiGenerated=True,
                  voice=dict(id=VOICE,rate='-12%',pitch='-8Hz',language='en-GB'),
                  cues=global_cues,passages=passages,markers=dict(assemblyStart=0,convergenceStart=3,countReveal=20,beautyStart=29),
                  subject=dict(calibre='9001',movementComponentCount=380,countAppliesTo='movement'),
                  rms=round(float(np.sqrt(np.mean(decoded.astype(np.float64)**2))),6),peak=round(float(np.max(np.abs(decoded))),6))
    (OUT/'narration.json').write_text(json.dumps(manifest,indent=2)+'\n')
    blocks=['WEBVTT','']
    for i,cue in enumerate(global_cues,1):blocks.extend([str(i),f"{stamp(cue['start'])} --> {stamp(cue['end'])}",cue['text'],''])
    (OUT/'narration.vtt').write_text('\n'.join(blocks)+'\n')
    (OUT/'transcript.txt').write_text('A UNIVERSE, ASSEMBLED\nAI-generated female narration\n\n'+'\n\n'.join(f"{p['start']:.3f}–{p['end']:.3f}s\n{p['text']}" for p in passages)+'\n')
    print(json.dumps(dict(duration=duration,passages=passages),indent=2),flush=True)


if __name__=='__main__':asyncio.run(main())
