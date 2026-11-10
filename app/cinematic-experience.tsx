"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ACT, LAST_ACT } from "./film-config";
import prologueTiming from "./prologue-timing.json";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowUpRight,
  ArrowRight,
  X,
  Menu,
  Maximize,
  Captions,
  AudioLines,
} from "lucide-react";
import CinematicScene, { type CinemaState } from "./cinematic-scene";
import { calendarFrame, smooth } from "./mechanics/cinematic-timeline";
import film from "./film-narration.json";
import { createFilmMediaCache, waitForFilmMetadata } from "./film-media";
import calendarVoice from "./calendar-timing.json";
import { sources } from "./research-sources";
import {
  ASSEMBLY,
  CALIBRE_9001_COMPONENTS,
} from "./mechanics/assembly-timeline";
import "./cinema.css";
const acts = [
  {
    name: "A century of possibility",
    eyebrow: "THE ROLEX SKY-DWELLER",
    title: ["Carry the world.", "On your wrist."],
    text: "Two time zones. An annual calendar. A world of possibility.",
  },
  {
    name: "The invitation",
    eyebrow: "01 / BEYOND THE SAPPHIRE",
    title: ["Come closer.", "A universe awaits."],
    text: "An extraordinary companion. A story written in motion.",
  },
  {
    name: "Energy becomes time",
    eyebrow: "02 / THE AWAKENING",
    title: ["Your movement.", "Its heartbeat."],
    text: "Energy becomes rhythm. Rhythm becomes time.",
  },
  {
    name: "The secret of midnight",
    eyebrow: "03 / THE SECRET OF MIDNIGHT",
    title: ["One invisible", "gesture."],
    text: "April 30. Midnight. And suddenly, May.",
  },
  {
    name: "Twelve windows. One year.",
    eyebrow: "04 / REPLAY: APRIL 30 · THE MONTH DISPLAY",
    title: ["Twelve windows.", "One year."],
    text: "A dark sector beneath the dial carries the month from one opening to the next.",
  },
  {
    name: "Two worlds",
    eyebrow: "05 / HOME IS ALWAYS WITH YOU",
    title: ["The world moves.", "Home stays."],
    text: "Local time follows your journey. Reference time keeps your connection.",
  },
  {
    name: "Ring Command",
    eyebrow: "06 / COMPLEXITY AT YOUR FINGERTIPS",
    title: ["One turn.", "A new possibility."],
    text: "The bezel chooses. The crown acts.",
  },
  {
    name: "A universe, assembled",
    eyebrow: "07 / EVERY SHAPE HAS A PURPOSE",
    title: ["A little universe.", "Yours to explore."],
    text: "An extraordinary companion for a world without borders.",
  },
];
const offsets = film.chapters.map((_, i) =>
  film.chapters.slice(0, i).reduce((s, c) => s + c.duration, 0),
);
const total = film.totalDuration;
const format = (v: number) =>
  `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, "0")}`;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
function calendarEditorialTime(time: number) {
  const f =
    calendarVoice.fragments.find((f) => time >= f.start && time < f.end) ??
    calendarVoice.fragments.at(-1)!;
  const p = clamp((time - f.start) / (f.end - f.start));
  return f.storyboardStart + p * (f.storyboardEnd - f.storyboardStart);
}
function chapterLabel(ct: number) {
  return ct < 5
    ? "APRIL 30 → MAY 1"
    : ct < 11
      ? "SLOW MOTION / 31 POSITIONS"
      : ct < 16
        ? "THE ORDINARY DRIVING FINGER"
        : ct < 22
          ? "A TOOTH MEETS THE EXTRA FINGER"
          : ct < 29
            ? "EXTRA STEP / 30 → 31"
            : ct < 35
              ? "DAILY STEP / 31 → 1"
              : ct < 44
                ? "THE SATELLITE ROLLS AROUND A FIXED WHEEL"
                : ct < 51
                  ? "SAME PLACE. DIFFERENT ORIENTATION."
                  : ct < 57
                    ? "A GAP. NO EXTRA STEP."
                    : ct < 60
                      ? "ONE ORDINARY STEP / 30 → 31"
                      : "FOUR SHORT MONTHS. ONE ELEGANT MEMORY.";
}
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (update: () => void) => {
  const query = matchMedia(motionQuery);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
};
const readMotion = () => matchMedia(motionQuery).matches;
const serverMotion = () => false;
export default function CinematicExperience() {
  const [act, setAct] = useState(0),
    [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [started, setStarted] = useState(false),
    [finished, setFinished] = useState(false),
    [muted, setMuted] = useState(false),
    [score, setScore] = useState(true),
    [captions, setCaptions] = useState(true),
    [menu, setMenu] = useState(false),
    [info, setInfo] = useState(false),
    [ready, setReady] = useState(false),
    [audioLoading, setAudioLoading] = useState(false),
    [error, setError] = useState(""),
    [localOffset, setLocalOffset] = useState(0),
    [selector, setSelector] = useState(0),
    [separation, setSeparation] = useState(0.68),
    [reset, setReset] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    readMotion,
    serverMotion,
  );
  const a = useRef<HTMLAudioElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    request = useRef(0),
    actRef = useRef(0),
    playingRef = useRef(false),
    mutedRef = useRef(false),
    music = useRef<HTMLAudioElement>(null),
    musicEnabled = useRef(true),
    lastMusicCheck = useRef(0),
    mediaCache = useRef<ReturnType<typeof createFilmMediaCache> | null>(null),
    mediaAct = useRef<number | null>(null),
    mediaRequest = useRef<AbortController | null>(null),
    state = useRef<CinemaState>({
      act: 0,
      phase: 0,
      time: 0,
      playing: false,
      calendarTime: 0,
      localOffset: 0,
      selector: 0,
      separation: 0,
      reducedMotion: false,
      reset: 0,
    });
  const phase = clamp(time / film.chapters[act].duration),
    ct = act === ACT.calendar ? calendarEditorialTime(time) : 0,
    elapsed = offsets[act] + time;
  state.current = {
    act,
    phase,
    time,
    playing,
    calendarTime: ct,
    localOffset,
    selector,
    separation: act === ACT.energy ? separation : 0,
    reducedMotion,
    reset,
  };
  musicEnabled.current = score;
  mutedRef.current = muted;
  actRef.current = act;
  playingRef.current = playing;
  const onReady = useCallback(() => setReady(true), []),
    onError = useCallback(
      () =>
        setError(
          "The 3D scene could not start. Try refreshing this page in a browser with WebGL enabled.",
        ),
      [],
    );
  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (playingRef.current && a.current) {
        const at = a.current.currentTime,
          index = actRef.current;
        setTime(at);
        const m = music.current;
        if (m) {
          const speaking = film.chapters[index].cues.some(
              (c) => at >= c.start - 0.08 && at < c.end + 0.08,
            ),
            target = musicEnabled.current
              ? speaking
                ? index <= ACT.energy
                  ? 0.4
                  : index === ACT.assembly
                    ? 0.285
                    : 0.32
                : 0.7
              : 0;
          m.volume += (target - m.volume) * 0.12;
          const now = performance.now();
          if (now - lastMusicCheck.current > 700) {
            lastMusicCheck.current = now;
            const expected = scorePosition(index, at);
            if (
              m.dataset.filmSource === expected.file &&
              Math.abs(m.currentTime - expected.time) > 0.25
            )
              m.currentTime = expected.time;
          }
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (a.current) a.current.muted = muted;
    if (music.current) music.current.muted = muted;
  }, [playing, score, muted]);
  useEffect(() => {
    if (info) dialog.current?.showModal();
    else dialog.current?.close();
  }, [info]);
  useEffect(() => {
    const cache = createFilmMediaCache(),
      requestOwner = request,
      voiceElement = a.current,
      scoreElement = music.current;
    mediaCache.current = cache;
    return () => {
      requestOwner.current++;
      mediaRequest.current?.abort();
      voiceElement?.pause();
      scoreElement?.pause();
      cache.dispose();
      if (mediaCache.current === cache) mediaCache.current = null;
    };
  }, []);
  useEffect(() => {
    const cache = mediaCache.current;
    if (!cache) return;
    const next = Math.min(LAST_ACT, act + 1);
    // Warm the next voice and musical cue without creating extra players.
    void Promise.allSettled([
      cache.get(film.chapters[act].file),
      cache.get(scorePosition(act, 0).file),
      cache.get(film.chapters[next].file),
      cache.get(scorePosition(next, 0).file),
    ]);
  }, [act]);
  function scorePosition(index: number, at: number) {
    const start =
      index <= ACT.energy
        ? ACT.history
        : index === ACT.calendar
          ? ACT.calendar
          : index <= ACT.ring
            ? ACT.months
            : ACT.assembly;
    const file =
      start === ACT.history
        ? "heritage"
        : start === ACT.calendar
          ? "calendar"
          : start === ACT.months
            ? "voyage"
            : "assembly";
    return {
      file: `/audio/score/${file}.mp3${file === "assembly" ? "?v=finale36" : ""}`,
      time: offsets[index] - offsets[start] + at,
    };
  }
  function pause() {
    request.current++;
    mediaRequest.current?.abort();
    setAudioLoading(false);
    music.current?.pause();
    if (a.current) {
      if (mediaAct.current === actRef.current) setTime(a.current.currentTime);
      a.current.pause();
    }
    if (playingRef.current) {
      if (actRef.current === ACT.energy)
        setSeparation(0.68 * smooth(0.05, 0.45, phase));
      if (actRef.current === ACT.travel)
        setLocalOffset(Math.round(5 * smooth(0.25, 0.7, phase)));
      if (actRef.current === ACT.ring)
        setSelector(Math.min(3, Math.floor(phase * 4)));
    }
    setPlaying(false);
    playingRef.current = false;
  }
  async function play(index = actRef.current, at = time) {
    const audio = a.current,
      m = music.current,
      cache = mediaCache.current;
    if (!audio || !m || !cache) return;
    const token = ++request.current;
    mediaRequest.current?.abort();
    const preparation = new AbortController();
    mediaRequest.current = preparation;
    audio.pause();
    m.pause();
    playingRef.current = false;
    setPlaying(false);
    setAudioLoading(true);
    setError("");
    setMenu(false);
    setStarted(true);
    setFinished(false);
    setAct(index);
    actRef.current = index;
    setTime(at);
    try {
      const expected = scorePosition(index, at);
      const [voiceURL, musicURL] = await Promise.all([
        cache.get(film.chapters[index].file),
        cache.get(expected.file),
      ]);
      if (token !== request.current) return;
      if (audio.getAttribute("src") !== voiceURL) {
        audio.src = voiceURL;
        audio.load();
      }
      if (m.getAttribute("src") !== musicURL) {
        m.src = musicURL;
        m.load();
      }
      await Promise.all([
        waitForFilmMetadata(audio, preparation.signal),
        waitForFilmMetadata(m, preparation.signal),
      ]);
      if (token !== request.current) return;
      mediaAct.current = index;
      audio.dataset.filmSource = film.chapters[index].file;
      m.dataset.filmSource = expected.file;
      audio.currentTime = at;
      m.currentTime = expected.time;
      audio.muted = m.muted = mutedRef.current;
      m.volume = musicEnabled.current
        ? index <= ACT.energy
          ? 0.4
          : index === ACT.assembly
            ? 0.285
            : 0.32
        : 0;
      await Promise.all([audio.play(), m.play()]);
      if (token !== request.current) return;
      setAudioLoading(false);
      setPlaying(true);
      playingRef.current = true;
    } catch {
      if (token !== request.current) return;
      audio.pause();
      m.pause();
      setAudioLoading(false);
      setPlaying(false);
      playingRef.current = false;
      setError("Audio could not start. Tap play to try again.");
    }
  }
  function jumpTo(index: number, at = 0) {
    pause();
    setAct(index);
    actRef.current = index;
    setTime(at);
    setFinished(false);
    setMenu(false);
    setReset((r) => r + 1);
    setLocalOffset(0);
    setSelector(0);
    setSeparation(0.68);
    mediaAct.current = null;
  }
  function toggle() {
    if (playing || audioLoading) pause();
    else void play(finished ? 0 : act, finished ? 0 : time);
  }
  function ended() {
    if (actRef.current < LAST_ACT) void play(actRef.current + 1, 0);
    else {
      playingRef.current = false;
      setPlaying(false);
      setFinished(true);
      setTime(film.chapters[ACT.assembly].duration);
      music.current?.pause();
    }
  }
  function seek(value: number) {
    const absolute = (value / 1000) * total;
    let index = 0;
    offsets.forEach((o, i) => {
      if (o <= absolute) index = i;
    });
    const at = Math.min(
      absolute - offsets[index],
      film.chapters[index].duration - 0.02,
    );
    if (playing) void play(index, at);
    else jumpTo(index, at);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {}
  }
  const cue = film.chapters[act].cues.find(
      (c) => time >= c.start && time < c.end,
    ),
    frame = calendarFrame(ct),
    isMechanism = act === ACT.calendar && ct >= 6.2 && ct < 61.7;
  const historyActive = act === ACT.history && (playing || time > 0),
    monthDetail = act === ACT.months && time >= 11.705 && time < 31.3;
  const milestone = [...prologueTiming.milestones]
    .reverse()
    .find((m) => time >= m.start);
  let data = acts[act];
  if (historyActive) {
    if (time < 5.213)
      data = {
        name: data.name,
        eyebrow: "A CENTURY OF POSSIBILITY",
        title: ["Before the journey,", "a beginning."],
        text: "The ideas that made a traveller’s watch possible.",
      };
    else if (time < 12.685)
      data = {
        name: data.name,
        eyebrow: "OYSTER / WATERPROOFNESS",
        title: ["1926", "Defy the elements."],
        text: "A sealed case protects the movement.",
      };
    else if (time < 19.588)
      data = {
        name: data.name,
        eyebrow: "PERPETUAL / SELF-WINDING",
        title: ["1931", "Powered by you."],
        text: "Your movement becomes stored energy.",
      };
    else if (time < 28.182)
      data = {
        name: data.name,
        eyebrow: "GMT-MASTER / THE AGE OF TRAVEL",
        title: ["1955", "Two horizons."],
        text: "Two time zones. One wrist.",
      };
    else if (time < 40.923)
      data = {
        name: data.name,
        eyebrow: "THE SKY-DWELLER / CALIBRE 9001",
        title: ["2012", "A world on your wrist."],
        text: "The traveller’s story meets an annual calendar.",
      };
    else if (time < 54.801)
      data = {
        name: data.name,
        eyebrow: "SAROS / A CELESTIAL NAME",
        title: ["From the heavens.", "Into your hands."],
        text: "The name evokes an eclipse cycle. The watch remembers the civil calendar.",
      };
    else
      data = {
        name: data.name,
        eyebrow: "BENEATH THE SAPPHIRE",
        title: ["Come closer.", "Watch a year unfold."],
        text: "One extraordinary midnight at a time.",
      };
  }
  const monthLabel =
    time < 16.818
      ? "THE DIAL LIFTS. THE MONTH RING STAYS."
      : time < 19.503
        ? "ONE DARK SECTOR. TWELVE FIXED OPENINGS."
        : time < 25.767
          ? "DATE SECTOR → INTERMEDIATE WHEEL → MONTH RING"
          : "NET MONTHLY TRAVEL / ONE STATION · 30°";
  return (
    <main
      className={`cinema ${historyActive ? "cinema-history" : ""} ${monthDetail ? "cinema-month-detail" : ""} ${started ? "cinema-started" : ""} ${isMechanism ? "cinema-mechanism" : ""} cinema-act-${act}`}
    >
      <div className="cinema-aura" aria-hidden="true" />
      <CinematicScene state={state} onReady={onReady} onError={onError} />
      <div className="cinema-vignette" aria-hidden="true" />
      <header className="cinema-header">
        <button
          className="cinema-brand"
          onClick={() => jumpTo(0)}
          aria-label="Return to the beginning"
        >
          <span>✧</span>
          <div>
            SAROS<small>THE TRAVELLER’S LITTLE UNIVERSE</small>
          </div>
        </button>
        <span className="cinema-edition">
          ROLEX SKY-DWELLER <i /> CALIBRE 9001
        </span>
        <button
          className="cinema-menu-button"
          aria-label={menu ? "Close chapters" : "Open chapters"}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={18} /> : <Menu size={18} />}
          <span>EXPLORE</span>
        </button>
      </header>
      <nav
        className={`cinema-nav ${menu ? "open" : ""}`}
        aria-label="Film chapters"
        inert={!menu}
      >
        {acts.map((c, i) => (
          <button
            key={c.name}
            onClick={() => jumpTo(i)}
            className={i === act ? "selected" : ""}
          >
            <span>0{i + 1}</span>
            {c.name}
            <ArrowRight size={15} />
          </button>
        ))}
        <button
          className="cinema-research-link"
          onClick={() => {
            pause();
            setMenu(false);
            setInfo(true);
          }}
        >
          The research & the reference <ArrowUpRight size={13} />
        </button>
      </nav>
      {!isMechanism && !monthDetail && act !== ACT.assembly && (
        <section
          className="cinema-copy"
          key={`${act}-${historyActive ? (milestone?.id ?? "start") : ""}`}
        >
          <p className="cinema-eyebrow">
            <span />
            {data.eyebrow}
          </p>
          <h1>
            {data.title[0]}
            <em>{data.title[1]}</em>
          </h1>
          <p className="cinema-description">{data.text}</p>
          {act === ACT.history && !historyActive && (
            <>
              <button
                className="cinema-primary"
                disabled={!ready}
                onClick={() => void play(0, 0)}
              >
                <span className="cinema-play-circle">
                  <Play size={12} fill="currentColor" />
                </span>
                {ready
                  ? started
                    ? "Watch from the beginning"
                    : "Watch the story"
                  : "Preparing the little universe"}
                <small>{format(total)}</small>
              </button>
              <div className="cinema-listen-note">
                A CINEMATIC JOURNEY · AI FEMALE NARRATION
              </div>
            </>
          )}
        </section>
      )}
      {act === ACT.assembly && (
        <>
          {time < ASSEMBLY.count && (
            <div className="cinema-assembly-heading">
              <span>THE ART OF COMING TOGETHER</span>
              <p>A universe, assembled.</p>
            </div>
          )}
          {time >= ASSEMBLY.count && (
            <section
              className="cinema-assembly-count"
              aria-label="380 movement components in calibre 9001"
            >
              <p className="cinema-eyebrow">
                <span /> CALIBRE 9001
              </p>
              <h1>{CALIBRE_9001_COMPONENTS}</h1>
              <p className="cinema-assembly-unit">MOVEMENT COMPONENTS</p>
              <div
                className={`cinema-assembly-beauty ${time >= ASSEMBLY.beauty ? "visible" : ""}`}
                inert={time < ASSEMBLY.beauty}
              >
                <p>One extraordinary watch.</p>
                <a
                  className="cinema-discover"
                  href="https://www.rolex.com/en-gb/watches/sky-dweller"
                  target="_blank"
                  rel="noreferrer"
                >
                  Discover the Sky-Dweller <ArrowUpRight size={15} />
                </a>
              </div>
            </section>
          )}
        </>
      )}
      {isMechanism && (
        <>
          <div className="cinema-mechanism-title">
            <span>THE SAROS ANNUAL CALENDAR</span>
            <h2>{chapterLabel(ct)}</h2>
          </div>
          <div className="cinema-date-readout">
            <span>{frame.month === 3 ? "APRIL" : "MAY"}</span>
            <strong>{String(frame.date).padStart(2, "0")}</strong>
            <small>
              {ct < 35
                ? "SLOW MOTION"
                : ct < 51
                  ? "TIME ACCELERATED"
                  : "SLOW MOTION"}
            </small>
          </div>
        </>
      )}
      {monthDetail && (
        <div className="cinema-mechanism-title">
          <span>THE MONTH DISPLAY / UNDER THE DIAL</span>
          <h2>{monthLabel}</h2>
        </div>
      )}
      {act === ACT.months && time >= 3.324 && time < 11.705 && (
        <div className="cinema-month-label">
          {time < 5.2
            ? "JANUARY / 1 O’CLOCK"
            : time < 6.8
              ? "FEBRUARY / 2 O’CLOCK"
              : time < 8.651
                ? "DECEMBER / 12 O’CLOCK"
                : "APRIL / THE DARK WINDOW AT 4"}
        </div>
      )}
      {!playing && act === ACT.months && (
        <div className="cinema-calendar-controls">
          <button onClick={() => void play(ACT.months, 0)}>
            <RotateCcw size={12} />
            Watch the month story
          </button>
          <button onClick={() => void play(ACT.months, 11.705)}>
            Lift the dial
          </button>
          <button onClick={() => void play(ACT.months, 29.631)}>
            April → May
          </button>
        </div>
      )}
      {!playing && act === ACT.calendar && (
        <div className="cinema-calendar-controls">
          <button onClick={() => void play(ACT.calendar, 0)}>
            <RotateCcw size={12} /> Watch the explanation
          </button>
          <button onClick={() => void play(ACT.calendar, 22)}>
            April / extra step
          </button>
          <button onClick={() => void play(ACT.calendar, 51)}>
            May / a gap
          </button>
        </div>
      )}
      {!playing && act === ACT.energy && (
        <div className="cinema-layer-control">
          <label>
            Bring the layers together
            <input
              aria-label="Separate the watch layers"
              type="range"
              min="0"
              max="1000"
              value={Math.round((separation / 0.68) * 1000)}
              onChange={(e) =>
                setSeparation((Number(e.target.value) / 1000) * 0.68)
              }
            />
          </label>
        </div>
      )}
      {!playing && act === ACT.travel && (
        <div className="cinema-travel">
          <button
            aria-label="Move local hour back"
            onClick={() => setLocalOffset(Math.max(-9, localOffset - 1))}
          >
            −
          </button>
          <div>
            <span>LOCAL TIME</span>
            <strong>{String(10 + localOffset).padStart(2, "0")}:10</strong>
            <small>REFERENCE HOLDS AT 10:10</small>
          </div>
          <button
            aria-label="Move local hour forward"
            onClick={() => setLocalOffset(Math.min(13, localOffset + 1))}
          >
            +
          </button>
        </div>
      )}
      {!playing && act === ACT.ring && (
        <div
          className="cinema-selector"
          role="group"
          aria-label="Bezel selection"
        >
          {["Neutral", "Calendar", "Local time", "Reference time"].map(
            (s, i) => (
              <button
                className={selector === i ? "selected" : ""}
                key={s}
                onClick={() => setSelector(i)}
              >
                {s}
              </button>
            ),
          )}
          <p>
            {selector === 0
              ? "Turn the bezel to choose a function."
              : selector === 1
                ? "The crown adjusts the date and month."
                : selector === 2
                  ? "The crown jumps the local hour in one-hour steps."
                  : "The crown adjusts reference time; seconds stop for setting."}
          </p>
        </div>
      )}
      <div className="cinema-side-mark">
        <span>326939</span>
        <i />
        18 CT WHITE GOLD / IVORY ROMAN DIAL
      </div>
      <div className="cinema-bottom">
        <div className={`cinema-subtitles ${captions ? "" : "off"}`}>
          <p>
            {captions
              ? (cue?.text ??
                (started || act !== 0
                  ? ""
                  : "Put on your headphones. There is a world beneath the sapphire."))
              : ""}
          </p>
        </div>
        <div className="cinema-player">
          <button
            className="cinema-transport"
            disabled={!ready}
            aria-label={
              audioLoading
                ? "Cancel audio preparation"
                : playing
                  ? "Pause film"
                  : finished
                    ? "Replay film"
                    : "Play film"
            }
            onClick={toggle}
          >
            {playing ? (
              <Pause size={16} fill="currentColor" />
            ) : finished ? (
              <RotateCcw size={16} />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
          </button>
          <div className="cinema-now">
            <span>0{act + 1} / 08</span>
            <strong>{data.name}</strong>
          </div>
          <div className="cinema-timeline">
            <div>
              <span>{format(elapsed)}</span>
              <small>{format(total)}</small>
            </div>
            <input
              aria-label="Film progress"
              type="range"
              min="0"
              max="1000"
              value={Math.round((elapsed / total) * 1000)}
              onChange={(e) => seek(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right,#c3a472 ${(elapsed / total) * 100}%,#c3a47233 ${(elapsed / total) * 100}%)`,
              }}
            />
            {offsets.slice(1).map((o) => (
              <i key={o} style={{ left: `${(o / total) * 100}%` }} />
            ))}
          </div>
          <div className="cinema-tools">
            <button
              aria-label={captions ? "Hide captions" : "Show captions"}
              aria-pressed={captions}
              onClick={() => setCaptions(!captions)}
            >
              <Captions size={17} />
            </button>
            <button
              aria-label={score ? "Turn music off" : "Turn music on"}
              aria-pressed={score}
              onClick={() => setScore(!score)}
            >
              <AudioLines size={17} />
            </button>
            <button
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              className="cinema-fullscreen"
              aria-label="Toggle fullscreen"
              onClick={() => void fullscreen()}
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>
        <footer className="cinema-footer">
          <span>AN INDEPENDENT CREATIVE STUDY · NOT AFFILIATED WITH ROLEX</span>
          <button
            onClick={() => {
              pause();
              setInfo(true);
            }}
          >
            About the model & research <ArrowUpRight size={9} />
          </button>
        </footer>
      </div>
      {!ready && !error && (
        <div className="cinema-loading" aria-live="polite">
          <i />
          Preparing the little universe
        </div>
      )}
      {audioLoading && (
        <p className="cinema-audio-loading" role="status">
          Preparing the soundtrack…
        </p>
      )}
      {error && (
        <div className="cinema-error" role="status">
          {error}
          <button aria-label="Dismiss message" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      <audio
        ref={a}
        preload="metadata"
        onEnded={ended}
        onError={() => {
          pause();
          setError(
            "The narration could not load. The 3D chapters remain available to explore.",
          );
        }}
      />
      <audio ref={music} preload="auto" />
      <dialog
        className="cinema-dialog"
        ref={dialog}
        onCancel={() => setInfo(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setInfo(false);
        }}
      >
        <div>
          <button
            className="cinema-dialog-close"
            aria-label="Close research"
            onClick={() => setInfo(false)}
          >
            <X size={20} />
          </button>
          <p className="cinema-eyebrow">THE REFERENCE BEHIND THE FILM</p>
          <h2>
            A faithful study.
            <br />
            <em>An honest boundary.</em>
          </h2>
          <p>
            One reference throughout: the original 2012 Sky-Dweller 326939,
            white gold, ivory Roman dial, Oyster bracelet, calibre 9001. The
            main experience uses our own animated geometry. Reference
            photographs guide modelling and are not displayed as film scenes.
          </p>
          <p>
            The exterior is a reconstruction, not authenticated factory CAD.
            Typography, surface profiles and concealed components remain
            approximations. The calendar shows the documented action; its
            internal placement and driver paths are enlarged for clarity.
          </p>
          <p>
            The finale’s 380 is Rolex’s published component count for calibre
            9001 (2012 launch dossier, page 10). It describes the movement, not
            the complete watch. The assembly animates the components represented
            in this model; it is not a part-for-part reconstruction of all 380.
            Integral teeth, flutes and printing remain attached to their host
            components.
          </p>
          <p>
            Rolex describes four production Saros fingers. Our rolling geometry
            derives from the early patent’s 123/36 example, combined with four
            program positions. Those production tooth counts are not verified.
            The month-drive tooth counts are illustrative. Its net 30-degree
            monthly travel is shown separately from the visible date boundary; a
            production staging schedule is not asserted. The short-month signal
            is calculated from gear orientation, rather than a month-length
            lookup. February requires correction on March 1.
          </p>
          <details>
            <summary>Research sources</summary>
            {sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                <span>
                  {s.title}
                  <small>{s.detail}</small>
                </span>
                <ArrowUpRight size={14} />
              </a>
            ))}
          </details>
          <details>
            <summary>Read the narration</summary>
            {film.chapters.map((c) => (
              <section key={c.id}>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </section>
            ))}
          </details>
          <p className="cinema-provenance">
            AI voice: Microsoft Sonia. Original procedural models and composed
            orchestral score. No paid assets. Gentilis font: SIL Open Font
            License. Rolex names and marks belong to their owners. This
            educational creative study is not endorsed by Rolex.
          </p>
        </div>
      </dialog>
    </main>
  );
}
