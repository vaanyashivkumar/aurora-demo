# Context Prompt — Rebuild the Home Landing Page "Guided Walkthrough"

> Paste this whole file as the opening message to an engineer or coding agent.
> It is written to be self-contained: everything needed is below, no prior conversation assumed.

---

## 1. Your role

You are a senior front-end engineer with a motion-design background. You are improving the
**guided walkthrough player** on the home landing page of *Aurora AI — Clinical Console*, a
static demo web app. The walkthrough is the single most important asset on the page: it is
what a visitor watches to understand the product in ~30 seconds. Right now it works, but it
reads as "a slideshow with a cursor drawn on top," not as a convincing product demo.

**Do not start coding until you have completed Step 8 (Plan first).**

---

## 2. Repo context

| | |
|---|---|
| **Root** | `C:\Users\Vaanya\aurora-demo` |
| **Stack** | Vanilla JS, no framework, **no build step**, no package.json |
| **Libraries** | GSAP 3 + ScrollTrigger, vendored locally (`gsap.min.js`, `ScrollTrigger.min.js`) |
| **Files** | `index.html` (shell) · `app.js` (~86 KB, all logic + all view rendering) · `styles.css` (~47 KB) · `data.js` (mock patients) · `serve.py` (dev server) |
| **Run it** | `python serve.py` → http://localhost:8138 (threaded, sends no-cache headers) |
| **Deploy** | Static / GitHub Pages (`.nojekyll` present) |

Conventions already in the codebase — **match them, do not introduce new ones**:

- Views are rendered by building HTML strings and assigning `innerHTML`. There is no templating library.
- `$(sel)` / `$$(sel)` are the querySelector / querySelectorAll helpers.
- `esc(str)` escapes user-facing strings. `svg(path, size)` builds inline icons from the `ICON` map.
- All colour comes from CSS custom properties (`--teal`, `--ink`, `--muted`, `--surface`, `--paper`, `--line`…). **Never hard-code a hex value** that duplicates an existing variable.
- `GSAP_OK` is a boolean guard; `prefersReduced()` wraps `prefers-reduced-motion`. Every animation path must check both and degrade to a static, still-usable state.
- CSS is authored in the same dense, single-line-rule style as the rest of `styles.css`.

---

## 3. How the walkthrough works today (read this before touching anything)

**It is not a video file.** It is a simulated browser window built from live DOM.

**Code locations:**

- `app.js` **440–461** — `HOME` object. `HOME.story.steps` is the 7-step script (`title`, `caption`, `url`).
- `app.js` **463–464** — `PLAYER` state (`{i, timer, steps}`) and `PL_DUR = 4600` (ms per step, constant).
- `app.js` **465–493** — `wfRail()`, `wfBar()`, `wfShell()`, `frameVisual(i)`. **`frameVisual` is a hand-rebuilt miniature of each real app screen** — a parallel, simplified re-implementation of the actual UI.
- `app.js` **494–507** — cursor/feedback primitives: `revealPlayer`, `typeUrl`, `CURSOR_TARGETS`, `ripple`, `press`, `STEP_TOAST`, `reactClick`, `wfToast`, `STEP_PROCESS`, `wfProcess`, `revealResult`, `stepFeedback`.
- `app.js` **508–523** — `cursorTour(frame)`: builds a GSAP timeline that walks the fake cursor first to the active sidebar dot, then through `CURSOR_TARGETS[step]`, clicking each.
- `app.js` **525–554** — `showFrame(i)`, `playPlayer`, `pausePlayer`, `stopPlayer`.
- `app.js` **555–567** — `buildPlayer(steps)`: injects frames, cursor, ripple, toast, processing chip, poster; wires controls.
- `app.js` **568–603** — `renderHome()`: the landing page, including the `.player` markup.
- `styles.css` **485–504** — `.player`, `.chrome`, `.screen` (**`aspect-ratio: 16/10`, `max-width: 920px`**), `.frame`, `.cap`, `.poster`, `.controls`.
- `styles.css` **517–579** — the `.wf-*` mini-app design system (rail, KPIs, donut, thumbs, cursor, click ripple, toast, processing chip, live dot).
- `styles.css` **594** — the global `prefers-reduced-motion` block.

**Runtime flow:**

1. `renderHome()` → `buildPlayer(HOME.story.steps)` → `showFrame(0)`; a poster scrim covers the screen.
2. Click poster (or the hero's "Watch walkthrough" button) → `playPlayer()`.
3. `playPlayer` sets `setInterval(… , PL_DUR)` which calls `showFrame((i+1) % steps.length)` forever.
4. `showFrame(i)` toggles `.on` on the right frame, retypes the URL bar, updates the segmented progress bar, animates the frame in (zoom + fade + slide), then calls `cursorTour(frame)`.
5. `cursorTour` kills any previous timeline and builds a fresh one starting at `delay: 0.4`.

---

## 4. Known defects — fix these, and explain in your PR how each was fixed

These are confirmed by reading the code. Treat them as the baseline bug list.

1. **Two independent clocks.** Step advance is a `setInterval(PL_DUR)`. The cursor choreography is a
   separate GSAP timeline. The progress-bar fill is a *third* tween (`gsap.fromTo(fill, …, {duration: PL_DUR/1000})`).
   Nothing synchronises them, so they drift, and pausing mid-step leaves the bar wrong.
2. **Fixed 4.6 s per step regardless of workload.** Step 3 ("AI Analysis") must move the cursor to the
   sidebar, then to `.wf-opt.hot`, then to `.wf-cta`, then run a ~1.05 s processing chip, then a toast,
   then reveal the result — inside the same 4.6 s as step 5, which has one click and nothing else.
   **Duration must be derived from the choreography, not hard-coded.**
3. **The cursor teleports between steps.** Positions are computed relative to the new frame, so the
   cursor jumps rather than travelling. A real screen recording never does this.
4. **Loop restart is a hard cut.** After step 7 it snaps back to step 1 with no transition or "replay" affordance.
5. **`resetFrameState()` is incomplete.** It clears `.picked` and `.wf-result` opacity, but an in-flight
   toast / processing chip from the previous step can still be on screen after a rapid prev/next.
6. **It plays while off-screen.** No `IntersectionObserver` and no `visibilitychange` handling — the
   timeline burns CPU when the player is scrolled out of view or the tab is hidden.
7. **No hover-to-pause**, no keyboard control (space / ← / →), no focus-visible styling on `.wf-seg`.
8. **Accessibility gaps.** Step changes are not announced (no `aria-live`); the fake cursor, ripple and
   toast are decorative but not `aria-hidden="true"`; captions exist visually but there is no text
   transcript for screen readers.
9. **`prefers-reduced-motion` yields a dead player.** `playPlayer()` returns early with
   `playing = false`, so a reduced-motion user gets frame 1 and must manually click Next. It should
   instead present a clean, static, readable storyboard.
10. **Drift risk.** `frameVisual()` re-implements the app's UI a second time. When the real dashboard
    changes, the walkthrough silently keeps showing the old one. Call this out in your plan and
    propose a mitigation (even if you don't implement it).

---

## 5. Decide this first, then tell me before you build

The current thing is a **simulated player**, not a video. Two viable directions:

- **(A) Keep it live-DOM, make it excellent.** Stays crisp at any resolution, themeable, zero asset
  weight, editable by changing a script array. Cannot be shared as a file.
- **(B) Produce a real video** (record the improved player, export MP4/WebM + poster, ship a `<video>`
  with `muted autoplay loop playsinline` and a captions track). Shareable and embeddable; adds
  megabytes, goes stale, and loses theme-awareness.

**Recommendation: (A), architected so that (B) becomes a trivial screen-capture of it later.**
State your choice and your reasoning in your plan. Do not silently pick one.

---

## 6. What "better" means — acceptance criteria

The rebuilt walkthrough must satisfy **all** of the following. These are testable; I will check them.

**Timing & motion**
- [ ] **One master GSAP timeline** owns the whole tour. Step advance, cursor choreography, and progress
      bar are all driven from it. `setInterval` is gone.
- [ ] Each step's duration is **computed from its own choreography** (travel + clicks + processing +
      toast + a read-beat for the caption), not a shared constant.
- [ ] The cursor **travels between steps** with easing; it never teleports.
- [ ] Cursor motion is not linear point-to-point: use eased, slightly arced movement with a brief
      settle before each click. It should read as a hand, not a tween.
- [ ] Scrubbing the segmented bar seeks the master timeline (`timeline.seek()`), so bar, cursor and
      frame are always consistent.

**Narrative**
- [ ] The script has an arc, not a menu tour: **problem → the scan → the AI → the disagreement/consensus →
      the decision → the artefact**. Rewrite `HOME.story.steps` captions to carry that arc.
- [ ] Captions are short enough to actually read in the time they're on screen (≈ 2.5 words/second).
- [ ] The loop either ends on a persistent "Replay / Start an analysis" end-card, or cross-fades cleanly
      back to step 1. No hard cut.

**Robustness**
- [ ] Pauses when scrolled out of view (`IntersectionObserver`) and when the tab is hidden.
- [ ] Pauses on hover, resumes on leave (or a documented, deliberate alternative).
- [ ] Space toggles play/pause; ← / → step; the player is focusable and shows a visible focus ring.
- [ ] Rapid prev/next/scrub spam leaves **no** orphaned toast, spinner, `.picked` or `.wf-clicked` state.

**Accessibility**
- [ ] `prefers-reduced-motion` → a static, complete, readable storyboard (all steps legible, no motion),
      not a frozen frame 1.
- [ ] Step changes announced via a polite `aria-live` region.
- [ ] Decorative cursor / ripple / toast marked `aria-hidden="true"`.
- [ ] Controls keep their existing `aria-label`s and remain reachable by keyboard.

**Fidelity**
- [ ] Keep the 16:10 `.screen` and the 920 px max width. The player must not push the page layout around.
- [ ] Do not regress the existing look: browser chrome, teal glow, poster, segmented timeline, live dot.
- [ ] Everything still themes off the existing CSS custom properties.

---

## 7. Hard constraints

- **No build step. No npm. No new runtime dependency.** GSAP is already vendored; use it.
- Do not add a framework, a bundler, or a CSS preprocessor.
- Do not rewrite unrelated parts of `app.js`. Your diff should be confined to the walkthrough region
  (roughly `app.js` 440–603), its CSS block (`styles.css` 485–579), and any new markup in `renderHome()`.
- The clinical framing is a **research-preview demo on sample data** — the page already says
  "not for clinical use." Do not write copy that implies diagnostic authority or regulatory clearance.
- Keep the mock data mock. Do not wire the walkthrough to real patient records.

---

## 8. Plan first (required)

Before writing code, reply with:

1. Your choice from Section 5 (A or B) and why.
2. The new 6–8 step script — titles and final caption copy — showing the narrative arc.
3. The master-timeline architecture: how a step's duration is computed, how seek/pause/resume work,
   and how you keep the progress bar in sync.
4. Your mitigation for defect #10 (walkthrough drifting out of sync with the real UI).
5. Anything in Section 6 you think is wrong or not worth doing — push back if you disagree.

Wait for my approval on the plan. Then implement.

---

## 9. Verification before you call it done

- Run `python serve.py`, open http://localhost:8138, click through to the landing page.
- Watch the full loop twice end-to-end. The second loop must look identical to the first
  (no accumulated state).
- Scrub the timeline backwards and forwards rapidly; confirm no orphaned toast/spinner.
- Toggle OS "reduce motion" and reload; confirm the static storyboard is complete and readable.
- Tab to the player; confirm focus ring, space, ← and →.
- Scroll the player off-screen mid-play and back; confirm it paused and resumed cleanly.
- Check the console is clean.

Report what you actually observed, including anything that didn't work.

---

## 10. Out of scope

The onboarding coach-marks tour (`startTour` / `TOUR` / `#tourScrim`, `app.js` 347–360) is a **different
feature** that runs inside the signed-in app. Leave it alone.
