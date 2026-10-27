# `code-changelog-check`

[`code-changelog-check.yml`](../code-changelog-check.yml) checks that every pull request is linked to the issue it closes, because the release job generates the `CHANGELOG.md` entries from those issues.

## Trigger

Any pull request to `main` or `main-*` that is `opened`, `synchronize`d, `ready_for_review`, `labeled`, `unlabeled` or `edited` (the link lives in the PR body). It runs on every PR, whatever paths it changes.

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Rule

- The link is a GitHub closing reference: a closing keyword in the PR body (`Closes #N`) or the Development sidebar. A plain `#N` mention is not one. GitHub only reads closing keywords on PRs to the default branch, so PRs to `main-*` need the sidebar.
- A maintainer can waive the rule with the `skip-release` label, which also skips the release on merge. The issues such a PR does close still get entries in the next release.
- Dependabot PRs are exempt.
- Issues labelled `internal` or `kind/internal` count as a link but get no entry, and an issue already listed in an earlier release is not listed again. Both are shown in the report.
- While `CHANGELOG_LINK_ENFORCE` is `'false'` the check only warns. Set it to `'true'` to make unlinked PRs fail.

## Jobs

- ### `linked-issue`
  - **Steps**
    - Checkout the pull request and setup Node from `code/.tool-versions`.
    - Run the tests of `.github/scripts/changelog-from-prs.mjs`.
    - Run `.github/scripts/changelog-from-prs.mjs --pr <number>`, which writes the entries the PR will generate, their sections and any warnings to the job summary.
