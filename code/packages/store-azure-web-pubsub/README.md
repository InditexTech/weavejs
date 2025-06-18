<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Weave.js / Azure Web PubSub Store

This package generates the `@inditextech/weave-store-azure-web-pubsub` package, this package defines a client and server tools to setup Weave using [Azure Web PubSub](https://azure.microsoft.com/es-es/products/web-pubsub) as transport.

We support servers like:

- Express.js
- Koa

## Setup

This is a monorepo, to install this package dependencies, just setup the monorepo, this can be done by locating on the `/code` project and execute the following command.

```sh
$ npm install
```

## Usage

This is a monorepo, this commands need to be from the `/code` folder of the repo.

### Build the package

```sh
$ npm run build --workspace=@inditextech/weave-store-azure-web-pubsub
```

### Link the package

```sh
$ npm run link --workspace=@inditextech/weave-store-azure-web-pubsub
```

### Lint the package

```sh
$ npm run lint --workspace=@inditextech/weave-store-azure-web-pubsub
```

### Test the package

```sh
$ npm run test --workspace=@inditextech/weave-store-azure-web-pubsub
```

### To launch a local test server

To launch a local test server using Express.js, use the command:

```sh
$ npm run dev:server:express --workspace=@inditextech/weave-store-azure-web-pubsub
```

To launch a local test server using Koa, use the command:

```sh
$ npm run dev:server:koa --workspace=@inditextech/weave-store-azure-web-pubsub
```

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
