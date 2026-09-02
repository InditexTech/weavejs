---
name: docouture-getting-started
description: "How to take a repo from no docs at all to a real, published docouture site — scaffolding it with the docouture CLI if it isn't already, planning what the site's structure should be, and drafting first content from whatever the repo actually has (existing docs, README, CONTRIBUTING, or the code itself). USE WHEN starting documentation from scratch, a repo has no docs/ yet, deciding what a new docs site should cover, or planning its module/page structure for the first time. EXAMPLES: 'set up docs for this repo', 'I want to start documenting this project', 'what should my docs site look like', 'scaffold docouture here and write a first draft'."
---

# Getting started with docouture

This is the entry point for a repo with no docouture site yet. It gets you from nothing to a
published-shaped site with a real first draft — not perfect, not complete, but grounded in
what the repo actually is rather than a boilerplate stub. Once a site exists and is
evolving normally, **`docouture-documenting-changes`** takes over for keeping it in sync as the
repo grows; re-entering this skill after that point should be rare (a full restructure, not
routine maintenance).

This is a planning and orchestration skill, not a syntax reference. Once a decision is
made here, it hands off to three skills:

- **`docouture-docs-internals`** — once you know a module/page needs to exist, this is how
  `antora.yml`, `nav.adoc` and the home-page pattern actually work.
- **`docouture-authoring-guides`** — once you know a page needs to exist, this is *what it
  should say*: the section skeleton, per-section instructions, a copyable AsciiDoc
  skeleton and a quality checklist, for every page in the standard six-section structure
  plus the home page.
- **`docouture-writing-docs-pages`** — once you know what a page should say, this is *how*
  to write it in AsciiDoc: the syntax, xrefs and this site's custom blocks (`[tabs]`,
  `[cards]`, `[accordion]`, …).

- `reference/structure-planning.md` — mono- vs. multi-module decision, the default nav
  structure, how Guides/Reference get derived from the repo rather than assumed, the
  per-artifact-module strategy for a monorepo, and the home page's special (structure now,
  content later) treatment.
- `reference/content-sourcing.md` — where content comes from when nothing is prescribed:
  priority order across existing docs, README/CONTRIBUTING, and the repo's code itself
  (exports, doc-comments, CLI definitions, config schemas, tests-as-examples) — including
  the all-code, zero-prose case.

## The flow, in short

1. **Scaffold, if it isn't already.** Check for `docs/antora-playbook.yml` (or run
   `docouture doctor` — a missing-site error means there's nothing here yet). If absent, run
   `docouture new <name>` (interactively, or with flags — see the CLI's own `--help`) from the
   repo root. This is the CLI's whole job: it lays down the starter site and GitHub
   workflows, nothing about content or skills.
2. **Base check** — confirm identity/branding `docouture new` already seeded (title, product
   name, description, favicon, light/dark logo). Look for existing brand assets elsewhere
   in the repo before asking the user to supply new ones.
3. **Structure planning** — decide which modules exist beyond the default `main`. See
   `reference/structure-planning.md`. The home page's slot is asserted here — its content
   is not, see below.
4. **Content sourcing & drafting** — for every planned page, find where its content
   actually lives (don't assume — a repo with no `README` at all still has an API surface,
   a CLI, a config schema) and draft it. See `reference/content-sourcing.md`. Before
   writing, open that page's guide in `docouture-authoring-guides` for its section-by-section
   contract (what to say, what not to say, the copyable skeleton and quality checklist) —
   content-sourcing decides *where the facts come from*, the authoring guide decides *what
   shape the page takes*. Draft a rough home page early from whatever one-line description
   exists; treat it as unfinished.
5. **Record what was sourced from code** in `AGENTS.md`'s documentation-state ledger — see
   the `docouture-documenting-changes` skill's `reference/maintenance-loop.md` for the exact
   shape. This is what lets that skill pick up the loop from here, later.
6. **Hand off.** Once the site has a real first draft, day-to-day upkeep belongs to
   `docouture-documenting-changes` — don't keep re-running this skill's structure-planning pass
   every time something changes; that skill's re-entry loop is for that.

## What this skill does not opinionate about

Where in the repo the "real" information lives is entirely up to the repo itself — a
doc-comment, a type signature, a schema file, a test, a `--help` string, an existing
`README.md`, are all fair game and equally valid sources. This skill does not prescribe a
required location or format for source material; it only prescribes _that_ every
documented surface is traceable to something real, and _where in `AGENTS.md`_ that
traceability is recorded.
