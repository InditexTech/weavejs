# Antora

A meta package for Antora that installs both the CLI (`@antora/cli`) and site generator (`@antora/site-generator`), as well as any dependencies of these packages.
The CLI provides the `antora` command (i.e., bin script) to run Antora.
The site generator provides the function invoked by the `generate` (default) command of the CLI.
Other packages may be included with this package in the future.

[Antora](https://antora.org) is a modular static site generator designed for creating documentation sites from AsciiDoc documents.
Its site generator aggregates documents from versioned content repositories and processes them using [Asciidoctor](https://asciidoctor.org).

## How to Install

This package adds the `antora` command to your PATH preconfigured to use the custom site generator.

To install Antora into your Node.js installation (i.e., globally), use:

```sh
npm i -g antora
```

Check that the package was successfully installed:

```sh
antora -v
```

Alternately, to install Antora within your project (i.e., locally), use:

```sh
npm i antora
```

Check that the package was successfully installed:

```sh
npx antora -v
```

When you install Antora locally, you must always prefix the command with `npx`.

The `antora` command (specifically the implicit `generate` subcommand) will look for the `@antora/site-generator` package by default.

## How to Use

To run Antora, you’ll need a playbook file and at least one content (source) repository.
Consult the [quickstart](https://docs.antora.org/antora/latest/install-and-run-quickstart/) to find an example.

Once you have your content sources set up, point the `antora` command at your playbook file:

```sh
antora antora-playbook.yml
```

or

```sh
npx antora antora-playbook.yml
```

The `antora` command will output the generated site to the _build/site_ folder by default.

## Copyright and License

Copyright (C) 2017-present [OpenDevise Inc.](https://opendevise.com) and the [Antora Project](https://antora.org).

Use of this software is granted under the terms of the [Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/) (MPL-2.0).
