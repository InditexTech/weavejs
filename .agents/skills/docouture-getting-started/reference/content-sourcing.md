# Content sourcing

Once the structure is planned (`structure-planning.md`), every page needs real content
from somewhere. This is deliberately not prescriptive about _where_ — a repo with a rich
`docs/` wiki export and a repo with nothing but source code both need to end up
documented, through different paths.

## Priority order

For each planned page, look in this order and use the first thing that actually exists:

1. **Existing docs** — a pre-existing `docs/` tree, wiki export, Notion/Confluence dump
   committed somewhere, or hand-written prose already sitting in the repo. Adapt it into
   the page structure/blocks from `docouture-writing-docs-pages`, don't just paste it verbatim
   if the shape doesn't fit (e.g. a wall of prose where a `[tabs]` or ordered steps would
   serve the reader better).
2. **README / CONTRIBUTING / inline package docs** — often covers getting-started and
   contributing ground well, rarely covers the full API/reference surface.
3. **The code itself, directly** — when neither of the above exists, or doesn't cover a
   given surface, read the actual repo to derive the page. This is the case worth
   designing for, not treating as a fallback edge case:
   - exported functions/classes and their doc-comments (JSDoc/TSDoc, docstrings, godoc,
     rustdoc, whatever the language uses) → `reference` pages, one per public symbol or
     coherent group of them
   - CLI command definitions, `--help` output, argument parsers → `guides`/`reference`
     entries for CLI usage
   - config schema files, typed config objects, environment variable reads in code →
     `configuration` pages
   - OpenAPI/GraphQL/protobuf definitions → `reference` pages, one per
     endpoint/type/service or a sensible grouping of them
   - tests and examples in the repo → real, working usage patterns worth lifting into a
     tutorial or reference page's "Usage" section, since they're the most likely to be
     accurate and up to date
4. **Nothing found** — write the page as an explicit stub: enough structure to be useful
   (title, one-line description, an empty section per anticipated topic) plus a visible
   `TODO` note of what's missing and what would need to be true in the repo for the note to
   go away (e.g. "TODO: document once this CLI subcommand exists / is exported").

Don't force step 3 to imitate step 1/2's tone if there's nothing to imitate — a
code-derived reference page reads differently from a hand-written guide, and that's fine.

## No fixed assumption about location

Never assume "the code lives here" or "the API surface is always in `src/`" — every repo
is laid out differently. Look at what's actually there (package manifests, build config,
directory structure, language-appropriate entry points) rather than pattern-matching
against one expected shape.

## Recording what a page is based on

Once a page is drafted from the code itself (step 3 above, not steps 1/2/4), record it in
`AGENTS.md`'s documentation-state ledger — see the `docouture-documenting-changes` skill's
`reference/maintenance-loop.md` for the exact shape. This is what lets that skill's later
passes tell "still matches the code" apart from "needs a look" without re-deriving every
page from scratch each time, and what stops a later pass from overwriting a page a human
has since hand-edited.
