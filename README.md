<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![project_license][license-shield]][license-url]

<br />
<div align="center">
  <a href="https://github.com/InditexTech/weavejs">
    <picture>
      <img src="images/logo.png" alt="Weave.js logo" width="80" height="80">
    </picture>
  </a>

<h3 align="center">Weave.js</h3>

  <p align="center">
    Free, open source library to build real-time collaboration applications like whiteboards, <br /> diagram editors, etc. on HTML5 Canvas with your own UI!
    <br />
    <a href="https://inditextech.github.io/weavejs/docs/main"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://weavejs.cloud.inditex.com/">View Demo</a>
    &middot;
    <a href="https://github.com/InditexTech/weavejs/issues/new?labels=bug&template=bug-report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/InditexTech/weavejs/issues/new?labels=enhancement&template=feature-request.md">Request Feature</a>
  </p>
</div>

## About The Project

https://github.com/user-attachments/assets/347ad22a-6bb5-425d-87b5-f09c56b57273

Weave.js is a powerful headless framework for building end-to-end collaborative whiteboard applications. Aimed at developers, it provides all the building blocks to develop visual collaborative canvas applications, while handling user interactions to enable real-time collaboration among multiple users.

It provides robust synchronization of a shared-state based on [Yjs][Yjs-url] and [SyncedStore][SyncedStore-url] as well as an extensible API to streamline the development of interactive, collaborative applications. Rendering is handled using [Konva.js][Konva-url] and a custom [React Reconciler][ReactReconciler-url].

### Related repos

- Weave.js [showcase backend](https://github.com/InditexTech/weavejs-backend)
- Weave.js [showcase frontend](https://github.com/InditexTech/weavejs-frontend)

## Prerequisites

- **Node.js:** `18.18.0` or later.
- **Package Manager:** `pnpm` is used in the examples below. `npm` or `yarn` can also be used.
- **React:** `18.2.0` (or `<19.0.0`) is required as a peer dependency.

For a complete understanding of the requirements and detailed setup instructions, please visit the [official documentation](https://inditextech.github.io/weavejs/docs/main/requirements).

## Quickstart

Here’s how to quickly get a sample Weave.js project up and running using `pnpm`. You will be prompted to enter project names.

### 1. Set up the Backend

In your terminal:

```bash
pnpm create weave-backend-app
cd [my-service]
pnpm run dev
```

The backend server will start (at `http://localhost:8080`).

### 2. Set up the Frontend

In a new terminal (ensure you are in the same parent directory as your backend project):

```bash
pnpm create weave-frontend-app
cd [my-app]
pnpm run dev
```

The frontend application will start at `http://localhost:3030`. Open your browser to this URL to try out the sample application.

This basic setup uses an Express.js backend with a WebSockets store. For further details, alternative stores, or troubleshooting, please consult the full [quickstart guide][docs-quick-start-url].

## Documentation

To unlock the full potential of Weave.js, we recommend exploring our official documentation:

- **[Full Documentation & Guides][docs-url]:** Your complete reference for all features and APIs.
- **[Architecture Overview][docs-architecture]:** Get a high-level understanding of the framework's design and core principles.

## Roadmap

The following table provides a high-level overview of our approximate roadmap. For detailed information on planned features and the most current timeline, please consult the official Weave.js [roadmap][docs-roadmap-url].

| Quarter | Focus Area                                               |
| ------- | -------------------------------------------------------- |
| Q3 2025 | Mobile gesture support improvements, Smart Guides Plugin |
| Q4 2025 | Connector Tool, Sticky Notes Tool                        |
| Q1 2026 | Awareness enhancement, Comment plugin, Minimap Plugin    |
| Q2 2026 | Other cloud providers stores                             |
| Q3 2026 | Koa server, Fastify server, NestJS server                |
| Q4 2026 | Bindings kit for Vue, Bindings for Svelte                |

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is valuable.

Before you start, please take a moment to read our [Contributing Guide](CONTRIBUTING.md). It provides detailed instructions on how to get your contributions accepted. Please note that you'll need to sign our [Contributor License Agreement (CLA)](https://github.com/InditexTech/foss/blob/main/documents/CLA.pdf) before we can accept your pull request.

Here's a quick overview of how you can contribute:

1. **Discuss:** Open an [issue](https://github.com/InditexTech/weavejs/issues/new/choose) to discuss the changes you'd like to make.
2. **Fork & Branch:** Fork the repository and create a new branch for your work.
3. **Develop:** Make your changes, following the project's coding style. Our `CONTRIBUTING.md` has detailed instructions on setting up your development environment.
4. **Pull Request:** Open a pull request and link it to the issue you created.

We look forward to your contributions!

## License

This project is licensed under the terms of the [Apache-2.0](LICENSE) license.

© 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/InditexTech/weavejs.svg?style=for-the-badge
[contributors-url]: https://github.com/InditexTech/weavejs/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/InditexTech/weavejs.svg?style=for-the-badge
[forks-url]: https://github.com/InditexTech/weavejs/network/members
[stars-shield]: https://img.shields.io/github/stars/InditexTech/weavejs.svg?style=for-the-badge
[stars-url]: https://github.com/InditexTech/weavejs/stargazers
[issues-shield]: https://img.shields.io/github/issues/InditexTech/weavejs.svg?style=for-the-badge
[docs-url]: https://inditextech.github.io/weavejs
[docs-architecture]: https://inditextech.github.io/weavejs/docs/main/architecture
[docs-quick-start-url]: https://inditextech.github.io/weavejs/docs/main/quickstart
[docs-roadmap-url]: https://inditextech.github.io/weavejs/docs/main/roadmap
[issues-url]: https://github.com/InditexTech/weavejs/issues
[license-shield]: https://img.shields.io/github/license/InditexTech/weavejs.svg?style=for-the-badge
[license-url]: https://github.com/InditexTech/weavejs/blob/master/LICENSE.txt
[product-screenshot]: images/screenshot.png
[Konva-url]: https://github.com/konvajs/konva
[Yjs-url]: https://github.com/yjs/yjs
[SyncedStore-url]: https://github.com/yousefed/SyncedStore
[ReactReconciler-url]: https://github.com/facebook/react/tree/main/packages/react-reconciler
