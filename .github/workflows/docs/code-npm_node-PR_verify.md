# `code-npm-PR_verify`

[`code-npm_node-PR_verify.yml`](../code-npm_node-PR_verify.yml) workflow allows to **run** different types of tests.

## Trigger

Any pull request `opened` with changes about `code` folder.

## Where does it run?

`ubuntu-24.04` GitHub infrastructure.

## Versions used

`asdf` and any `Java`, `Maven` and `Node`.

## How does it work?

This workflow relies on asdf to automatically load any tool version defined on the project's `code/.tool-versions` file.

## Jobs

- ### `unit-tests`

  - **Steps**
    - Checkout the repository in the specific pull request.
    - Setup NPM and Asdf caches.
    - Configure asdf environment with the added tools in the `.tool-versions` file.
    - Create Cache Folders.
    - Run verify npm script.
    - Store project name and version.
    - Run SonarQube action in current branch.
