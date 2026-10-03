# Design of Job Assistant

I built Job Assistant as a master's student who is applying for internships and jobs myself. This document explains who I designed it for, the principles I followed, and why the interface looks and moves the way it does. It also lists three trade-offs I made on purpose.

The design tokens live in `frontend/src/index.css`. The shared motion settings live in `frontend/src/lib/motion.ts`. The 3D scenes live in `frontend/src/three/`.

## 1. Who it is for and what problem it solves

**Target users.** Students and early-career developers who apply to many positions at the same time. I am one of them, so the problems below come from my own job search, not from a formal user study. A study with other applicants is the first thing I would add with more time.

**Their problems.**

| Problem | What the app does about it |
|---|---|
| "Do I even fit this job?" Reading a long posting against my own resume is slow and I am biased about myself. | An AI match score from 0 to 100, with the skills that match and the skills that are missing. |
| Writing a new cover letter for every application takes an evening. | A cover letter generated from the resume, limited to 300 words, that is told never to invent experience. |
| After ten applications I lose track of which one is at which stage. | A dashboard as a list or as a Kanban board, one column per status. |
| I do not see patterns. The same skill may be missing in many postings and I never notice. | An insights page that counts the most often missing skills across all analyzed applications. |
| I do not want to paste my resume into a cloud chatbot. | The AI model runs locally through Ollama. |

## 2. Design principles

1. **The answer first.** The most important thing on a screen is the largest thing on it: the score on the application page, the status columns on the board, the missing skill on the insights page.
2. **Show the evidence.** A score alone is not trustworthy. The Compare tab puts my resume next to the job description and marks the skills, so I can check whether the AI was right.
3. **Honest about the AI.** The interface says when an answer came from the cache, which model made it and when, and reminds the user to read the cover letter before sending it. The animated "steps" while the AI works are an illustration of the wait, not real progress, and the code comments say so.
4. **Calm by default, expressive at key moments.** Most of the interface is quiet paper and ink. Color, motion and 3D are saved for the moments that matter: the first impression, a result arriving, a card moving, an offer.
5. **Works for everyone.** Keyboard, screen reader, phone, dark mode and reduced motion are part of the design, not extras added at the end.

## 3. Color

I wanted the app not to look like a default template, where a white page with an indigo button is the common starting point. The palette has three parts.

**Paper and ink (the neutrals).** The background is a warm off-white (`oklch(0.975 0.008 95)`) and the text is a green-black (`oklch(0.21 0.02 165)`), not pure white and pure black. A job search is stressful, and a warm paper tone feels calmer and more like a document than a dashboard. In dark mode the two swap: a green-black background with warm off-white text.

**One strong accent: electric lime** (`--brand`, `oklch(0.9 0.2 125)`). I use it sparingly: the logo, the marker stroke behind "not harder." on the landing page, active navigation, progress, the glowing spheres of the 3D scenes, and in dark mode the main button. One accent means that when lime appears, it means "this is the brand" or "this is the next step", and nothing else.

Lime is a difficult color: it is very bright, so lime text on a light background is unreadable. I solved this with a rule instead of a compromise color:

- Lime is never used as text on a light background. It is always a **surface with ink text on it** (contrast 13.6:1).
- In light mode the main button is ink with paper text (14.7:1). In dark mode the main button is lime with ink text (13.9:1).
- The keyboard focus ring is ink in light mode and lime in dark mode, so it always has strong contrast with the page.

**Meaning colors (semantic).** Green, yellow and red are reserved for the score and the skills: green for a strong match and matching skills, yellow for a partial match, red for a weak match and missing skills. The five statuses have their own dot colors. These colors are never used for decoration, so they keep their meaning. They are also never the only signal: a status always has its name next to the dot, and the score always has a number and a label.

**Charts use one color.** I tested the five status colors as a chart palette with a color-blindness check, and red and green were too close to tell apart. So both charts use a single color, with the name on the axis and the value written at the end of the bar.

## 4. Typography

- **Fraunces** for headings. It is a serif with soft, slightly irregular shapes. It gives the product a voice, and a serif heading on warm paper makes the app feel closer to a letter or a CV than to an admin tool.
- **Geist** for everything else. It is a clean sans-serif that stays readable at small sizes and has tabular numbers, which matters for scores and counts that change.

The pairing follows a simple rule: character where there is little text (headings), neutrality where there is a lot (body, forms, tables). Both fonts are bundled with the app, so no request goes to a font server.

## 5. Spacing, radius and shadows

All three are tokens, so the interface stays consistent.

- **Spacing** uses one 4-pixel scale. Cards have 20 to 24 px of padding, sections are 24 px apart.
- **Radius** comes from one base value (`--radius: 0.75rem`). Small controls use a smaller step and cards a larger one.
- **Shadows** have exactly three steps: `shadow-card` (a card at rest), `shadow-raised` (hovered or dragged), `shadow-pop` (a floating layer). The shadows are tinted with the ink color instead of pure black, which looks softer on the paper background. In dark mode shadows are barely visible, so cards are separated by a border and a slightly lighter surface instead.

## 6. 3D: where I use it and where I do not

I use real 3D (WebGL, with three.js through React Three Fiber) in exactly three places, and each has a reason.

| Place | What it shows | Why 3D helps here |
|---|---|---|
| Landing page hero: the **skill galaxy** | Skills as glowing spheres connected by lines, slowly turning, leaning gently towards the mouse. Skills you have glow in the accent color; skills to learn are dimmer. | A visitor decides in seconds whether a product is worth a look. The galaxy shows the core idea, "your skills against a job's skills", before a single word is read. Nobody has to operate it. |
| Analysis result: the **score orb** | A glass orb that fills up and turns from red over yellow to green while the number counts up. | The score is the moment the user waited up to a minute for. Filling up is a physical picture of "how much of this job do I cover". |
| Insights: the **skill universe** | The most often missing skills as spheres. Bigger and closer means missing more often; hovering shows the number. | Depth is a natural way to show importance: what is close feels urgent. It invites exploring, which fits a page meant for reflection. |

**Why not on the dashboard and the Kanban board.** These are the screens where I work: I read many titles, compare statuses, and drag cards. Work screens need three things that 3D makes worse:

- **Reading speed.** Flat text in straight rows is the fastest thing to scan. Perspective makes text smaller, tilted or overlapping.
- **Precise pointing.** Dragging a card to a column needs a stable, predictable target. A moving or tilted scene makes targets harder to hit, and harder still on a phone.
- **Keyboard and screen reader use.** A list and a board have a clear order. A 3D scene does not.

So the dashboard and the board stay 2D. The only 3D-like touch there is a **tilt of a few degrees** when the mouse is over a card in the list. It is a plain CSS transform, it does not move the card's content out of place, and it is off on touch screens and with reduced motion.

**3D is never the only way to get information.** The galaxy is decoration with a text description. The score is always a real number in normal text on top of the orb. The skill universe sits directly above a 2D bar chart with the same numbers, and a hidden table for screen readers.

**The scenes match the design system.** The spheres use the lime accent, the lines use the ink color, the canvas is transparent so the paper background shows through, and the labels are normal page text in the app's font. The scene colors are defined per theme, so light and dark mode both work.

## 7. Performance decisions

3D is the most expensive thing in this project, so I set rules for it.

- **Lazy loading.** All 3D code is in separate files that are downloaded only when a 3D scene is about to be shown. The dashboard, the board, the forms and the login page never download it. The 3D code is about 937 kB (251 kB compressed); the main bundle grew by only about 12 kB.
- **The page is usable before 3D arrives.** Each scene has a static version (the galaxy as a flat drawing, the orb as the 2D ring, the universe as flat bubbles). That static version is what is on screen while the 3D code loads, so text and buttons are never waiting for it.
- **Limited pixel ratio.** Very sharp screens would render four to nine times as many pixels. I cap the ratio at 1.5 (1.25 on phones).
- **Rendering stops when nobody is looking.** A scene stops drawing completely when it is scrolled off-screen or when the browser tab is in the background.
- **Simpler scenes on phones.** Fewer skills, fewer triangles per sphere, no anti-aliasing.
- **Cheap effects.** The glow is a second, transparent sphere, not a post-processing effect. Labels are page elements moved by a few lines of code, not text rendered in 3D.
- **No 3D at all when it would not work or is not wanted.** Without WebGL, or with "reduce motion" switched on, the static version stays and the 3D code is never downloaded. If a scene crashes, the static version replaces it.

## 8. Motion principles

1. **Motion explains.** Every animation answers a question. "Where did my card go?" The card glides into its new column. "What did I open?" The dashboard card grows into the header of the detail page. "Did something change?" A number counts to its new value.
2. **Fast.** Interface animations take between 0.15 and 0.4 seconds. The only slower movements are the ambient ones (the drifting background and the turning galaxy on the landing page) and the score orb filling up (about one second), because the score is the result the user was waiting for.
3. **Never blocking.** No animation has to finish before the user can click. A dragged card moves immediately and the backend is updated in the background; if that fails, the card goes back and a message explains why.
4. **One celebration.** Confetti appears only when an application moves to Offer. If it appeared for every action it would mean nothing.
5. **Respect the user's setting.** With "reduce motion" switched on in the operating system, movement animations are off: there is no gliding, no growing, no tilt, no confetti, the landing page preview does not cycle, and the 3D scenes are replaced by their static versions. Numbers show their final value at once. Short fades remain, because they do not move anything.

The techniques, for a reader of the code: shared `layoutId` for the card-to-page transition and the sliding tab highlight, `layout` for the Kanban cards, staggered variants for lists, and `MotionConfig reducedMotion="user"` at the root of the app.

## 9. Accessibility decisions

- **Contrast.** I computed the contrast of the text and control colors of the design tokens against their backgrounds in both modes. Body and muted text are above 6:1, and every pair I checked meets the 4.5:1 target of WCAG AA for text. Input borders and focus rings are above 3:1. The colored score and status texts were checked on the card background; the lowest is 5:1.
- **Visible keyboard focus.** Every link, button, tab and option gets a 2 px outline when reached by keyboard. It does not appear after a mouse click.
- **Skip link.** The first Tab on a page reaches "Skip to content", so keyboard users do not have to pass the navigation every time.
- **Everything works without a mouse.** The command palette (Cmd+K), the shortcuts, and the Kanban board (focus the handle, Space, arrow keys, Space) are all usable from the keyboard. Shortcuts are switched off while typing in a field.
- **Screen readers.** Icon-only buttons have labels. Decorative elements are hidden. Each chart has a hidden table with the same numbers. Animated counters expose the final value, not the numbers in between. Each 3D scene is announced as one picture with a description, for example "Match score 80 out of 100", and its canvas is hidden from the screen reader.
- **3D never blocks.** The galaxy and the orb ignore the mouse and touch completely, so they cannot swallow a click or stop a scroll. The skill universe can be hovered or tapped, and a finger can still scroll the page over it.
- **Color is never the only signal**, as described in the color section.
- **Phone.** Every page is checked at 390 px width without sideways scrolling. The board scrolls inside its own area.

What I have **not** done: a test with a real screen reader user, and a full audit against every WCAG criterion. My checks were computed contrast values, keyboard walkthroughs and automated browser checks, including runs with WebGL switched off and with reduced motion. I also have not measured frame rates on real low-end phones; the phone checks were done at phone screen size on my laptop.

## 10. Three trade-offs I made

**1. A distinctive accent color instead of an easy one.**
Lime gives the product a recognizable identity, but it cannot be used as text on light backgrounds, and it is close to the green that means "match". I accepted two costs: the main button looks different in light mode (ink) and dark mode (lime), and I had to write down a strict rule for where lime is allowed. A blue accent would have needed neither, but the app would look like many others.

**2. 3D in three places, at the price of a large download.**
The 3D scenes make the project memorable and they explain its idea, but three.js is big: about 251 kB compressed, close to the size of the rest of the app's code. I accepted that cost under three conditions: the code is only downloaded on pages that show a scene, every scene has a static version that appears first, and the work screens stay 2D. The alternative was to fake the galaxy with CSS, which would have been lighter but could not show real depth or the filling orb. A related small cost: the animated "AI steps" shown during the wait are an illustration, not real progress, because the local model sends one answer at the end.

**3. Optimistic updates on the board instead of waiting for the server.**
When a card is dropped, the interface changes at once and the server is told afterwards. This makes the board feel instant, which matters for an action the user repeats often. The cost is complexity and a rare moment of "untruth": for a fraction of a second the screen shows a status the server has not confirmed. If the server refuses, the card moves back and an error message says so. For a personal job tracker I judged speed to be worth this; for something like a payment I would wait for the server.
