"""Render the four commissioned original cues, shape their film dynamics,
and write measured local MP3 assets plus a playback/credits manifest.

Run compose-score.py first. The native renderer uses installed Apple factory
instruments and a temporary FluidR3 bank. Sample banks never enter public/.
"""

import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from mutagen.mp3 import MP3

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'public/audio/score'
WORK=Path('/tmp/sky-dweller-orchestra')
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
SWIFT=WORK/'render-orchestra'
SAMPLE_RATE=44100
NAMES=['heritage','calendar','voyage','assembly']
TARGET_RMS=dict(heritage=.105,calendar=.082,voyage=.092,assembly=.120)
VOICE_GAIN=dict(heritage=.40,calendar=.32,voyage=.32,assembly=.285)
VOICE_LUFS=dict(heritage=-19.02,calendar=-19.25,voyage=-19.0,assembly=-18.92)
SEGMENTS={
    'heritage':[
        dict(act='history',offset=0,duration=61.176),
        dict(act='invitation',offset=61.176,duration=12.792),
        dict(act='energy',offset=73.968,duration=12.792),
    ],
    'calendar':[dict(act='calendar',offset=0,duration=67.440)],
    'voyage':[
        dict(act='month-windows',offset=0,duration=40.032),
        dict(act='travel',offset=40.032,duration=15.480),
        dict(act='ring-command',offset=55.512,duration=17.688),
    ],
    'assembly':[dict(act='assembly',offset=0,duration=36.000)],
}


def decode(path):
    r=subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-i',str(path),'-f','f32le','-acodec','pcm_f32le','-ac','2','-ar',str(SAMPLE_RATE),'-'],check=True,capture_output=True)
    return np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).copy()


def loudness(path):
    r=subprocess.run([FFMPEG,'-hide_banner','-i',str(path),'-af','loudnorm=I=-20:TP=-1.5:LRA=14:print_format=json','-f','null','-'],check=True,capture_output=True,text=True)
    start=r.stderr.rfind('{')
    data=json.loads(r.stderr[start:r.stderr.rfind('}')+1])
    return dict(integratedLUFS=float(data['input_i']),truePeakDBTP=float(data['input_tp']),loudnessRangeLU=float(data['input_lra']))


def render(name,force=False):
    score=json.loads((HERE/f'{name}.json').read_text())
    raw=WORK/f'{name}.wav'
    if force or not raw.exists():
        subprocess.run([str(SWIFT),str(HERE/f'{name}.json'),str(raw)],check=True)
    audio=decode(raw)
    total=round(score['duration']*SAMPLE_RATE)
    assert len(audio)==total,(name,len(audio),total)
    points=np.array(score['envelope'],dtype=np.float64)
    time=np.arange(total,dtype=np.float64)/SAMPLE_RATE
    envelope=np.interp(time,points[:,0],points[:,1])
    edge=min(round(.08*SAMPLE_RATE),total//4)
    envelope[:edge]*=np.linspace(0,1,edge)
    envelope[-edge:]*=np.linspace(1,0,edge)
    if name=='calendar':
        envelope[(time>=51)&(time<57)]=0
    audio*=envelope[:,None]
    raw_rms=float(np.sqrt(np.mean(audio.astype(np.float64)**2)))
    raw_peak=float(np.max(np.abs(audio)))
    assert raw_rms>.0001 and raw_peak>0
    gain=min(TARGET_RMS[name]/raw_rms,.86/raw_peak)
    audio*=gain
    destination=OUT/f'{name}.mp3'
    subprocess.run(
        [FFMPEG,'-hide_banner','-loglevel','error','-y','-f','f32le','-ar',str(SAMPLE_RATE),'-ac','2','-i','pipe:0',
         '-c:a','libmp3lame','-b:a','256k','-write_xing','1','-id3v2_version','3',
         '-metadata',f"title={score['title']}",'-metadata','artist=Original Sky-Dweller film score',str(destination)],
        input=audio.astype('<f4').tobytes(),check=True,
    )
    decoded=decode(destination)
    rms=float(np.sqrt(np.mean(decoded.astype(np.float64)**2)))
    peak=float(np.max(np.abs(decoded)))
    assert rms>.005 and peak<.995,(name,rms,peak)
    measures=loudness(destination)
    windows=[]
    for start in range(0,int(score['duration']),5):
        clip=decoded[start*SAMPLE_RATE:min((start+5)*SAMPLE_RATE,len(decoded))]
        windows.append(dict(start=start,end=min(start+5,score['duration']),rms=round(float(np.sqrt(np.mean(clip.astype(np.float64)**2))),6)))
    silence=None
    if name=='calendar':
        silence=float(np.sqrt(np.mean(decoded[round(51.1*SAMPLE_RATE):round(56.9*SAMPLE_RATE)].astype(np.float64)**2)))
        assert silence<.00001,silence
    item=dict(id=name,title=score['title'],file=f'/audio/score/{name}.mp3',duration=score['duration'],timelineDuration=score['duration'],
              encodedDuration=round(MP3(destination).info.length,6),decodedDuration=round(len(decoded)/SAMPLE_RATE,6),
              bytes=destination.stat().st_size,sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),
              rms=round(rms,6),peak=round(peak,6),peakDBFS=round(20*math.log10(peak),3),
              gainApplied=round(gain,6),targetRMS=TARGET_RMS[name],**measures,
              narrationReferenceRMS=.110,narrationReferenceLUFS=VOICE_LUFS[name],
              recommendedVoiceGain=VOICE_GAIN[name],recommendedNoVoiceGain=.7,
              voiceRelativeMusicDBAtGain032=round(20*math.log10(rms*.32/.110),2),
              voiceRelativeMusicLUFSAtRecommendedGain=round(measures['integratedLUFS']+20*math.log10(VOICE_GAIN[name])-VOICE_LUFS[name],2),
              segments=SEGMENTS[name],markers=score['markers'],fiveSecondRMS=windows,
              instruments=[tr['id'] for tr in score['tracks']],midiSource=f'scripts/audio/music/{name}.mid')
    if silence is not None:item['gapSilenceRMS']=silence
    print(f"MASTERED {name}: {score['duration']:.3f}s, RMS {rms:.3f}, peak {peak:.3f}, {measures['integratedLUFS']}LUFS",flush=True)
    return item


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--force-render',action='store_true');args=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True);WORK.mkdir(parents=True,exist_ok=True)
    cues=[]
    for name in NAMES:
        cues.append(render(name,args.force_render))
        # Publish measured cue availability as each asset finishes.
        manifest=dict(title='The Traveller’s Little Universe — original orchestral film score',
                      generatedAt='2026-11-10',originalComposition=True,budgetSpent=0,sampleRate=SAMPLE_RATE,
                      format='Stereo MP3, 256kbps',totalTimelineDuration=263.400,
                      renderer='Apple AVAudioEngine offline + AVAudioUnitSampler',
                      sourceBanksRedistributed=False,cues=cues,
                      sourceCredits=[
                          dict(name='Installed Apple Logic factory orchestral samples',usage='String ensemble, French horns, full brass, solo flute; only original performed soundtrack is distributed.',url='https://support.apple.com/en-us/101908'),
                          dict(name='FluidR3',author='Frank Wen and contributors',usage='Harp, celesta, choir, cello, bass, tremolo, pizzicato, timpani and orchestral percussion. Bank remains outside the site.',
                               source='https://ftp.osuosl.org/pub/musescore/soundfont/fluid-soundfont.tar.gz',licenseReference='https://musescore.org/en/handbook/2/soundfonts-and-sfz-files',
                               archiveReadme='Original archive README declares release to the public domain on 25 December 2001; MuseScore describes FluidR3 as MIT licensed.'),
                      ])
        (OUT/'score-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    assert abs(sum(c['duration'] for c in cues)-263.4)<.00001
    print('Complete: four original orchestral cues; 263.400s film timeline.',flush=True)


if __name__=='__main__':main()
