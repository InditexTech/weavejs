<!--
SPDX-FileCopyrightText: 2026 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js docs demos

Animated faux-UI demos for the documentation site, built with the vendored [Stageshow](https://benji.org/stageshow) kit (`kit/`, MIT, see `kit/VENDORED.md`) in the Weave showcase look (`src/looks/weave.ts`, mapped from `InditexTech/weavejs-frontend`).

The dev harness wraps each demo the way an image block does (`.doc .imageblock.weave-demo`, with the docs UI's `svg { height: auto }` rule), so what you see in `npm run dev` matches the site.

They are authored illustrations, not live Weave canvases. The docs build compiles them into `docs/supplemental-ui/js/demos/` (git-ignored), served by the site under `/_/js/demos/`.

## Embed a demo in a page

Use the poster as a normal AsciiDoc image and give it the `weave-demo` role plus `weave-demo--<name>`, where `<name>` is the key in `src/registry.ts`:

```asciidoc
image::rectangle-tool-poster.png[A rectangle is drawn on the canvas,width=960,height=540,role="weave-demo weave-demo--rectangle-tool"]
```

The image is what readers see without JavaScript and while the demo loads, and it stays if the demo fails. It is the demo's **first frame** (start state, cursor at rest), not its last: the loader keeps it visible until the stage has painted that same frame (two animation frames after React commits), so the hand-over has no jump and no blank gap. Once the block nears the viewport the loader (`src/loader.ts`, added by `docs/supplemental-ui/partials/footer-scripts.hbs`) mounts the demo over it, follows the docs light/dark toggle, and the kit's `Stage` pauses it off-screen and shows its poster state under reduced motion.

On the home page the hero slot is a demo too: set `:page-hero-image:` to the poster and `:page-hero-demo: <name>` (supported by the overridden `supplemental-ui/partials/home-hero.hbs`).

## Add a demo

Fastest path: `npm run new-demo -- <name> --family tool|node|blank --images <folder under docs/src/modules>` creates the folder (component, stylesheet, `BRIEF.md`, `REHEARSAL.md`), the registry entry and the `pages.json` mapping from a family starting point. Then:

1. Add `src/demos/<name>/BRIEF.md` (the prompt: medium, place, look, story beats, size, crop) and ask the agent, with the `stageshow` and `weave-demos` skills, to build `<name>.tsx` from the closest Stageshow gold example.
2. Export it from `src/registry.ts` as a lazy import.
3. Rehearse (below), write `REHEARSAL.md`, export the poster PNG.
4. Embed it in the page as above.

Demos are 960x540 (16:9) by default, with a transparent background and no plate; a brief may override the size.

## Commands

Run from `docs/demos/`:

```sh
npm run dev          # http://127.0.0.1:5174/?demo=<name>&theme=light|dark
npm run typecheck
npm test             # loader unit tests
npm run build        # to ../supplemental-ui/js/demos
```

`docs/` runs the build for you: `npm ci` in `docs/` installs and builds the demos (`postinstall`), and `npm run build` rebuilds them first. Antora does not rebuild them while `docouture dev` runs, so keep `npm run build` or `npm run dev` going when editing demos.

### Poster PNGs for every demo

`npm run posters` exports the light and dark pair of every registered demo, each from the stage's first frame (`?frame=initial` on the dev route, which freezes every Stage before its script runs) (or only the keys you name: `npm run posters -- ellipse-tool`). It writes them next to the demo and, when `pages.json` maps the key to a folder under `docs/src/modules`, copies them there for the page to embed. It starts the dev server if none is running and exits non-zero if any export fails. A demo whose `BRIEF.md` says `**Poster alpha:** required` must produce a PNG with an alpha channel.

### One poster by hand (transparent)

`scripts/poster.mjs` screenshots one element with an alpha channel (Stageshow's `film.mjs --still` is opaque). `--reduced` makes the stage show its poster state (use the dev route's `&frame=initial` instead for a page poster); `--require-alpha` fails if the PNG has no alpha channel (use `--check-alpha` instead for a demo that fills its whole stage, such as a cropped canvas, which is fully opaque):

```sh
node scripts/poster.mjs 'http://127.0.0.1:5174/?demo=<name>' --select '#root' --out src/demos/<name>/<name>-poster-light.png --reduced --require-alpha
node scripts/poster.mjs 'http://127.0.0.1:5174/?demo=<name>&theme=dark' --dark --reduced --select '#root' --out src/demos/<name>/<name>-poster-dark.png --require-alpha
```

Needs Google Chrome (or `CHROME_PATH`). The AsciiDoc page references the PNG from its module's `images/` folder, so copy the light poster there.

### Film and gate (Stageshow)

The skill's scripts live in `.agents/skills/stageshow/scripts/` and need `playwright-core` once:

```sh
npm --prefix ../../.agents/skills/stageshow install --no-save --no-package-lock playwright-core@~1.48.2
node ../../.agents/skills/stageshow/scripts/film.mjs 'http://127.0.0.1:5174/?demo=<name>' --select '#root' --gate
node ../../.agents/skills/stageshow/scripts/film.mjs 'http://127.0.0.1:5174/?demo=<name>' --select '#root' --width 390 --gate
```

A demo is ready when `--gate` ends `rehearsal passed`; that is necessary, not sufficient, so watch the motion too.

## Shared parts

`src/weave-ui/` holds the Weave parts demos are built from: toolbar, canvas, peers, room cards, selection, `nodes/` (SVG node renderers), `overlays/` (context menu, zoom bar, minimap, comment pin, snap guides, marquee, drop target) and `flow/` (system-flow boxes and message chips for the store pages). SVGs that fill their parent carry the `wv-fill` class. `nodes-specimen` and `overlays-specimen` render them all, in both themes, for checking; they are not exported as posters.

## Fonts

`Weave Inter` and `Weave Noto Sans Mono` are registered at runtime from `docs/supplemental-ui/fonts/` (see its README). The families are named distinctly because the docs UI bundle already loads its own `Inter`.

## On a docouture upgrade

Two UI-bundle partials are overridden in `docs/supplemental-ui/partials/` (each says so in its header comment):

- `footer-scripts.hbs`: the bundle's `site.js` tag plus the demos loader tag.
- `home-hero.hbs`: only the media slot, for `:page-hero-demo:`.

After bumping `@inditextech/docouture-ui-bundle`, diff each against the new bundle's `partials/` copy (unzip `node_modules/@inditextech/docouture-ui-bundle/build/ui-bundle.zip`) and re-apply the change on top of the new upstream file.

When a demo is touched, update its row in the documentation state ledger in the root `AGENTS.md`.
