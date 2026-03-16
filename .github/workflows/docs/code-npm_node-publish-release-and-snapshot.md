# `code-npm-publish-release-and-snapshot`

[`code-npm_node-publish-release-and-snapshot.yml`](../code-npm_node-publish-release-and-snapshot.yml) is a unified workflow that publishes release versions and pre-release snapshots to NPM using **OIDC Trusted Publishers** for authentication, and generates the associated release in GitHub.

## Triggers

- An `issue_comment` with `/publish-snapshot` on an open pull request (snapshot job).
- Any `closed` pull request to `main` branch on `code` path, if no `skip-release` label AND if a `release-type/*` label is added if using Gitflow development flow (release job).
- A manual dispatch (`workflow_dispatch`) invoked from the GitHub UI (release job).

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

  Triggered by a `/publish-snapshot` comment on a pull request. Publishes a pre-release snapshot version tagged as `next`.

  - **Steps**

    - Validate the commenter has admin permissions.
    - Get the release labels from the PR.
    - Checkout the PR branch.
    - Setup NPM and asdf caches.
    - Configure asdf environment with the tools in the `.tool-versions` file.
    - Ensure minimum npm version (`>=11.5.1`) for OIDC support, upgrading only if needed.
    - Configure npmrc registry (no auth token — OIDC handles authentication).
    - Create NPM cache folders.
    - Update the version based on the input release type.
    - Update CHANGELOG.md and calculate next version using `release-flow/keep-a-changelog-action` action.
    - Define the snapshot version (`<version>-SNAPSHOT.<run_number>.<run_attempt>`).
    - Prepare the snapshot with `version:release` and `release:prepare` node scripts.
    - Publish the snapshot with `publish:snapshot` node script (`NPM_CONFIG_PROVENANCE` set to `false`).
    - Comment on the PR with the result (success with version info, or failure).

- ### `release`

  Triggered by a merged pull request or manual workflow dispatch. Publishes a release version and creates a GitHub release.

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
    - Update CHANGELOG.md and calculate next version using `release-flow/keep-a-changelog-action` action.
    - Prepare the release with `version:release` and `release:prepare` node scripts.
    - Publish the artifact with `release:perform` node script (`NPM_CONFIG_PROVENANCE` set to `false`).
    - Commit and push CHANGELOG.md, `package.json`, `package-lock.json`, and `packages/*/package.json` with the released version.
    - Create an annotated, signed git tag.
    - Set the new SNAPSHOT version with `version:development` node script.
    - Commit `package.json`, `package-lock.json`, and `packages/*/package.json` with the new snapshot version.
    - Create Sync Branch PR into Develop if using Gitflow development flow.
    - Publish release on GitHub.
    - Comment in PR if sync PR failed.
    - Comment in PR if the release creation has failed.
