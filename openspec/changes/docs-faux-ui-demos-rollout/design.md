# Design

## Context

The pilot (see `openspec/changes/docs-faux-ui-demos`) delivered the pipeline: `docs/demos/` (Vite, vendored Stageshow kit), `weave-ui` parts (toolbar, tooltip, canvas, selection, peer, room cards), the loader, two partial overrides, `scripts/poster.mjs`, the `weave-demos` skill, and three demos. Lessons that now bind every demo:

- The docs UI styles SVGs inside image blocks (`.doc .imageblock svg { height: auto }`); filling SVGs use the `wv-fill` class. The dev harness reproduces this.
- Nodes, selections and anchors are canvas drawings, so they are SVG; no node is ever cut by an edge; a whole window has even margins.
- Posters come as `<name>-poster-light.png` / `-dark.png`; pages embed `image::<poster>-light.png[alt,width=960,height=540,role="weave-demo weave-demo--<name>"]` (no commas in alt text).
- Cursors: remote people are `Peer`; a single actor uses the kit cursor `real` style with ripple; do not use `a.drag` over a crosshair canvas.

See proposal.md for scope and motivation.

## Goals / Non-Goals

**Goals:**
- Reuse, not re-invention: new demos are assembled from `weave-ui` parts and a family template, so a demo is mostly its script and brief.
- Make the repeatable work (posters, scaffolding, embed, verify) one command each.
- Keep review load per PR small enough to look at every demo.

**Non-Goals:**
- Changing the loader, the kit or the pilot demos' behavior.
- Designing a compact (phone-column) layout.

## Decisions

1. **One demo per page, family-based reuse.** Demos are separate (node vs tool) but share per-family modules: `weave-ui/nodes/*` (ellipse, polygon, star, line, arrow, text, image placeholder, frame, sticky note, connector, measure, stroke), `weave-ui/overlays/*` (context menu, zoom bar, minimap, comment pin, snap guides, marquee, drop target), and `weave-ui/flow/*` (client, server, transport, message chip for stores). A new demo file imports these and adds its script.
   - Alternative: one parametrized component per pair. Rejected by the user (separate demos); sharing happens at the part level.
2. **Scene families** (gold examples per family are in the `weave-demos` skill): Shapes, Lines, Text, Media, Frames and notes, Drawing, Selection and viewport tools, Collaboration plugins, Canvas-behavior plugins, Stores. Each family gets a short section in the skill with its gold example, its parts and its gotchas.
3. **Automation.** `scripts/posters.mjs` starts the dev server, iterates the registry and exports both posters per demo through `poster.mjs` (alpha required only when a demo's brief says it has transparent margins); `scripts/new-demo.mjs <name> [--family f]` copies the brief and rehearsal templates and a family stub and adds the registry entry. Both are exposed as `npm run posters` and `npm run new-demo`.
4. **Registry naming.** Keys match the page file name with a suffix for the kind where a name collides: nodes `<name>` (e.g. `ellipse`), actions `<name>` (e.g. `ellipse-tool`, already the page name), plugins `<name>` (e.g. `nodes-snapping`), stores `<name>` (e.g. `websockets-store`). Pilot keys stay (`rectangle-node`, `rectangle-tool`, `home-hero`).
5. **Stores use system-flow scenes.** Clients, a transport and a server are drawn with the Weave look plus the kit's `Connector`, `Roll` and a message chip that travels the connector. Each store tells its own story; the mermaid diagram below stays as the exact reference. The page embed goes above the diagram.
6. **Definition of done per demo (DoD).** `BRIEF.md` (grounded in the SDK source), `REHEARSAL.md`, `film.mjs --gate` ending `rehearsal passed` at 960 and 390 in light and dark, a check on the built page (mounted, no console errors, both themes, reduced motion, no-JS poster, SVGs fill their parents), posters via `npm run posters`, the page's old media removed, a ledger row in `AGENTS.md`. Tasks below refer to this as "the DoD".
7. **Batching.** One PR per family (about 6 to 12 demos), reviewed with a fresh-eye pass (a reviewer subagent per `stageshow` review.md) and a contact-sheet look at every demo. Order across families does not matter.
8. **Media cleanup.** Each demo's PR deletes the GIF/PNG it replaces when no other page references it (`grep` first). `stage-zoom` currently reuses the panning GIF; both plugin pages get their own demos.

9. **Generalized scenes.** `weave-ui/scenes/tool-scene.tsx` (pick a tool, drag out a node, select it) and `node-scene.tsx` (select, move, resize from a corner) generalize the two pilots; a shape demo is a thin file that supplies the shape renderer. Tool demos keep their own tooltip text and shortcut from the showcase's tool table (`TOOL_INFO`). The polygon tool is drag-to-size with presets in the SDK (not click-per-point), so it uses the same scene.

## Risks / Trade-offs

- [Volume: 64 more demos, quality drift] -> shared parts, per-family templates, the DoD gate on every demo, a fresh-eye review per PR, and corrections fed back into the `weave-demos` skill.
- [Bundle growth] -> one lazy chunk per demo; shared parts live in shared chunks; pages without demos still load only the 1.6 kB loader. Re-measure after each family.
- [Inaccurate behavior] -> each brief cites the SDK source path; where the SDK has a behavior the demo cannot show, the brief's "Out of scope" lists it.
- [Media still referenced elsewhere] -> `grep` before deleting.
- [Many posters in git] -> posters are 2x PNG; check size after each family; a poster over about 300 kB is a flag to simplify the scene.

## Open Questions

1. Whether the node-page demos for non-visual-looking nodes (`group`, `comment`, `connector`, `measure`) need a mini properties panel to be meaningful; decide in each brief, it does not change the specs.
2. Whether `users-selector` and `connected-users` need a mock top-right room card variant (reuse `StatusCard`); decide in their briefs.
