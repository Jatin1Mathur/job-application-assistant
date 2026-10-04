# ADR 005: 3D only on selected pages

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

I wanted the project to have a visual identity that is more than a template, and 3D in the browser is a good way to show that. But three.js is large (about 909 kB of JavaScript in this project), 3D drains batteries, some people get unwell from motion, and the screens where users work (the board, forms, lists) have to be fast and calm.

## Decision

I decided that 3D is allowed only where it has a job, and only one object per place:

| Place | Object | Its job |
|---|---|---|
| Landing page | Backpack with orbiting skills, with a scroll story | Explain the product in three steps |
| Login page | Compass that turns north on a successful login | Confirm the login |
| Application page | Score orb | Make the result of an analysis feel like an event |
| Insights page | Skill universe | Show which missing skills come up most |

The dashboard, the forms and the resumes page stay 2D.

Every scene follows the same rules, enforced by one wrapper component (`Lazy3D`):

- The 3D code is a separate download that starts only when the scene comes near the screen.
- No WebGL, or "reduce motion" switched on: a flat picture is shown and no 3D code is downloaded.
- Rendering stops when the scene is off-screen or the tab is hidden.
- The pixel ratio is capped at 1.5 (1.25 on phones), and phones get simpler models.
- A scene never receives clicks and never carries information that is not also there as text.

## Alternatives

- **No 3D.** The safest choice for speed, but the project would lose its most recognisable part.
- **3D everywhere** (animated backgrounds on every page). More impressive at first sight, slower and more tiring in daily use.
- **Pre-made 3D models loaded from files.** Less code, but extra downloads, licence questions, and models that do not match the design system. The objects here are built in code from simple shapes.
- **Video or images instead of real-time 3D.** Cheap to show, but they cannot react to scrolling or to a login.

## Consequences

- Pages without a scene download no 3D code. The browser tests check this for the dashboard.
- Every scene needs a second, flat version, which is extra work but also the reason the pages work without WebGL.
- The backpack was rebuilt from a single photo, so its back and sides are assumed. It only swings from side to side and never shows its back.
- The scroll story measured about 60 frames per second on a MacBook Air (M4). It has not been measured on a real phone.
- The 3D code is still a large download on the pages that use it.
