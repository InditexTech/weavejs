# Proposal

## Why

The pilot (`docs-faux-ui-demos`, issue #1305) proved the live-demo pipeline on three pages. The rest of the docs still show static PNGs and GIFs (about 38 MB, not theme-aware, hard to keep in sync) or no media at all. Tracked in InditexTech/weavejs#1307.

## What Changes

- One demo per page for every node (18), action (28), plugin (17) and store (4: standalone, websockets, azure-web-pubsub and the stores index) page: 67 demos.
- Extend `weave-ui` with the shared parts the families reuse (node renderers, context menu, zoom bar, minimap, comment pins, file drop, system-flow parts).
- Add `npm run posters` (export every light and dark poster pair from the registry) and a `new-demo` scaffold script.
- Replace each page's GIF or PNG screenshot with its demo and delete the old media when unused (about 38 MB).
- Store pages keep their mermaid diagrams; the demo is added above them.
- Extend the `weave-demos` skill with the new parts and the scene families.

Decisions taken: node and tool pages get separate demos; no page keeps a real screenshot; `layer` and `stage` node pages are non-visual and stay as they are; order is not significant.

Non-goals: new loader or kit features, a docouture block, changes to any `code/` package, a compact (phone-column) redesign of existing demos.

## Capabilities

### New Capabilities
- `docs-demos/coverage`: which documentation pages carry a demo, what each demo must show, and the automation around posters.

### Modified Capabilities

None. (`docs-demos/live-demos`, from the pilot change, defines how any demo behaves and is reused unchanged.)

## Impact

- `docs/demos/` (new demos, `weave-ui` parts, scripts), `docs/src/modules/{main,sdk,...}/pages/` embeds, `docs/src/modules/main/images/` (media removed, posters added), `AGENTS.md` ledger rows.
- Bundle: one lazy chunk per demo; the shared chunk grows with the parts. Pages without demos still pay only the 1.6 kB loader.
- No runtime change to published Weave packages.
