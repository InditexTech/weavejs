---
name: weave-demos
description: House rules for building animated faux-UI demos for the Weave.js documentation site with Stageshow. Use whenever adding, changing or re-running a demo under docs/demos (home hero, tool or node cards), writing a demo BRIEF.md, exporting its poster, or correcting how a demo looks. Layers the Weave look, 16:9 transparent format and repo workflow on top of the `stageshow` skill.
---

# Weave docs demos

Layer on top of the `stageshow` skill: read it first (workflow, craft, framing, motion, rehearse). This skill only adds what is specific to this repo. If a rule here conflicts with `stageshow`, this one wins for demos under `docs/demos/`.

Never edit `.agents/skills/stageshow/`: `npx skills add` updates would overwrite it. Put corrections in the **Corrections** section below instead.

## Where things live

```
docs/demos/
  kit/                    vendored Stageshow kit (import from here, not from the skill)
  src/looks/weave.ts      the Weave look (tokens, light and dark)
  src/looks/fonts.ts      runtime font registration
  src/weave-ui/           Weave product parts: toolbar, tooltip, canvas
  src/demos/<name>/       BRIEF.md, <name>.tsx, REHEARSAL.md, posters
  src/registry.ts         lazy registry, key = the name used in pages
  scripts/poster.mjs      transparent poster PNGs
  README.md               commands (dev, film, poster, embed)
```

## Fixed rules

- **Format.** Design size `960 x 540` (16:9) unless the brief says otherwise, scaled to the container by `Stage`. **Transparent**: no `ground`, no plate, no page-colored backdrop. The product's own surfaces may fill the stage when the framing calls for it (a cropped canvas), but never a card around the product.
- **Look.** Always `<Stage theme={theme} tokens={weaveTokens(theme)}>` with the `theme` prop the loader passes (`light` | `dark`, from the docs toggle). Never hard-code colors, radii or fonts in a demo; extend `looks/weave.ts` or `weave-ui/` when something is missing. Fonts are `Weave Inter` and `Weave Noto Sans Mono`, self-hosted.
- **Mirror the real app.** The reference is `InditexTech/weavejs-frontend` `main` (Tailwind v4, shadcn new-york/zinc, lucide, 1px icon strokes). Toolbar: white, square-cornered, 4px padding and gap, 40px buttons, `#2e2e2e` active, vertical on the left at wide breakpoints (horizontal at the bottom at narrow ones), tooltip "<Tool name> <shortcut>" 12px beside the button. Selection is the SDK's blue `#1a1aff` with white anchors. Do not copy the old pill-shaped toolbar from README screenshots. Check the frontend source or a live screenshot before inventing UI.
- **Icons** are `lucide-react` only. No sparkles, no made-up logos (stageshow rule).
- **Words.** The Weave UI is mostly icons. Real strings only where the story needs them: tool names in tooltips, collaborator names on cursors, a node label.
- **Window chrome and cropping.** Hero demos use the kit browser chrome (`Window url=...`), shown **whole** with an even margin on every side (the film gate requires even margins; 24 px in 960 x 540). Tool and node cards use no window: crop to the toolbar plus a canvas corner. **Never leave a shape cut by an edge**: every node on the canvas is a whole shape (the user reads a cropped rectangle as a bug). This overrides stageshow's "window runs off an edge" advice.
- **Cursors.** Remote collaborators are `Peer` cursors (`weave-ui/peer.tsx`, arrow, crosshair while a drawing tool is active). A single actor uses the kit cursor, `style: 'real'` with `ripple` (only that set has a crosshair; `arrow` does not): the canvas carries `data-cursor="crosshair"` while a drawing tool is active. Do not use `a.drag` over a crosshair canvas (the kit treats it as a text selection and gates on `a.caret()`): `click()` for the press plus a straight `move()` with `path` and `onMove` instead.
- **Canvas drawings are SVG.** Nodes, selection boxes and anchors are painted by the canvas in the real app, not DOM elements: draw them as SVG (`weave-ui/selection.tsx`), or the gate reads them as floating cards or status dots.
- **Typing in a centered label.** Reserve the full word's width (typed part visible, the rest `visibility: hidden`) so it does not shift per keystroke, and make the caret a `::after`, not an element.
- **Posters.** Every demo ships a `<name>-poster-light.png` and `<name>-poster-dark.png` pair (`scripts/poster.mjs --reduced`, 2x; `--require-alpha` when the demo leaves transparent margins). The page links the light one; the loader swaps to the dark one in the dark theme, so keep the `-light` / `-dark` suffix pair. The poster state (`Stage poster=`) is the beat that tells the story on its own: the result on screen, not mid-motion.
- **Deps.** No new runtime dependency without asking. The kit and `lucide-react` are enough.
- **Do not edit** `kit/` except through a documented re-sync (`kit/VENDORED.md`).

## Workflow

1. Write `src/demos/<name>/BRIEF.md` from `templates/BRIEF.md`. Ground the story in the real behavior (SDK source or the docs page for the tool), not in guesses.
2. Pick the gold example (map below), copy its structure into `src/demos/<name>/`, switch to the Weave look and Weave parts.
3. Register it in `src/registry.ts`; run `npm run dev` in `docs/demos` and open `/?demo=<name>&theme=light|dark`.
4. Rehearse per `stageshow` (`film.mjs --gate` at 960 and 390, both themes); fix every gate line.
5. Export posters, write `REHEARSAL.md` from `templates/REHEARSAL.md`.
6. Embed in the page with `image::<poster>-light.png[alt,width=960,height=540,role="weave-demo weave-demo--<name>"]` (no commas in the alt text: they split the macro's attributes; on the home page use `:page-hero-image:` and `:page-hero-demo:` instead) and check light, dark, reduced motion and no-JS (`docs/demos/README.md`).

## Gold examples for Weave scenes

| Scene | Start from | Borrow |
|---|---|---|
| Collaboration, two cursors on one canvas | `presence` | per-person color, names riding cursors |
| Drawing or placing a node (drag) | `freeform-drag` | grab offset, measured geometry, snapping |
| Tool picked from a toolbar, tooltip | `cursor-morph` | crosshair on the canvas, hover tooltip |
| Selection handles, resize | `cursor-resize` | edge and corner resize cursors |
| Hero in a browser | `hero-demo`, `linear` | crop off the edge, one satellite |
| Two clients, one room (stores docs) | `device-pair`, `annotations` | straddling objects, flow leaders |

## Shared parts (`docs/demos/src/weave-ui/`)

Assemble a demo from these; extend them when something is missing, never hand-build a lookalike inside a demo.

- `canvas`, `toolbar` (`WeaveToolbar`, `WeaveTooltip`), `selection` (HTML-box selection), `peer` (collaborator cursor), `room` (`RoomCard`, `StatusCard`).
- `nodes/nodes` (SVG, canvas coordinates, put inside `<NodeLayer>`): `RectNode`, `EllipseNode`, `PolygonNode`, `RegularPolygonNode`, `StarNode`, `LineNode`, `ArrowNode`, `TextNode`, `ImageNode`, `FrameNode`, `StickyNode`, `ConnectorNode`, `MeasureNode`, `StrokeNode`, `NodeSelection`. Lines, text, connectors and strokes use `--wv-ink` (black in light, near white in dark); filled shapes keep the SDK's white fill and black stroke.
- `overlays/overlays`: `ContextMenu`, `ZoomBar`, `Minimap`, `CommentPin`, `SnapGuides`, `Marquee`, `DropTarget`, `FileChip`.
- `flow/flow` (store scenes): `FlowBox`, `MiniCanvas`, `MessageChip`, used with the kit's `Connector`.
- `fill.css` (`wv-fill`): every SVG that fills its parent carries this class.

## Scene families and their gold examples

| Family | Pages | Start from | Notes |
|---|---|---|---|
| Shapes | ellipse, polygon, regular-polygon, star (node and tool) | `rectangle-tool` / `rectangle-node` | polygon tool: a click per point, closing on the first point |
| Lines and links | line, arrow, connector, measure | `rectangle-tool`, `cursor-resize` | connector: two nodes linked; measure: the length label |
| Text | text, text-tool, text-v2 | `google-docs`, `notion` | reserve the label's width while typing |
| Media | image, image-tool, images-tool, video, video-tool | `upload` | placeholders only (`ImageNode`), never a made-up photo |
| Frames, notes, comments | frame, sticky-note, group, comment (+ tools) | `many-of-one`, `presence` | |
| Drawing | brush, pen, eraser, stroke (+ tools) | `chart-scrub` | a pointer path with `onMove` |
| Selection and viewport tools | move, selection, align, fit, zoom, export | `cursor-morph`, `close-up` | |
| Collaboration plugins | users-*, connected-users | `presence`, `home-hero` | `Peer` cursors |
| Canvas-behavior plugins | context-menu, copy-paste, comments-renderer, stage-* | `freeform-drag`, `annotations` | |
| Stores | standalone, websockets, azure-web-pubsub, overview | `subscriptions`, `device-pair` | `FlowBox` + `Connector` + `MessageChip`; keep the page's mermaid diagram below |

## Commands

From `docs/demos`: `npm run new-demo -- <name> --family tool|node|blank --images <folder under docs/src/modules>` scaffolds a demo (folder, brief, rehearsal, registry entry, `pages.json` mapping); `npm run posters [-- <key> ...]` exports and copies every poster pair; see `docs/demos/README.md`.

## Brief checklist

A brief is re-runnable: another agent must be able to rebuild the demo from it. It names the page it sits on, the size, the look (always Weave), the beats (3 to 5, with the payoff), the crop, the gold example, the cursor style, and what the poster shows. See `templates/BRIEF.md`.

## Corrections

When the user corrects a demo ("shadow too harsh", "title not centered"), fix the demo and add one line here saying what and why, so every later demo gets it for free. Newest first.

- **SVG inside an image block collapses** (selection taller than its shape, a shape clipped while drawn). The docs UI styles every `.doc .imageblock svg` with `height: auto; max-width: 100%`, which breaks any SVG sized with `height: 100%`. Give every SVG that fills its parent the `wv-fill` class (`weave-ui/fill.css`). The dev harness (`docs/demos/index.html`) now wraps the demo in `.doc .imageblock.weave-demo` with that same rule, so such bugs show in `npm run dev` and in film gates; check a new demo on its built page too.
