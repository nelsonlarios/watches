# Saros calendar: production evidence and explanatory kinematics

Scope: the original 2012 Sky-Dweller, calibre **9001**, reference **326939**, white gold, ivory Roman-numeral dial and Oyster bracelet. This note does not identify the later calibre 9002 as mechanically identical.

## What the primary sources establish

**Rolex's 2012 launch dossier, PDF page 6**, is the strongest production account located. It specifies a fixed central wheel, an orbiting satellite carried by the date disc, **four correction fingers**, a double advance at the ends of April, June, September and November, and a manual correction on 1 March. Its page 10 identifies calibre 9001; page 12 identifies reference 326939. The dossier does not publish production tooth counts, contact profiles, dimensions or spring data. [Rolex-authored dossier, externally hosted](https://www.thewatch.co.il/image/users/190146/ftp/my_files/ROLEX/Sky-Dweller_EN.pdf), local copy: `sources/rolex-sky-dweller-launch-2012.pdf`.

**EP1596261B1**, description [0019–0034], is a Rolex patent with a schematic example: a 31-position date ring, a spring/cam release, an additional finger ahead of the ordinary driving finger, and coaxial rolling/program satellites. Its example uses **123 fixed teeth, 36 rolling satellite teeth and five program teeth**, including a February correction on the mechanical 30th. The correction finger moves 30→31 before the ordinary finger moves 31→1 during the same release. This example is not evidence of the exact production configuration. [Rolex patent EP1596261B1](https://patents.google.com/patent/EP1596261B1/en), local copy: `sources/EP1596261B1-annual-calendar.pdf`.

**US20190179264A1**, paragraphs [0057–0059], expressly distinguishes four program teeth when February is excluded from five when it is included. Its first example has four, on a satellite carried by the date ring and engaged with a fixed wheel. This corroborates a documented four-tooth architecture, but does not connect its dimensions or gearing to production calibre 9001. [Rolex patent application US20190179264A1](https://patents.google.com/patent/US20190179264A1/en), local copy: `sources/US20190179264A1-calendar-variant.pdf`.

## Derived configuration used by the interactive demonstrator

The demonstrator follows production **four-finger behavior**, while using the documented **123/36 patent ratio** as a disclosed explanatory example. That pairing is a mathematical construction, not an authenticated Rolex production tooth count.

For external meshing with a stationary central wheel, let `c` be carrier/date-ring rotation and `p` the satellite's absolute rotation, both in the same positive direction. The rolling constraint is:

```
123 × (0 − c) + 36 × (p − c) = 0
p = (1 + 123/36)c = (53/12)c
p − c = (41/12)c
```

Thus the satellite turns **4 + 5/12 absolute revolutions** during one orbit. Comparing it at the *same carrier position* in successive months leaves a phase change of **5/12 revolution, or 150°**. Saying that the satellite merely turns 150° over a month would be incorrect: that is the sampled residual, not its complete rotation.

Use January's date-30 inspection position as zero, and twelve possible program positions. The successive sampled residues are:

| Month | Sampled phase, twelfths | Four-finger contact slot | Date-30 result |
|---|---:|---:|---|
| January | 0 | gap | 30→31 |
| February | 5 | gap | 30→31, if not manually corrected |
| March | 10 | gap | 30→31 |
| April | 3 | 9 | 30→31→1 |
| May | 8 | gap | 30→31 |
| June | 1 | 11 | 30→31→1 |
| July | 6 | gap | 30→31 |
| August | 11 | gap | 30→31 |
| September | 4 | 8 | 30→31→1 |
| October | 9 | gap | 30→31 |
| November | 2 | 10 | 30→31→1 |
| December | 7 | gap | 30→31 |

Place four physical program fingers at local slots **8, 9, 10, 11**. A finger meets the fixed inspection ray when `(monthPhaseSlot + fingerSlot) mod 12 = 0`. Together with the carrier pivot's arrival at the inspection position, this produces exactly four correction signals. There is no month-length lookup in the simulation's decision path. Adding a fifth finger at slot **7** produces the patent example's additional February signal.

The slot labels and angular zero are arbitrary calibration choices. Rotating the entire arrangement, or reversing every sign and rephasing the fingers consistently, does not change its calendar function. For the three-dimensional scene, satellite **relative** angle must be used inside a rotating carrier group; absolute angle must be used for a mesh in world coordinates. Mixing these counts the carrier rotation twice.

## How the jump should be shown

The date ring always has **31 positions**. During an ordinary midnight, its normal driving finger supplies one step. At the date-30 inspection position in a correction month, the additional driving finger finds a program finger. Its impulse, constrained by the rolling satellite and fixed wheel, advances the ring one extra position. The ordinary finger follows and supplies its usual step. The two phases share one spring/cam release, so the intermediate 31 should be visible only in an explicitly slowed inspection.

The spring/cam provides stored energy and a rapid release; the program wheel determines whether the extra engagement occurs. The cam is not a month-length cam. There is no electronic sensor or calculation inside the watch: the tooth arrangement and phase preserve the mechanical state of the year.

In this four-finger configuration February has no automatic shortening. In a common year, after midnight at the end of 28 February, a still-running uncorrected display would show 29, and in a leap year it would show 30 after 29 February. The owner corrects the calendar to 1 March. The simulator intentionally does not pretend it knows February's length or the leap-year cycle.

## Precision boundary

Verified production behavior: four correction fingers; four 30-day corrections; annual March intervention; month indication by the dial apertures. Verified patent example: 123/36 ratio, five-tooth program, 31-position ring, consecutive correction/ordinary driving phases, spring/cam release. Derived and explicitly schematic: the four-finger 123/36 combination, arbitrary phase zero, normalized animation timing and linear visual interpolation.

Exact production pitch diameters, tooth modules and flanks, centre distances, clearances, axial stack, driver angular sweep, contact-window widths, cam contour, spring force and measured jump time have **not** been established. Consequently, the simulation gates engagement at the ideal alignment point and represents the documented contact sequence; it is not a contact-force or full tooth-collision solver. The `0–0.5` / `0.5–1` inspection windows are editorial time expansion, not measured durations.

## Executable verification

`node research/check-calendar-kinematics.mjs` checks all 372 date positions across the twelve months, the four geometric correction signals against independent calendar expectations, continuous ring/satellite positions through the double jump, 31 physical steps per full month, no-slip rolling, local/world angle consistency, annual closure over multiple cycles, and the separate five-tooth patent pattern. The module also passes a strict isolated TypeScript check.

Implementation: `../sky-dweller/app/mechanics/calendar-kinematics.ts`.
