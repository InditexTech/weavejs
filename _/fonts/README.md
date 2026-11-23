# Self-hosted fonts

Used by the docs demos (`docs/demos`) so no font is requested from a third party.
Matches the typefaces of the Weave.js showcase frontend (`InditexTech/weavejs-frontend`).

- `Inter-{300,400,700}.woff2`: Inter, SIL OFL 1.1, see `LICENSE-Inter.txt`.
- `NotoSansMono-400.woff2`: Noto Sans Mono, SIL OFL 1.1, see `LICENSE-NotoSansMono.txt`.

Latin subset (U+0020-007E, U+00A0-00FF and common punctuation), converted to WOFF2 with `pyftsubset` from the TTF files hosted in `weavejs-frontend`.
