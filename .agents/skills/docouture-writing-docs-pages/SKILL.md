---
name: docouture-writing-docs-pages
description: "How to author AsciiDoc content in a docouture Antora documentation site — the content tree, xref: references, nav.adoc, admonitions, code blocks, and this site's own custom blocks (tabs, cards, accordion, feature-tabs, cta, label:/mono: macros). USE WHEN writing or editing a .adoc page, adding a page to the nav, fixing a broken xref, or reaching for a block like tabs/cards/accordion. EXAMPLES: 'add a page', 'my xref doesn't resolve', 'the build fails on a warning', 'add tabs for pnpm/npm/yarn commands', 'group these FAQ items', 'add a card grid'."
---

# Writing docs pages

Every page here is AsciiDoc, parsed by **Asciidoctor** and orchestrated by **Antora**.
Antora restricts and reinterprets parts of the language (includes, xrefs, image paths);
where this skill and the upstream Asciidoctor docs differ, follow this skill.

- `reference/language-basics.md` — the AsciiDoc language itself: document structure,
  blocks, text formatting, lists, links/xrefs, images, source blocks, admonitions, tables,
  includes, conditionals, substitutions, attributes — plus a URL index into
  `https://docs.asciidoctor.org/asciidoc/latest/` for anything not covered.
- `reference/docouture-blocks.md` — this site's own custom blocks, registered via
  `@inditextech/docouture-asciidoc-extensions` (see `antora-playbook.yml`'s
  `asciidoc.extensions`): `[tabs]`, `[cards]`, `[accordion]`, `[feature-tabs]`, `[cta]`,
  `label:`/`mono:` inline macros, and a few table/video sizing attributes.

For the home page vs. content page patterns, mono- vs. multi-module sites, and the
playbook/component-descriptor mechanics, see the `docouture-docs-internals` skill.

## Where content lives

```
docs/src/
  antora.yml                  component descriptor: name, title, version, nav
  modules/
    ROOT/                     the home page only — see docouture-docs-internals
    main/                     the default content module; every other section starts here
      nav.adoc                the navigation tree for this module
      pages/*.adoc            one page per file — these become site URLs
```

Only `pages/` exists in a freshly scaffolded site. The other family directories are
created when first needed, with these exact names — Antora keys off them and ignores
anything else:

| directory      | family        | referenced as                  |
| -------------- | ------------- | ------------------------------- |
| `pages/`       | `page$`       | `xref:name.adoc[]`             |
| `partials/`    | `partial$`    | `include::partial$name.adoc[]` |
| `examples/`    | `example$`    | `include::example$name.json[]` |
| `images/`      | `image$`      | `image::name.png[]`            |
| `attachments/` | `attachment$` | `xref:attachment$file.pdf[]`   |

## Resource IDs

Antora addresses content by resource ID, not by relative path:

```
version@component:module:family$relative/path.adoc#fragment
```

Everything left of the filename is optional and defaults to the current page's context.
Inside the same module:

| reference                        | means                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `xref:index.adoc[Home]`          | a page in the same module                                                    |
| `xref:guide/setup.adoc[]`        | a page in a subdirectory of `pages/` — empty text uses the target's title    |
| `xref:other-module:index.adoc[]` | a page in another module — see `docouture-docs-internals` for when a repo has more than `ROOT` + `main` |
| `xref:index.adoc#install[]`      | a fragment on another page                                                   |
| `include::partial$intro.adoc[]`  | a partial from the same module                                               |

`../` path traversal between pages is not how this works — a page one directory deep
still addresses its sibling as `xref:guide/other.adoc[]`, module-relative, never
file-relative.

## Where a change goes

| you want to                    | do                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| add a page                     | create `docs/src/modules/<module>/pages/name.adoc` **and** add an `xref:` to that module's `nav.adoc`                                          |
| add a section to the nav       | edit `nav.adoc` — nesting is list depth (`*`, `**`, `***`); a bare, unlinked list item can group xrefs under a heading with no page of its own |
| reuse a chunk of prose         | `docs/src/modules/<module>/partials/name.adoc`, included as `partial$name.adoc`                                                                |
| add an image                   | `docs/src/modules/<module>/images/name.png`, referenced as `image::name.png[Alt]`                                                              |
| set a site-wide attribute      | `asciidoc.attributes` in `antora-playbook.yml`                                                                                                 |
| set a component-wide attribute | `asciidoc.attributes` in `docs/src/antora.yml`                                                                                                 |
| set a page-scoped attribute    | an attribute entry in the page header, above the first blank line                                                                              |

## Nesting rule: keep a section's Overview flat

Nesting in `nav.adoc` is literal list-marker depth (`*`, `**`, `***`) — Antora has no
concept of "this line is an Overview page," so indenting a topic one level under it reads
exactly like indenting it under anything else. **A section's own Overview/index page stays
a flat sibling of that section's other top-level pages — it is never their parent.**
Nesting only happens one level below a page that genuinely owns sub-pages of its own.

This doesn't forbid nesting under an Overview/index page in general — it forbids nesting
*other* topics under the *section's* own Overview. A sub-topic's own index page can still
legitimately parent its own children: `changelog/index.adoc` parenting its per-version
pages is correct, because those pages genuinely belong to the changelog, not to the
section's Overview.

Don't — nests every other topic under Overview:

```adoc
* Guides
* xref:guides-overview.adoc[Overview]
** xref:configure-authentication.adoc[Configure authentication]
*** xref:configure-authentication-details.adoc[Configure authentication details]
```

Do — Overview stays flat; only a topic's genuine sub-page nests under that topic:

```adoc
* Guides
* xref:guides-overview.adoc[Overview]
* xref:configure-authentication.adoc[Configure authentication]
** xref:configure-authentication-details.adoc[Configure authentication details]
```

## Linking third-party mentions

The first time a page names a third-party product, library, or repo in prose — Antora,
AsciiDoc, Kroki, Shiki, pnpm, GitHub, etc. — link it to its canonical home
(`https://antora.org`, `https://kroki.io`, ...). Don't repeat the link on every later
mention on the same page; once is enough. Internal/proprietary tools with no public URL
(e.g. an internal wiki page, a private registry) are named but left unlinked — there's nothing to send
a reader to.

## Constraints that fail silently

- **Never touch `docs/build/` directly — no editing, no `rm -rf`, ever.** It's
  generated output, not source. If `docouture dev` is running, it owns that directory
  and rebuilds it live on every save; a separate ad-hoc `antora`/`docouture build`
  invocation into the same path, or deleting it "to verify a clean build," pulls the
  directory out from under that running server and breaks what the user is looking at
  in their browser. To verify a change, trust the running `dev` server's own
  live-reload — don't build a second copy.
- **A warning is a build failure.** `antora-playbook.yml` sets
  `runtime.log.failure_level: warn`. A broken xref, a missing include target, an
  undefined attribute reference or a bad image path exits non-zero.
- **A page missing from `nav.adoc` still builds.** It publishes at its URL, renders with
  an empty navigation context and is reachable only by direct link. Nothing warns.
- **`include::` cannot read arbitrary paths.** Antora installs its own include processor
  that resolves targets against the content catalog, so only the family forms
  (`partial$`, `example$`, page IDs) work. A filesystem path fails at build time.
- **Attribute references are not substituted inside verbatim blocks.** `{version}`
  inside `----`/`....` renders literally unless the block carries `subs=attributes+`.
- **Unconstrained formatting needs doubled marks.** `**bold**` mid-word, `__italic__`
  mid-word. The single-mark form adjacent to a word character is not formatting at all.
- **A cross-module xref only resolves inside a multi-module site**, and only once both
  modules are listed under `docs/src/antora.yml`'s `nav:` — see `docouture-docs-internals`.

## Page attributes the UI reads

| attribute                                             | effect                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `description`                                         | hero excerpt (below the title) AND `<meta name="description">`                                                                                          |
| `page-tags`                                           | comma-separated; one label pill each in the hero                                                                                                        |
| `page-action` / `page-action-url`                     | primary hero button — renders only when BOTH are set                                                                                                    |
| `page-action-secondary` / `page-action-secondary-url` | secondary hero button, same rule                                                                                                                        |
| `page-hero-image` / `page-hero-image-alt`             | hero illustration                                                                                                                                       |
| `page-hero-video` / `page-hero-video-poster`          | hero video (wins over `page-hero-image` if both are set), with a still shown before it plays                                                           |
| `page-hero-image-bordered`                            | bare, presence-only attribute (no value) — opts either hero media form into a framed panel instead of the default bare slot                             |
| `page-nav-module`                                     | which module's nav tree the side menu shows for this page — set on `ROOT`'s own landing page, since `ROOT` never has its own nav.adoc                  |
| `page-layout: home`                                   | the marketing home-page layout, two-column (hero beside content) — see `docouture-docs-internals`'s page-patterns reference                             |
| `page-layout: home-single`                            | the same home-page authoring surface, single-column (hero stacked above content) — pick per site, not a different set of attributes                    |
| `page-role: -hero`                                    | suppresses the hero entirely                                                                                                                            |
| `page-role: -toc`                                     | suppresses the right-hand table of contents                                                                                                             |
| `page-pagination`                                     | enables the previous/next footer links                                                                                                                  |
