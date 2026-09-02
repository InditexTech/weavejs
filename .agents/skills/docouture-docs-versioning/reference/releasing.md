# How releasing works

## What each file says, where

| name                | set in                                       | scope                                                       |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `version`           | `docs/src/antora.yml`                        | per git ref — a ref's own checkout declares its own version |
| `prerelease`        | `docs/src/antora.yml`                        | per git ref — `true`/`false`                                |
| `branches` / `tags` | `antora-playbook.yml` → `content.sources[0]` | which refs the _build_ aggregates content from at all       |

`docs/src/antora.yml` is read once per matched ref — `main` and each release tag get
their own checkout, and therefore their own copy of that file, even though it's "the same
file" in the sense that both trace back to the same path in git history.

**On `main`:**

```yaml
name: my-site
title: My Site
version: prerelease
prerelease: true
```

**On a release tag** (e.g. checked out at `v1.2.0`):

```yaml
name: my-site
title: My Site
version: '1.2.0'
prerelease: false
```

**Playbook**, `content.sources[0]`:

```yaml
content:
  sources:
    - url: ..
      start_path: docs/src
      branches: [main]
      tags: ['docs/v*']
```

`tags: ['docs/v*']` matches every tag shaped `docs/v1.2.0`, `docs/v2.0.0`, etc. — each becomes its own
version because each tag's own `docs/src/antora.yml` carries a different `version:`.
`branches: [main]` contributes the single prerelease version on top. How many past
versions show up is purely a function of how many tags exist and match the glob — delete
or rename a tag and it drops out of the aggregate on the next build.

## Cutting a release: `docouture-release.yml`

**Triggers**, both deliberate acts rather than a side effect of an ordinary push:

- `workflow_dispatch` — run by hand from the Actions tab. Its `version` input must be a
  real version (e.g. `1.2.0`) — the workflow fails before touching anything if it's left
  at the default (that default is meant for a standalone-mode site, which this isn't).
- `pull_request`, `types: [closed]`, `branches: ['main*']` — fires automatically when a
  pull request merges into a branch matching that glob, but only actually proceeds when
  the PR was genuinely merged **and** carries the `docs/release` label. Any other close
  (not merged, or merged without the label) is a no-op run.

**Where the target version comes from** differs by trigger: `workflow_dispatch` has a
form field for it; the `pull_request` trigger has none, so it reads
`docs/.release-version` instead — the plain-text file committed as part of the
merged PR, containing just the target version.

**The release itself**: `docouture version <value>` patches `docs/src/antora.yml` on a
one-off commit built on top of `main`'s current tip, `git tag docs/v<value>` is created there,
and the tag is pushed — a GitHub Release is also created from it. `main` itself is never
advanced or touched by this step; its own `docs/src/antora.yml` permanently keeps saying
`version: prerelease`, `prerelease: true`.

**Every release tag is force-recreated if it already exists** — a republish (fixing a
released version, e.g. a docs typo caught after the tag went out) is a deliberate,
ordinary act, not something needing a separate flag.

## `docs/.release-version` after a release

Nothing clears it — it's bumped forward instead, except on a republish. On a genuine
forward release (the target tag was new), a final step in the workflow advances the file
to the next patch version and commits that directly to `main` — so the file always holds
a sane next target rather than a stale, already-released value. This step is **skipped**
on a republish (the target tag already existed): that run's target version was typically
already superseded by whatever the file currently holds as the next planned target, so
bumping forward from the republished version would clobber that already-planned value.

## Why there's no `docouture release` command

`docouture-release.yml`'s own steps depend on CI-only concerns a portable local CLI command
would either have to assume or re-implement badly: a token with `contents: write` +
`pull-requests: write`, reading which label a merged PR carried, creating a GitHub
Release. None of that has a sane local equivalent. The CLI's release-adjacent surface
stays deliberately narrow: `docouture version` is the one piece of actual logic the workflow
reuses locally-testable, because patching `docs/src/antora.yml`'s fields genuinely is
portable; everything else about _cutting_ a release stays in the workflow.

## URL routing

This site gets a component-scoped version segment for free — `/my-site/1.2.0/…`,
`/my-site/prerelease/…` — Antora always includes the version in the URL unless told
otherwise. `urls.latest_version_segment: latest` (an optional playbook key, not set by
default here) gives whichever version Antora computes as "latest" an _additional_, stable
alias URL (`/my-site/latest/…`) alongside its real version path — useful when most inbound
links should track "whatever the newest release is" without editing them on every tag.
"Latest" is Antora's own semver-aware computation among non-prerelease versions, not
something either file above sets directly.
