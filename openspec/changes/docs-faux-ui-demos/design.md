# Design

## Context

- The docs are an Antora site (`docs/`), built with the docouture UI bundle 1.4.1. Theme is a class on `<html>` (`dt-theme-light` / `dt-theme-dark`), set by an inline bootstrap and toggled by `site.js`. No CSP meta tag was found in the bundle.
- The bundle loads a single script via `footer-scripts.hbs` (`{{uiRootPath}}/js/site.js`). `ui.supplemental_files: ./supplemental-ui` can override UI partials; supplemental files land under `/_/`.
- Pages cannot know the UI root path from AsciiDoc, so a raw `<script src>` inside a page would break on nested pages.
- Current media: `actions/rectangle-tool.gif`, `home-hero.png` (`:page-hero-image:` on the home page), per-card PNGs.
- Real Weave UI reference is `InditexTech/weavejs-frontend` (Apache-2.0): Tailwind v4, shadcn `new-york`/zinc, lucide, Inter + Noto Sans Mono, `.dark` variant, white square vertical toolbar (4px padding/gap, tooltip on the right). See proposal.md for motivation.
- Stageshow (MIT): skill + `kit/` + gold `examples/` + `scripts/film.mjs|jumps.mjs|layout.mjs`. Needs React >= 18, `lucide-react`; filming uses `playwright-core` and local Chrome.

## Goals / Non-Goals

**Goals:**
- One shared, lazily loaded demos bundle with a tiny loader, usable from any page with one placeholder element.
- Theme sync, reduced-motion and no-JS fallbacks, 16:9 transparent output.
- A repeatable per-demo authoring flow (brief, rehearsal, poster) that a human or agent can re-run.

**Non-Goals:**
- A docouture AsciiDoc extension or block (possible upstream follow-up).
- Mirroring the real Weave SDK at runtime; demos are authored illustrations, not live canvases.
- Rolling out to all tool/node pages.

## Decisions

1. **Island, not iframe or static media.** One IIFE/ESM bundle in `supplemental-ui/js/demos/`, loader finds `.weave-demo[data-demo]`, dynamic-imports the demo chunk. Theme sync is free (read the `<html>` class), sizing is native.
   - Alternative: iframe per demo. Rejected: needs `postMessage` for theme and a resize handshake per demo, plus a full React runtime per frame. CSS isolation is its only advantage and is handled by scoping (below).
   - Alternative: pre-rendered video/GIF. Kept only as the poster/fallback path; cannot follow theme and is heavy.
2. **Loader wiring via partial override.** Add `docs/supplemental-ui/partials/footer-scripts.hbs`: the bundle's own `site.js` tag, unchanged, plus `<script type="module" src="{{{uiRootPath}}}/js/demos/loader.js">`. The loader is ~1.6 kB and only imports the React-based `boot` chunk when the page has a `.weave-demo` placeholder, so pages without demos pay almost nothing.
   - **Embedding.** A page embeds a demo with the normal image macro and a role: `image::<poster>.png[<alt>,role="weave-demo weave-demo--<name>"]`. Antora resolves the poster URL and alt text (a raw `++++` block cannot know the page's depth), the image is the no-JS fallback and the poster while the demo loads, and the loader mounts the demo inside the block's `.content` once it nears the viewport.
   - Alternative: raw passthrough `div` plus `<noscript><img>`. Rejected: poster URL would be hard-coded relative to the page.
   - Alternative: inline script per page. Rejected: UI root unknown from AsciiDoc.
   - Risk: a bundle upgrade changes the upstream partial; mitigated by a comment in the partial and a task to document the diff step.
3. **CSS scoping.** Demo roots use a dedicated class and the kit's own CSS (prefixed), rendered inside a Shadow DOM root only if class-based scoping proves leaky in the pilot. Start with scoped classes; decide at the end of the hero task.
4. **Format.** Design size 960x540 via `Stage`; container uses `aspect-ratio: 16/9; width: 100%`. Transparent: no stage plate (the skill's "page is the ground" rule). Posters exported at 2x (1920x1080). Per-demo override allowed in `BRIEF.md`.
5. **Weave look as a token mapping.** `docs/demos/src/looks/weave.ts` maps `weavejs-frontend` shadcn/zinc tokens, radii, fonts and the toolbar geometry onto the kit's tokens; dark follows `dt-theme-dark`. Fonts (Inter 300/400/700, Noto Sans Mono 400, Latin WOFF2 subsets, ~95 kB total) live in `supplemental-ui/fonts/` with their OFL licences and are registered at runtime with `FontFace` under the distinct families `Weave Inter` / `Weave Noto Sans Mono`: the docs UI bundle already loads its own `Inter` from Google Fonts, and a second face with the same family name would be ambiguous. The demos add no third-party request; the UI bundle's own Google Fonts request is pre-existing and out of scope. The real toolbar is hard-coded white; in dark theme the demos invert it so a white block does not glare.
6. **Window chrome and cropping.** Hero: kit browser chrome shown whole with an even margin on every side (revised after review: a window cut off by the stage edge read as a bug). Tool and node cards: no window; crop to the left vertical toolbar plus a canvas corner. No node on a canvas is ever cut by an edge.
7. **Gold starting points.** Hero: `presence` (two cursors, per-person colours, names on cursors). Rectangle: `freeform-drag` (grab offset, measured grid), borrowing `cursor-morph` for the crosshair cursor over the canvas. Behaviour reference for the rectangle story is `code/packages/sdk/src/actions/rectangle-tool/` and the existing action page.
8. **Layout.**
   ```
   docs/demos/
     package.json, vite.config.ts, tsconfig.json
     kit/                       vendored Stageshow kit + LICENSE + NOTICE
     src/loader.ts              mount / pause / theme / reduced-motion
     src/looks/weave.ts
     src/demos/<name>/{BRIEF.md,<name>.tsx,REHEARSAL.md,poster.png}
   ```
   Build output goes to `docs/supplemental-ui/js/demos/` (git-ignored). `docs/package.json`: `build:demos` (`npm --prefix demos ci && build`) runs from `postinstall`, because the docouture CI workflows run `npm ci` and then `npx antora` directly (only publish uses `npm run build`); `prebuild` and `git:pre-push` rebuild the demos first for local runs. A demo compile error fails `npm ci` and `npm run build`.
9. **Skills in-repo.** Install upstream `stageshow` with `npx skills add benjitaylor/skills --skill stageshow` unmodified; add overlay `weave-demos` (size, transparency, Weave look, brief template, gold-example map, correction notes). Upstream updates never clobber our rules.
10. **Playback, reduced motion and fallbacks.** The kit's `Stage` already stops and resets playback off-screen and restarts it on re-entry, and under reduced motion renders its `poster` state instead of playing; the loader relies on that rather than reimplementing it. The block's own image (a transparent PNG, light variant) is the no-JS fallback and the loading poster; it is hidden once the demo is mounted and stays if the demo fails to load. Poster PNGs come from `scripts/poster.mjs` (Playwright, `omitBackground`), because `film.mjs --still` is opaque (open question 1, resolved).

## Risks / Trade-offs

- [Upstream partial drifts on UI bundle upgrade] -> keep our override minimal, diff on docouture bumps (task), document in `docs/` contributing notes.
- [Kit CSS leaks into or from the UI bundle] -> prefixed classes, verified in both themes on the pilot pages; Shadow DOM as fallback.
- [Bundle weight on every page] -> loader is tiny and runs only when a placeholder exists; demo chunks load lazily on intersection.
- [Agent-generated demos look sloppy] -> rely on the skill's film/gate scripts, `BRIEF.md` + `REHEARSAL.md`, human review, and feed corrections into the overlay skill.
- [Licensing] -> Stageshow MIT (keep LICENSE/NOTICE), `weavejs-frontend` Apache-2.0 (keep SPDX headers; REUSE check passes), fonts self-hosted with licence files.
- [Filming needs local Chrome] -> filming is an authoring-time tool only, not part of the docs CI.

## Open Questions

1. ~~Can `film.mjs --still` produce transparent PNGs?~~ Resolved (task 1.4): no, it screenshots without `omitBackground`. Posters use `docs/demos/scripts/poster.mjs` (Playwright, `omitBackground`, forces a transparent page background; `--check-alpha` verifies the PNG). `film.mjs` remains the tool for contact sheets and gates.
2. ~~Does Antora's default AsciiDoc safe mode pass the placeholder `++++` block unchanged?~~ Resolved (task 1.1): yes, a `++++` block with `div.weave-demo` and a `<noscript>` child is emitted verbatim. The built page references `site.js` through a relative `data-ui-root-path` (e.g. `../../../_`), confirming the loader must be wired through the partial.
3. ~~Whether the home hero replaces `:page-hero-image:` or sits beside it~~ Resolved (task 5.4): the hero media slot is the demo. `:page-hero-image:` is the poster and a new `:page-hero-demo: <name>` attribute, supported by a second partial override (`supplemental-ui/partials/home-hero.hbs`, media slot only), wraps it as a `weave-demo` block. Both overridden partials must be diffed on docouture upgrades.
