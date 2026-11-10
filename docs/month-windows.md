# The twelve month windows — a 40–45 second reveal

Baseline: original 2012 reference 326939, ivory Roman dial, calibre 9001. Its active month aperture is **dark/black**, as shown beside 4 o’clock in Rolex’s original launch photograph. Keep the red reference-time triangle visually separate from this explanation.

The viewer’s takeaway: the dial has twelve stationary openings; a separate moving month ring underneath presents one contrasting sector through the opening for the current month. A month-indication ring and a date ring are different parts.

## Narration

> Those twelve little windows tell you the month. One o’clock is January, two is February; December is at twelve. The dark window at four means April. Lift the dial: a separate month ring carries the dark sector beneath. You see its colour through the opening. A toothed section of the date ring drives this intermediate wheel, which turns the month ring. One station per month. Thirty degrees. As April thirtieth becomes May first, the dark sector leaves four and appears at five. The windows stay still; the ring moves underneath.

Approximately 90 words. Use the existing warm Sonia voice and sentence boundaries to conform the picture to the actual recording. Target 40–45 seconds; a natural recording up to 50 seconds is preferable to hurried speech.

## Shot sequence

| Nominal time | Picture | Audio cue tag |
|---|---|---|
| 0–4 s | Begin on the same complete ivory Roman dial already used for the calendar film, date 30, with the aperture beside 4 o’clock dark. A macro focus pull catches the real edges of the little windows. | `windows-intro` |
| 4–10 s | Briefly guide the eye to the window beside 1 o’clock, then 2, then 12. Tiny labels “January”, “February”, “December” appear individually and disappear. Keep the current dark indication at 4 throughout; the mapping highlight is a fine rim light rather than a second filled month window. | `month-map` |
| 10–14 s | Return to the dark opening at 4. One quiet label: “April”. The numeral itself retains the exact typography of the reference dial. | `april-window` |
| 14–20 s | Hands and the central reference-time display recede from the teaching view. **Lift the actual ivory dial mesh**, with its twelve cutouts and numeral furniture, axially above the mechanism. Do not replace it with a newly drawn diagram. A shallow oblique camera reveals the separate annular month ring below, including its dark sector. | `dial-lift` |
| 20–23 s | Hold a ray of sight through the April opening down onto the dark sector. The sector is wider than the opening in this illustrative model, so the viewer can see a patch of material underneath rather than assume the window itself changes colour. | `sector-through-window` |
| 23–31 s | Bring the date ring and its toothed sector into view, followed by the small intermediate wheel. Light follows the actual chain of engagement: **date-ring sector → intermediate wheel → month ring**. Other Saros gears stay out of the teaching frame. | `drive-train` |
| 31–35 s | Demonstrate the **net monthly travel** of the month ring from one station to its neighbour. A single restrained 30° arc is optional here; twelve angular marks and equations are unnecessary. Keep the date window out of this explanatory travel shot so it does not falsely timestamp the whole underlying rotation. | `monthly-station`, `thirty-degrees` |
| 35–42 s | Return to the assembled dial’s April 30 state, then show the visible midnight result: date 1 and the dark month indication at 5 o’clock. A short matched under-dial glimpse connects the dark sector to its new opening. The face now reads **May 1**. | `april-to-may` |
| 42–45 s | End with one brief alternating view: ivory dial stationary, month ring moving beneath in the explanatory view; then the complete watch, correctly showing May 1. Let the fine aperture edges and bezel reflections carry the finish. | `fixed-windows` |

These nominal times are planning estimates. The generated narration manifest supplies the authoritative sentence times.

## Render the same physical object

1. The existing ivory dial should be a solid mesh with twelve genuine rectangular/trapezoidal cutouts at the reference positions. When it rises, the openings remain holes and reveal the layer underneath. A dark rectangular decal on an uncut dial would fail this reveal.
2. Keep the applied Roman numerals and dial printing attached to that mesh. Rehaut, bezel, crystal and case are separate components; they must not rise with the dial. For the exploded teaching shot, let the hands and central reference-time display leave the view first rather than collide with the lifted dial.
3. Give the month ring its own annular mesh immediately underneath the aperture radius, distinct from the date ring carrying the printed dates. Its mostly light surface and one dark sector should explain why most windows remain light while the current one is dark.
4. Match the first and last assembled poses to the real dial. The windows sit **outside the hour markers**, not where the numerals are. At 12 o’clock the Rolex crown is the hour marker; the narration does not require a printed Roman XII.
5. Use a stable, shallow oblique camera for the lift, then an overhead detail for the gear engagement. Keep the scene in one place. An exploded pile of rings, cards or a dashboard would obscure the simple layer relationship.
6. The month numbering is clockwise from the front: January at 1, February at 2, March at 3, April at 4, May at 5, June at 6, July at 7, August at 8, September at 9, October at 10, November at 11 and December at 12. The month station’s angle clockwise from 12 is `(monthNumber × 30°) mod 360°`.
7. In the patent’s annular embodiment, an **external** toothed date-ring sector drives the intermediate wheel, which engages the month ring’s **internal** teeth. Thus the date ring and month ring turn in opposite directions in that view. Do not draw all three meshed parts turning the same way. Tooth profiles, counts and exact centre distances remain illustrative.

## What is established, and what remains illustrative

**Production display facts:** Rolex’s 2012 launch dossier, PDF page 6, specifies twelve month apertures outside the hour markers: January at 1 o’clock, February at 2 and so on, with a contrasting indication for the current month. Its page 7 photograph shows the selected ivory Roman model with a dark April aperture. [Rolex-authored 2012 dossier](https://www.thewatch.co.il/image/users/190146/ftp/my_files/ROLEX/Sky-Dweller_EN.pdf). Local source: `sources/rolex-sky-dweller-launch-2012.pdf`; image: `working/launch-7.png`.

**Documented mechanism:** Rolex patent EP2428856B1 describes a separate month indicator beneath a fixed twelve-window dial. In its annular embodiment, a toothed sector on the date ring drives an intermediate wheel engaging the month ring’s internal teeth. The net monthly advance is 30°. Its contrasting zone can be wider than a window. [EP2428856B1, description 0012–0019 and 0042–0044](https://patents.google.com/patent/EP2428856B1/en). Local source: `sources/EP2428856B1-month-display.pdf`.

**Timing boundary:** the patent contains different arrangements spreading the month ring’s motion over different numbers of date steps, while the **visible** month change remains synchronized with the 31→1 date boundary. It does not authenticate one of those arrangements as the production 9001. Therefore this film may explain a **net one-station monthly advance** and show the April→May indication changing with April 30→May 1, but must not claim that the manufactured ring makes its entire 30° travel in that single instant. Likewise, do not assert a particular production two-step or four-step schedule. The internal travel shot above is deliberately separated from the dated midnight shot.

**Illustrative choices:** exact tooth profiles/counts, centre distances, sector width, axial spacing and time expansion in the lifted view. A dark material patch on the ring is an explanatory representation of the contrasting zone, not a verified claim about its factory coating or construction. Keep this evidence boundary in the source panel. The front-facing narration need not become a patent lecture.

## Audio assets

Generator: `../sky-dweller/scripts/audio/generate-month-windows.py`.

Outputs: `../sky-dweller/public/audio/month-windows/narration.mp3`, `narration.json`, raw sentence metadata, WebVTT and transcript. The JSON includes `title`, `text`, `file`, `duration`, and sentence `cues` with `start`, `end`, `text`, and the shot tags used above. The recorded duration and generated sentence times supersede the nominal storyboard times.

Generated recording: **40.032 seconds, 90 words, 10 validated sentence cues**. Sonia uses `en-GB-SoniaNeural`, rate `-12%`, pitch `-8Hz`. The real dial-lift sentence begins at 11.705 s; the drive-train sentence at 19.503 s; April→May at 29.631 s; and the final fixed-window explanation at 35.966 s. The manifest is the timing authority for the scene.

Validation: transcript matches this storyboard; every cue is ordered and within the MP3 duration; full MP3 decoding succeeds. Peak audio level is −3.7 dBFS, with no clipping indicated. No application/UI files were changed.
