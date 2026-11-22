# Tasks

Every demo task below is done only when the demo meets the DoD (design.md, decision 6): `BRIEF.md` grounded in the SDK source, `REHEARSAL.md`, `film.mjs --gate` ending `rehearsal passed` at 960 and 390 in light and dark, built-page check (mounted, no console errors, both themes, reduced motion, no-JS poster), posters via `npm run posters`, the page's old media removed (grep first), and a ledger row in `AGENTS.md`.

## 1. Shared infrastructure

- [x] 1.1 Add `scripts/posters.mjs` and `npm run posters` in `docs/demos`: start the dev server, export light and dark posters for every registry key, fail on any error; verify by running it and seeing every registered demo's poster pair rewritten
- [x] 1.2 Add `scripts/new-demo.mjs` and `npm run new-demo -- <name> [--family f]`: copy the brief and rehearsal templates, a family stub and a registry entry; verify by scaffolding a throwaway demo, seeing `npm run build` and `npm run typecheck` pass, then deleting it
- [x] 1.3 Extend `weave-ui` with node renderers (`nodes/`: ellipse, polygon, regular polygon, star, line, arrow, text, image placeholder, frame, sticky note, connector, measure, stroke) as filling SVGs with the `wv-fill` class; verify with a specimen demo rendering all of them in both themes and `film.mjs --gate` passing
- [x] 1.4 Extend `weave-ui` with overlays (`overlays/`: context menu, zoom bar, minimap, comment pin, snap guides, marquee, file-drop target) and system-flow parts (`flow/`: client, server, transport, message chip on a `Connector`); verify with a specimen demo in both themes and `film.mjs --gate` passing
- [x] 1.5 Add the scene families, their gold examples and gotchas to the `weave-demos` skill and update `docs/demos/README.md` for the new commands; verify the skill lists every family in this change and the README commands run as written

## 2. Shapes

- [x] 2.1 Ellipse node: registry key `ellipse`, replaces `nodes/ellipse.png`; meets the DoD
- [x] 2.2 Ellipse tool: registry key `ellipse-tool`, replaces `actions/ellipse-tool.gif`; meets the DoD
- [x] 2.3 Polygon node: registry key `polygon`, replaces `none`; meets the DoD
- [x] 2.4 Polygon tool (drag to size a preset polygon, pentagon by default): registry key `polygon-tool`, replaces `none`; meets the DoD
- [x] 2.5 Regular polygon node: registry key `regular-polygon`, replaces `nodes/regular-polygon.png`; meets the DoD
- [x] 2.6 Regular polygon tool: registry key `regular-polygon-tool`, replaces `actions/regular-polygon-tool.gif`; meets the DoD
- [x] 2.7 Star node: registry key `star`, replaces `nodes/star.png`; meets the DoD
- [x] 2.8 Star tool: registry key `star-tool`, replaces `actions/star-tool.gif`; meets the DoD

## 3. Lines and links

- [x] 3.1 Line node: registry key `line`, replaces `nodes/line.png`; meets the DoD
- [x] 3.2 Line tool: registry key `line-tool`, replaces `actions/line-tool.gif`; meets the DoD
- [x] 3.3 Arrow node: registry key `arrow`, replaces `nodes/arrow.png`; meets the DoD
- [x] 3.4 Arrow tool: registry key `arrow-tool`, replaces `actions/arrow-tool.gif`; meets the DoD
- [x] 3.5 Connector node: registry key `connector`, replaces `nodes/connector.png`; meets the DoD
- [x] 3.6 Connector tool: registry key `connector-tool`, replaces `actions/connector-tool.gif`; meets the DoD
- [x] 3.7 Measure node: registry key `measure`, replaces `nodes/measure.png`; meets the DoD
- [x] 3.8 Measure tool: registry key `measure-tool`, replaces `actions/measure-tool.gif`; meets the DoD

## 4. Text

- [x] 4.1 Text node: registry key `text`, replaces `nodes/text.png`; meets the DoD
- [x] 4.2 Text tool: registry key `text-tool`, replaces `actions/text-tool.gif`; meets the DoD
- [x] 4.3 Text v2 node (rich text: marks, lists, paragraph indent): registry key `text-v2`, replaces `none`; meets the DoD

## 5. Media

- [x] 5.1 Image node (crop and flip): registry key `image`, replaces `nodes/image.png`; meets the DoD
- [x] 5.2 Image tool: registry key `image-tool`, replaces `actions/image-tool.gif`; meets the DoD
- [x] 5.3 Images tool: registry key `images-tool`, replaces `actions/images-tool.gif`; meets the DoD
- [x] 5.4 Video node: registry key `video`, replaces `nodes/video.png`; meets the DoD
- [x] 5.5 Video tool: registry key `video-tool`, replaces `actions/video-tool.gif`; meets the DoD

## 6. Frames, notes and comments

- [x] 6.1 Frame node (edge selection): registry key `frame`, replaces `nodes/frame.png`; meets the DoD
- [x] 6.2 Frame tool: registry key `frame-tool`, replaces `actions/frame-tool.gif`; meets the DoD
- [x] 6.3 Sticky note node: registry key `sticky-note`, replaces `none`; meets the DoD
- [x] 6.4 Sticky note tool: registry key `sticky-note-tool`, replaces `none`; meets the DoD
- [x] 6.5 Group node: registry key `group`, replaces `nodes/group.png`; meets the DoD
- [x] 6.6 Comment node: registry key `comment`, replaces `nodes/comment.png`; meets the DoD
- [x] 6.7 Comment tool: registry key `comment-tool`, replaces `actions/comment-tool.png`; meets the DoD

## 7. Drawing

- [x] 7.1 Brush tool (input profiles): registry key `brush-tool`, replaces `actions/brush-tool.gif`; meets the DoD
- [x] 7.2 Pen tool: registry key `pen-tool`, replaces `actions/pen-tool.gif`; meets the DoD
- [x] 7.3 Eraser tool: registry key `eraser-tool`, replaces `actions/eraser-tool.gif`; meets the DoD
- [x] 7.4 Stroke node: registry key `stroke`, replaces `nodes/stroke.png`; meets the DoD
- [x] 7.5 Stroke single node: registry key `stroke-single`, replaces `nodes/stroke-single.png`; meets the DoD
- [x] 7.6 Stroke tool: registry key `stroke-tool`, replaces `actions/stroke-tool.gif`; meets the DoD

## 8. Selection, viewport and export tools

- [x] 8.1 Move tool: registry key `move-tool`, replaces `actions/move-tool.gif`; meets the DoD
- [x] 8.2 Selection tool: registry key `selection-tool`, replaces `actions/selection-tool.gif`; meets the DoD
- [x] 8.3 Align nodes tool: registry key `align-nodes-tool`, replaces `actions/align-nodes-tool.gif`; meets the DoD
- [x] 8.4 Fit to screen tool: registry key `fit-to-screen-tool`, replaces `actions/fit-to-screen-tool.gif`; meets the DoD
- [x] 8.5 Fit to selection tool: registry key `fit-to-selection-tool`, replaces `actions/fit-to-selection-tool.gif`; meets the DoD
- [x] 8.6 Zoom in tool: registry key `zoom-in-tool`, replaces `actions/zoom-in-tool.gif`; meets the DoD
- [x] 8.7 Zoom out tool: registry key `zoom-out-tool`, replaces `actions/zoom-out-tool.gif`; meets the DoD
- [x] 8.8 Export node tool: registry key `export-node-tool`, replaces `actions/export-node-tool.gif`; meets the DoD
- [x] 8.9 Export stage tool: registry key `export-stage-tool`, replaces `actions/export-stage-tool.gif`; meets the DoD

## 9. Collaboration and selection plugins

- [x] 9.1 Users presence: registry key `users-presence`, replaces `plugins/users-presence.gif`; meets the DoD
- [x] 9.2 Users pointers: registry key `users-pointers`, replaces `plugins/users-pointers.gif`; meets the DoD
- [x] 9.3 Users selector: registry key `users-selector`, replaces `plugins/users-selector.gif`; meets the DoD
- [x] 9.4 Connected users: registry key `connected-users`, replaces `plugins/connected-users.gif`; meets the DoD
- [x] 9.5 Nodes selection: registry key `nodes-selection`, replaces `plugins/nodes-selection.gif`; meets the DoD
- [x] 9.6 Nodes multi-selection feedback: registry key `nodes-multi-selection-feedback`, replaces `plugins/nodes-multi-selection-feedback.gif`; meets the DoD
- [x] 9.7 Nodes snapping: registry key `nodes-snapping`, replaces `plugins/nodes-snapping.gif`; meets the DoD

## 10. Canvas-behavior plugins

- [ ] 10.1 Context menu: registry key `context-menu`, replaces `plugins/context-menu.gif`; meets the DoD
- [ ] 10.2 Copy and paste nodes: registry key `copy-paste-nodes`, replaces `plugins/copy-paste.gif`; meets the DoD
- [ ] 10.3 Comments renderer: registry key `comments-renderer`, replaces `plugins/comments-renderer.gif`; meets the DoD
- [ ] 10.4 Stage panning: registry key `stage-panning`, replaces `plugins/stage-panning.gif`; meets the DoD
- [ ] 10.5 Stage zoom (currently reuses the panning GIF): registry key `stage-zoom`, replaces `plugins/stage-panning.gif`; meets the DoD
- [ ] 10.6 Stage resize: registry key `stage-resize`, replaces `none`; meets the DoD
- [ ] 10.7 Stage grid: registry key `stage-grid`, replaces `none`; meets the DoD
- [ ] 10.8 Stage minimap: registry key `stage-minimap`, replaces `none`; meets the DoD
- [ ] 10.9 Stage keyboard move: registry key `stage-keyboard-move`, replaces `none`; meets the DoD
- [ ] 10.10 Stage drop area (a file dragged in from the desktop): registry key `stage-drop-area`, replaces `plugins/stage-drop-area.gif`; meets the DoD

## 11. Stores

- [ ] 11.1 Standalone store: one client, local state, nothing to sync: registry key `standalone-store`, replaces `none`; meets the DoD
- [ ] 11.2 WebSockets store: an edit travels client, server, client; keep the mermaid diagram below: registry key `websockets-store`, replaces `none (mermaid)`; meets the DoD
- [ ] 11.3 Azure Web PubSub store: clients, Web PubSub, your backend; keep the mermaid diagram below: registry key `azure-web-pubsub-store`, replaces `none (mermaid)`; meets the DoD
- [ ] 11.4 Stores overview: the same edit reaching two clients through each transport; names the transports the page compares: registry key `stores-index`, replaces `none`; meets the DoD

## 12. Integration

- [ ] 12.1 Run the full docs build and `docouture doctor`; verify no console errors on a page of each family, the demos add no third-party requests, and a page without a demo still loads only the loader
- [ ] 12.2 Verify `grep` finds no GIF or PNG screenshot reference left on a covered page and the orphaned media files are deleted; check the docs bundle size drop against the roughly 38 MB baseline
- [ ] 12.3 Open the PR(s) and confirm `docouture-pr-verify` builds the demos and passes the REUSE checks
