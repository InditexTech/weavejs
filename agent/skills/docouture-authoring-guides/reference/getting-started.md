# Getting started section — authoring guide

The Getting started section takes the reader from zero to a first working result. Everything here is optimized for time-to-first-success — the shortest path from "I want to try this" to "it works on my machine".

Pages in this section:

| Page            | Level       | One-line purpose                      |
| --------------- | ----------- | ------------------------------------- |
| `prerequisites` | 🔴 required | What the reader needs before starting |
| `quickstart`    | 🔴 required | A first working result in minutes     |

This list is the minimum, not a ceiling: a product with more complex or more specific documentation needs can add more pages to this section (see [the skill guide](../SKILL.md#the-minimal-structure)) — like a basic installation, basic configuration, basic development, basic deployment, basic observability, or basic concepts.

The entry page of this section is `prerequisites` — the natural reading order (see the naming conventions in [the skill guide](../SKILL.md)). The [sizing rule](../SKILL.md#sizing-rule-one-page-or-many) applies: if prerequisites amount to a short list, fold them into the quickstart as its first section.

---

## `prerequisites` 🔴

### Purpose & audience

Ensures the reader has the prior knowledge, tools, accounts, and permissions they need before using the product — including its basic installation. Written for someone about to start the quickstart: everything they need to check or install, nothing else.

Do not assume anything is preinstalled: list every language, runtime, and tool the product needs. Do assume the reader is a developer — skip the obvious (git, an operating system, a terminal, an editor).

### Section-by-section instructions

| Section                      | Level | What to write                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_        | 🔴    | One or two sentences: what this page lists and what the reader will be able to do once they meet it (start the quickstart).                                                                                                                                                                                                  |
| `== Requirements`            | 🔴    | The tools, versions, accounts, and permissions required, as a checkable list. Be exact about versions (`Node.js 20 or later`, not `a recent Node.js`). If requirements differ per operating system, present the variants with a `[tabs]` block (see the [tabs rule](../SKILL.md#variants-always-go-in-tabs) in the skill guide). |
| `== Installation`            | 🔴    | The basic installation of the product itself, with copy-pasteable commands. If installation differs per package manager or OS, use a `[tabs]` block.                                                                                                                                                                         |
| `== Verify the installation` | 🟠    | One command (or check) that confirms everything is in place, with its expected output. Saves a support ticket per reader.                                                                                                                                                                                                    |

### Docouture blocks

| Use                                                 | Block                                  |
| --------------------------------------------------- | -------------------------------------- |
| Equivalent install commands (package managers, OSs) | `[tabs]` — one tab per alternative     |
| A version or permission caveat worth surfacing      | Standard `NOTE`/`IMPORTANT` admonition |

### AsciiDoc skeleton

See [`skeletons/prerequisites.adoc`](skeletons/prerequisites.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
== Requirements

* Java 17 or later
* Maven 3.9 or later

== Installation

Add the dependency to your project:

[tabs]
--
[tab,label="Maven"]
****
[source,xml]
----
<dependency>
  <groupId>com.example</groupId>
  <artifactId>example-core</artifactId>
  <version>2.4.0</version>
</dependency>
----
****

[tab,label="Gradle"]
****
[source,kotlin]
----
implementation("com.example:example-core:2.4.0")
----
****
--

== Verify the installation

[source,bash]
----
mvn dependency:tree | grep example-core
----

The command prints `com.example:example-core:jar:2.4.0`.
```

### Quality checklist

- [ ] Every requirement states an exact version or a link to obtain it.
- [ ] Installation commands are copy-pasteable as-is (no unexplained placeholders).
- [ ] OS or package-manager variants are covered when they differ.
- [ ] There is a way to verify the setup before moving on.
- [ ] Nothing here belongs to the product's advanced configuration (that is Reference).
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Vague requirements.** "A recent version of Docker" fails the reader six months from now; state the number.
- **Explaining the product here.** The reader already decided to try it; do not re-tell Overview.
- **Hiding non-obvious prerequisites.** Accounts, tokens, VPN access, and permissions cause more failed quickstarts than missing binaries — list them explicitly.
- **Installation instructions that drift.** When the install command changes, this page changes; a wrong first command is the worst first impression a product can make.

---

## `quickstart` 🔴

### Purpose & audience

A condensed version of the documentation: a guided, copy-pasteable scenario that gets the reader to a first working result in minutes. This is the main page of Getting started and it will be one of the most visited pages of the whole site — write it for someone who has met the prerequisites and wants proof that the product works, not for someone who wants to understand every feature.

Present a sample scenario rather than abstract instructions: readers relate to "build a to-do API" better than "invoke the create endpoint". Show, don't tell — include the actual commands, the actual code, and the actual output.

### Section-by-section instructions

| Section                        | Level | What to write                                                                                                                                                                                              |
| ------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro, no heading)_          | 🔴    | What the reader will build/achieve, in how long, and a link back to the prerequisites. State the scenario in one sentence.                                                                                 |
| `== Step by step`              | 🔴    | Numbered steps as `=== 1. <Step>` subsections, in strict order. Each step: what to do (copy-pasteable), what happens, and — when useful — why. Keep each step small enough that failure is easy to locate. |
| `== <Result / See it working>` | 🔴    | The moment of truth: what the reader should see now (output, screenshot, running URL). Make success unambiguous.                                                                                           |
| `== Next steps`                | 🟠    | Where to go from here: two or three links to the guides that deepen what the quickstart touched.                                                                                                           |
| `== Known issues`              | 🔵    | Only if the quickstart has known failure points: list them or link to the troubleshooting content in Additional information.                                                                               |

### Docouture blocks

| Use                                                         | Block                                  |
| ----------------------------------------------------------- | -------------------------------------- |
| Equivalent commands (package managers, OSs, config formats) | `[tabs]`                               |
| A caveat that would break the flow if missed                | Standard `NOTE`/`IMPORTANT` admonition |
| A recorded walkthrough of the whole scenario                | `video::demo[youtube,640,360]` — locks the aspect ratio at any viewport width; use alongside the written steps, never instead of them |

Steps are written as plain `=== 1. <Step>` numbered subsections.

### AsciiDoc skeleton

See [`skeletons/quickstart.adoc`](skeletons/quickstart.adoc) for the copyable AsciiDoc starting point.

### Example

```asciidoc
== Step by step

=== 1. Generate the test project

[source,bash]
----
mvn archetype:generate -DarchetypeGroupId=com.example.karate
----

The archetype creates a `karate-tests/` directory with a runnable suite
and a sample feature file.

=== 2. Run the sample test

[source,bash]
----
mvn test
----

== See it working

The build ends with:

[source]
----
Tests run: 1, Failures: 0, Errors: 0
----

The HTML report is available at `target/karate-reports/index.html`.
```

### Quality checklist

- [ ] The reader reaches a working result by only copy-pasting, in the stated time.
- [ ] The scenario is concrete (a named thing gets built), not a list of abstract functions.
- [ ] Every step shows its expected outcome, and success at the end is unambiguous.
- [ ] Steps were actually executed on a clean environment before publishing.
- [ ] Next steps link onward — the quickstart is a gateway, not a dead end.
- [ ] Style guide respected (see [the skill guide](../SKILL.md#style-guide)).

### Common mistakes

- **Explaining too much.** Deep explanations belong in Overview or Guides; here they dilute momentum. Link instead of digressing.
- **Untested steps.** A quickstart that fails at step 3 loses the user for good. Re-run it on every release.
- **Hidden state between steps.** Environment variables or files created "off-screen" break copy-paste users; make every dependency between steps explicit.
- **Covering every option.** One happy path. Alternatives get one `[tabs]` block at most, not parallel storylines.
- **No visible finish line.** If the reader cannot tell whether it worked, it did not work.
