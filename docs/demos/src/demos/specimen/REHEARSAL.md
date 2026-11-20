# Rehearsal: Weave look specimen

Not embedded in any page; it exists to check `src/looks/weave.ts` and `src/weave-ui/*` in both themes.

- **Gold copied:** none (look study). Stage, tokens and `Tooltip` placement follow `kit/` and `references/looks.md`.
- **Source of the look:** `InditexTech/weavejs-frontend` `main` (Nov 2026): shadcn `new-york` / zinc tokens (`src/routes/globals.css`), Inter and Noto Sans Mono, 10px radius scale, `Toolbar`/`ToolbarButton` (white, 4px padding and gap, 40px buttons, square corners, `#2e2e2e` active, `#f0f0f0` hover, 1px lucide strokes, `drop-shadow`), tooltip text "Rectangle tool" + shortcut, selection blue `#1a1aff` from the SDK's nodes-selection constants.
- **Orientation:** the frontend switches the tools toolbar between vertical (left, wide breakpoints) and horizontal (bottom, tooltip on top) by breakpoint. The pill-shaped toolbar in its README screenshots predates this and is not what `main` renders.
- **Dark theme:** the real toolbar is hard-coded `bg-white`; the docs demos invert it (zinc-900 surface, light active button) so a white block does not glare on a dark page.

Captures (`scripts/poster.mjs`): `specimen-light.png`, `specimen-dark.png`.

## Not checked

- Side-by-side with a live screenshot of the running frontend at the same scale.
- Horizontal toolbar variant (not needed for the pilot).
