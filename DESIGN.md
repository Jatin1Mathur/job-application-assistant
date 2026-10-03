---
version: alpha
name: Job Assistant
description: "A calm, warm-paper interface for people who are looking for a job. Warm off-white canvas, warm charcoal ink, and one accent: a deep teal called tide, used for the one action that moves the user forward. A soft serif (Fraunces) speaks only in page titles; a friendly, highly legible sans (Figtree) does all the work. Cards are flat with a hairline border; shadows appear only when something is lifted. A warm sand wash marks encouraging messages. Green, amber and red are reserved for the match score and skills and never decorate."

colors:
  # Light mode
  canvas: "#f9f6f1"
  surface: "#fffdfa"
  surface-muted: "#f0ede8"
  ink: "#1e1a14"
  ink-muted: "#5e5a53"
  hairline: "#e1ded7"
  control-border: "#8a857e"
  tide: "#006375"
  on-tide: "#fdfcf8"
  tide-wash: "#ddf1f6"
  on-tide-wash: "#00404e"
  sand-wash: "#ffeccd"
  on-sand-wash: "#1e1a14"
  danger: "#c21725"
  # Dark mode
  dark-canvas: "#13110e"
  dark-surface: "#1e1b18"
  dark-surface-muted: "#282622"
  dark-ink: "#f1eee9"
  dark-ink-muted: "#aeaaa4"
  dark-hairline: "#32302c"
  dark-control-border: "#78746e"
  dark-tide: "#77ced8"
  dark-on-tide: "#04191f"
  dark-tide-wash: "#12333a"
  dark-on-tide-wash: "#a9e4ea"
  dark-sand-wash: "#382c15"
  dark-danger: "#ff6467"
  # Meaning colors (same roles in both modes; never decorative)
  match-strong: "#10b981"
  match-partial: "#f59e0b"
  match-weak: "#f43f5e"
  status-saved: "#94a3b8"
  status-applied: "#3b82f6"
  status-interview: "#f59e0b"
  status-offer: "#10b981"
  status-rejected: "#f43f5e"

typography:
  display-xl:
    fontFamily: Fraunces Variable
    fontSize: 60px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Fraunces Variable
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  page-title:
    fontFamily: Fraunces Variable
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  section-title:
    fontFamily: Figtree Variable
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Figtree Variable
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: Figtree Variable
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  reading:
    fontFamily: Figtree Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: Figtree Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: Figtree Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  score:
    fontFamily: Figtree Variable
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: tnum

rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 14px
  2xl: 18px
  pill: 9999px

spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 80px

components:
  button-primary:
    backgroundColor: "{colors.tide}"
    textColor: "{colors.on-tide}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: 36px
    padding: 0 12px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.hairline}"
    height: 36px
  button-quiet-danger:
    backgroundColor: transparent
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
  text-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    underline: "2px {colors.tide} at 40% opacity, 4px offset"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    border: "1px solid {colors.hairline}"
    padding: 20px
  card-lifted:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    shadow: "0 12px 28px -12px rgba(30,26,20,0.22), 0 3px 8px -2px rgba(30,26,20,0.08)"
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.control-border}"
    height: 40px
  text-input-focused:
    border: "1px solid {colors.tide}"
    outline: "3px {colors.tide} at 50% opacity"
  status-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  skill-tag-matching:
    backgroundColor: "{colors.match-strong} at 10% opacity"
    textColor: "#047857"
    rounded: "{rounded.pill}"
  skill-tag-missing:
    backgroundColor: "{colors.match-weak} at 10% opacity"
    textColor: "#be123c"
    rounded: "{rounded.pill}"
  encouragement-note:
    backgroundColor: "{colors.sand-wash}"
    textColor: "{colors.on-sand-wash}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  tab-bar-phone:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    activeTextColor: "{colors.tide}"
    height: 56px
---

# Job Assistant design system

## Overview

Job Assistant is a career tool. The person using it is looking for a job, which is a stressful, repetitive task with a lot of waiting and a lot of rejection. The interface should feel like a steady desk to work at: **confident, calm, and encouraging**.

- **Confident** means clear statements, one obvious next action, and numbers shown plainly. The score is a number, not a mood.
- **Calm** means warm paper instead of white, few colors, no decoration competing with the content, and motion that explains instead of entertaining.
- **Encouraging** means the interface always shows the next step, phrases gaps as things to work on, and saves its one celebration for an offer.

The system is built from four ideas:

1. **Paper and ink.** A warm off-white canvas (`{colors.canvas}`) with warm charcoal text (`{colors.ink}`). All neutrals share one warm hue, so nothing looks cold or clinical.
2. **One accent, tide.** A deep teal (`{colors.tide}`) used for the primary action, the active place in the navigation, links, and the focus ring. Nothing else is teal.
3. **A warm wash for encouragement.** `{colors.sand-wash}` is a surface tint for "your next step" and "a tip for you". It is not a second accent: it never carries buttons, icons, or text color.
4. **Meaning colors are reserved.** Green, amber and red mean strong, partial and weak match (and matching or missing skills). The five statuses have their own dot colors. None of them is ever used as decoration.

**Key characteristics**

- Warm paper canvas with flat, hairline-bordered cards. Shadows appear only when something is lifted (hover, drag, dialogs).
- A soft serif (Fraunces) for page titles and landing headlines only; a friendly sans (Figtree) for everything inside the app.
- One filled teal button per view. Secondary actions are outlined; rare, destructive actions are quiet text at the end of the page.
- The answer comes first: the largest element on a screen is what the user came for (the score, the board, the missing skill).
- Every control is at least 44 px tall on touch screens, and the phone has a labelled tab bar at the bottom.
- 3D appears in three places only (landing hero, score, insights) and always has a flat fallback.

## Colors

### Brand and accent

- **Tide** `{colors.tide}` (#006375): primary buttons, active navigation, links, focus ring, progress, the logo mark. In dark mode it becomes `{colors.dark-tide}` (#77ced8) with dark text on it.
- **Tide wash** `{colors.tide-wash}`: the background of the active navigation item and of small numbered markers.

### Surface

- **Canvas** `{colors.canvas}`: the page.
- **Surface** `{colors.surface}`: cards, inputs, dialogs.
- **Surface muted** `{colors.surface-muted}`: quiet areas such as "not analyzed yet" notes and tab tracks.
- **Hairline** `{colors.hairline}`: card borders and dividers.
- **Control border** `{colors.control-border}`: input and select borders. It is darker than the hairline on purpose, so a field can be found without relying on its fill (3:1 against the surface).

### Text

- **Ink** `{colors.ink}`: all primary text.
- **Ink muted** `{colors.ink-muted}`: secondary text, captions, placeholders.

Both pass 4.5:1 on the canvas, the surface and the muted surface in light and dark mode.

### Semantic

- **Match strong / partial / weak**: the score and its label. Always shown with the number and a word ("Strong match"), never as color alone.
- **Status colors**: a small dot next to the status name. The name is always written.
- **Danger** `{colors.danger}`: destructive actions and error messages.
- **Sand wash** `{colors.sand-wash}`: encouraging notes.

Charts use a single color (tide) with the name on the axis and the value at the bar, because the five status colors are not distinguishable enough for color-blind readers when used as a chart palette.

## Typography

### Font family

- **Display: Fraunces Variable.** A serif with soft, slightly irregular shapes. It gives the product a human voice. Fallback: `ui-serif, Georgia, serif`.
- **Text: Figtree Variable.** A geometric sans with open shapes that stays friendly and legible at 12 to 14 px. Fallback: `ui-sans-serif, system-ui, sans-serif`.

Both fonts are bundled with the app. No request goes to a font server.

### Hierarchy

| Role | Token | Use |
|---|---|---|
| Landing headline | `{typography.display-xl}` | One per landing page |
| Landing section heading | `{typography.display-lg}` | Section headings on the landing page |
| Page title | `{typography.page-title}` | The one `h1` of each app page |
| Section title | `{typography.section-title}` | Headings inside cards and sections |
| Body | `{typography.body}` | Interface text |
| Reading | `{typography.reading}` | Long text meant to be read: the cover letter |
| Label | `{typography.label}` | Buttons, form labels, navigation |
| Caption | `{typography.caption}` | Dates, counts, hints |
| Score | `{typography.score}` | The match score and other key numbers |

### Principles

- **The serif speaks once per screen.** Page titles and landing headlines use Fraunces. Headings inside the app use Figtree, because a serif at 16 px is slower to scan in a dense interface.
- **Sentence case everywhere.** No all-caps labels and no title case.
- **Tabular numbers.** Scores, counts and dates use tabular figures so they line up and do not jump when they change.
- **Readable measure.** Paragraphs stop at about 60 to 68 characters per line.
- **Balanced headings.** Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.
- **Tight, not squeezed.** Display sizes use -0.02em letter-spacing; text sizes use 0 to -0.01em.

## Layout

### Spacing system

One 4 px unit. Common steps: 8 px inside a group, 12 to 16 px between related elements, 24 px between cards, 48 px or more between page regions, 80 px between landing page sections.

### Grid and container

- A centered container with a maximum width of 1152 px and 16 px (phone) or 24 px (larger) side padding.
- The dashboard is a grid of 1, 2 or 3 columns. The board has five equal columns on desktop and scrolls sideways inside its own area on a phone.
- The application page is a main column (the result) beside a narrower, sticky column (what was compared).

### Whitespace philosophy

Tight inside a group, generous between groups. There is more space above a heading than below it, so a heading belongs to what follows.

## Elevation and depth

| Level | Treatment | Use |
|---|---|---|
| 0, flat | No border, no shadow | Page text, landing sections |
| 1, card | 1 px `{colors.hairline}` border, no shadow | Every card and section at rest |
| 2, lifted | Soft shadow, tinted with the ink color | A card under the mouse, a card being dragged |
| 3, floating | Larger tinted shadow | Dialogs, the command palette, the landing preview card |

Elevation is declared once: a card at rest has a border and no shadow. A shadow means "this is lifted right now". Shadows are tinted with the ink color, not pure black, and always have a downward offset so the light comes from above.

In dark mode shadows are nearly invisible, so depth comes from a slightly lighter surface and the hairline.

### Decorative depth

The landing hero has three large, soft color washes (tide and sand) that drift slowly behind the content, and a 3D leather backpack with skills orbiting it. Scrolling through the three steps below the hero plays a short story with that scene (resume into the bag, skills sorted, score ring fills); the page scrolls natively, and with reduced motion each step shows a still picture instead. The backpack is lit with warm paper light, a sand-coloured bounce and a faint tide rim, so it belongs to the page. Inside the app there is no decorative depth.

## Shapes

### Border radius scale

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 6 px | Key caps, small chips |
| `{rounded.md}` | 8 px | Notes, inner blocks |
| `{rounded.lg}` | 10 px | Buttons, inputs, selects |
| `{rounded.xl}` | 14 px | Cards |
| `{rounded.2xl}` | 18 px | The landing preview card |
| `{rounded.pill}` | full | Status badges, skill tags, progress bars |

Inner elements are tighter than their container. Pills are for small labels, never for buttons.

### Illustration

There are no stock photos and no drawn illustrations. Pictures are either real product output (the example analysis) or 3D objects built in code (the hero backpack with its orbiting skills, the score orb, the skill universe).

## Components

### Buttons

- **Primary** (`button-primary`): filled tide. One per view. Its label names the action: "Analyze match", "Add application", "Create your account".
- **Secondary** (`button-secondary`): outlined. Actions that support the primary one: "Copy", "Cancel".
- **Text link** (`text-link`): ink with a teal underline. The second choice next to a primary button ("I already have an account").
- **Quiet danger** (`button-quiet-danger`): red text without a fill, placed at the end of the page. Always confirmed in a dialog.

Buttons press down slightly when held. On touch screens every button is at least 44 px tall.

### Cards and containers

A card is a flat surface with a hairline border and a 14 px radius. Cards are never nested. When content inside a card needs separating, a hairline divider is used instead of another box.

### Inputs and forms

Labels sit above the field and are always visible. Fields have a 3:1 border. Focus shows a teal border and a soft teal ring. Errors appear above the form as a short sentence that names the problem and, where possible, the fix.

### Status and score

- **Status badge**: a pill with a colored dot and the status name.
- **Score**: a number out of 100 with a label ("Strong match"), shown in a ring or, where WebGL is available, in an orb that fills up.
- **Skill tags**: green pills for skills the resume shows, red pills for skills it does not.

### Encouragement note

A sand-wash block for the next step, a tip, or a helpful pattern ("Learning Docker would improve 4 of your 6 analyzed applications"). It is the only place the warm wash appears.

### Navigation

- **Desktop**: a top bar with the logo, three labelled destinations, search, help, theme toggle and log out. The current destination has a tide wash.
- **Phone**: a compact top bar and a tab bar fixed to the bottom with an icon and a word for each destination.
- A "Skip to content" link is the first focusable element on every page.

### Empty states

An empty state has three parts: an icon in a quiet tile, one sentence that says what will appear here, and the action that makes it appear.

## Motion

- Interface motion takes 0.15 to 0.4 seconds and never blocks input.
- Motion explains a change: a card grows into its page, a moved card glides to its column, a number counts to its new value.
- One celebration: confetti when an application moves to Offer.
- With "reduce motion" switched on, movement stops, numbers show their final value at once, and 3D scenes are replaced by flat pictures.

## Voice and copy

- Plain words, short sentences, active voice.
- Speak to the user as "you". Say what happens next.
- No exclamation marks, no "Oops", no hype words.
- Gaps are "skills to work on", not failures.
- Do not promise what the product cannot check. The cover letter note says "Read it through and check the facts before you send it."

## Do's and don'ts

### Do

- Use tide for exactly one filled button per view, the active navigation item, links and focus.
- Keep cards flat with a hairline. Add a shadow only while something is lifted.
- Put the answer first and make it the largest thing on the screen.
- Write the status and the match label in words next to their color.
- Use the sand wash for encouragement and the next step, and for nothing else.
- Keep every control at least 44 px tall on touch screens.
- Give every 3D scene a flat fallback and a text equivalent.

### Don't

- Don't add a second accent color, and don't use green, amber or red as decoration.
- Don't set headings inside the app in the serif. It speaks once per screen.
- Don't nest a card inside a card.
- Don't put a destructive action next to a frequent one.
- Don't use all-caps labels, exclamation marks, or words like "seamless" and "supercharge".
- Don't show a number without saying what it counts.
- Don't use 3D on screens where people work (dashboard, board, forms).

## Responsive behavior

### Breakpoints

| Name | Width | What changes |
|---|---|---|
| Phone | below 640 px | One column, bottom tab bar, the board scrolls sideways in its own area |
| Tablet | 640 to 1023 px | Two-column card grid, top navigation with labels |
| Desktop | 1024 px and up | Three-column grid, five board columns, two-column application page |

### Touch targets

At least 44 px tall for every button, link, tab and field on touch screens and narrow screens.

### Collapsing strategy

Columns stack in reading order: the result first, then what was compared. Sticky side columns become normal sections. Labels are never removed to save space; when space is short, the navigation moves to the bottom tab bar instead of becoming icon-only.

## Iteration guide

1. Start from the tokens in the front matter. A new color or radius needs a reason that fits the Overview.
2. Decide what the user came to the screen for, and make that the largest element.
3. Use one primary button. If two actions feel equally important, the screen is doing two jobs.
4. Check both themes, a 390 px wide phone, keyboard focus, and reduced motion before calling it done.
5. Compute contrast for any new text or control color: 4.5:1 for text, 3:1 for control borders and focus rings.

## Known gaps

- No test with real job seekers or with a screen reader user yet.
- The match colors are standard green, amber and red; their text versions pass contrast, but the palette has not been tuned for every type of color blindness beyond always pairing color with words.
- Frame rates of the 3D scenes have not been measured on real phones.
- There is no custom "page not found" screen; unknown addresses return to the dashboard.
