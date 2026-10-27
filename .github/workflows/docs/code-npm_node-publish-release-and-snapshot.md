# `code-npm-publish-release-and-snapshot`

[`code-npm_node-publish-release-and-snapshot.yml`](../code-npm_node-publish-release-and-snapshot.yml) is a unified workflow that publishes release versions and pre-release snapshots to NPM using **OIDC Trusted Publishers** for authentication, and generates the associated release in GitHub.

## Triggers

- A manual dispatch (`workflow_dispatch`) with `ACTION=snapshot` (snapshot job). `BASELINE` selects the branch to build from. npm trusted publishing rejects OIDC tokens from `issue_comment` events, so the former `/publish-snapshot` comment trigger was removed.
- Any `closed` pull request to `main` branch on `code` path, if no `skip-release` label AND if a `release-type/*` label is added if using Gitflow development flow (release job).
- A manual dispatch (`workflow_dispatch`) with `ACTION=release` (default) (release job).

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Versions used

`asdf` and any `Node` version defined in the project's `code/.tool-versions` file. npm is conditionally upgraded to `>=11.5.1` when the bundled version does not support OIDC Trusted Publishers.

## Authentication

This workflow uses **npm Trusted Publishers (OIDC)** instead of long-lived `NPM_TOKEN` secrets. GitHub Actions generates short-lived OIDC tokens automatically via the `id-token: write` permission at job level.

## How does it work?

This workflow relies on asdf to automatically load any tool version defined on the project's `code/.tool-versions` file. Permissions are scoped at the job level following the principle of least privilege.

## Jobs

- ### `publish-snapshot`

  Triggered by a manual dispatch with `ACTION=snapshot`. Publishes a pre-release snapshot version tagged as `next`.

  - **Steps**

    - Validate the actor has admin permissions.
    - Get the release type (`RELEASE_TYPE`) and branch (`BASELINE`) inputs.
    - Checkout the `BASELINE` branch.
    - Setup NPM and asdf caches.
    - Configure asdf environment with the tools in the `.tool-versions` file.
    - Ensure minimum npm version (`>=11.5.1`) for OIDC support, upgrading only if needed.
    - Configure npmrc registry (no auth token — OIDC handles authentication).
    - Create NPM cache folders.
    - Update the version based on the input release type.
    - Update CHANGELOG.md and calculate next version using `release-flow/keep-a-changelog-action` action.
    - Define the snapshot version (`<version>-SNAPSHOT.<run_number>.<run_attempt>`).
    - Prepare the snapshot with `version:release` and `release:prepare` node scripts.
    - Publish the snapshot with `publish:snapshot` node script (`NPM_CONFIG_PROVENANCE` set to `true`).
    - Write a job summary with the result (snapshot version, tag, branch and auth method, or failure).

- ### `release`

  Triggered by a merged pull request or a manual workflow dispatch with `ACTION=release`. Publishes a release version and creates a GitHub release.

  - **Steps**

    - Validate the actor has admin permissions.
    - Get the release labels and the baseline branch.
    - Checkout the specific merge commit or the baseline branch if using workflow_dispatch trigger.
    - Setup NPM and asdf caches.
    - Configure asdf environment with the tools in the `.tool-versions` file.
    - Ensure minimum npm version (`>=11.5.1`) for OIDC support, upgrading only if needed.
    - Configure npmrc registry (no auth token — OIDC handles authentication).
    - Create NPM cache folders.
    - Update the version based on the input release type.
    - Prepare committer information and configure GPG signing (gpg-agent with loopback-pinentry and preset-passphrase).
    - Generate the `[Unreleased]` entries of CHANGELOG.md with `.github/scripts/changelog-from-prs.mjs`: one line per issue closed by the PRs merged since the last release tag (`git describe --tags --abbrev=0 --match '[0-9]*'`). Any error stops the job before the bump, the commit and the tag.
    - Update CHANGELOG.md and calculate next version using `release-flow/keep-a-changelog-action` action.
    - Prepare the release with `version:release` and `release:prepare` node scripts.
    - Publish the artifact with `release:perform` node script (`NPM_CONFIG_PROVENANCE` set to `true`).
    - Commit and push CHANGELOG.md, `package.json`, `package-lock.json`, and `packages/*/package.json` with the released version.
    - Create an annotated, signed git tag.
    - Set the new SNAPSHOT version with `version:development` node script.
    - Commit `package.json`, `package-lock.json`, and `packages/*/package.json` with the new snapshot version.
    - Create Sync Branch PR into Develop if using Gitflow development flow.
    - Publish release on GitHub.
    - Comment in PR if sync PR failed.
    - Comment in PR if the release creation has failed.
