# `code-release_preview`

[`code-release_preview.yml`](../code-release_preview.yml) generates a `CHANGELOG.md` preview in a comment pull request.

## Trigger

Any pull request `labeled` to `main` branch about `code` path with `release-type/` or `release-preview` labels.

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Preconditions

In case the changelog generation is desirable, a requirement for a successful run is to fill the CHANGELOG.md unreleased section with the issues that are included in the release.

## Jobs

- ### `check-changes-in-paths`
  - Executed if (pull_request is not in draft OR a `release-type/*` label is added OR a `release-preview` label is added)
  - **Steps**

    - Usage of `dorny/paths-filter` action to check for changed files in `code/` and `.github/workflows/code*.`

- ### `release-preview`
  - Executed if ((a `release-type/*` label is added OR a `release-preview` label is added) AND the previous `dorny/paths-filter` action detects changes in the configured paths)
  - **Steps**

    - Checkout the repository in the specific pull request.
    - Setup Maven and Asdf caches.
    - Configure asdf environment with the added tools in the `.tool-versions` file.
    - Setup JAVA_HOME env var.
    - Get release type from a label on the pull request. It could be one of the following: `release-type/hotfix`, `release-type/multi-hotfix`, `release-type/patch`, `release-type/minor` and `release-type/major`.
    - Check the merge strategy needed, depending if it is a hotfix release and the development flow used.
    - Check if CHANGELOG.md changes are added. If not, the workflow will throw an error and a message will be shown.
    - Usage of `release-flow/keep-a-changelog-action` action to generate the `CHANGELOG.md` preview.
    - Add a PR comment with the `CHANGELOG.md` on the open pull request.

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
