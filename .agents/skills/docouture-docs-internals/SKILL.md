---
name: docouture-docs-internals
description: "How a docouture Antora documentation site is put together: the playbook, the docs/antora.yml component descriptor, the four names that must agree, the ROOT+main default layout, promoting Guides/Reference to their own modules, the per-artifact-module strategy for a monorepo, and the home-page vs. content-page patterns. USE WHEN adding a page or module, renaming the site/component, deciding whether a section or artifact earns its own module, building a landing/home page, or diagnosing a site that builds with zero pages or fails with 'start page not found'. EXAMPLES: 'add a new module', 'rename this docs site', 'build a marketing home page', 'the site builds but has no pages', 'start page not found', 'should this artifact get its own module'."
---

# Site structure

This site was scaffolded by `docouture new` (`@inditextech/docouture-cli`). This skill covers the
pieces that make it hang together — where each name is set, how a page becomes reachable,
and the two page patterns (home vs. content) worth copying rather than reinventing.

- `reference/naming.md` — the four names that must agree, and how to fix them when they
  don't (`docouture doctor` checks this automatically).
- `reference/page-patterns.md` — the home-page block structure, the recurring content-page
  shapes, the always-present `ROOT` + `main` layout, and how a site grows more modules
  (promoted sections, or one per artifact in a monorepo).
- `reference/antora-extensions.md` — what `@inditextech/docouture-antora-extensions` (a
  different kind of extension from the authoring blocks in `docouture-writing-docs-pages`)
  provides: the module switcher, site footer, search index and `llms.txt` generation.

For AsciiDoc authoring itself — xrefs, admonitions, code blocks, this site's custom
blocks — see the `docouture-writing-docs-pages` skill. For *which* modules/pages a site
should have in the first place, see `docouture-getting-started` (new site) or
`docouture-documenting-changes` (an existing site gaining a new module/artifact).

## The moving pieces

```
docs/
  antora-playbook.yml          site title, content source, UI bundle, asciidoc/antora extensions
  antora-playbook.local.yml    same shape, but content.sources[] is just `branches: HEAD` —
                                 what `docouture dev` and PR verification build against, since a
                                 PR/feature-branch checkout doesn't have `main` or a release tag
  package.json                 name, devDependencies (docouture-cli, ui-bundle, the two extension
                                 packages), the `build`/`dev` scripts
  src/
    antora.yml                 component descriptor: name, title, version, nav
    modules/<module>/nav.adoc  navigation tree, one per module
```

The whole starter template — `package.json`, both playbooks, the nested `src/` — was
copied under this repository's own `docs/`, so `antora-playbook.yml` lives at
`<repo-root>/docs/antora-playbook.yml` and the component descriptor ends up one level
further down, at `docs/src/antora.yml`. That's why `antora-playbook.yml`'s
`content.sources[0]` reads `url: ..` (this repo's root, one level up from `docs/`) and
`start_path: docs/src`.

`docs/build/` (git-ignored) is generated output, not part of this tree — **never edit
or delete it directly.** If `docouture dev` is running, it owns that directory and
rebuilds it live on every save; a second, ad-hoc build into the same path (or clearing
it by hand) pulls the site out from under that running server.

## Versioning

`docs/antora.yml`'s `version`/`prerelease` fields are identical on `main` regardless of
which versioning mode this site uses (`version: prerelease`, `prerelease: true`) — what
differs is only which git refs `antora-playbook.yml`'s `content.sources[0]` aggregates
from (`tags: ['docs/stable']` vs. `tags: ['docs/v*']`). If this site was scaffolded with
`--mode versioned`, see the `docouture-docs-versioning` skill for cutting a release; a
**standalone**-mode site (the default) has no separate skill for this — `docouture doctor`
and the `docouture-release.yml` workflow are all that's needed.
