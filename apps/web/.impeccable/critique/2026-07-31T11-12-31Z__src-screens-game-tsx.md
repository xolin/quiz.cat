---
target: apps/web/src/screens/Game.tsx
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-07-31T11-12-31Z
slug: src-screens-game-tsx
---
Method: dual-agent (A: a46168c6fbb83b488 · B: aa574f3547b0d28ed)

Provenance: Assessment A reached the live game screen at 390px and played 7 of the 9 mechanics (it had to start the `quizcat-db` container first). Assessment B ran earlier, while the DB was still down, so `POST /api/auth/guest` returned 500 and B never reached the game screen — B's measurements are source-derived, not live-DOM. `image_guess` and `silhouette` were never drawn in ~20 rounds of sampling and are assessed from source only. **No browser overlay was injected**; script mutation was confirmed available, but injection was skipped because the target screen was unreachable at that moment. There is no user-visible overlay in the browser.

Working tree note: `apps/web/src/tv/` (new), `App.tsx`, `Home.tsx` and `styles.css` changed during this run — TV mode is in progress. `Game.tsx` was untouched, so the findings hold.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Counter and 3-channel low-time warning are excellent; the result toast paints *under* the Leaflet map, and a backgrounded tab returns to an already-dead round. |
| 2 | Match System / Real World | 2 | `higher_lower` puts `a` left and `b` right while the question sentence reads `b` vs `a`; a timeout is reported as "Incorrecte". |
| 3 | User Control and Freedom | 1 | No pause; no undo on multiple choice; ordering/timeline auto-submit on the final tap; "Abandona la partida" destroys the match on one tap with no confirmation. |
| 4 | Consistency and Standards | 2 | Strong component system undermined by three different commitment models, two reveal languages, an unstyled white Leaflet tooltip, `borderRadius: 8` in `GeoMap.tsx:76` against a 3/6px system. |
| 5 | Error Prevention | 1 | Nothing guards the irreversible final tap in ordering/timeline, nor the abandon link; the estimation slider is anchored at a misleading default. |
| 6 | Recognition Rather Than Recall | 2 | MC is clean, but `higher_lower` forces you to hold the subject across an inverted layout and the log slider hides its own curve. |
| 7 | Flexibility and Efficiency | 1 | `map_guess` has no keyboard path at all; no number-key shortcuts; the toast's click-to-skip is dead on every media mechanic. |
| 8 | Aesthetic and Minimalist Design | 3 | The real strength. Deductions only for triplicated instructions and dead space below the fold. |
| 9 | Error Recovery | 2 | "Era: X" works for most mechanics and timeline adds a text correction line — but `correctAnswerText` (Game.tsx:217-228) returns empty for `map_guess` and `higher_lower`. |
| 10 | Help and Documentation | 1 | No mechanic is ever explained before it is scored. A first-timer's first map round is an unlabelled world map and a running clock. |
| **Total** | | **17/40** | **Poor — the interaction layer needs an overhaul; the visual layer does not** |

No heuristic is n/a: this is an Operate surface and all ten bind.

## Design Specificity Verdict

**LLM assessment: authored, and authored for this product — as a visual world.** The broadcast-graphics thesis is executed with real discipline. The lower-third is a genuine two-region strap whose entire field takes the category colour rather than a badge on a card; the counter is an object with its own frame instead of a number lost in metadata; the answer panel is a letter-tab + field composite that reads as a lit panel; the numerals are condensed and tabular. Translate the copy to English and this would still not be mistakable for a generic quiz template — no card grid, no pill radius, no shadow stack, no confetti, and the stated anti-reference (retro kitsch) is genuinely absent. Single-family Archivo with the width axis doing the work of a second family is the correct call and it holds.

**Where the authorship stops is the interaction layer.** The world is designed; the system underneath the nine mechanics is not.

- **The media frame is claimed as the unifying grammar and then abandoned twice.** DESIGN.md says every non-pure-MC mechanic inherits `.qc-media`. `ordering` (Game.tsx:471-503) does not — it renders bare `.qc-options` and puts its instruction in a `<p class="qc-label">` *below* the buttons (line 494). `timeline` (506-570) uses the frame and then invents a second reveal language inside it: inline-styled strip cells that go green/red with no per-slot glyph (lines 520-528), on the same screen as `.qc-option` panels that do carry ✓/✗.
- **Three commitment models, undecided.** Multiple choice and higher/lower submit on the first tap. Ordering and chronology submit silently on the Nth tap (lines 485, 548) — and Undo vanishes at the exact moment it becomes irrecoverable. Map and estimation require an explicit Confirma (463, 616). Under a 15-second clock the player cannot learn a single rule about what a tap costs.
- **The timer is mechanic-blind.** `TIME_LIMIT_MS = 15000` flat for quick match and daily. The API already knows better: `SLOW_TYPES = {ordering, timeline, map_guess, estimation}` with a 10s floor (`routes/matches.ts:23-25`), with a comment saying a single floor made slow mechanics "impossible for interface reasons, not knowledge". That insight was applied to Survival's floor and never carried back.

**Deterministic scan: 0 findings.** `detect.mjs` returned an empty array and exit 0 on `src/screens/Game.tsx`, and again on the wider `src/screens` + `src/components` set. The project's own contrast gate (`pnpm design:sheet`, run from the monorepo root) passes all 22 pairs. Computed ratios confirm it: question text 17.0:1, option label 14.9:1, media caption 8.9:1, the two thinnest being the `geo` (4.78:1) and `cult` (4.98:1) category bands, both still over 4.5:1. **The detector's silence is a real result, not a gap: the visual layer is clean, and every issue below is beyond what a rule engine can see.**

**Visual overlays: none.** No injection was performed, so there is nothing to look at in the browser.

## Overall Impression

This is a well-designed surface with a broken system underneath it. The screen looks like quiz.cat and behaves like nine prototypes sharing a stylesheet. The single biggest opportunity is not visual: it is that a player currently loses rounds to causes that have nothing to do with knowing the answer — a stale timer that fails a round before it renders, a timeout that is reported as "you were wrong", and a map mechanic that is a dexterity test in a 15-second window.

## What's Working

1. **The counter and the three-channel low-time warning.** `.qc-counter` as a framed object with its own 92px minimum, rather than a number in the metadata, is the single most correct decision on the screen, and it directly serves the brief's "nothing may compete with the question and the clock". The `--low` state is signalled by red field *and* border-weight change *and* 45° stripes (`styles.css:272-288`), plus stripes on the bar — so it survives both `prefers-reduced-motion` and colour blindness.
2. **The answer panel's `dim` state.** The comments at `styles.css:411-416` record that `opacity: .45` was rejected because it dropped text to 4.26:1 *and* made the grid flicker on every submit, and that a border matching the background made discarded options dissolve exactly when you need to compare all four. Full opacity plus hairline, dimming only the text, is the right answer, and it was reached by observation rather than taste.
3. **The `.qc-media` caption as a per-mechanic instruction rail.** When used as designed it works: the caption is dynamic (`mapPick ? "Confirma o torna a clicar" : "Clica el punt al mapa"`, line 448), it carries the photo credit only after the reveal so attribution never competes with thinking (lines 334-341), and it keeps nine wildly different mechanics inside one recognisable box.

## Priority Issues

### [P0] A round the player never sees can be auto-failed on any real network

**Why it matters.** The countdown effect (Game.tsx:161-176) captures `const limit = remaining` with deps `[round, feedback]`. `loadRound()` sets `submittedRef.current = false` and `setFeedback(null)` *before* awaiting the network (lines 135-141). After a timed-out round `remaining` is already 0, so clearing feedback re-runs the effect with `limit = 0` while the next round is still in flight; on the first 100ms tick `left <= 0 && !submittedRef.current` fires `submit(null)` against the round that is about to load. Verified in source. Assessment A reproduced it with 600ms of simulated latency: `POST /answer {given:null}` → `GET /round` → a second `POST /answer {given:null}` 1.0s later → `GET /round`. The stated usage scene is queue, transport, sofa — mobile networks where >100ms is normal. The player loses a round to an invisible cause immediately after already losing one to the clock, and in Survival it ends the run outright.

**Fix.** Drive the countdown from the round itself: `const limit = round.timeLimitMs`, keyed on `round.index`, or gate the interval on a `loadingRef` held for the duration of the `loadRound` fetch. Reset `submittedRef.current = false` after the await, not before.

**Suggested command:** `/impeccable harden`

### [P1] A timeout is reported as "you were wrong"

**Why it matters.** `expired` is only true when `responseMs > timeLimitMs + GRACE_MS` (`services/scoring.ts:27`, `GRACE_MS = 2000`), but the client submits at exactly `timeLimitMs`. Verified: `feedback.expired` is effectively never true, so the string "Temps esgotat" at Game.tsx:292 is dead code and every timeout renders **"Incorrecte"** next to a sad cat. PRODUCT.md states the audience "can feel evaluated" and that no element may make them feel examined. Conflating *I didn't answer in time* with *I did not know this* is precisely the wrong attribution, and it is the most frequent failure mode in the product. On `timeline` it is worse: a timeout paints all four slots solid red with em-dashes (verified — `ok` is false for every unplaced slot), so "you placed nothing" renders as "everything you did was wrong".

**Fix.** Have the client send `timedOut: true` when it submits `null` and trust that flag for the copy, keeping the server's `expired` for scoring. Show "Temps esgotat" with the correct answer and the neutral mascot, not `trist`. Give the timeline strip a neutral empty state instead of red.

**Suggested command:** `/impeccable clarify`

### [P1] The result toast is painted underneath the media frame

**Why it matters.** `.qc-toast` is absolutely positioned inside `.qc-stagelight`, which has `isolation: isolate` (`styles.css:124`) — a stacking context, so the toast's `z-index` cannot outrank anything outside it. `.leaflet-container` comes later in the DOM and paints on top. Assessment A confirmed with `document.elementFromPoint()` at the toast's own visual centre, which returns `leaflet-container`; the toast is clipped to a ~45px sliver. On map rounds the player gets no usable result feedback at all — and because `correctAnswerText` (lines 217-228) handles neither the `{lat,lng}` nor the `{bHigher,bDisplay}` shape, there is nothing to read even if it were visible. The documented click-to-skip and hover-to-pause affordances are also dead, because the toast is not the hit-test target.

**Fix.** Scope the light bath with its own wrapper instead of isolating `.qc-stagelight`, or render the toast in a portal at screen level. Extend `correctAnswerText` to cover the map and higher/lower shapes.

**Suggested command:** `/impeccable harden`

### [P1] The toast covers the first answer panel

**Why it matters.** Covering the *question* is deliberate and documented (`styles.css:640-641`: it hides the question "which by then you no longer need to read" and leaves the strap and counter visible) — that part is a resolved design decision, and it closes DESIGN.md open item 2. But `.qc-stagelight`'s box is only the `<h1>`, and the toast is 90-145px tall, so it overflows 30-85px below the light bath onto the option grid. Measured on a wrong MC answer: toast bottom 233, option A top 194 — **70% of option A obscured, including its whole letter tab**; with a two-line correction the toast covers it completely. On a correct answer the toast is `--qc-good` green and the correct panel is the same green, so when A is the answer the two merge into one block. The system spent real effort keeping all four panels legible during the reveal (documented at `styles.css:411-416`) and the toast then hides the one the eye reaches first.

**Fix.** Reserve the toast's height in flow above `.qc-options`, or shrink it to one line and let the correction live in the panel that is already flooding green.

**Suggested command:** `/impeccable layout`

### [P2] The estimation slider is logarithmic and says nothing about it

**Why it matters.** `posToVal` uses `K = 5` (line 577), so the visual midpoint of the track maps to ~7.6% of the range, and only the two endpoints are labelled. Assessment A observed a 0-800 range whose thumb sat at the visual centre reading **46**. The default is `posToVal(0.5)` (line 585), so every round anchors the player at 7.6% of the range. The control's spatial semantics contradict its own labels, there is no tick to recalibrate against, and `proximity` scores the player on that miscalibration. Under 15 seconds nobody discovers the curve; they conclude the question was unfair.

**Fix.** Add 3-4 labelled ticks at their true positions and anchor the default at the geometric midpoint of the value range rather than the pixel midpoint. Add `aria-valuetext`.

**Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Casey (distracted, one-handed, on the go)** — the persona PRODUCT.md actually describes, and the worst served.
- **Backgrounding kills the round.** The countdown is `Date.now()`-based while `setInterval` is throttled in a hidden tab. Switch apps for a notification and you return to `submit(null)` already fired. There is no pause. `styles.css:303-306` shows the team already thought about backgrounded-tab clock jumps — but only to keep the *bar* in sync, never to make the *round* fair.
- **All interaction lives in the top half.** At 390×844 content ends around y≈583; ~260px at the bottom — the easiest one-handed reach — is dead. The answer panels sit at y≈190-440, the furthest stretch for a thumb.
- **`map_guess` is not a one-handed task.** Whole world at zoom 1, ~20px city target, Leaflet +/− controls at ~30×29px (below the system's own 44px minimum), then a second tap on Confirma, in 15 seconds, moving.
- **"Abandona la partida" has no confirmation.** A bare `<a href="#">` at Game.tsx:643-648 with no padding — ~21px tall, below both the 44px house minimum and the 24px WCAG 2.5.8 floor — POSTs `/abandon` and destroys the match on one stray tap, in the region where a thumb rests.

**Sam (screen reader / keyboard)**
- **The question is never announced.** `<h1 class="qc-question">` has no `aria-live` and no `role`. A new round swaps the h1 silently; a screen-reader user must re-navigate the document every round against a 15-second clock.
- **The clock is never announced.** `.qc-counter` has `role="timer"` with no `aria-live`, and ARIA's implicit live value for `timer` is `off`. A blind player has no way to perceive time remaining at all, and no warning before it expires.
- **Focus is destroyed every round.** After a round loads `document.activeElement` is `BODY` (confirmed live). A keyboard or remote user tabs in from the top eight times per match. **The TV-remote mode now in progress inherits this directly.**
- **`map_guess` is unplayable by keyboard.** `GeoMap.tsx:76` renders a bare `<div>` with Leaflet click handlers — no focusable target, no keyboard alternative, no text fallback. Roughly 1 round in 9 has no path to completion.
- **The estimation slider announces the wrong number.** `value={Math.round(valToPos(val) * 1000)}` with no `aria-valuetext` (lines 598-602): the screen reader reads the slider *position* ("463") while the screen shows the *estimate* ("46").
- **The chronology strip is the one place that breaks the house colour rule.** Lines 520-528 set the slot background to `--qc-good` or `--qc-live` with no per-slot glyph. It is not colour-*only* — the year appears per cell and a "Correcte: …" text line follows when wrong — but it is the only reveal in the codebase without the ✓/✗ its own `.qc-option` siblings carry, six lines away.

**Jordan (first-timer)**
- **Nothing is ever taught.** "You never know what's next" is delightful only if each mechanic is instantly legible. The only instruction is a 12px uppercase caption, and for `ordering` it sits *below* the control it governs.
- **The commitment model has to be learned by losing.** Jordan's first ordering round ends the moment they tap a fourth item "just to see" — auto-submit, no confirm, Undo gone.
- **`higher_lower` reads backwards.** Observed: "Tailàndia té més o menys població que Brasil?" over a panel showing **Brasil** left with its value and **Tailàndia** right with "?", options labelled only "Més població" / "Menys població".

## Minor Observations

- **`audio_clip`'s caption is hardcoded "Clip de veu"** (line 322) but the type also serves instrument questions — observed live: "Quin instrument sona?" under a caption reading VOICE CLIP.
- **"ratxa +0" renders** whenever `speedBonus > 0` (line 295 gates on `||` then prints both), producing "rapidesa +37 · ratxa +0" on a screen whose scoreboard simultaneously reads RATXA 1.
- **The Leaflet tooltip is unstyled default white** (`rgb(255,255,255)` on `rgb(34,34,34)`) — a white pill on the dark studio map. DESIGN.md claims Leaflet is fully retokenised; the tooltip was missed.
- **`GeoMap.tsx:76` hardcodes `borderRadius: 8`** against a 3px/6px system.
- **The map tiles are still unreadable.** `brightness(1.45)` has not solved it: land and sea both render near-black, separated only by hairline borders. The stated goal — in a map question the geography must be recognisable — is not met.
- **`silhouette` fills the revealed shape with `--qc-amber`** (line 366), and a full silhouette is a field; amber is documented as never filling a field outside a home-screen mode. *(Source-only: the mechanic was never drawn.)*
- **`image_guess` recomputes a CSS `blur()` on a full-width 4:3 image every 100ms** (lines 347-352) with a 0.15s transition and a 1.08 scale — roughly 14 full re-rasterisations per round on a mid-range phone. *(Source-only.)*
- **Timeline strip cells lack `overflow-wrap`** (lines 525-528) despite the house rule for any flex cell containing text; at 390px each cell is ~85px wide and holds labels like "Primer vol dels germans Wright".
- **The summary is a graded exam paper.** `Summary.tsx` renders a per-round transcript with ✓/✗, the question, the points and **your response time to one decimal** (`· 3.4s`), and line 53 sets the host cat to `trist` whenever `correct <= total/2`. Peak-end says the ending is what people carry; the ending here is a report card delivered by a disappointed animal. This is outside the critiqued target but is the same tone commitment.
- **DESIGN.md has drifted from the code.** Open item 1 says the round sweep is unimplemented — it exists at Game.tsx:239. Open item 2 says the toast covers the strap and counter — it no longer does; it covers the question deliberately and option A accidentally. Open item 5 says photo licences are unverified, which PRODUCT.md now contradicts.

## Questions to Consider

1. **If the clock is the product, why is it the same length for every mechanic?** The API already encodes the answer (`SLOW_TYPES`, 10s floor) and the toast already varies by mechanic. What breaks if `timeLimitMs` becomes a property of the question type everywhere — and would that let the map round finally be a knowledge test rather than a dexterity test?
2. **What if the timer paused when the player left?** The brief says people play in dead time, which is by definition time that gets interrupted. Pausing on `visibilitychange` and resuming with a 3-2-1 costs nothing in fairness — the server is still the arbiter — and removes the single most unfair loss in the product.
3. **The toast exists because the reveal needs narration, but the answer panels already narrate.** They flood, they flip to ✓/✗, they shake. What is left for the toast that the panels cannot say — the points, and the cat? If the score bump moved to the scoreboard where it already animates, and the cat moved to the strap, the toast could shrink to nothing and three defects above would disappear with it.
4. **Should "wrong" and "out of time" ever share a visual treatment?** Right now they share the colour, the mascot, the word and the scoreboard consequence. Splitting them costs one string and one mascot mood, and it is the cheapest available purchase on the "never feel examined" commitment.
5. **What is the one gesture that means "I commit"?** Every mechanic answers differently. If it were always the same, would "you never know what's next" get *more* thrilling rather than less, because the only unknown left would be the question itself?
6. **Whom is the summary screen for?** It reports per-question response times to a tenth of a second. That is data for a study tool. "Seterra estudia; quiz.cat juga" — does the end screen know which one it is?
