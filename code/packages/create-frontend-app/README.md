<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js / Create Weave Frontend App

This package uses the NPM [`init`](https://docs.npmjs.com/cli/v8/commands/npm-init) functionality to initialize the frontend-side of a project based on Weave.js.

## Setup

This is a monorepo, to install this package dependencies, just setup the monorepo, this can be done by locating on the `/code` project and execute the following command.

```sh
$ npm install
```

## Usage

This is a monorepo, this commands need to be from the `/code` folder of the repo.

### Build the package

```sh
$ npm run build --workspace=create-weave-frontend-app
```

### Link the package

```sh
$ npm run link --workspace=create-weave-frontend-app
```

### Lint the package

```sh
$ npm run lint --workspace=create-weave-frontend-app
```

### Test the package

```sh
$ npm run test --workspace=create-weave-frontend-app
```

### Test the app creation

Link the package to your global NPM setup and then run the following command:

```sh
$ npm create weave-frontend-app
```

This will launch the Weave frontend app creation tool.

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
