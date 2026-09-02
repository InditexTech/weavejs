# Structure planning

Decide what the site's shape should be before drafting any content. This builds on
`docouture-docs-internals`'s mechanics — read that skill for how `nav.adoc`/`antora.yml`
actually work; this file is about which structure to choose in the first place.

## The default: `ROOT` + `main`, everything else is pages

`docouture new` always scaffolds two modules, never a true single-module site:

- **`ROOT`** — the landing page only (`pages/index.adoc`), rendered with
  `:page-layout: home`. It has no `nav.adoc` of its own and borrows `main`'s navigation for
  its side menu (`:page-nav-module: main`). Never put content pages here.
- **`main`** — the one real content module from day one, with its own `nav.adoc` and every
  page below. `docs/src/antora.yml`'s `nav_modules:` already lists `main` as its single
  entry straight out of the scaffold.

For a small or early-stage repo, the whole tree below stays inside `main`: each numbered
section becomes a bare, unlinked list item in `main`'s `nav.adoc`, grouping its pages under
a heading with no page of its own (see `docouture-docs-internals`'s
`reference/page-patterns.md` grouping example).

## The target nav structure (inside `main`, to start)

This is the default shape to aim for — six ordered sections, each page tagged with how
essential it is (🔴 required, 🟠 recommended, 🔵 conditional, ⚪ optional). The full page
list, per-section requirement levels and the routing/sizing rules that decide where a
given piece of content belongs live in `docouture-authoring-guides`'s `SKILL.md` — the
single copy of that table; this file only adds the *structural* decisions the content
guide doesn't cover (mono- vs. multi-module, the monorepo per-artifact axis, promoting a
section out of `main`). Skim that table before planning a site's structure so the tags
below aren't quoted from memory against a copy that may have moved on.

Two shorthands worth knowing before reading it: only **Guides** and **Reference** are ever
candidates for their own module (see "Promoting Guides/Reference" below) — Overview,
Getting started, Additional information and Contributing stay grouped inside `main`
permanently, even in a mature, heavily-modularized site.


## Deriving Guides — don't assume a fixed list

Guides is not "write however many how-to pages seem reasonable." Derive the candidate set
by inspecting what the repo can actually do:

- A distinct exported feature area (a public module, a top-level export group) → a "how to
  use `<feature>`" guide.
- A CLI subcommand or subcommand group → a "how to `<verb>` with the CLI" guide.
- A documented workflow spanning multiple parts of the repo (setup → configure → run) → a
  tutorial-shaped guide, using the Tutorial page pattern (`docouture-docs-internals`'s
  `reference/page-patterns.md`).
- An existing `development`/`CONTRIBUTING` workflow distinct from end-user usage → the
  `development` 🟠 page.

One page per identified capability, not a fixed count — a repo with three real
capabilities gets three Guides pages, not a padded-out generic list, and a repo with one
gets one.

## The Reference sub-catalog

Reference documents *what a thing is*, not how to use it. It has a fixed, named set of
candidate sub-pages — include only the ones a detected signal actually supports:

| sub-page          | included when…                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Configuration**  | a config schema file, a typed config object, or environment variable reads in code                |
| **CLI API**        | a `bin` field in `package.json`, or a `cli`/`cmd` directory, `--help` output, argument parsers    |
| **SDK API**        | exported functions/classes with doc-comments (JSDoc/TSDoc, docstrings, godoc, rustdoc, …) meant for another program to import |
| **Public API**     | an OpenAPI/GraphQL/protobuf definition, or a REST/RPC handler directory — a network-facing surface |
| **Integrations**   | documented third-party connectors, webhooks, or plugins this repo ships or consumes               |

This list is extensible — a repo can surface a reference sub-page this table doesn't name
if there's a real, distinct surface that needs one. Each populated sub-page uses the
"Reference/leaf page" pattern (`docouture-docs-internals`'s `reference/page-patterns.md`): one
page per symbol/endpoint/config option, or a sensible grouping of them.

## Signals worth checking

Don't assume where these live — check what's actually in the repo, in whatever form it
takes there. This is the same signal set the Reference sub-catalog table above draws on,
plus the two that shape structure rather than content:

- A changelog file, deprecation notices, major-version breaks, or an existing upgrade
  guide → wants **Additional information → eol / migration-guides**.
- An existing `docs/`, `README.md`, `CONTRIBUTING.md`, wiki export, or similar → these
  inform which pages already have real content to source from (see
  `content-sourcing.md`), not just which pages to create.

Confirm the proposed set of 🔵/⚪ pages with whoever's driving before committing pages to
it — auto-detected signals can be wrong (a `bin` field for an internal-only dev tool
doesn't need a user-facing CLI guide, for instance).

## Promoting Guides/Reference to their own modules

Guides and Reference are the pair worth promoting out of `main` into real modules once the
site outgrows it, because they're the two sections that need a landing page a reader can
land on directly (via the module switcher) rather than always arriving through `main`'s own
nav. Promote them independently and only when it earns its keep — a repo with five guide
pages and one reference page doesn't need Reference split out yet.

When in doubt, leave them inside `main` — it's cheap to split out later, see
`docouture-docs-internals`'s `reference/page-patterns.md` for the mono→multi migration steps.
Splitting too early just adds a module switcher nobody needs; splitting too late means a
`main` full of unrelated content with no clean way to navigate it.

## Monorepo with multiple artifacts: one module per artifact, in addition

A repo with several independently packaged artifacts (several publishable packages in a
monorepo, for instance) gets a *second*, additional axis of modules on top of everything
above — not instead of it. `main` (plus any promoted Guides/Reference) still carries the
product's own end-to-end story; each qualifying artifact gets its own module for its
package-specific detail.

**Proposing candidates**: use "publishable" as the detection proxy — a package whose own
manifest does not mark it private/internal-only (mirroring however this repo itself
decides what ships vs. what's internal tooling, e.g. a `private: true` field). This is a
**proposal, not an auto-commit** — surface the detected candidates and let whoever's
driving confirm which ones actually earn a module; a publishable-but-trivial internal
package might not need one, and a private package with a real public-facing story might.

**Each artifact module's structure** — deliberately compact, not the full six-section
tree:

```
docs/src/modules/<artifact>/
├── nav.adoc
└── pages/
    ├── index.adoc      Overview — what this artifact is, why it exists on its own
    ├── usage.adoc       How to use it — this artifact's own quickstart/usage, scoped
    │                     to just this package, distinct from main's product-wide Guides
    └── api.adoc          API, if needed — reuses the same Reference sub-catalog above
                           (Configuration/CLI API/SDK API/Public API/Integrations),
                           scoped to this one artifact, collapsed to whichever apply —
                           split into multiple pages only if more than one genuinely does
```

**Reference becomes a showcase once artifact modules exist**: don't duplicate each
artifact's API content into `main`'s (or a promoted) Reference section — once per-artifact
modules exist, that section becomes a thin index/showcase linking out to each module's own
API page(s), rather than a parallel full reference tree. `main`'s Guides stays the
cross-cutting, whole-product tutorials (spanning more than one artifact); each artifact
module's own "How to use" page stays narrowly scoped to that one package.

## The home page: structure now, content later

The home page's _existence and slot_ is fixed and non-negotiable, asserted in this phase:
`ROOT`'s `pages/index.adoc`, using the `page-layout: home` pattern (see
`docouture-docs-internals`'s `reference/page-patterns.md`). It sits outside the six-section
tree above — it's the site's entry point, not a member of "Overview". Do not skip creating
it, and do not spend long drafting its real copy yet — its content is a _summary_ of
everything else, so it's better drafted roughly here (from whatever one-line description
already exists) and properly finished in the content-sourcing phase, once there's
something real to summarize.
