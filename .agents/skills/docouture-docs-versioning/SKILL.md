---
name: docouture-docs-versioning
description: "How to cut a release or a prerelease on a docouture Antora documentation site scaffolded with Versioned (Full History) mode: docouture version, docs/.release-version, and the docouture-release.yml workflow. USE WHEN bumping a version, cutting a release, configuring what a release tag contains, or asking how versioning works on this site. EXAMPLES: 'cut a release', 'bump the docs version', 'what does docs/.release-version do', 'how do I release a new version of the docs'."
---

# Docs versioning (Versioned — Full History)

Applies to a site scaffolded with `docouture new --mode versioned`. `main` is permanently
the prerelease/preview channel; every release is its own immutable `docs/vX.Y.Z` git tag, and
all of them stay in the version dropdown forever — the shape to use when consumers pin an
old version and need its docs to keep existing unchanged.

See `reference/releasing.md` for the full mechanism (what each file says on `main` vs. on
a release tag, and what the release workflow actually does).

## The short version

- **`docs/src/antora.yml`** on `main` always says `version: prerelease`,
  `prerelease: true` — never edit this by hand to "cut" a release; it doesn't change on
  `main` at all. A release tag gets its _own_ copy of this file, with `version: '1.2.0'`,
  `prerelease: false`.
- **`docouture version <value>`** is the one piece of this the CLI does for you locally — it
  patches `docs/src/antora.yml`'s `version:`/`prerelease:` fields. Useful for testing a
  version bump locally; the actual release workflow uses the same command internally.
- **`docs/.release-version`** holds the next planned version (e.g. `1.2.0`) as plain
  text. It's what a merged, `docs/release`-labeled pull request uses to tell the release
  workflow what to tag — review it like any other file in that PR's diff.
- **Cutting a release** happens through the `docouture-release.yml` GitHub Actions workflow
  (`.github/workflows/`), not a local CLI command — see `reference/releasing.md` for why.
  Trigger it either by:
  - running it by hand (`workflow_dispatch`), giving the target version as input, or
  - merging a pull request labeled `docs/release` into `main` — it reads the target
    version from `docs/.release-version`.
- After a genuine new release (not a republish of an existing tag), the workflow bumps
  `docs/.release-version` forward to the next patch version automatically and commits
  that to `main` — you shouldn't normally need to edit it yourself except to set an
  intentionally different next target (e.g. jumping to a new minor).
