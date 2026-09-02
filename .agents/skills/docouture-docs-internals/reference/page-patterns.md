# Page patterns

Two recurring shapes: a home page, and a handful of content-page structures. Both are
patterns to copy, not a fixed schema Antora enforces — deviate when the content actually
calls for it.

## Home page

The `ROOT` module's `index.adoc`, rendered through the UI bundle's `home` layout
(`:page-layout: home`). Fixed section order — each block is optional, but when present
they appear in this order:

```adoc
= Home
:page-layout: home
:page-nav-module: <module>                      which module's nav the side menu shows,
                                                  since ROOT itself never has one — see below
:description: One-line product description.
:page-tags: tag-one, tag-two
:page-action: Primary action
:page-action-url: module:page.adoc
:page-action-secondary: Secondary action
:page-action-secondary-url: module:other.adoc
:page-hero-image: /component/_images/hero.png
:page-hero-image-alt: Alt text for the hero image.

Intro paragraph, then a short bullet list of core capabilities.

== Get started

[cards,type=image-square,columns="1 s:2 m:4",width=container]
====
[card,subheader="Category"]
.xref:module:page.adoc[Entry point]
--
image::card-image.png["Alt text"]

Short description.
--
====

== Key capabilities

[feature-tabs]
====
[feature,label="Capability one"]
--
image::feature-one.png[Alt text]

Prose.

[.cta]
xref:module:page.adoc[Learn more]
--
====

== CTA

[cta]
====
Prose making the case for the action.

[.primary]
https://example.com[Primary link]
====

== FAQ

[accordion,aria-label="Frequently asked questions"]
--
.Question?
[%collapsible]
====
Answer.
====
--
```

Block syntax for `[cards]`, `[feature-tabs]`, `[cta]` and `[accordion]` is in the
`docouture-writing-docs-pages` skill's `reference/docouture-blocks.md`; this file is the
section-order pattern, not the block reference.

**`home-single`**: a single-column sibling of this layout, selected with
`:page-layout: home-single` instead of `:page-layout: home` on the same `index.adoc`. Same
authoring surface exactly — same attributes, same blocks, same section order — the only
difference is the hero stacks above the content column instead of sitting beside it at
every breakpoint (`home` already does this below the narrow breakpoints; `home-single`
holds that arrangement everywhere). Pick one per site, not per page: use `home-single`
when the two-column split doesn't earn its keep for this product's content.

## Content pages

Three shapes cover most content. Pick whichever fits, don't force every page into one.

**Overview page** — orients a reader before they dig into a module:

```adoc
= Module Name
:description: One-line description.

Intro paragraph.

[NOTE]
====
A callout worth surfacing immediately — a prerequisite, a link to a deeper page.
====

== Key features

* *Capability one* — with an xref to where it's covered in depth
* *Capability two*

== FAQ

.Question?
[%collapsible]
====
Answer.
====
```

Note: an overview page's FAQ is usually a run of _ungrouped_ `[%collapsible]` blocks —
reach for `[accordion]` grouping (see `docouture-writing-docs-pages`) when the questions
genuinely belong together as one unit, the way the home page's FAQ does.

**Tutorial page** — a linear walkthrough, the shape most Guides pages use:

```adoc
= Quickstart
:description: Get to a working example in minutes.

Intro paragraph.

== Prerequisites

Before you begin, ensure you meet the xref:module:requirements.adoc[requirements].

== Step by step

=== 1. First step

Prose. Alternative commands (package managers, etc.) go in a [tabs] block:

[tabs]
--
[tab,label="pnpm"]
****
[source,bash]
----
pnpm install
----
****

[tab,label="npm"]
****
[source,bash]
----
npm install
----
****
--

=== 2. Second step

. Ordered step
. Another ordered step
+
Attached content needs a `+` continuation.
```

Steps are plain nested `=== N. ...` subsections — there is no custom "steps" block here,
just section nesting.

**Reference/leaf page** — documents one thing (an API, a config option, a component); the
shape every Reference sub-catalog page uses (see the `docouture-getting-started` skill's
`reference/structure-planning.md` for the sub-catalog itself):

```adoc
= Thing Name
:description: One-line description.

image::thing.png[Alt text]

Prose describing what it is and when to use it.

== Usage

=== Import it

[source,ts]
----
import { Thing } from "package"
----

=== Register it

[source,ts]
----
const instance = new Thing() // <1>
----
<1> Explanation of this step.
```

## The default layout: `ROOT` + `main`

`docouture new` always scaffolds **two** modules, never a bare single one:

- **`ROOT`** — the landing page only. No `nav.adoc` of its own; its `index.adoc` borrows
  `main`'s navigation via `:page-nav-module: main`. Never put content pages here.
- **`main`** — the one real content module from the start, with its own `nav.adoc` and
  every content page below it. `docs/src/antora.yml`'s `nav_modules:` already lists `main`
  as a single entry straight out of the scaffold — this is not something a site "grows
  into" later, it's the baseline shape.

For a small or early-stage repo, every section (Overview, Getting started, Guides,
Reference, Additional information, Contributing) stays inside `main`, each a bare,
unlinked list item in its `nav.adoc` grouping xrefs under a heading with no page of its
own:

```adoc
* Getting started
* xref:main:requirements.adoc[Requirements]
* xref:main:quickstart.adoc[Quickstart]
* Reference
* xref:main:reference-overview.adoc[Overview]
* xref:main:api/index.adoc[API]
```

Overview stays a flat sibling of the other topics in its section — never their parent;
see the `docouture-writing-docs-pages` skill for the full nesting rule.

## Growing beyond `main`: two different reasons to add a module

A site adds modules beyond `ROOT` + `main` for one of two distinct reasons — see the
`docouture-getting-started` skill's `reference/structure-planning.md` for when each one
actually earns its keep:

1. **A section outgrows `main`** — only Guides and Reference are ever promoted this way,
   because they're the two sections a reader might land on directly (via the module
   switcher) rather than always arriving through `main`'s own nav. Overview, Getting
   started, Additional information and Contributing never get promoted — they stay
   grouped inside `main` permanently, even in a mature, heavily-modularized site.
2. **A monorepo has multiple independently packaged artifacts** — each qualifying artifact
   gets its own module, *in addition to* `main` (and any promoted Guides/Reference), for
   its package-specific Overview/How-to-use/API. This is a different axis from (1): it's
   about documenting separate things that ship separately, not about one product's
   Guides/Reference outgrowing a single module.

Either way, growing into more modules:

1. Create `docs/src/modules/<name>/{nav.adoc,pages/}` for each new module.
2. List every new module's `nav.adoc` under `docs/src/antora.yml`'s top-level `nav:` — it
   already lists `modules/main/nav.adoc`; add alongside it, never remove `main`'s own
   entry. `ROOT` is never listed here — it has nothing to navigate; it borrows a module's
   nav via `:page-nav-module:` on its `index.adoc`, as shown above.
3. Describe each new module under `nav_modules:` (a **list**, not a map — see
   `reference/antora-extensions.md` for why) so the UI's switcher can show one module's
   nav at a time with a title, description and icon — `main`'s own entry is already there
   from scaffolding:

```yaml
nav:
  - modules/main/nav.adoc
  - modules/guides/nav.adoc
  - modules/sdk/nav.adoc

nav_modules:
  - module: main
    title: Documentation
    description: The core product story — overview, getting started, reference, etc.
    icon: design/grid-outlined
  - module: guides
    title: Guides
    description: Task-oriented how-tos.
    icon: actions/code-block-outlined
  - module: sdk
    title: SDK
    description: One-line description of this artifact.
    icon: actions/code-block-outlined
```

4. If Reference was promoted to its own module (case 1) or per-artifact modules now exist
   (case 2), rewrite whatever Reference content remains in `main` as a thin showcase — a
   short index page with xrefs into each module's own Reference/API pages — rather than
   duplicating the content in two places.
