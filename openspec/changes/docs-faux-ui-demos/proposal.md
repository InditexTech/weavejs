# Proposal

## Why

The docs site shows Weave.js through static images and GIFs (`showcase.png`, `sample-app.gif`, per-tool GIFs such as `actions/rectangle-tool.gif`). They are heavy, ignore the light/dark theme toggle, and go stale as tools change. Stageshow (MIT, <https://benji.org/stageshow>) is an agent skill plus a small React kit for scripted, looping faux product UIs, so we can replace those assets with crisp, theme-aware demos that match the real Weave look. Tracked in InditexTech/weavejs#1305.

## What Changes

- Add a `docs/demos/` package (Vite library build, React) that bundles faux-UI demos, with the Stageshow `kit/` vendored under its MIT licence.
- Add a loader that lazily mounts demos into `<div class="weave-demo" data-demo="...">` placeholders, pauses them off-screen, honours reduced motion, and follows the docs light/dark toggle.
- Override the UI bundle's `footer-scripts.hbs` through `docs/supplemental-ui/partials/` to load the demos bundle with `{{uiRootPath}}`.
- Add a Weave look (`looks/weave.ts`) mapped from `InditexTech/weavejs-frontend` (Tailwind v4, shadcn `new-york`/zinc, lucide, Inter + Noto Sans Mono self-hosted, square white vertical toolbar).
- Pilot two demos at 960x540 (16:9), transparent, no plate:
  - **Home hero** on `ROOT/index.adoc`: two collaborators on one canvas, browser chrome running off an edge.
  - **Rectangle tool** on `main:build/actions/rectangle-tool.adoc`: toolbar plus canvas crop, no window chrome, replacing `rectangle-tool.gif`.
- Each demo ships `BRIEF.md` (re-runnable prompt), `REHEARSAL.md` and a poster PNG used as `<noscript>`/reduced-motion fallback.
- Install upstream `stageshow` skill unmodified and add an overlay `weave-demos` skill holding house rules and correction notes.
- Run the demos build before Antora in `docs/package.json` so PR verify and publish workflows include it.

Non-goals: a custom `[stageshow]` AsciiDoc block in docouture; rolling demos out to other tool/node pages (follow-up after the pilot); changes to any `code/` package.

## Capabilities

### New Capabilities
- `docs-demos/live-demos`: how animated faux-UI demos behave on the published docs site (mounting, playback, theming, fallbacks, format, authoring contract).

### Modified Capabilities

None.

## Impact

- `docs/` only: new `docs/demos/`, `docs/supplemental-ui/partials/footer-scripts.hbs` and built assets, `docs/package.json` scripts, `index.adoc`, `rectangle-tool.adoc`, `AGENTS.md` documentation-state ledger.
- New repo skills (`stageshow`, `weave-demos`).
- New dev dependencies in the demos package (React, Vite, `lucide-react`, Playwright tooling for filming); no runtime change to published Weave packages.
- Self-hosted fonts added to the docs bundle (no third-party requests); SPDX/REUSE headers on all new files.
