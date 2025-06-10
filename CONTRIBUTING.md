<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Contributing Guide

Thank you for your interest in contributing to this project! We value and appreciate any contributions you can make.

To maintain a collaborative and respectful environment, please consider the following guidelines when contributing to this project.

## Prerequisites

- Before starting to contribute to the code, you must first sign the
  [Contributor License Agreement (CLA)](https://github.com/InditexTech/foss/blob/main/documents/ITX_OSS_CLA.pdf). Detailed instructions on how to proceed can be found [here](https://github.com/InditexTech/foss/blob/main/CONTRIBUTING.md).

## How to Contribute

1. Open an issue to discuss and gather feedback on the feature or fix you wish to address.
2. Fork the repository and clone it to your local machine.
3. Create a new branch to work on your contribution: `git checkout -b your-branch-name`.
4. Make the necessary changes in your local branch.
5. Ensure that your code follows the established project style and formatting guidelines.
6. Perform testing to ensure your changes do not introduce errors.
7. Make clear and descriptive commits that explain your changes.
8. Push your branch to the remote repository: `git push origin your-branch-name`.
9. Open a pull request describing your changes and linking the corresponding issue.
10. Await comments and discussions on your pull request. Make any necessary modifications based on the received feedback.
11. Once your pull request is approved, your contribution will be merged into the main branch.

## Contribution Guidelines

- All contributors are expected to follow the project's [code of conduct](CODE_OF_CONDUCT.md). Please be respectful and considerate towards other contributors.
- Before starting work on a new feature or fix, check existing [issues](../../issues) and [pull requests](../../pulls) to avoid duplications and unnecessary discussions.
- If you wish to work on an existing issue, comment on the issue to inform other contributors that you are working on it. This will help coordinate efforts and prevent conflicts.
- It is always advisable to discuss and gather feedback from the community before making significant changes to the project's structure or architecture.
- Ensure a clean and organized commit history. Divide your changes into logical and descriptive commits.
- Document any new changes or features you add. This will help other contributors and project users understand your work and its purpose.
- Be sure to link the corresponding issue in your pull request to maintain proper tracking of contributions.

## Development

This project is a monorepo using [Nx](https://nx.dev/) and [NPM](https://docs.npmjs.com/about-npm). We also make heavy use of NPM [Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces). All code is located on the `/code` folder.

Weave.js is separated in several packages for better maintainability, these packages are located on the `code/packages` folder:

- `create-backend-app`: Helper package that contains the CLI to create the backend test app.
- `create-frontend-app`: Helper package that contains the CLI to create the frontend test app.
- `react`: Package that contains the helper to use Weave.js with React.
- `sdk`: Main package of Weave.js, contains the SDK.
- `store-azure-web-pubsub`: Package that contains the client / server side of a Store that uses Azure Web PubSub as transport.
- `store-websockets`: Package that contains the client / server side of a Store that uses Websockets as transport.
- `types`: Package that contain all the TS typings for the project.

### Installation

Before start we need to install all the dependencies to work with the monorepo, this is done by executing the following command from the `/code` folder.

```
npm install
```

### Frontend & Backend Setup

Is good practice to setup a backend and frontend application on your local development environment that you can use to develop & test the changes made to the different packages that your PR touches. Our create-app CLI can help with this, just follow the [quickstart][docs-quick-start-url] located in or documentation.

### Development Tasks

Once you have a backend and frontend to test locally the changes on the different packages, you can perform several operations on top of the different packages:

- `build`: build the package.
- `lint`: lints the package.
- `format`: formats the package using prettier.
- `link`: links the package.
- `test`: test the package (\*).

(\*): as today not all packages contain unitary tests

All this operations can be performed:

- Per package, just launch the following command:

  ```
  npm run <operation> --workspace=@inditextech/<package-name>
  ```

  Where `<package-name>` is the name of the package you want to build.

- All packages:

  ```
  npm run <operation>
  ```

All commands are launched from the `/code` folder.

### Development Flow

For start:

1. Setup your test backend & frontend.
2. Install the monorepo dependencies.
3. Build all the packages.
4. Link all the packages.
5. On the backend / frontend project run:

   ```
   npm link @inditextech/<package-name> @inditextech/<package-name-2> ...
   ```

   To link the built packages and use this instead of installed from NPM.

6. Start your backend and frontend, this will use the built linked packages.

To make a change and test it:

1. Make a change on a package or packages related to the Feature of Fix you're trying to solve.
2. Build the package or packages.
3. Refresh your frontend or backend - depending on the change performed, and test the change.

As you can see to test you can repeat steps 1-3 as many times as you want.

### Before Submitting

- Lint your code with `npm run lint`.
- Format your code with `npm run format`.
- Update the CHANGELOG.md to reflect the changes you made, we follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- On the PR, depending on your change add one of the following labels:

  - `skip-release`: when this PR is merged no release will be performed.
  - `release-type/major`: when this PR is merged a major release will be performed.
  - `release-type/minor`: when this PR is merged a major release will be performed.
  - `release-type/patch`: when this PR is merged a patch release will be performed.
  - `release-type/hotfix`: when this PR is merged a hotfix release will be performed.

- Document your changes, check the Documentations section of this document.

## Documentation

This project documentation is handled by [Fumadocs](https://fumadocs.dev/) and [NPM](https://docs.npmjs.com/about-npm). All code is located on the `/docs` folder.

Documentation is based on MDX and the content files are located on `/docs/content/docs`.

### Installation

Before start making changes to the documentation we need to install all the dependencies to work with it, this is done by executing the following command from the `/docs` folder.

```
npm install
```

### Documentation Tasks

Once you have a backend and frontend to test locally the changes on the different packages, you can perform several operations on top of the different packages:

- `dev`: start the documentation site locally.
- `build`: builds the documentation site.

All this operations can be performed launching the following command on the `/docs` folder:

```
npm run <operation>
```

### Documentation Flow

For start:

1. Install the documentation dependencies.
2. Start the documentation site locally.

To make a change and test it:

1. Make a change on a MDK file and save it.
2. Check the changes on the live local site.

As you can see to test you can repeat steps 1-2 as many times as you want.

## Helpful Resources

- [Project documentation](README.md): Refer to our documentation for more information on the project structure and how to contribute.
- [Issues](../../issues): Check open issues and look for opportunities to contribute. Make sure to open an issue before starting work on a new feature or fix.

Thank you for your time and contribution! Your work helps to grow and improve this project. If you have any questions, feel free to reach out to us.

[docs-quick-start-url]: https://stunning-enigma-169l5kv.pages.github.io/docs/main/quickstart
