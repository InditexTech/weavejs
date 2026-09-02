## Agent skills

### Issue tracker

Issues live in GitHub Issues (`InditexTech/weavejs`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- docouture:start - managed by docouture; edits inside this block are overwritten by `docouture new`/`docouture upgrade` -->
# Weave.js documentation

This repository's `docs/` directory is an Antora documentation site, scaffolded by
`docouture new` (`@inditextech/docouture-cli`). This file is the baseline for any coding agent
(OpenCode, Claude Code, Codex, Cursor, …) working on it — house rules, commands and where
to look for more.

## Layout

```
docs/
  antora-playbook.yml          build entry point: site title, content sources, UI bundle
  antora-playbook.local.yml    used by `docouture dev` and PR verification — builds HEAD only
  src/
    antora.yml                 component descriptor: name, title, version, nav
    modules/
      ROOT/                    the home page only — no nav.adoc of its own
      main/                    the default content module — every other page starts here
        nav.adoc               the navigation tree
        pages/*.adoc           one page per file — these become site URLs
```

The nesting (`docs/src/...`) is intentional, and so is `ROOT` + `main` both existing from
the start — see the `docouture-docs-internals` skill (below).

## Commands

Run from the repository root (or pass `--dir <path>` to any of them):

| command                         | does                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `docouture dev [--port <port>]` | build the site and serve it with live reload, rebuilding on every change                     |
| `docouture build`               | build the site once (`npm run build` under `docs/`)                                          |
| `docouture doctor`              | check Node version, the four names that must agree, git history and that antora is installed |

`docs/package.json` also exposes `npm run build`/`npm run dev` directly if you'd rather not
go through the `docouture` CLI.

## Conventions

- Every page lives at `docs/src/modules/<module>/pages/*.adoc` and must have an `xref:`
  entry in that module's `nav.adoc`, or it builds but is unreachable from the navigation.
- A build failure on a warning is expected behaviour here, not a bug — `antora-playbook.yml`
  sets `runtime.log.failure_level: warn`. A broken `xref:`, a missing include target or an
  unknown attribute reference fails the build.
- Run `docouture doctor` after any structural change (renaming the component, moving
  `antora.yml`, editing `package.json`'s `name`) — it's the fast way to catch the four names
  drifting out of agreement.

## Skills

Docs-authoring skills are not scaffolded here — `docouture new`/`docouture upgrade` only
opinionate on the starter site and its GitHub workflows. Install them yourself, once, with:

```
npx skills@latest add InditexTech/docouture --all
```

(or `--skill <name>` for one at a time). This installs:

- **`docouture-getting-started`** — start here on a brand-new site: scaffolding (if not done
  yet), planning what to document, sourcing content from wherever it actually lives
  (existing docs, README, or the code itself). Hands off to the skills below for mechanics
  and content once a decision is made.
- **`docouture-documenting-changes`** — the re-entry point once the site exists: a feature,
  change, deprecation or fix landed in the repo, and the docs need to catch up. This is
  the one to reach for day to day, not `docouture-getting-started`.
- **`docouture-authoring-guides`** — what to actually write on each page: purpose, section
  skeleton, per-section instructions, a copyable AsciiDoc starting point and a quality
  checklist, for every page in the standard structure plus the home page.
- **`docouture-writing-docs-pages`** — authoring AsciiDoc content: the language itself,
  `xref:` references, `nav.adoc`, admonitions, code blocks, and this site's own custom
  blocks (`[tabs]`, `[cards]`, `[accordion]`, …).
- **`docouture-docs-internals`** — the playbook, the component descriptor, the four names
  that must agree, the home-page vs. content-page patterns, and how a site grows beyond
  its default `ROOT` + `main` modules.
- **`docouture-docs-versioning`** — only relevant when this site was scaffolded with
  `--mode versioned`: cutting releases, `docouture version`, and `docs/.release-version`.

<!-- docouture:end -->

## Documentation state

<!-- maintained by the docouture-documenting-changes skill — do not hand-edit structure, only content -->

| doc page          | derived from          | status |
| ----------------- | --------------------- | ------ |
| index.adoc (home) | manual (hand-written) | —      |
