# Design decisions

This document explains the redesign of Job Assistant in step 14: what I looked at for inspiration, what the audit found, what I changed and why, and three trade-offs. I am writing it as a master's student presenting my own project, so I try to say plainly what I know and what I only assume.

The design system itself is in [`DESIGN.md`](../DESIGN.md). Screenshots of every page before and after are in [`docs/screenshots/before`](screenshots/before) and [`docs/screenshots/after`](screenshots/after), in desktop and phone size, light and dark mode.

## 1. Who the design is for

The target users are students and early-career developers who apply to many jobs at the same time. I am one of them. The problems I designed for come from my own job search, not from a user study, and a study with other applicants is the first thing I would add.

A job search is stressful and repetitive. So the brief I set for the redesign was three words: the product should feel **confident, calm, and encouraging**.

## 2. What I learned from three design systems

I read the DESIGN.md files of Linear, Stripe and Vercel from the `awesome-design-md` collection. I did not copy their colors, fonts or layouts. I looked for the reasons each one works.

| System | What makes it good | What I took from it (as an idea, not a look) |
|---|---|---|
| **Linear** | One accent color used in very few, named places (logo, primary button, focus). Depth comes from a ladder of four surface tones and thin borders, almost never from shadows. The product screenshots are the content; the frame stays quiet. | Give the accent a short list of allowed uses. Let borders and surface tone carry depth instead of shadows. |
| **Stripe** | One filled button per section, so the next action is never in doubt. Numbers use tabular figures everywhere, a small detail that signals care with data. The typographic voice is consistent from headline to caption. | One filled button per view. Tabular numbers for scores, counts and dates. |
| **Vercel** | A strict rule set: display weight never above 600, sentence case, stacked subtle shadows with a thin edge line. A long "do and don't" list makes the system easy to follow and hard to break. | Write down do's and don'ts, not only tokens. Declare elevation once and keep it subtle. |

The common lesson: all three are good because they are **restrictive**. Each has few colors, few type styles, and written rules about where each may appear. My frontend before this step had the opposite problem: many nice things, each used a little too often.

## 3. The audit

I reviewed the frontend with two installed skills: the redesign checklist from the taste-skill, and the audit and polish playbooks of the impeccable skill. I looked at the 28 "before" screenshots and at the code.

One limit, stated openly: the impeccable skill also ships an automatic detector. It needs a program that is downloaded and run on first use, and that step was not run. The findings below come from going through both checklists by hand.

### Scores before the redesign (impeccable's five dimensions, 0 to 4)

| Dimension | Score | Main finding |
|---|---|---|
| Accessibility | 3 | Good basics (contrast, focus ring, skip link), but touch targets were too small. |
| Performance | 3 | 3D was already lazy-loaded; nothing serious. |
| Responsive design | 2 | The phone navigation was three icons without words, and most controls were 36 px tall. |
| Theming | 3 | Tokens were in place, but the favicon and the 3D scenes had hard-coded colors from older designs. |
| Implementation integrity | 2 | Several template patterns: three equal feature cards, a label above the headline, letter avatars, cards inside cards. |
| **Total** | **13 / 20** | "Acceptable": works, but needs significant design work. |

I have not given myself scores for the result. Grading my own fixes would not mean much; the before and after screenshots are the evidence.

### The top problems, ordered by impact

1. **The look did not match the purpose.** The accent was a neon lime used in at least six roles (logo, button, navigation, avatars, progress, 3D). It was loud and energetic. A person who has just been rejected does not need a highlighter color. *Impact: the first impression of the whole product.*
2. **The application page did not put the answer first.** Every block sat in its own card, a dropdown had a card to itself, the cover letter was a card inside a card, and the short job description left half the page empty. The score, the thing the user waited up to a minute for, did not stand out. *Impact: the most used and most important screen.*
3. **The phone navigation was three unlabelled icons, and most controls were too small to tap comfortably** (36 px instead of the recommended 44 px). *Impact: every screen on a phone.*
4. **Dashboard cards carried decoration instead of information.** A letter avatar took the best position on the card but said nothing. Titles started at different heights depending on whether a card had a score, and every card showed the same absolute date. There was no overview of how many applications were at each stage. *Impact: the screen the user sees most often.*
5. **The serif was used for small headings.** Section titles of 16 px inside the app were set in the display serif, which is slower to scan in a dense screen. One label was in spaced capitals. *Impact: reading speed everywhere in the app.*
6. **The landing page used familiar template patterns**: a small label above the headline, a slogan as the headline ("Apply smarter, not harder"), a row of check marks, three equal feature cards with icons, and two competing buttons. *Impact: whether a visitor understands the product in the first seconds.*
7. **Copy was uneven.** Some messages had exclamation marks, some talked about "the AI" instead of the user's task, and the resume list printed the first lines of the resume, which are my name, email address and phone number. *Impact: tone, and a small privacy problem.*
8. **A destructive action sat next to a frequent one.** The delete button was directly beside the status dropdown. *Impact: risk of deleting an application by accident.*
9. **Cards had both a border and a shadow**, so elevation meant nothing, and a hover lift and a tilt ran at the same time on dashboard cards. *Impact: visual noise.*
10. **Small leftovers**: the favicon still had the color of an older design, every page had the same browser tab title, and there was no page description for search engines and link previews.

No console errors were found before or after. The only console message is a deprecation warning from the 3D library, which I cannot fix in my own code.

## 4. What I changed and why

### Color: from a loud accent to a calm one

- The accent is now **tide**, a deep teal (#006375). It is used for the primary button, the active navigation item, links, focus and progress, and nowhere else.
- All neutrals share one warm hue: warm paper background, warm charcoal text.
- A new **sand wash** marks encouraging messages: the next onboarding step and the tip on the insights page. It is a background tint, not a second accent.
- Green, amber and red stay reserved for the match score and the skills.
- I computed the contrast of all 46 token pairs I use for text and controls. All text pairs pass 4.5:1 and all control borders and focus rings pass 3:1, in light and dark mode.
- The 3D scenes, the confetti and the favicon use the new palette.

*Why:* calm and confident. Teal is steady without being cold on a warm background, and it does not collide with the green, amber and red that carry meaning.

### Typography: one voice per role

- **Fraunces** (serif) is now only for the page title and landing headlines.
- **Figtree** (sans) is used for everything else, including headings inside the app. It replaced Geist, which is closely tied to another company's brand.
- Sentence case everywhere, tabular numbers, balanced headings, and a line length of about 60 to 68 characters for longer text.

*Why:* a serif once per screen gives the product a human voice; a sans for the working parts keeps them fast to scan.

### Application page: the answer first

- The match analysis is the first block, and its result is the largest element.
- The resume picker and the job description moved to a side column titled by what they are: "Resume used" and "Job description". A long description is shortened with a "Show the full description" button.
- The cover letter is no longer a card inside a card. It sits between two thin lines at a comfortable reading width.
- Only one button is filled at a time, and it is the next step: "Analyze match" first, then "Generate cover letter". Once a result exists, "Analyze again" and "Generate again" are outlined.
- "Delete application" moved to the end of the page as quiet red text, with a confirmation dialog whose safe choice says "Keep it".

### Dashboard

- Cards have no letter avatar. The status is top left, the score top right, in a row of fixed height so all titles line up.
- Dates are relative: "Added today", "Added 5 days ago".
- The status filter shows how many applications each stage has ("Applied 2"), which gives the overview without adding another block. The numbers update when a card is moved on the board.
- Cards only tilt on hover; the extra lift was removed.

### Phone

- A tab bar at the bottom with an icon and a word for each destination.
- Every button, tab, field and link is at least 44 px tall on touch screens and narrow screens. I check this in my browser test.

### Landing page

- The headline is now a plain statement of the benefit: "Know where you stand before you apply."
- No label above the headline and no row of check marks.
- One filled button ("Create your account") and one text link ("I already have an account").
- The three features are a list with dividing lines beside a heading, not three equal cards.
- "Three steps to your first result" keeps its numbers, because the order is real information there.

### Copy

- No exclamation marks. "Your account is ready" instead of "Account created. Welcome!".
- Messages talk about the user's task: "Drafted from the facts in your resume. Nothing is invented."
- Errors say what happened and what to do.
- The resume list no longer prints my contact details. It says "Text read and ready to compare".
- Empty states say what will appear and offer the action that makes it appear.

### Smaller fixes

- Cards are flat with a thin border; a shadow appears only while a card is hovered or dragged.
- Each page has its own browser tab title, and the site has a description.
- The text cursor, the text selection and the scroll bars follow the palette.

## 5. What I kept

- **All features.** My automated browser run still passes all of its checks after the redesign (77 checks, including login, upload, analysis, cover letter, board with drag and drop, insights, command palette and shortcuts).
- **The three 3D scenes** (skill galaxy, score orb, skill universe; the galaxy became the backpack hero in step 15, see section 7) with the rules from before: 3D code is only downloaded where a scene is shown, every scene has a flat fallback without WebGL or with reduced motion, and the work screens stay 2D.
- **Motion that explains**: the card that grows into its page, the gliding board cards, the counting numbers, and confetti only for an offer.

## 6. Three trade-offs

**1. Calm over memorable.**
The lime accent made the project instantly recognizable in a screenshot. Teal on warm paper is quieter and closer to what other products look like. I decided that the feeling of the person using it matters more than how distinctive a thumbnail is. The identity now has to come from the typography, the warm paper, and the 3D scenes instead of from one loud color.

**2. Fewer cards and less decoration, at the cost of some visual richness.**
Removing the letter avatars, the nested cards and the shadows makes the screens plainer. On a first look, the old dashboard seemed more "designed". But decoration that carries no information slows reading, and the dashboard is a screen for work. I kept richness where it has a job: the landing page and the moment a result arrives.

**3. A bottom tab bar on phones costs screen height.**
The labelled tab bar takes 56 px at the bottom of every phone screen, and long pages need extra padding so the last element is not covered. The alternative was to keep icon-only navigation in the top bar, which saved space but made people guess. With only three destinations, I chose clarity over space.

## 7. The 3D hero object (step 15)

The landing page hero now shows a leather backpack with skills orbiting around it. The backpack stands for the career a job seeker carries along: what you have collected so far and take with you to the next place.

### The reference and what I did with it

The model was rebuilt from one reference photo: **"brown leather backpack on white surface" by Wiser by the Mile on Unsplash (Unsplash License)**. The photo itself is not in this repository (`frontend/reference/` is ignored by git), and no pixel of it is used in the product. The shapes are written in code and the leather is drawn with seeded noise.

I followed the pipeline of the img2threejs skill:

1. **Image analysis** in a fixed order (form, parts, relations, materials, identity-defining features, what one view hides).
2. **Suitability:** "conditional", because there is only one front view. The back, the sides, the depth and the straps are convention, not evidence.
3. **A sculpt spec** with 18 parts and 5 materials, checked by the skill's strict validator.
4. **Eight build passes**, each rendered from five directions and compared with the photo: blockout, structure, form, material, surface, lighting, interaction, optimization. Each pass was recorded with scores and with what still does not match.

The deterministic outline check of the final model against the photo gives a silhouette overlap (IoU) of 0.92. My own estimate of the overall likeness is about 0.78 on the skill's scale, which it describes as "object reads correctly, local details approximate". The renders of the passes are in `docs/screenshots/3d/` (`pass-1-blockout`, `pass-2-structure`, `model-front`, `model-three-quarter`, `model-rear`). The side-by-side sheets with the photo are not committed, because they contain the photo.

### Decisions

- **The model code is written by hand, from the spec.** The skill's generator produced a first blockout, but it flattened curved parts (the handle became a straight slab), and its output loads textures cut from the photo and contains file paths from my machine. So I used the skill's "refine code" route: I wrote the model myself in `frontend/src/three/backpack/createBackpack.ts` and kept using the skill's capture, gate and comparison tools for every pass.
- **The maker's logo is not reproduced.** The real bag has an embossed brand mark on the front. I replaced it with a plain plate. Copying a brand's mark into my project would be wrong, and it is not what makes the object a backpack.
- **Stylized, not photoreal.** The panels are smooth and rounded. The sag, the wrinkles, the gathered folds of the side pockets and the darker patina along the seams of the real bag are only suggested. For a small, slowly turning hero object this reads better than a noisy surface, and it costs far fewer triangles.
- **It turns from side to side instead of spinning.** The photo says nothing about the back, so the back is the weakest part of the model. A slow swing of about 30 degrees to each side shows the volume without showing the back.
- **Lighting follows DESIGN.md, not the photo.** The photo is lit like a studio shot: flat, white, high-key. In the product the bag gets warm paper light from above, a sand-coloured bounce from below, one soft key, and a faint rim in the accent colour (tide), so it belongs to the page it stands on.
- **Skills orbit the backpack, with limits.** My first version had eight skills, and it was too busy: labels crossed in front of the bag and the bag was small. The version I kept has six skills (four on a phone) on two visible orbits, a larger bag, a camera slightly above so the orbits open into ellipses, and labels that fade while their skill passes in front of or behind the bag.
- **The score orb was left as it is.** It already uses the three match colours of DESIGN.md and has the number as normal text.

### Performance, kept from before

- The backpack is part of the lazy 3D code. Pages without a 3D scene still download none of it.
- Full detail is 11,656 triangles with one 512 px texture set; the phone version is 6,888 triangles with 256 px textures and no bump map.
- Stitches are one instanced mesh. The shadow under the bag is a soft gradient on a plane, not a real shadow.
- The pixel ratio cap, the pause when off-screen or in a hidden tab, and the static fallback (a flat drawing of the same bag and skills) for browsers without WebGL and for reduced motion all still apply.
- Size of the 3D code: 937 kB (251 kB compressed) before, 944 kB (254 kB compressed) after. The main bundle went from 1,095 kB to 1,096 kB.

### The better option, if this is still too much

If the hero should be calmer still, I would drop the orbit lines and keep only three skills. The backpack alone carries the idea; the skills are there to connect it to what the product does.

## 8. Scroll storytelling on the landing page

The hero and "How it works" are now one story. The 3D scene stays in view while the text scrolls past it, and the scroll position plays the scene:

| Where you are | What the scene shows |
|---|---|
| Top of the page | The backpack floats, the skills orbit, all in the same colour |
| Step 1, "Upload your resume" | The backpack turns to a three-quarter view and a resume sheet slides into it |
| Step 2, "Analyze the match" | The orbits tighten; matching skills grow and glow in the accent colour, missing skills shrink and fade |
| Step 3, "Get your score" | The backpack moves aside and a score ring fills to 82 |

Screenshots of the four positions are in `docs/screenshots/3d/scroll/`.

### Decisions

- **Native scrolling.** The page scrolls the normal way. Motion's `useScroll` only *reads* how far the list of steps has moved through the screen, and `useTransform` turns that into a story position from 0 to 3. Nothing catches the scroll wheel, nothing snaps, and scrolling back plays the story backwards.
- **The steps moved up, directly under the hero.** Before, "How it works" was the fourth section. A scene that follows you through two unrelated sections would sit on top of their content, so the story is now one block: hero, then the three steps.
- **One scene, not two.** The same canvas is used from the hero to the last step (CSS `position: sticky`). A second scene for the steps would mean a second WebGL context and a second copy of the backpack.
- **Text stays readable because it never shares space with the scene.** On wide screens the text is the left column and the scene is the right column. On narrow screens the scene is pinned to the top with a solid background and the text scrolls below it. The browser test checks that the step text and the scene do not overlap.
- **The picture holds still while you read.** The story position has flat parts: around the middle of each step the scene does not change, and the changes happen between steps.
- **The scene follows the scroll with a small delay.** A mouse wheel scrolls in jumps. The scene moves a part of the remaining distance each frame, so it looks fluid without changing how the page itself scrolls.
- **All skills start in one colour.** In step 15 the matching skills glowed from the start. Now the difference appears in step 2, because that is the moment the product finds it out. The legend ("Skills you have / Skills to learn") moved to step 2 for the same reason.
- **The number in the ring is page text**, placed over the ring, like the skill names. It stays sharp and uses the same green as the 2D score ring.
- **The step titles changed** to "Upload your resume", "Analyze the match", "Get your score". Pasting the job posting is now part of the text of step 2.

### Reduced motion and no WebGL

With "reduce motion" switched on (or without WebGL) there is no pinned scene and no 3D code is downloaded. The hero shows the flat drawing of the backpack, and each step gets its own still picture of the same moment: the resume half way in the bag, the sorted skills, the bag next to a ring at 82.

### Phones

The same story, lighter: four skills instead of six, the low-detail backpack (6,888 triangles), no anti-aliasing, pixel ratio capped at 1.25, and the scene takes about a third of the screen height.

### Is it smooth?

Measured on a MacBook Air (M4) in Chrome with the real graphics chip (Metal), production build, scrolling through the whole story and back in 9 seconds:

| | Frames per second | 95% of frames within | Frames slower than 20 ms |
|---|---|---|---|
| Desktop, 1440 x 900 at 2x | 59.0 | 16.8 ms | 2 of 532 |
| Phone size, 390 x 844 at 3x | 59.9 | 16.8 ms | 1 of 539 |

The phone line is a phone-sized window on the laptop, not a real phone.

Per frame the story costs a few dozen multiplications: no new geometry, no new materials, no React re-render. The ring fills by drawing more of the triangles of one fixed shape.

Size: the 3D code grew from 944 kB to 948 kB (254 kB to 255 kB compressed). The main bundle grew from 1,096 kB to 1,107 kB (339 kB to 342 kB compressed), mostly Motion's scroll functions.

## 9. What I have not done

- No test with real users or with a screen reader user. My checks were computed contrast, keyboard walkthroughs, and automated browser runs at desktop and phone width.
- The automatic detector of the impeccable skill was not run, as described above.
- The 44 px rule is applied through one CSS rule for touch and narrow screens. I verified it on the insights page in the browser test, not on every page.
- Frame rates of the 3D scenes on real phones are still unmeasured.
- The scroll story was measured on my laptop only. I have not measured it on a real phone or on an older computer.
- The backpack was rebuilt from one photo. Its back, sides and depth are my assumption, and I did not have a second view to check them.
