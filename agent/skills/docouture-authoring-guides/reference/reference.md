# Reference section — authoring guide

The Reference section documents **what things are**: it focuses on cause and effect — which actions produce which results. It is information-oriented lookup material: exhaustive, structured, and neutral. A reader lands here mid-task from a search or a guide's link, finds the exact fact, and leaves.

Pages in this section:

| Page                                                    | Level          | One-line purpose                           |
| ------------------------------------------------------- | -------------- | ------------------------------------------ |
| `overview`                                              | 🔴 required    | Map of the available reference material    |
| `configuration`                                         | 🔵 conditional | Every configuration property, exhaustively |
| `<api / cli / sdk / integrations>` (repeatable pattern) | 🔵 conditional | One page per real surface, exhaustively    |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like a components catalog (one page per component), a features catalog, a commands catalog (one page per command), or roles and permissions tables.

**Document only the surfaces the product actually has.** If the product has no CLI, there is no CLI page; if it exposes no API, there is no API reference. This is not optional padding to complete: an empty stub is worse than no page. The usual surfaces are configuration, a CLI, an SDK/library API, a public (HTTP) API, and integrations — and any other real, distinct surface the product exposes gets its page too.

Unsure whether something belongs here or in Guides? See [Guides vs Reference](../SKILL.md#guides-vs-reference) in the skill guide.

### Adding these pages to the nav

List every page above as a flat sibling of `overview` in `main`'s `nav.adoc` — Overview never parents the other Reference pages; only a surface page's own genuine sub-pages nest under that page:

```adoc
* Reference
* xref:overview.adoc[Overview]
* xref:configuration.adoc[Configuration]
* xref:cli.adoc[CLI]
* xref:api.adoc[API]
```

See the `docouture-writing-docs-pages` skill for the full nav.adoc nesting rule.

---

## `overview` 🔴

### Purpose & audience

The map of the section: which reference material exists and what each page covers. Written for a reader who knows what fact they need and wants the right page in one click.

### Section-by-section instructions

| Section               | Level | What to write                                                                                                                                                                                                                                                                                        |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | One or two sentences: what kind of material this section holds.                                                                                                                                                                                                                                      |
| _(the map)_           | 🔴    | A card per reference page. The title states what the page documents — add a short description only when the title alone is not enough. When the catalog grows, group the pages by **type of reference** — configuration, APIs, catalogs (commands, components)… — one `== <Type>` heading per group. |

### Docouture blocks

| Use                        | Block                                             |
| -------------------------- | ------------------------------------------------- |
| The map of reference pages | `[cards]` — the default presentation of this page |

### AsciiDoc skeleton

See [`skeletons/reference-overview.adoc`](skeletons/reference-overview.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Reference
:description: Reference material for Karate: configuration, Java API, and CLI.

This section is the lookup material for Karate: every option, command,
and API, described exhaustively.

[cards,columns="1 s:2 m:3"]
====
[card]
.xref:configuration.adoc[Configuration]

[card]
.xref:java-api.adoc[Java API]

[card]
.xref:cli.adoc[CLI commands]
====
```

### Quality checklist

- [ ] Every reference page is listed with what it documents.
- [ ] Only pages for surfaces the product actually has — no stubs.
- [ ] No content on this page — only the map.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Stub sub-pages "for symmetry".** An empty CLI page because "other products have one" wastes the reader's click; the sub-catalog is conditional by design.

---

## `configuration` 🔵

### Purpose & audience

The exhaustive list of the product's configuration properties and how to apply them. Written for a reader who needs the exact name, type, default, and effect of an option — usually arriving from a guide or a search. Include this page only if the product has a configuration surface (a config schema, a typed config object, documented environment variables).

### The properties table

Every property is documented in a table with **at least these columns** (if more columns are needed, keep them the minimal possible).

| Column            | Content                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| **Key**           | The property name, in `code font`, exactly as written in the config file                                  |
| **Type**          | The data type (String, Boolean, Integer, List…)                                                           |
| **Default value** | The literal default; state it explicitly when empty or none                                               |
| **Description**   | What the property does and its effect. Start with `#Required#` (highlight) when the property is mandatory |

Recommended column widths: `[cols="20%,20%,20%,40%"]`. Group properties by namespace or functional area (one table per `== ` section) when the list grows.

### Section-by-section instructions

| Section                            | Level | What to write                                                                                                                                                                                                    |
| ---------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_              | 🔴    | Where configuration lives (file, env vars, flags), the precedence order when there are several sources, and how to apply changes.                                                                                |
| `== Full example`                  | 🟠    | A complete, commented configuration file with the options in use together. Readers reach for examples before tables — lead with it. This is the **maximal** counterpart of the minimal snippets shown in Guides. |
| `== <Namespace / area>` (repeated) | 🔴    | The properties table for that group. Exhaustive: every property, including the obscure ones — this is the page's whole reason to exist.                                                                          |

### Docouture blocks

| Use                                       | Block                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The properties tables                     | Standard tables with the spec above; `mono:[]` for the Key column when the code-chip styling adds noise; `nowrap-cols` to keep keys on one line |
| A properties table that overflows its column | `table-width=` — an absolute CSS width, for when the four-column spec (`20%,20%,20%,40%`) still runs too wide or too narrow for the content |
| Equivalent config formats (YAML/JSON/env) | `[tabs]` in the intro example                                                                                                                   |

### AsciiDoc skeleton

See [`skeletons/configuration.adoc`](skeletons/configuration.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
== Full example

[source,yaml]
----
app:
  database:
    url: jdbc:postgresql://db.internal:5432/app   # required
    pool-size: 25          # high-concurrency deployment
  cache:
    enabled: true
    ttl-seconds: 300
----

== Database

[cols="20%,20%,20%,40%"]
|===
| Key | Type | Default value | Description

| `app.database.url`
| String
| _(none)_
| #Required# JDBC URL of the primary database.

| `app.database.pool-size`
| Integer
| `10`
| Maximum number of open connections. Raise it for high-concurrency
  deployments; each connection holds ~2 MB of memory.
|===
```

### Quality checklist

- [ ] Every existing property appears — exhaustiveness is the contract of this page.
- [ ] The table has the four columns of the spec, in that order (extra columns only when truly needed, and as few as possible).
- [ ] Defaults are literal values; "none" is stated, never left blank.
- [ ] Required properties are marked `#Required#` at the start of their description.
- [ ] Descriptions state the effect (cause → consequence), not just a restatement of the name.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Descriptions that repeat the key.** `pool-size: the size of the pool` documents nothing; state what changing it does.
- **Silent incompleteness.** An undocumented property teaches users to read the source instead of the docs — once they start, they do not come back.
- **Tutorial content in the table.** "First create the file, then…" is a guide; the table states facts. Link the guide instead.
- **Improvised columns.** Extra columns (Since, Deprecated…) go inside the Description (or a `label:` pill), not as new columns — keep the table spec uniform across products.

---

## `<api / cli / sdk / integrations>` — the surface page pattern 🔵

### Purpose & audience

One page per real surface of the product: its public API, its CLI, its SDK, its integrations. Documents every exposed element of that surface in a structured, uniform way: for each element, what it is, its signature, its parameters, what it returns, and what can go wrong. Written for a developer mid-integration who needs exact facts. This pattern is repeatable — one page per surface, or one page per artifact for multi-artifact products.

When the surface is described by a machine-readable contract (OpenAPI, GraphQL schema, doc-comments), prefer **generating** the reference from it and use this pattern for what generation does not cover. Annotate the code with descriptive comments and autogenerate where possible — hand-written copies of signatures drift.

Good API reference documentation, whatever the surface:

- Provides a detailed reference for **all** its resources/endpoints/commands/exports.
- Offers plenty of **examples** — example request and example response, example call and example output.
- Lists and defines **status codes and error messages**.

Examples here complement the guides: a guide shows the minimal implementation of one task; the reference is where complete, full-option examples live.

**One pattern, two flavors.** All surfaces share the same anatomy — one `== ` section per element, uniformly structured — so there is no separate contract per surface. What changes is how each element is documented inside:

- **API / SDK / integrations**: one `== ` section per element (method, endpoint, class), documented inside with a **parameters table** (Name · Type · Required · Description), plus signature, example, and errors.
- **A CLI**: one `== ` section per command, documented inside as **plain text and lists** — what the command does, its usage line, its options as a simple list, and an example. CLIs read best as a list of commands, each with what it does.

### Section-by-section instructions

| Section                            | Level | What to write                                                                                                                                                                                                 |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_              | 🔴    | What this surface is, when to use it, and how it is organized.                                                                                                                                                |
| `== <Element>` (API/SDK, repeated) | 🔴    | One section per method/endpoint/class: description → signature → parameters table (Name · Type · Required · Description) → returns/output → example (request **and** response, call **and** output) → errors. |
| `== <command>` (CLI, repeated)     | 🔴    | One section per command, in plain text: what it does, the usage line, the options as a simple list (`--option` — what it controls and its default), and an example with its output.                           |
| `== Status codes and errors`       | 🟠    | The status codes and error messages this surface produces, each defined, with its cause and the action to take. Group them here rather than scattering them.                                                  |

### Docouture blocks

| Use                               | Block                                                         |
| --------------------------------- | ------------------------------------------------------------- |
| Parameters and error tables       | Standard tables; `mono:[]` for name/code columns              |
| Example call in several languages | `[tabs]`                                                      |
| Marking element status            | `label:` pill (`label:red[Deprecated]`, `label:orange[Beta]`) |

### AsciiDoc skeleton — API / SDK / integrations

See [`skeletons/surface-api.adoc`](skeletons/surface-api.adoc) for the copyable AsciiDoc starting point.

### Example — API / SDK

```asciidoc
== runner.builder()

Creates a test runner for one or more feature paths.

.Signature
[source,java]
----
static Runner.Builder builder(String... paths)
----

.Parameters
[cols="1,1,1,3",options="header"]
|===
| Name | Type | Required | Description

| `paths`
| String…
| Yes
| Classpath locations of the features to run.
|===

.Example
[source,java]
----
Results results = Runner.builder("classpath:demo").tags("@smoke").parallel(5);
----

[source]
----
Karate version: 1.4.1 | 12 scenarios passed | 0 failed
----
```

### AsciiDoc skeleton — CLI

See [`skeletons/surface-cli.adoc`](skeletons/surface-cli.adoc) for the copyable AsciiDoc starting point.

### Example — CLI

```asciidoc
== run

Runs the feature files passed as arguments.

[source,bash]
----
karate run [options] <paths>
----

Options:

* `--tags` — runs only the scenarios matching the tag expression.
* `--threads` — number of parallel threads. Default: `1`.

.Example
[source,bash]
----
karate run --tags @smoke --threads 5 src/test/features
----

[source]
----
12 scenarios passed | 0 failed | 8.2s
----
```

### Quality checklist

- [ ] Every exposed element of the surface is documented — no undocumented public API.
- [ ] Every element has at least one example with both input and output.
- [ ] Parameters tables (API/SDK) state name, type, required, and description for every parameter; CLI options are a plain list with what each controls and its default.
- [ ] Status codes and error messages are listed and defined in one place.
- [ ] Signatures match the current code (generated where possible).
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Examples without responses.** Half an example: the reader needs to see what comes back, not only what to send.
- **Documenting usage flows here.** "To set up authentication, first…" is a how-to; this page states what each element does. Link the guide.
- **Hand-copying what the code declares.** Signatures and types transcribed by hand drift within weeks; generate or include from source.
- **Scattered error documentation.** Error codes explained inline per endpoint and nowhere else make troubleshooting a scavenger hunt — group them.
