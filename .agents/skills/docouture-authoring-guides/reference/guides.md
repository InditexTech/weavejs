# Guides section — authoring guide

The Guides section is the **procedural documentation** of the product: it shows readers how to accomplish a specific goal by following a set of structured steps. Where Overview explains and Reference describes, Guides _does_.

Two kinds of common procedural content live here:

- **Tutorials** teach: a safe, guided environment where the user learns how to achieve a goal (the quickstart in Getting started is the first tutorial). Additional learning-oriented walkthroughs belong here.
- **How-to guides** solve: the core content of this section. They show users how to solve actual business problems by performing specific steps with real code.

Pages in this section:

| Page                                      | Level          | One-line purpose                              |
| ----------------------------------------- | -------------- | --------------------------------------------- |
| `overview`                                | 🔴 required    | Catalog of the available guides               |
| `<`guide`-name>` (≥1, repeatable pattern) | 🔴 required    | One guide per real task or capability         |
| `development`                             | 🟠 recommended | Set up and work on the product's own codebase |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like installation and upgrade, configuration (defining and reading it), deployment (per environment, with its checklist), authentication and authorization, observability (logging, metrics, tracing, alerts), permissions management, testing, tutorials, use cases, or best practices.

**Do not invent the task list.** Derive it from what the repo can actually do — one guide per real capability: a distinct feature area, a workflow spanning setup → configure → run. A product with three real capabilities gets three guides; a product with one gets one. The product's CLI commands or API endpoints are not tasks — those catalogs belong in [Reference](reference.md).

Unsure whether something belongs here or in Reference? See [Guides vs Reference](../SKILL.md#guides-vs-reference) in the skill guide.

### Adding these pages to the nav

List every page above as a flat sibling of `overview` in `main`'s `nav.adoc` — Overview never parents the other Guides pages:

```adoc
* Guides
* xref:overview.adoc[Overview]
* xref:configure-authentication.adoc[Configure authentication]
* xref:development.adoc[Development]
```

See the `docouture-writing-docs-pages` skill for the full nav.adoc nesting rule.

---

## `overview` 🔴

### Purpose & audience

The catalog of the section: it tells the reader which guides exist and which one matches their goal. Written for someone who arrives with a task in mind and needs to find the right guide in seconds.

### Section-by-section instructions

| Section               | Level | What to write                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | One or two sentences: what kind of content this section holds and how to use it.                                                                                                                                                                                                                                                      |
| _(the catalog)_       | 🔴    | A card per guide. The title (bare infinitive) already states the goal — add a short description only when the title alone is not enough. When the catalog grows, group the guides by **set of actions** — management, observability, authentication… — one `== <Action set>` heading per group, matching how users think about tasks. |

### Docouture blocks

| Use                                               | Block                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The guide catalog                                 | `[cards]` — the default presentation of this page                                                                    |
| Documenting a visual tool (a UI, a design system) | Cards **with an image**: a screenshot of the interface for that task, or — in a design system — the component itself |

### AsciiDoc skeleton

See [`skeletons/guides-overview.adoc`](skeletons/guides-overview.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Guides
:description: Step-by-step guides to accomplish specific tasks with Karate.

These guides show how to accomplish specific tasks with Karate. Each
guide states its goal, the prerequisites, and the steps to follow.

[cards,columns="1 s:2 m:3"]
====
[card]
.xref:run-tests-by-tags.adoc[Run tests by tags]

[card]
.xref:configure-environments.adoc[Configure environments]

[card]
.xref:mock-external-services.adoc[Mock external services]
<Simulate third-party APIs so the suite runs without network access.>
====
```

### Quality checklist

- [ ] Every guide in the section is listed — no orphan pages.
- [ ] Titles are bare infinitives that state the goal on their own; descriptions appear only where the title is not enough.
- [ ] Grouping (if any) is by set of actions, matching how users think about tasks — not how the code is organized.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Premature grouping.** Five guides in three groups is harder to scan than five bullets.
- **Content on the catalog page.** The moment this page starts explaining a task, that content is a guide waiting to be extracted.

---

## `<guide-name>` — the how-to page pattern 🔴

### Purpose & audience

One guide, one goal. A how-to guide shows a user how to solve an actual problem by performing specific steps with real code. The reader is mid-work: they arrive with a goal, follow the steps, verify the result, and leave. This pattern is repeatable — clone it for every task worth documenting.

Name the page after the task (`configure-authentication.adoc`, `add-a-custom-node.adoc`) and title it as a bare infinitive (`Configure authentication`).

Show the **minimal implementation** that accomplishes the goal — the smallest working code, one option chosen for the reader. Complete, full-option examples belong to the Reference pages, which the guide links from Next steps.

### Section-by-section instructions

| Section               | Level | What to write                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_ | 🔴    | The core concepts and overview information required for this guide: what the reader accomplishes, and any context needed to follow it. Two or three sentences — deeper concepts link to Overview.                                                                                                                                                 |
| `== Prerequisites`    | 🔴    | What the user must do or have before following the steps: completed guides, installed tools, permissions, product state. Link, do not repeat.                                                                                                                                                                                                     |
| `== Steps`            | 🔴    | The numbered procedure. Each step: one action with real, copy-pasteable code, and its observable result — show the output the reader should see if it worked, as a `[source]` block with the expected output, or a screenshot when the result is visual. Conditional clauses before instructions ("To enable X, set…", not "Set… if you want X"). |
| `== Verify`           | 🟠    | How to confirm the goal was reached: a command with its expected output, or a screenshot of the expected state.                                                                                                                                                                                                                                   |
| `== Next steps`       | 🟠    | Links to the documentation the user should follow after this guide — related guides, or the Reference pages for the options just used.                                                                                                                                                                                                            |

### Docouture blocks

| Use                                                                                 | Block                                                                   |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Equivalent alternatives inside a step (package managers, config formats, languages) | `[tabs]`                                                                |
| The expected output of a step or of the verification                                | `[source]` block with the real output — searchable, unlike a screenshot |
| The expected result in a visual tool                                                | A screenshot (image) of the state the reader should see                 |
| A destructive or irreversible action warning                                        | `WARNING`/`CAUTION` admonition                                          |
| A recorded walkthrough of the whole task                                            | `video::demo[youtube,640,360]` — sizes and locks the aspect ratio; a supplement to the written steps, not a replacement for them |

### AsciiDoc skeleton

See [`skeletons/how-to-guide.adoc`](skeletons/how-to-guide.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Run tests by tags
:description: Execute a subset of your Karate test suite using tags.

Tags let you run a subset of the suite — smoke tests, a single team's
features, or everything except work in progress.

== Prerequisites

* A generated test project, see xref:../getting-started/quickstart.adoc[Quickstart].

== Steps

. Tag the scenarios to include:
+
[source,gherkin]
----
@smoke
Scenario: Get user by id
----

. Run the suite passing the tag filter:
+
[source,bash]
----
mvn test -Dkarate.options="--tags @smoke"
----
+
Only the scenarios tagged `@smoke` execute.

== Verify

The report at `target/karate-reports/index.html` lists only the tagged
scenarios.
```

### Quality checklist

- [ ] The title states the goal as a bare infinitive; the page solves exactly that goal.
- [ ] Prerequisites are complete and linked, not repeated.
- [ ] Every step has real code and an observable result; the whole flow is copy-pasteable.
- [ ] Steps were executed as written before publishing.
- [ ] Options and flags used in the steps link to their Reference entry instead of being exhaustively described here.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Turning the guide into reference.** Describing every available option mid-procedure buries the path; use one option, link the rest (see [Guides vs Reference](../SKILL.md#guides-vs-reference)).
- **Multiple goals in one guide.** "Configure and deploy and monitor" is three guides. Split.
- **Steps without results.** If a step does not say what the reader should observe, the reader cannot tell when it went wrong.
- **Abstract placeholders everywhere.** How-to guides work on real problems: prefer a concrete worked example with real values over `<your-value-here>` chains.

---

## `development` 🟠

### Purpose & audience

How to work on the product's own codebase: environment setup, development process, and testing. Written for a developer who wants to modify or extend the product — including future maintainers. This page complements `CONTRIBUTING.md`: the contribution _process_ (issues, PRs, conventions) belongs to the [Contributing section](contributing.md); this page covers the _technical_ workflow.

### Section-by-section instructions

| Section                  | Level | What to write                                                                                                                       |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_    | 🔴    | One or two sentences: what this page covers and who it is for.                                                                      |
| `== Environment setup`   | 🔴    | Tools and versions needed to build the product locally, and the commands to clone, install dependencies, and build. Copy-pasteable. |
| `== Development process` | 🟠    | The day-to-day workflow: how to run the product locally, watch mode, useful scripts/targets, project layout pointers.               |
| `== Testing`             | 🟠    | How to run the test suite (all and a subset), and what is expected before submitting changes.                                       |

### Docouture blocks

| Use                                               | Block                      |
| ------------------------------------------------- | -------------------------- |
| Equivalent setup commands (package managers, OSs) | `[tabs]`                   |
| A caveat about the dev environment                | Standard `NOTE` admonition |

### AsciiDoc skeleton

See [`skeletons/development.adoc`](skeletons/development.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
= Development
:description: Set up a development environment and work on Karate.

This page explains how to set up a development environment for Karate
and the workflow to build, run, and test it locally.

== Environment setup

Install Java 17 or later and Maven 3.9 or later, then:

[source,bash]
----
git clone https://github.com/example-org/karate.git
cd karate
mvn clean install
----

The build ends with `BUILD SUCCESS`.

== Development process

Run the local demo server to try changes against real requests:

[source,bash]
----
mvn exec:java -pl karate-demo
----

The server starts at `http://localhost:8080`.

== Testing

[source,bash]
----
mvn test                          # run the whole suite
mvn test -Dtest=RunnerTest        # run a single class
----

All tests must pass before opening a pull request, see
xref:../contributing/overview.adoc[Contributing].
```

### Quality checklist

- [ ] A newcomer can go from clone to a successful local build following only this page.
- [ ] Commands are current and copy-pasteable.
- [ ] Testing covers both "run everything" and "run just what I changed".
- [ ] No overlap with Contributing: process there, technique here — cross-linked both ways.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Duplicating CONTRIBUTING.md.** Link it; do not paste it. Two copies always diverge.
- **Assuming insider knowledge.** "Run the usual setup" helps nobody who was not in the room.
- **Skipping the verification.** A dev-setup page needs its own "see it working" moment, same as a quickstart.
