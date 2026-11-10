"""Original orchestral scoring for the Sky-Dweller film.

Writes four composed MIDI/event scores. Instruments are played from sampled
Logic factory EXS24 instruments and FluidR3. No existing music or audio loop
is quoted. The companion Swift renderer performs all notes offline.
"""

import json
import math
import random
from pathlib import Path

import mido

HERE = Path(__file__).resolve().parent
ORCHESTRA = Path('/Library/Application Support/Logic/Sampler Instruments/09 Orchestral')
SOUND_FONT = '/tmp/sky-dweller-orchestra/FluidR3_GM.sf2'
RNG = random.Random(2012326939)

TRACKS = [
    dict(id='strings', program=48, instrument=str(ORCHESTRA/'09 Strings/String Ensemble.exs'), gainDB=-12, pan=-22),
    dict(id='tremolo', program=44, instrument=None, gainDB=-20, pan=25),
    dict(id='cello', program=42, instrument=None, gainDB=-12, pan=-12),
    dict(id='bass', program=43, instrument=None, gainDB=-14, pan=5),
    dict(id='horns', program=60, instrument=str(ORCHESTRA/'02 Brass/French Horns Legato.exs'), gainDB=-12, pan=22),
    dict(id='brass', program=61, instrument=str(ORCHESTRA/'02 Brass/Full Brass Legato.exs'), gainDB=-18, pan=12),
    dict(id='harp', program=46, instrument=None, gainDB=-12, pan=-30),
    dict(id='celesta', program=8, instrument=None, gainDB=-18, pan=28),
    dict(id='choir', program=52, instrument=None, gainDB=-19, pan=0),
    dict(id='flute', program=73, instrument=str(ORCHESTRA/'01 Woodwinds/Flute Solo Legato.exs'), gainDB=-16, pan=-8),
    dict(id='timpani', program=47, instrument=None, gainDB=-13, pan=5),
    dict(id='percussion', program=0, instrument=None, percussion=True, gainDB=-18, pan=18),
    dict(id='pizzicato', program=45, instrument=None, gainDB=-14, pan=18),
]

CHORDS = {
    'Dm': [50, 57, 62, 65, 69],
    'Dm9': [50, 57, 62, 65, 69, 76],
    'Bb': [46, 53, 58, 62, 65],
    'F': [41, 53, 57, 60, 65],
    'C': [48, 55, 60, 64, 67],
    'Gm': [43, 55, 58, 62, 67],
    'Am': [45, 57, 60, 64, 69],
    'A7': [45, 57, 61, 64, 67],
    'D': [50, 57, 62, 66, 69],
    'G': [43, 55, 59, 62, 67],
    'Asus': [45, 57, 62, 64, 69],
}


class Cue:
    def __init__(self, name, title, duration, markers, envelope):
        self.name, self.title, self.duration = name, title, duration
        self.markers, self.envelope = markers, envelope
        self.events = []

    def note(self, track, time, pitch, duration, velocity, human=True):
        if time < 0 or time >= self.duration or duration <= 0:
            return
        start = max(0, time + (RNG.uniform(-.008, .008) if human else 0))
        end = min(self.duration-.05, start+duration)
        if end <= start:
            return
        velocity = max(1, min(120, round(velocity + (RNG.uniform(-3, 3) if human else 0))))
        self.events.extend([
            dict(time=round(start, 6), track=track, kind='on', note=int(pitch), velocity=velocity),
            dict(time=round(end, 6), track=track, kind='off', note=int(pitch)),
        ])

    def chord(self, track, time, pitches, duration, velocity, spread=.009):
        for index, pitch in enumerate(pitches):
            self.note(track, time+index*spread, pitch, duration, velocity, True)

    def expression(self, track, start, end, low=58, high=105):
        steps=max(3, round((end-start)*4))
        for i in range(steps+1):
            self.events.append(dict(time=round(start+(end-start)*i/steps, 6), track=track, kind='cc', controller=11, value=round(low+(high-low)*i/steps)))

    def foundation(self, start, end, chord, strength=55, brass=False, choir=False):
        notes=CHORDS[chord]
        duration=max(.1,end-start-.12)
        self.chord('strings', start, notes[1:], duration, strength)
        self.note('cello', start+.015, notes[0], duration, strength-4)
        self.note('bass', start+.03, notes[0]-12, duration, strength-9)
        if brass:
            self.chord('horns', start+.04, [notes[0]+12, notes[2], notes[3]], duration-.1, strength-4)
        if choir:
            self.chord('choir', start+.13, [notes[2],notes[3],notes[4]], max(.1,duration-.2), strength-5)

    def arpeggio(self, start, end, chord, step=.5, velocity=52, track='harp', octave=0, pattern=None):
        notes=CHORDS[chord]
        pitches=pattern or [notes[0]+12, notes[1]+12, notes[2]+12, notes[3]+12, notes[4]+12, notes[2]+24]
        count=math.ceil((end-start)/step)
        for i in range(count):
            t=start+i*step
            if t>=end-.1:
                break
            pitch=pitches[i%len(pitches)]+octave
            accent=5 if i%3==0 else -3 if i%3==2 else 0
            self.note(track,t,pitch,min(.85,step*1.65),velocity+accent)

    def motif(self, start, step=.58, major=False, track='horns', velocity=74, octave=0):
        notes=([62,69,74,73,69,67,66,62] if major else [62,69,72,69,65,67,64,62])
        lengths=[.92,.92,1.7,.9,.9,.9,.9,1.8]
        t=start
        for pitch,length in zip(notes,lengths):
            self.note(track,t,pitch+octave,step*length*.92,velocity)
            t+=step*length

    def roll(self, start, end, pitch=38, low=38, high=100, step=.14):
        count=max(2,math.ceil((end-start)/step))
        for i in range(count):
            t=start+(end-start)*i/count
            self.note('timpani',t,pitch+(7 if i%4==3 else 0),step*.8,low+(high-low)*i/count)

    def crash(self, time, velocity=70):
        self.note('percussion',time,49,1.2,velocity,False)

    def save(self):
        for track in TRACKS:
            self.events.append(dict(time=self.duration-.03,track=track['id'],kind='cc',controller=123,value=0))
        self.events.sort(key=lambda e:(e['time'],0 if e['kind']=='off' else 1))
        data=dict(title=self.title,duration=self.duration,soundFont=SOUND_FONT,reverb=24,tracks=TRACKS,events=self.events,
                  envelope=self.envelope,markers=self.markers)
        (HERE/f'{self.name}.json').write_text(json.dumps(data,indent=2)+'\n')
        midi=mido.MidiFile(ticks_per_beat=480)
        meta=mido.MidiTrack();meta.append(mido.MetaMessage('set_tempo',tempo=500000,time=0));midi.tracks.append(meta)
        channel_counter=0
        for tr in TRACKS:
            channel=9 if tr.get('percussion') else channel_counter
            if not tr.get('percussion'):
                channel_counter+=1
                if channel_counter==9:channel_counter+=1
            track=mido.MidiTrack();midi.tracks.append(track)
            track.append(mido.MetaMessage('track_name',name=tr['id']))
            track.append(mido.Message('program_change',program=tr['program'],channel=channel,time=0))
            last=0
            for event in [e for e in self.events if e['track']==tr['id']]:
                tick=round(event['time']*960);delta=tick-last;last=tick
                if event['kind']=='cc':msg=mido.Message('control_change',channel=channel,control=event['controller'],value=event['value'],time=delta)
                else:msg=mido.Message('note_on' if event['kind']=='on' else 'note_off',channel=channel,note=event['note'],velocity=event.get('velocity',0),time=delta)
                track.append(msg)
        midi.save(HERE/f'{self.name}.mid')
        print(self.name,self.duration,'seconds',len(self.events),'events')


def heritage():
    c=Cue('heritage','From history to a living heartbeat',86.760,
          [dict(time=28.182,label='2012 reveal: full warm brass and major-key arrival'),dict(time=40.923,label='Eclipse: orchestral breath and choir'),dict(time=45.185,label='Mechanism: harp and pizzicato motion'),dict(time=54.801,label='Invitation: soften to an intimate melody'),dict(time=61.176,label='Act 1 invitation'),dict(time=73.968,label='Act 2 energy')],
          [[0,0],[1.4,.48],[17,.66],[23,.82],[27.5,.95],[28.182,1],[33,.8],[39.9,.5],[40.923,.1],[43,.36],[45.185,.65],[52,.58],[54.801,.3],[61.176,.36],[73.968,.52],[82,.7],[85.4,.4],[86.76,.12]])
    segments=[(0,6,'Dm9',44),(6,12,'Bb',46),(12,18,'F',50),(18,23,'Gm',55),(23,28.182,'A7',64),
              (28.182,34,'D',90),(34,40.923,'G',65),(40.923,45.185,'Dm9',35),
              (45.185,50,'Dm',49),(50,54.801,'Asus',48),(54.801,61.176,'Dm9',38),
              (61.176,67.5,'Dm9',42),(67.5,73.968,'Bb',46),(73.968,78,'Gm',48),(78,82,'A7',52),(82,86.76,'Dm9',46)]
    for i,(start,end,chord,v) in enumerate(segments):
        c.foundation(start,end,chord,v,brass=i in [4,5,6],choir=i in [5,6,7])
        if i not in [7,10]:c.arpeggio(start+.18,end-.2,chord,.62 if i<3 else .32 if i in [3,4,8,9,13,14] else .48,v-8)
        if i in [3,4,8,9,13,14]:
            c.arpeggio(start+.1,end-.1,chord,.5,v-12,'pizzicato',-12,pattern=[CHORDS[chord][0]+12,CHORDS[chord][1]+12,CHORDS[chord][2]+12,CHORDS[chord][1]+12])
    c.motif(1.8,.79,False,'flute',49,12)
    c.motif(13.1,.72,False,'strings',56,12)
    c.motif(23.2,.56,False,'horns',74)
    c.motif(28.182,.62,True,'horns',88)
    c.roll(24.7,28.08,38,32,92,.12);c.crash(28.182,73)
    c.chord('brass',28.182,[50,57,62,66],4.6,80)
    c.note('timpani',28.182,38,1.1,105,False)
    c.motif(34.6,.7,True,'flute',59,12)
    c.chord('celesta',41.06,[74,77,81,88],2.9,36,.18)
    c.motif(55.4,.7,False,'flute',44,12)
    c.motif(64.3,.72,False,'celesta',44,12)
    c.motif(75,.58,False,'cello',57,0)
    for track in ['strings','horns','brass']:
        c.expression(track,20,28,50,115)
        c.expression(track,30,39,105,66)
    c.save()


def calendar():
    c=Cue('calendar','The tooth, the encounter, the gap',67.440,
          [dict(time=21.9,label='Release breath: score cuts out'),dict(time=22.7,label='Correction contact: small warm harp answer'),dict(time=29.2,label='Ordinary contact: second part of the same gesture'),dict(time=35,label='The orbit: moving harp figure'),dict(time=51,label='May gap: silence through 56.85'),dict(time=57,label='One ordinary step'),dict(time=60.948,label='Return to the complete watch')],
          [[0,.2],[.6,.56],[11,.48],[20.9,.5],[21.9,0],[22.5,0],[23,.6],[29.2,.72],[32,.46],[35,.6],[44,.54],[49.8,.42],[51,0],[57,0],[57.2,.5],[60.948,.73],[64.9,.6],[67.44,0]])
    segments=[(0,5.8,'Dm9',42),(5.8,11.6,'Bb',42),(11.6,16.2,'Dm',40),(16.2,21,'Gm',42),
              (22.65,29,'Dm',48),(29,35,'F',47),(35,41,'Bb',46),(41,44,'C',46),(44,49.8,'Gm',43),
              (57,60.948,'Dm',40),(60.948,65.8,'D',48)]
    for i,(start,end,chord,v) in enumerate(segments):
        c.foundation(start,end,chord,v,choir=i==10)
        c.arpeggio(start+.2,end-.2,chord,.62 if i<4 else .42 if i in [6,7,8] else .75,v-9)
        if i in [0,1,2,3,6,7,8]:c.arpeggio(start+.35,end-.2,chord,.9,v-13,'pizzicato',-12)
    c.chord('tremolo',18,[62,65,69],2.4,40)
    c.expression('tremolo',18,20.8,45,84)
    c.note('harp',22.65,62,.8,63,False);c.note('harp',22.84,69,.9,59,False)
    c.note('harp',29.15,65,1.1,62,False);c.note('celesta',29.3,77,1.1,43,False)
    c.motif(36.2,.58,False,'flute',43,12)
    c.note('harp',57.18,62,1.1,55,False)
    c.chord('celesta',60.948,[74,78,81],2.8,42,.14)
    c.motif(61.1,.42,True,'flute',44,12)
    c.save()


def voyage():
    c=Cue('voyage','Twelve windows and two skies',73.200,
          [dict(time=0,label='Month windows: lyrical harp and strings'),dict(time=40.032,label='Travel: major-key melody and warmer horns'),dict(time=55.512,label='Ring Command: three playful plucked gestures'),dict(time=70,label='Leave space for the assembly transition')],
          [[0,.12],[.7,.55],[15,.62],[30,.55],[39,.45],[40.032,.68],[52,.62],[55.512,.5],[68,.48],[71,.36],[73.2,.12]])
    chords=['Dm9','Bb','F','C','Gm','Dm','Bb','C','Am','Bb','Gm','A7']
    span=40.032/12
    for i,chord in enumerate(chords):
        start=i*span;end=(i+1)*span
        c.foundation(start,end,chord,43+4*(i%3==0),choir=i in [4,8])
        c.arpeggio(start+.12,end-.05,chord,span/6,46)
        if i%3==0:c.note('celesta',start+.16,CHORDS[chord][3]+24,1.1,42)
    c.motif(2.1,.72,False,'flute',48,12)
    c.motif(15.4,.67,False,'strings',51,12)
    c.motif(29,.73,False,'flute',46,12)
    for start,end,chord in [(40.032,44.5,'D'),(44.5,48,'G'),(48,51.5,'D'),(51.5,55.512,'Asus')]:
        c.foundation(start,end,chord,51,brass=True)
        c.arpeggio(start+.17,end-.1,chord,.68,42)
    c.motif(40.6,.72,True,'horns',58)
    for start,end,chord in [(55.512,60,'Dm'),(60,64,'Bb'),(64,68,'Asus'),(68,73.2,'Dm9')]:
        c.foundation(start,end,chord,42)
        c.arpeggio(start+.12,end-.1,chord,.42,43,'pizzicato',-12)
        c.arpeggio(start+.3,end-.1,chord,.68,38)
    for t,n in [(58.05,74),(59.65,77),(61.25,81)]:c.note('celesta',t,n,.7,47,False)
    c.save()


def assembly():
    c=Cue('assembly','A universe, assembled',17.280,
          [dict(time=0,label='Reassembly begins: rising string figures'),dict(time=6.7,label='Brass and timpani crescendo'),dict(time=9,label='Full orchestral arrival'),dict(time=12.8,label='Cadential lift'),dict(time=14.75,label='Final major-key resolution'),dict(time=16.7,label='Natural final decay')],
          [[0,.26],[1,.48],[4,.63],[6.7,.78],[9,1],[12,.95],[14.75,.9],[15.8,.68],[16.7,.26],[17.28,0]])
    segments=[(0,2.22,'Dm',56),(2.22,4.44,'Bb',61),(4.44,6.66,'Gm',66),(6.66,8.89,'A7',73),
              (8.89,11.11,'D',88),(11.11,13.33,'G',82),(13.33,14.75,'A7',81),(14.75,16.7,'D',91)]
    for i,(start,end,chord,v) in enumerate(segments):
        c.foundation(start,end,chord,v,brass=i>=3,choir=i>=4)
        c.arpeggio(start+.04,end-.07,chord,.22 if i<4 else .28,v-10)
        c.arpeggio(start+.02,end-.08,chord,.28,v-19,'pizzicato',-12)
        if i<4:c.chord('tremolo',start,[CHORDS[chord][2]+12,CHORDS[chord][3]+12],end-start-.1,v-12)
    c.motif(.3,.39,False,'strings',66,12)
    c.motif(8.89,.43,True,'horns',88)
    c.roll(6.7,8.84,38,45,105,.105)
    c.roll(12.3,14.68,45,45,102,.11)
    c.crash(8.89,90);c.crash(14.75,72)
    c.note('timpani',8.89,38,.95,112,False)
    c.note('timpani',14.75,38,1.6,106,False)
    c.chord('brass',14.75,[50,57,62,66,69],1.4,87)
    c.chord('celesta',14.9,[74,78,81,86],1.5,67,.08)
    c.expression('strings',0,9,58,115)
    c.expression('horns',6.7,9,70,116)
    c.save()


if __name__=='__main__':
    heritage();calendar();voyage();assembly()
