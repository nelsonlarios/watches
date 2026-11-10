"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowUpRight,
  ArrowRight,
  RotateCcw,
  Maximize,
  X,
  Moon,
  Sun,
  Plus,
  Minus,
  Captions,
  Headphones,
} from "lucide-react";
import WatchScene, { type SceneState } from "./watch-scene";
import narration from "../public/audio/narration.json";
const chapters = [
  {
    short: "The awakening",
    eyebrow: "THE TRAVELLER’S LITTLE UNIVERSE",
    title: ["A little", "universe."],
    after: "On your wrist.",
    description:
      "A journey beneath the sapphire. Into the extraordinary world of the Rolex Sky-Dweller.",
  },
  {
    short: "The heartbeat",
    eyebrow: "01 / ENERGY BECOMES TIME",
    title: ["A living", "heartbeat."],
    description:
      "Your movement becomes its energy. A mainspring stores it. A balance and blue hairspring give it rhythm.",
  },
  {
    short: "The calendar",
    eyebrow: "02 / THE CELESTIAL CALENDAR",
    title: ["Written in", "the stars."],
    description:
      "A fixed wheel. An orbiting satellite. A remarkably elegant way to remember the months.",
  },
  {
    short: "Two worlds",
    eyebrow: "03 / THE ART OF TRAVEL",
    title: ["Two worlds.", "One journey."],
    description:
      "The hands follow where you are. The 24-hour disc keeps a reference to wherever you call home.",
  },
  {
    short: "Ring Command",
    eyebrow: "04 / THE SECRET OF THE RING",
    title: ["A turn.", "A possibility."],
    description:
      "Turn the bezel to choose. Turn the crown to adjust. Mechanical complexity, made beautifully intuitive.",
  },
  {
    short: "The assembly",
    eyebrow: "05 / EVERYTHING FINDS ITS PLACE",
    title: ["A universe,", "assembled."],
    description:
      "Wheels, bridges, hands, and light. A world of tiny decisions becomes a travelling companion.",
  },
];
const offsets = narration.chapters.map((_, i) =>
  narration.chapters.slice(0, i).reduce((s, c) => s + c.duration, 0),
);
const total = narration.totalDuration;
const format = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export default function Experience() {
  const [chapter, setChapter] = useState(0),
    [phase, setPhase] = useState(0),
    [playing, setPlaying] = useState(false),
    [started, setStarted] = useState(false),
    [finished, setFinished] = useState(false),
    [ready, setReady] = useState(false),
    [sceneError, setSceneError] = useState(false),
    [muted, setMuted] = useState(false),
    [music, setMusic] = useState(true),
    [captions, setCaptions] = useState(true),
    [info, setInfo] = useState(false),
    [separation, setSeparation] = useState(0.7),
    [localOffset, setLocalOffset] = useState(0),
    [referenceOffset, setReferenceOffset] = useState(0),
    [displayDate, setDisplayDate] = useState(28),
    [crownTurns, setCrownTurns] = useState(0),
    [selector, setSelector] = useState(0),
    [night, setNight] = useState(false),
    [reset, setReset] = useState(0),
    [dateStep, setDateStep] = useState(0),
    [month, setMonth] = useState(11),
    [calendarKind, setCalendarKind] = useState<"short" | "long">("short"),
    [advancing, setAdvancing] = useState(false),
    [audioError, setAudioError] = useState(""),
    [reducedMotion, setReducedMotion] = useState(false);
  const audio = useRef<HTMLAudioElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    chapterRef = useRef(0),
    playRequest = useRef(0),
    playingRef = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    ambient = useRef<{ context: AudioContext; gain: GainNode } | null>(null),
    state = useRef<SceneState>({
      chapter: 0,
      phase: 0,
      playing: false,
      separation: 0.7,
      localOffset: 0,
      referenceOffset: 0,
      displayDate: 28,
      crownTurns: 0,
      selector: 0,
      dateStep: 0,
      month: 11,
      night: false,
      reset: 0,
      reducedMotion: false,
    });
  state.current = {
    chapter,
    phase,
    playing,
    separation,
    localOffset,
    referenceOffset,
    displayDate,
    crownTurns,
    selector,
    dateStep,
    month,
    night,
    reset,
    reducedMotion,
  };
  playingRef.current = playing;
  chapterRef.current = chapter;
  const onReady = useCallback(() => setReady(true), []),
    onError = useCallback(() => setSceneError(true), []);
  useEffect(() => {
    document
      .querySelectorAll(".chapter-nav button")
      [chapter]?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: reducedMotion ? "instant" : "smooth",
      });
  }, [chapter, reducedMotion]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(q.matches);
    const f = () => setReducedMotion(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    if (audio.current) audio.current.muted = muted;
    const a = ambient.current;
    if (a)
      a.gain.gain.setTargetAtTime(
        playing && music && !muted ? 0.032 : 0,
        a.context.currentTime,
        0.5,
      );
  }, [muted, music, playing]);
  useEffect(() => {
    if (info) dialog.current?.showModal();
    else {
      dialog.current?.close();
      dialog.current?.querySelectorAll("audio").forEach((a) => a.pause());
    }
  }, [info]);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const a = audio.current;
      if (a && playingRef.current)
        setPhase(
          Math.min(
            1,
            a.currentTime / narration.chapters[chapterRef.current].duration,
          ),
        );
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(
    () => () => {
      audio.current?.pause();
      void ambient.current?.context.close();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function beginAmbient() {
    if (ambient.current) {
      void ambient.current.context.resume();
      return;
    }
    try {
      const context = new AudioContext(),
        gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;
      filter.connect(gain);
      [110, 164.81, 220, 261.63, 329.63].forEach((f, i) => {
        const o = context.createOscillator(),
          g = context.createGain();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = i % 2 ? -3 : 3;
        g.gain.value = i < 2 ? 0.3 : 0.1;
        o.connect(g);
        g.connect(filter);
        o.start();
      });
      ambient.current = { context, gain };
      gain.gain.setTargetAtTime(
        music && !muted ? 0.032 : 0,
        context.currentTime,
        1.5,
      );
    } catch {}
  }
  async function playChapter(index: number, seek = 0) {
    const a = audio.current;
    if (!a) return;
    const request = ++playRequest.current;
    if (timer.current) clearTimeout(timer.current);
    setAdvancing(false);
    setDateStep(0);
    setMonth(11);
    setCalendarKind("short");
    setLocalOffset(0);
    setReferenceOffset(0);
    setDisplayDate(28);
    setNight(false);
    setAudioError("");
    setStarted(true);
    setFinished(false);
    setChapter(index);
    chapterRef.current = index;
    setPhase(seek / narration.chapters[index].duration);
    if (a.getAttribute("src") !== narration.chapters[index].file)
      a.src = narration.chapters[index].file;
    a.currentTime = seek;
    a.muted = muted;
    beginAmbient();
    try {
      await a.play();
      if (request !== playRequest.current) return;
      setPlaying(true);
      playingRef.current = true;
    } catch {
      if (request !== playRequest.current) return;
      setPlaying(false);
      setAudioError("The narration is ready. Tap play to start the sound.");
    }
  }
  function pause() {
    if (playingRef.current && audio.current) {
      const p = Math.min(
        1,
        audio.current.currentTime /
          narration.chapters[chapterRef.current].duration,
      );
      setPhase(p);
      const easing = (a: number, b: number) => {
        const x = Math.max(0, Math.min(1, (p - a) / (b - a)));
        return x * x * (3 - 2 * x);
      };
      if (chapterRef.current === 1) setSeparation(0.7 * easing(0.1, 0.6));
      if (chapterRef.current === 2) {
        setDateStep(2 * easing(0.2, 0.65));
        setMonth(p > 0.65 ? 12 : 11);
      }
      if (chapterRef.current === 3)
        setLocalOffset(Math.round(easing(0.25, 0.7) * 5));
      if (chapterRef.current === 4) setSelector(Math.min(3, Math.floor(p * 5)));
      if (chapterRef.current === 5 && p > 0.78) setNight(true);
    }
    playRequest.current++;
    audio.current?.pause();
    setPlaying(false);
    playingRef.current = false;
  }
  function toggle() {
    if (playing) pause();
    else if (finished) void playChapter(0);
    else
      void playChapter(chapter, phase * narration.chapters[chapter].duration);
  }
  function selectChapter(index: number) {
    pause();
    setChapter(index);
    chapterRef.current = index;
    setPhase(0);
    setFinished(false);
    setDateStep(0);
    setMonth(11);
    setNight(false);
    setLocalOffset(0);
    setReferenceOffset(0);
    setDisplayDate(28);
    setSelector(0);
    if (audio.current) {
      audio.current.src = narration.chapters[index].file;
      audio.current.currentTime = 0;
    }
    if (timer.current) clearTimeout(timer.current);
    setAdvancing(false);
  }
  function ended() {
    if (chapterRef.current < 5) void playChapter(chapterRef.current + 1);
    else {
      setPlaying(false);
      playingRef.current = false;
      setPhase(1);
      setFinished(true);
      setNight(true);
    }
  }
  function seek(value: number) {
    const absolute = (value / 1000) * total;
    let i = 0;
    for (let n = 0; n < offsets.length; n++) if (offsets[n] <= absolute) i = n;
    const t = Math.min(
      absolute - offsets[i],
      narration.chapters[i].duration - 0.05,
    );
    if (playing) void playChapter(i, t);
    else {
      selectChapter(i);
      setPhase(t / narration.chapters[i].duration);
      if (audio.current) audio.current.currentTime = t;
    }
  }
  function nextDate() {
    const limit = [4, 6, 9, 11].includes(month) || month === 2 ? 30 : 31;
    if (displayDate >= limit) {
      setDisplayDate(1);
      setMonth(month === 12 ? 1 : month + 1);
    } else setDisplayDate(displayDate + 1);
  }
  function adjustLocal(delta: number) {
    const old = 10 + localOffset + referenceOffset;
    if (delta > 0 && Math.floor((old + delta) / 24) > Math.floor(old / 24))
      nextDate();
    setLocalOffset(localOffset + delta);
  }
  function turnCrown() {
    setCrownTurns(crownTurns + 1);
    if (selector === 1) nextDate();
    if (selector === 2) adjustLocal(1);
    if (selector === 3) {
      const old = 10 + localOffset + referenceOffset;
      if (Math.floor((old + 1) / 24) > Math.floor(old / 24)) nextDate();
      setReferenceOffset(referenceOffset + 1);
    }
  }
  function advance() {
    if (advancing) return;
    pause();
    setAdvancing(true);
    setDateStep(0);
    setMonth(calendarKind === "short" ? 11 : 3);
    timer.current = setTimeout(() => {
      setDateStep(1);
      timer.current = setTimeout(
        () => {
          setDateStep(calendarKind === "short" ? 2 : 1);
          setMonth(calendarKind === "short" ? 12 : 4);
          setAdvancing(false);
        },
        calendarKind === "short" ? 850 : 0,
      );
    }, 350);
  }
  const data = chapters[chapter],
    elapsed = offsets[chapter] + phase * narration.chapters[chapter].duration,
    cue = narration.chapters[chapter].cues.find(
      (c) =>
        phase * narration.chapters[chapter].duration >= c.start &&
        phase * narration.chapters[chapter].duration < c.end,
    ),
    day =
      calendarKind === "long"
        ? dateStep
          ? "01"
          : "31"
        : dateStep >= 2
          ? "01"
          : dateStep === 1
            ? "31"
            : "30";
  return (
    <main
      className={`experience ${started ? "has-started" : ""} ${playing ? "is-playing" : ""}`}
    >
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <WatchScene state={state} onReady={onReady} onError={onError} />
      {sceneError && (
        <div className="scene-fallback">
          Your browser cannot display the 3D scene. The narrated story and
          chapter text are still available.
        </div>
      )}
      <header className="masthead">
        <button
          className="brand"
          onClick={() => {
            selectChapter(0);
            setStarted(false);
          }}
          aria-label="Saros home"
        >
          <span className="brand-emblem" aria-hidden="true">
            ✳
          </span>
          <span>
            SAROS<span className="brand-sub">A STUDY IN WONDER</span>
          </span>
        </button>
        <p className="masthead-center">THE EXTRAORDINARY, WITHIN.</p>
        <div className="header-actions">
          <button
            className="about-link"
            onClick={() => {
              pause();
              setInfo(true);
            }}
          >
            Behind the story <ArrowUpRight size={13} />
          </button>
          <span className="header-divider" />
          <button
            className="icon-button sound-button"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Enable sound" : "Mute sound"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{muted ? "SOUND OFF" : "SOUND ON"}</span>
          </button>
        </div>
      </header>
      <section
        className={`story-copy chapter-${chapter}`}
        key={chapter}
        aria-labelledby="story-title"
      >
        <p className="eyebrow">
          <span className="tiny-line" />
          {data.eyebrow}
        </p>
        <h1 id="story-title">
          {data.title[0]}
          <br />
          <em>{data.title[1]}</em>
          {data.after && <span className="title-after">{data.after}</span>}
        </h1>
        <p className="description">{data.description}</p>
        {chapter === 0 && (
          <div className="entrance">
            <button
              className="play-story"
              onClick={toggle}
              disabled={!ready && !sceneError}
            >
              <span className="play-disc">
                {playing ? (
                  <Pause size={18} fill="currentColor" />
                ) : (
                  <Play size={18} fill="currentColor" />
                )}
              </span>
              <span>
                {!ready && !sceneError
                  ? "Preparing your universe"
                  : playing
                    ? "Pause the story"
                    : started
                      ? "Resume the story"
                      : "Play the story"}
                <small>{format(total)} FILM · AI FEMALE NARRATION</small>
              </span>
              <ArrowRight className="cta-arrow" size={21} />
            </button>
            <p className="headphone-note">
              <Headphones size={13} />
              Best experienced with headphones
            </p>
          </div>
        )}
        {chapter !== 0 && !playing && (
          <div className="chapter-interactions">
            {chapter === 1 && (
              <>
                <div className="control-label">
                  <span>SEPARATE THE LAYERS</span>
                  <span>{Math.round(separation * 100)}%</span>
                </div>
                <input
                  aria-label="Assembly separation"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={separation}
                  onChange={(e) => setSeparation(+e.target.value)}
                />
                <p className="interaction-note">
                  Slide slowly. Discover the world beneath the dial.
                </p>
              </>
            )}
            {chapter === 2 && (
              <>
                <div className="segmented">
                  <button
                    className={calendarKind === "short" ? "selected" : ""}
                    disabled={advancing}
                    onClick={() => {
                      setCalendarKind("short");
                      setDateStep(0);
                      setMonth(11);
                    }}
                  >
                    30-day month
                  </button>
                  <button
                    className={calendarKind === "long" ? "selected" : ""}
                    disabled={advancing}
                    onClick={() => {
                      setCalendarKind("long");
                      setDateStep(0);
                      setMonth(3);
                    }}
                  >
                    31-day month
                  </button>
                </div>
                <div className="calendar-control">
                  <div className="date-tile">
                    <small>
                      {month === 12
                        ? "DEC"
                        : month === 4
                          ? "APR"
                          : calendarKind === "short"
                            ? "NOV"
                            : "MAR"}
                    </small>
                    <strong>{day}</strong>
                  </div>
                  <button
                    className="text-action"
                    onClick={advance}
                    disabled={advancing}
                  >
                    {advancing ? "Crossing midnight…" : "Advance to midnight"}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <p className="interaction-note">
                  Slowed down to reveal the extra calendar step.
                </p>
              </>
            )}
            {chapter === 3 && (
              <>
                <div className="time-worlds">
                  <div>
                    <small>REFERENCE / HOME</small>
                    <strong>
                      {String(
                        (((10 + referenceOffset) % 24) + 24) % 24,
                      ).padStart(2, "0")}
                      :10<span>24H</span>
                    </strong>
                  </div>
                  <span className="world-line" />
                  <div>
                    <small>LOCAL / DESTINATION</small>
                    <strong>
                      {String(
                        (((10 + localOffset + referenceOffset) % 24) + 24) % 24,
                      ).padStart(2, "0")}
                      :10
                    </strong>
                  </div>
                </div>
                <div className="hour-control">
                  <button
                    className="round-button"
                    aria-label="Move local time back one hour"
                    onClick={() => adjustLocal(-1)}
                  >
                    <Minus size={17} />
                  </button>
                  <span>LOCAL HOUR</span>
                  <button
                    className="round-button"
                    aria-label="Move local time forward one hour"
                    onClick={() => adjustLocal(1)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
              </>
            )}
            {chapter === 4 && (
              <>
                <p className="control-label">TURN THE RING</p>
                <div className="selector-controls">
                  {["Neutral", "Calendar", "Local", "Reference"].map(
                    (label, i) => (
                      <button
                        key={label}
                        className={selector === i ? "selected" : ""}
                        onClick={() => setSelector(i)}
                      >
                        <span>{["0", "I", "II", "III"][i]}</span>
                        {label}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="text-action crown-action"
                  onClick={turnCrown}
                >
                  <RotateCcw size={14} />
                  Turn the crown
                  <span>
                    {selector === 1
                      ? `DATE ${displayDate}`
                      : selector === 2
                        ? `LOCAL ${(((10 + localOffset + referenceOffset) % 24) + 24) % 24}:10`
                        : selector === 3
                          ? `REFERENCE ${(((10 + referenceOffset) % 24) + 24) % 24}:10`
                          : `WIND ${crownTurns}`}
                  </span>
                </button>
                <p className="interaction-note">
                  {
                    [
                      "The crown is ready to wind.",
                      "The crown now adjusts the calendar.",
                      "The crown now adjusts the local hour.",
                      "The crown now adjusts reference time.",
                    ][selector]
                  }
                </p>
              </>
            )}
            {chapter === 5 && (
              <>
                <button
                  className="night-button"
                  onClick={() => setNight(!night)}
                >
                  {night ? <Sun size={18} /> : <Moon size={18} />}{" "}
                  {night ? "Return to the light" : "Let the night fall"}
                  <span>CHROMALIGHT</span>
                </button>
                <button
                  className="text-action replay-action"
                  onClick={() => void playChapter(0)}
                >
                  <RotateCcw size={15} />
                  Experience it again
                </button>
              </>
            )}
          </div>
        )}
        {chapter !== 0 && playing && (
          <button className="pause-explore" onClick={pause}>
            <Pause size={13} />
            Pause & explore this chapter
          </button>
        )}
      </section>
      <div
        className={`object-label ${chapter === 2 ? "calendar-label" : ""}`}
        aria-hidden="true"
      >
        <span className="label-cross">+</span>
        <div>
          <span>
            {chapter === 2 ? "SAROS ANNUAL CALENDAR" : "OYSTER PERPETUAL"}
          </span>
          <strong>
            {chapter === 2 ? "A celestial choreography." : "Sky-Dweller"}
          </strong>
          <small>
            {chapter === 2
              ? "FIXED WHEEL · ORBITING SATELLITE"
              : "EVEROSE STUDY · CALIBRE 9002"}
          </small>
        </div>
        <span className="label-rule" />
      </div>
      <div className="scene-meta">
        <span className="live-dot" />
        {chapter === 2 ? "ILLUSTRATIVE CUTAWAY" : "INTERACTIVE 3D STUDY"}
        <span className="meta-divider">/</span>
        <button onClick={() => setReset((n) => n + 1)}>
          DRAG TO ROTATE <RotateCcw size={11} />
        </button>
      </div>
      {captions && started && cue && (
        <div className="caption">
          <span>{cue.text}</span>
        </div>
      )}
      {audioError && (
        <div className="audio-notice" role="status">
          {audioError}
        </div>
      )}
      <footer className="exhibit-footer">
        <div className="transport">
          <div className="transport-left">
            <button
              className="transport-play"
              aria-label={
                playing
                  ? "Pause story"
                  : finished
                    ? "Replay story"
                    : "Play story"
              }
              onClick={toggle}
            >
              {playing ? (
                <Pause size={16} fill="currentColor" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
            </button>
            <span className="timecode">
              {format(elapsed)}
              <i>/</i>
              {format(total)}
            </span>
            <span className="now-playing">
              {playing ? "NOW PLAYING" : "EXPLORE THE STORY"}
            </span>
          </div>
          <div className="transport-right">
            <button
              className={`icon-button ${captions ? "active" : ""}`}
              aria-label={captions ? "Hide captions" : "Show captions"}
              onClick={() => setCaptions(!captions)}
            >
              <Captions size={19} />
            </button>
            <button
              className="icon-button fullscreen"
              aria-label="Enter fullscreen"
              onClick={() => {
                if (!document.fullscreenElement)
                  void document.documentElement.requestFullscreen?.();
                else void document.exitFullscreen();
              }}
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
        <input
          className="story-seek"
          type="range"
          aria-label="Story progress"
          min="0"
          max="1000"
          step="1"
          value={(elapsed / total) * 1000}
          onChange={(e) => seek(+e.target.value)}
          style={
            {
              "--progress": `${(elapsed / total) * 100}%`,
            } as React.CSSProperties
          }
        />
        <nav className="chapter-nav" aria-label="Story chapters">
          {chapters.map((c, i) => (
            <button
              key={c.short}
              className={chapter === i ? "current" : ""}
              aria-current={chapter === i ? "step" : undefined}
              onClick={() => selectChapter(i)}
            >
              <span className="chapter-number">0{i + 1}</span>
              <span className="chapter-name">{c.short}</span>
              <span className="chapter-dot" />
            </button>
          ))}
        </nav>
        <div className="colophon">
          <span>AN INDEPENDENT EXPLORATION OF THE ROLEX SKY-DWELLER</span>
          <span>
            CRAFTED FOR THE CURIOUS <span className="colophon-star">✧</span>
          </span>
        </div>
      </footer>
      <audio
        ref={audio}
        src={narration.chapters[0].file}
        preload="auto"
        onEnded={ended}
        onError={() => {
          setAudioError(
            "The audio could not load. Try play again, or explore with captions.",
          );
          pause();
        }}
      />
      <dialog
        ref={dialog}
        className="info-dialog"
        onCancel={() => setInfo(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setInfo(false);
        }}
      >
        <button
          className="close-dialog icon-button"
          onClick={() => setInfo(false)}
          aria-label="Close story details"
        >
          <X size={21} />
        </button>
        <p className="eyebrow">BEHIND THE STORY</p>
        <h2>
          Wonder, with
          <br />
          <em>a reason.</em>
        </h2>
        <p>
          This is an independent cinematic study of the Rolex Sky-Dweller,
          inspired by its calibre 9002, Saros annual calendar, and Ring Command
          system.
        </p>
        <p>
          The functions follow Rolex’s documentation. The 3D movement and
          assembly are illustrative reconstructions; they are not a production
          CAD model or a servicing guide. Calendar tooth counts shown in the
          cutaway come from an example in Rolex’s patent.
        </p>
        <div className="info-sources">
          <a
            href="https://www.rolex.com/en-gb/watches/sky-dweller/features"
            target="_blank"
            rel="noreferrer"
          >
            The Sky-Dweller <ArrowUpRight size={13} />
          </a>
          <a
            href="https://patents.google.com/patent/EP1596261B1/en"
            target="_blank"
            rel="noreferrer"
          >
            The calendar patent <ArrowUpRight size={13} />
          </a>
          <a
            href="https://www.rolex.com/en-us/watchmaking/features/bezels/ring-command"
            target="_blank"
            rel="noreferrer"
          >
            Ring Command <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="sound-settings">
          <h3>The voice of the universe</h3>
          <p>
            AI-generated narration · Sonia · British English.
            <br />
            Warm, intimate, and unhurried. Explore the voice auditions.
          </p>
          {narration.auditions.map((a) => (
            <div className="audition" key={a.id}>
              <span>{a.label}</span>
              <audio
                controls
                preload="none"
                src={a.file}
                aria-label={`${a.label} voice audition`}
              />
            </div>
          ))}
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={music}
              onChange={(e) => setMusic(e.target.checked)}
            />
            Ambient score during the film
          </label>
          <label className="toggle-option">
            <input
              type="checkbox"
              checked={!muted}
              onChange={(e) => setMuted(!e.target.checked)}
            />
            Narration enabled
          </label>
        </div>
        <details>
          <summary>Read the full story</summary>
          {narration.chapters.map((c) => (
            <p key={c.id}>
              <strong>{c.title}.</strong> {c.text}
            </p>
          ))}
        </details>
        <p className="credits">
          Visual direction & original storytelling: Saros study. AI voice:
          Microsoft neural speech. No affiliation with or endorsement by Rolex.
          Rolex and its model names belong to their respective owner.
        </p>
      </dialog>
    </main>
  );
}
