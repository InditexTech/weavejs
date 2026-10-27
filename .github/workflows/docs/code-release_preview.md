# `code-release_preview`

[`code-release_preview.yml`](../code-release_preview.yml) generates a `CHANGELOG.md` preview in a comment pull request.

## Trigger

Any pull request `labeled` to `main` branch about `code` path with `release-type/` or `release-preview` labels.

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Preconditions

The PR should be linked to the issue it closes (`Closes #N` or the Development sidebar): the CHANGELOG.md entries are generated from the linked issues, not edited by hand. The link itself is checked by [`code-changelog-check`](code-changelog-check.md).

## Jobs

- ### `check-changes-in-paths`
  - Executed if (pull_request is not in draft OR a `release-type/*` label is added OR a `release-preview` label is added)
  - **Steps**

    - Usage of `dorny/paths-filter` action to check for changed files in `code/` and `.github/workflows/code*.`

- ### `release-preview`
  - Executed if ((a `release-type/*` label is added OR a `release-preview` label is added) AND the previous `dorny/paths-filter` action detects changes in the configured paths)
  - **Steps**

    - Checkout the repository in the specific pull request.
    - Setup Node from `code/.tool-versions`.
    - Get release type from a label on the pull request. It could be one of the following: `release-type/hotfix`, `release-type/multi-hotfix`, `release-type/patch`, `release-type/minor` and `release-type/major`.
    - Check the merge strategy needed, depending if it is a hotfix release and the development flow used.
    - Run `.github/scripts/changelog-from-prs.mjs --pr <number>` to write this PR's entries into the local `[Unreleased]` section and report them, with their sections and warnings.
    - Usage of `release-flow/keep-a-changelog-action` action to generate the `CHANGELOG.md` preview.
    - Add a PR comment with the next version, the `CHANGELOG.md` preview and the generated entries. On fork PRs, whose token cannot comment, the preview goes to the job summary.

- ### `release-preview-no-code-changes`
  - Executed if ((a `release-type/*` label is added OR a `release-preview` label is added) AND the previous `dorny/paths-filter` action DOES NOT detects changes in the configured paths)
  - **Steps**
    - Checkout the repository in the specific pull request.
    - An error message is shown explaining that this Pull Request will not trigger a Release without `code/` changes.

- ### `release-preview-no-release-labels`
  - Executed if (a `release-type/*` label is NOT added AND the previous `dorny/paths-filter` action detects changes in the configured paths AND the repository is not using trunk-based development flow)
  - **Steps**
    - Checkout the repository in the specific pull request.
    - An error message is shown explaining that this Pull Request will not trigger a Release without release labels.
