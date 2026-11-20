# Tasks

## 1. Spikes and scaffolding

- [x] 1.1 Verify in a scratch page that an AsciiDoc passthrough block with a `div.weave-demo` survives the Antora build unchanged (inspect built HTML under `docs/build`); record the result in design.md Open Question 2
- [x] 1.2 Install upstream skill with `npx skills add benjitaylor/skills --skill stageshow` and confirm `SKILL.md`, `kit/`, `examples/` and `scripts/` exist in the repo's skills folder
- [x] 1.3 Create `docs/demos/` (package.json, vite.config.ts, tsconfig.json), vendor Stageshow `kit/` with its MIT LICENSE/NOTICE, add SPDX headers to new files, and verify `npm run build` inside `docs/demos` emits a bundle
- [x] 1.4 Spike alpha output: film a gold example with `film.mjs --still` and confirm whether the PNG keeps transparency; if not, add a Playwright `omitBackground` capture script and verify the PNG has an alpha channel (record in design.md Open Question 1)

## 2. Weave look

- [x] 2.1 Self-host Inter (300/400/700 + italics) and Noto Sans Mono (400/700) under `docs/supplemental-ui/fonts/` with their licences and verify no request leaves the origin in a built page
- [x] 2.2 Implement `docs/demos/src/looks/weave.ts` mapping `weavejs-frontend` shadcn/zinc tokens, radii and toolbar geometry (4px padding/gap, square corners, white, right-side tooltip) to the kit tokens, light and dark; verify with a specimen demo rendered in both themes (screenshots in `REHEARSAL.md`)

## 3. Loader and build integration

- [x] 3.1 Implement the loader (`loader.ts` entry, `loader-core.ts`): find `.weave-demo` placeholders, lazy-mount on intersection, sync theme from the `dt-theme-*` class via `MutationObserver`; verify with Vitest unit tests covering mount, no early mount, single mount, font preparation, unknown demo, load failure and theme toggle without remount. Pause off-screen and reduced motion come from the kit's `Stage` and are verified in the browser in 5.2/6.2
- [x] 3.2 Add `docs/supplemental-ui/partials/footer-scripts.hbs` (copy of upstream plus the loader module tag using `{{{uiRootPath}}}`) and verify nested pages load `/_/js/demos/loader.js` with a 200
- [x] 3.3 Wire `docs/package.json` (`build:demos` from `postinstall` so every workflow's `npm ci` builds it; `prebuild` and `git:pre-push` rebuild it), git-ignore the output, and verify `npm run build` from a clean checkout succeeds and a deliberate demo compile error fails it
- [x] 3.4 Document the demo authoring flow (embedding snippet, brief template, rehearse commands) in `docs/demos/README.md` and verify the documented commands run as written

## 4. Overlay skill

- [x] 4.1 Create the `weave-demos` skill (size 960x540 transparent, no plate, Weave look, light/dark, brief template, gold-example map: hero -> `presence`, rectangle -> `freeform-drag`, correction-notes section) and verify the skill is discovered by the agent
- [x] 4.2 Add the `BRIEF.md` and `REHEARSAL.md` templates referenced by the skill and verify they match the spec's authoring contract

## 5. Home hero demo

- [x] 5.1 Write `docs/demos/src/demos/home-hero/BRIEF.md` (medium, place, look, 3-5 beats, crop) and verify it names the gold example and size
- [x] 5.2 Build `home-hero.tsx` from `presence` with the Weave look and browser chrome running off the bottom/right edge; verify `film.mjs --gate` ends `rehearsal passed` at 960 and at 390 widths
- [x] 5.3 Produce `poster.png` (2x) and `REHEARSAL.md`; verify the poster tells the story alone
- [x] 5.4 Embed on `docs/src/modules/ROOT/pages/index.adoc` (`image::` macro with the `weave-demo` role and the poster), reconcile with `:page-hero-image:` per design.md Open Question 3, and verify both themes, reduced motion and no-JS in a local `docouture dev` run

## 6. Rectangle tool demo

- [x] 6.1 Write `docs/demos/src/demos/rectangle-tool/BRIEF.md` grounded in `code/packages/sdk/src/actions/rectangle-tool/` and the existing action page; verify it states beats and the toolbar-plus-canvas crop
- [x] 6.2 Build `rectangle-tool.tsx` from `freeform-drag` (tool selected with right-side tooltip, drag draws, handles appear, loop resets with a cause); verify `film.mjs --gate` and `jumps.mjs` pass at 960 and 390 widths
- [x] 6.3 Produce `poster.png` (2x) and `REHEARSAL.md`
- [x] 6.4 Replace the GIF in `docs/src/modules/main/pages/build/actions/rectangle-tool.adoc` with an `image::` macro carrying the `weave-demo` role and the poster, remove `rectangle-tool.gif` if unused elsewhere (grep), and verify the page in both themes
- [x] 6.5 Review follow-ups: show the home window whole with even margins, keep every canvas node whole in the action demo, and add a `rectangle-node` demo (brief, rehearsal, posters, embed in `main:build/nodes/rectangle.adoc`); verify with `film.mjs --gate` at 960 and 390 in both themes and in the built pages

## 7. Integration and ledger

- [x] 7.1 Run the full docs build and `docouture doctor`, confirm the demos add no third-party requests, no console errors, and that a page without demos only loads the ~1.6 kB loader
- [ ] 7.2 Verify CI: open the PR and confirm `docouture-pr-verify` builds demos and passes REUSE/SPDX checks
- [x] 7.3 Update the Documentation state ledger in `AGENTS.md` for the touched pages (`index.adoc`, `main:build/actions/rectangle-tool.adoc`) and add a docs note on diffing the overridden `footer-scripts.hbs` on docouture upgrades
