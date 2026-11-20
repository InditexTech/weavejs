## Changelog

Do not edit `code/CHANGELOG.md`. The release job generates its entries from the issues that merged PRs close (`.github/scripts/changelog-from-prs.mjs`). Every PR must be linked to its issue with `Closes #<n>` in the description or from the Development sidebar; a plain `#<n>` mention does not count. The entry is the issue title, verbatim, and its section comes from the issue labels (`security` → Security, `bug` → Fixed, `enhancement` or `kind/feature` → Added, otherwise Changed); issues labelled `internal` or `kind/internal` get no entry. Fix an entry by editing the issue title or labels.

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
- A build failure on an error is expected behaviour here, not a bug — `antora-playbook.yml`
  sets `runtime.log.failure_level: error`. A broken `xref:`, a missing include target or an
  authoring mistake reported by a docouture extension fails the build. Warnings (an
  undefined attribute reference, an out-of-sequence section level) are logged but do not.
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
  `--mode versioned`: cutting releases, `docouture version`, `docs/.release-version` and the
  alternative version sources (`docouture version-source`).

<!-- docouture:end -->

## Documentation state

<!-- maintained by the docouture-documenting-changes skill — do not hand-edit structure, only content -->

| doc page          | derived from          | status |
| ----------------- | --------------------- | ------ |
| index.adoc (home) | manual (hand-written) | —      |
| main:build/actions/rectangle-tool.adoc | `code/packages/sdk/src/actions/rectangle-tool/rectangle-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| main:build/actions/ellipse-tool.adoc | `code/packages/sdk/src/actions/ellipse-tool/ellipse-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| main:build/actions/polygon-tool.adoc | `code/packages/sdk/src/actions/polygon-tool/polygon-tool.ts`, `code/packages/sdk/src/nodes/polygon/presets.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| main:build/actions/regular-polygon-tool.adoc | `code/packages/sdk/src/actions/regular-polygon-tool/regular-polygon-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| sdk:api-reference/actions/rectangle-tool.adoc | `code/packages/sdk/src/actions/rectangle-tool/rectangle-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| sdk:api-reference/actions/ellipse-tool.adoc | `code/packages/sdk/src/actions/ellipse-tool/ellipse-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| sdk:api-reference/actions/polygon-tool.adoc | `code/packages/sdk/src/actions/polygon-tool/polygon-tool.ts`, `code/packages/sdk/src/nodes/polygon/presets.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| sdk:api-reference/actions/regular-polygon-tool.adoc | `code/packages/sdk/src/actions/regular-polygon-tool/regular-polygon-tool.ts`, `code/packages/sdk/src/actions/shared/shape-geometry.ts` | released in 5.7.0 |
| main:build/nodes/image.adoc | `code/packages/sdk/src/nodes/image/{image,types,crop}.ts` | released in 5.7.0 |
| sdk:api-reference/nodes/image.adoc | `code/packages/sdk/src/nodes/image/{image,types,crop}.ts` | released in 5.7.0 |
| sdk:api-reference/weave/index.adoc | `code/packages/sdk/src/weave.ts` (`flipImage`) | released in 5.7.0 |
| sdk:api-reference/nodes/stroke.adoc | `code/packages/sdk/src/nodes/stroke/{types,constants,stroke}.ts`, `render/*` (stroke look, `setLookPreview`) | released in 5.8.0 |
| sdk:api-reference/actions/brush-tool.adoc | `code/packages/sdk/src/actions/brush-tool/{types,constants,profiles}.ts`, `code/packages/sdk/src/actions/brush-tool/brush-tool.ts` (input profiles, `setInputProfile`) | released in 5.8.0 |
| sdk:api-reference/actions/brush-tuning.adoc | `code/packages/sdk/src/actions/brush-tool/tunables/*` (descriptors, presets, scenarios, config export), `code/packages/sdk/src/nodes/stroke/{types,constants}.ts` (`WeaveStrokeLook`) | released in 5.8.0 |
| sdk:api-reference/plugins/brush-lab.adoc | `code/packages/sdk/src/plugins/brush-lab/*`, `code/packages/sdk/src/index.lab.ts` | released in 5.8.0 |
| main:build/nodes/text-v2.adoc | `code/packages/sdk/src/nodes/text-v2/*` | released in 5.7.1 |
| sdk:api-reference/nodes/text-v2.adoc | `code/packages/sdk/src/nodes/text-v2/*` | released in 5.7.1 |
| main:build/actions/text-tool.adoc | `code/packages/sdk/src/actions/text-tool/text-tool.ts` | released in 5.7.0 |
| sdk:api-reference/actions/text-tool.adoc | `code/packages/sdk/src/actions/text-tool/text-tool.ts` | released in 5.7.0 |
| sdk:api-reference/nodes/rectangle.adoc | `code/packages/sdk/src/nodes/rectangle/types.ts`, `code/packages/sdk/src/nodes/shared/shape-label*.ts` | released in 5.7.0 |
| sdk:api-reference/nodes/ellipse.adoc | `code/packages/sdk/src/nodes/ellipse/types.ts`, `code/packages/sdk/src/nodes/shared/shape-label*.ts` | released in 5.7.0 |
| sdk:api-reference/nodes/polygon.adoc | `code/packages/sdk/src/nodes/polygon/types.ts`, `code/packages/sdk/src/nodes/shared/shape-label*.ts` | released in 5.7.0 |
| sdk:api-reference/nodes/node.adoc | `code/packages/sdk/src/nodes/node.ts` (`setNodeInstanceListener`) | released in 5.7.0 |
| sdk:api-reference/actions/action.adoc | `code/packages/sdk/src/actions/action.ts` | released in 5.8.0 |
| sdk:api-reference/plugins/plugin.adoc | `code/packages/sdk/src/plugins/plugin.ts` | released in 5.8.0 |
| sdk:api-reference/nodes/node.adoc (hooks) | `code/packages/sdk/src/nodes/node.ts` | released in 5.8.0 |
| types:api-reference/types.adoc (base interfaces) | `code/packages/types/src/base/{node,action,plugin}.ts` | released in 5.8.0 |
| main:build/nodes/text-v2.adoc (paragraph indent) | `code/packages/sdk/src/nodes/text-v2/{model.ts,layout/engine.ts,edit/model.ts}` | released in 5.8.0 |
| sdk:api-reference/nodes/text-v2.adoc (paragraph indent, `getSelectionFormat().indent`) | `code/packages/sdk/src/nodes/text-v2/{model.ts,layout/engine.ts,edit/model.ts}` | released in 5.8.0 |
| sdk:api-reference/weave/index.adoc (base interfaces) | `code/packages/types/src/base/{node,action,plugin}.ts` | released in 5.8.0 |
| main:build/nodes/frame.adoc (edge selection) | `code/packages/sdk/src/nodes/frame/{frame,constants,types,hit-region}.ts` | released in 5.8.0 |
| sdk:api-reference/nodes/frame.adoc (`edgeHitWidth`) | `code/packages/sdk/src/nodes/frame/{frame,constants,types,hit-region}.ts` | released in 5.8.0 |
| sdk:api-reference/nodes/text-v2.adoc (list marker alignment) | `code/packages/sdk/src/nodes/text-v2/layout/engine.ts` | released in 5.8.0 |
| main:build/nodes/sticky-note.adoc | `code/packages/sdk/src/nodes/sticky-note/*` | released in 5.9.0 |
| main:build/actions/sticky-note-tool.adoc | `code/packages/sdk/src/actions/sticky-note-tool/*` | released in 5.9.0 |
| sdk:api-reference/nodes/sticky-note.adoc | `code/packages/sdk/src/nodes/sticky-note/*`, `code/packages/sdk/src/nodes/shared/shape-label.utils.ts` | released in 5.9.0 |
| sdk:api-reference/actions/sticky-note-tool.adoc | `code/packages/sdk/src/actions/sticky-note-tool/*` | released in 5.9.0 |
| main:build/server-side-rendering.adoc | `code/packages/sdk/src/backend.ts`, `code/packages/sdk/src/stores/store.ts` (`cancelPendingRender`), `code/packages/sdk/src/weave.ts` (`destroy`, `exportNodesServerSide`), `code/packages/sdk/src/nodes/video/video.ts`, `code/packages/store-standalone/src/store-standalone.ts` | released in 5.9.0 |
| sdk:api-reference/weave/index.adoc (`exportNodesServerSide` / `exportAreaServerSide` signatures) | `code/packages/sdk/src/weave.ts` | released in 5.9.0 |
| ROOT:index.adoc (home hero demo) | `docs/demos/src/demos/home-hero/*` (faux-UI demo, see `docs/demos/README.md`) | docs site only, not tied to a release |
| main:build/actions/rectangle-tool.adoc (demo) | `docs/demos/src/demos/rectangle-tool/*`; behavior shown follows `code/packages/sdk/src/actions/rectangle-tool/rectangle-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/rectangle.adoc (demo) | `docs/demos/src/demos/rectangle-node/*`; behavior shown follows `code/packages/sdk/src/nodes/rectangle/` | docs site only, not tied to a release |
| main:build/nodes/frame.adoc (demo) | `docs/demos/src/demos/frame/*`; behavior shown follows `code/packages/sdk/src/nodes/frame/` | docs site only, not tied to a release |
| main:build/actions/frame-tool.adoc (demo) | `docs/demos/src/demos/frame-tool/*`; behavior shown follows `code/packages/sdk/src/actions/frame-tool/frame-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/sticky-note.adoc (demo) | `docs/demos/src/demos/sticky-note/*`; behavior shown follows `code/packages/sdk/src/nodes/sticky-note/` | docs site only, not tied to a release |
| main:build/actions/sticky-note-tool.adoc (demo) | `docs/demos/src/demos/sticky-note-tool/*`; behavior shown follows `code/packages/sdk/src/actions/sticky-note-tool/sticky-note-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/group.adoc (demo) | `docs/demos/src/demos/group/*`; behavior shown follows `code/packages/sdk/src/nodes/group/` | docs site only, not tied to a release |
| main:build/nodes/comment.adoc (demo) | `docs/demos/src/demos/comment/*`; behavior shown follows `code/packages/sdk/src/nodes/comment/` | docs site only, not tied to a release |
| main:build/actions/comment-tool.adoc (demo) | `docs/demos/src/demos/comment-tool/*`; behavior shown follows `code/packages/sdk/src/actions/comment-tool/comment-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/image.adoc (demo) | `docs/demos/src/demos/image/*`; behavior shown follows `code/packages/sdk/src/nodes/image/` | docs site only, not tied to a release |
| main:build/actions/image-tool.adoc (demo) | `docs/demos/src/demos/image-tool/*`; behavior shown follows `code/packages/sdk/src/actions/image-tool/image-tool.ts` | docs site only, not tied to a release |
| main:build/actions/images-tool.adoc (demo) | `docs/demos/src/demos/images-tool/*`; behavior shown follows `code/packages/sdk/src/actions/images-tool/images-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/video.adoc (demo) | `docs/demos/src/demos/video/*`; behavior shown follows `code/packages/sdk/src/nodes/video/` | docs site only, not tied to a release |
| main:build/actions/video-tool.adoc (demo) | `docs/demos/src/demos/video-tool/*`; behavior shown follows `code/packages/sdk/src/actions/video-tool/video-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/text.adoc (demo) | `docs/demos/src/demos/text/*`; behavior shown follows `code/packages/sdk/src/nodes/text/` | docs site only, not tied to a release |
| main:build/actions/text-tool.adoc (demo) | `docs/demos/src/demos/text-tool/*`; behavior shown follows `code/packages/sdk/src/actions/text-tool/text-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/text-v2.adoc (demo) | `docs/demos/src/demos/text-v2/*`; behavior shown follows `code/packages/sdk/src/nodes/text-v2/` | docs site only, not tied to a release |
| main:build/nodes/line.adoc (demo) | `docs/demos/src/demos/line/*`; behavior shown follows `code/packages/sdk/src/nodes/line/` | docs site only, not tied to a release |
| main:build/actions/line-tool.adoc (demo) | `docs/demos/src/demos/line-tool/*`; behavior shown follows `code/packages/sdk/src/actions/line-tool/line-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/arrow.adoc (demo) | `docs/demos/src/demos/arrow/*`; behavior shown follows `code/packages/sdk/src/nodes/arrow/` | docs site only, not tied to a release |
| main:build/actions/arrow-tool.adoc (demo) | `docs/demos/src/demos/arrow-tool/*`; behavior shown follows `code/packages/sdk/src/actions/arrow-tool/arrow-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/connector.adoc (demo) | `docs/demos/src/demos/connector/*`; behavior shown follows `code/packages/sdk/src/nodes/connector/` | docs site only, not tied to a release |
| main:build/actions/connector-tool.adoc (demo) | `docs/demos/src/demos/connector-tool/*`; behavior shown follows `code/packages/sdk/src/actions/connector-tool/connector-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/measure.adoc (demo) | `docs/demos/src/demos/measure/*`; behavior shown follows `code/packages/sdk/src/nodes/measure/` | docs site only, not tied to a release |
| main:build/actions/measure-tool.adoc (demo) | `docs/demos/src/demos/measure-tool/*`; behavior shown follows `code/packages/sdk/src/actions/measure-tool/measure-tool.ts` | docs site only, not tied to a release |
| main:build/nodes/ellipse.adoc (demo) | `docs/demos/src/demos/ellipse/*`; behavior shown follows `code/packages/sdk/src/nodes/ellipse/` | docs site only, not tied to a release |
| main:build/nodes/polygon.adoc (demo) | `docs/demos/src/demos/polygon/*`; behavior shown follows `code/packages/sdk/src/nodes/polygon/` | docs site only, not tied to a release |
| main:build/nodes/regular-polygon.adoc (demo) | `docs/demos/src/demos/regular-polygon/*`; behavior shown follows `code/packages/sdk/src/nodes/regular-polygon/` | docs site only, not tied to a release |
| main:build/nodes/star.adoc (demo) | `docs/demos/src/demos/star/*`; behavior shown follows `code/packages/sdk/src/nodes/star/` | docs site only, not tied to a release |
| main:build/actions/star-tool.adoc (demo) | `docs/demos/src/demos/star-tool/*`; behavior shown follows `code/packages/sdk/src/actions/star-tool/star-tool.ts` | docs site only, not tied to a release |
| main:build/actions/ellipse-tool.adoc (demo) | `docs/demos/src/demos/ellipse-tool/*`; behavior shown follows `code/packages/sdk/src/actions/ellipse-tool/ellipse-tool.ts` | docs site only, not tied to a release |
| main:build/actions/polygon-tool.adoc (demo) | `docs/demos/src/demos/polygon-tool/*`; behavior shown follows `code/packages/sdk/src/actions/polygon-tool/polygon-tool.ts` | docs site only, not tied to a release |
| main:build/actions/regular-polygon-tool.adoc (demo) | `docs/demos/src/demos/regular-polygon-tool/*`; behavior shown follows `code/packages/sdk/src/actions/regular-polygon-tool/regular-polygon-tool.ts` | docs site only, not tied to a release |
