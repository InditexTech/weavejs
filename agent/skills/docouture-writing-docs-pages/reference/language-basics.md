# AsciiDoc language basics

Ordered by how often it comes up, not by upstream nav order. Antora-specific behaviour is
called out inline; everything else is plain AsciiDoc as Asciidoctor implements it.

Upstream base URL for every link below: `https://docs.asciidoctor.org/asciidoc/latest/`

## Document structure

A page is a header (optional), then blocks. The header is everything above the first
blank line.

```adoc
= Page Title
:description: Shown in the meta description and in search results.
:page-tags: one, two

Preamble paragraph — content before the first section title.

== First Section

Body.

=== Nested Section
```

- **One level-0 title per page.** `=` is the document title; `==` is the first real
  section. A second `=` is an error in `doctype: article` (the default).
- Section levels must not skip: `==` then `====` is a warning, and a warning fails the
  build here.
- Attribute entries (`:name: value`) in the header apply to the whole page. Placed in the
  body they apply from that point on.
- `page-*` attributes are Antora's convention: they are lifted onto the UI model and are
  available to templates rather than to the content.

`document-structure/`, `document/header/`, `sections/titles-and-levels/`

## Blocks

A block is delimited by four or more repeated characters, or implied by a blank line
(paragraph).

| delimiter | block                                   |
| --------- | --------------------------------------- |
| `----`    | listing / source                        |
| `....`    | literal                                 |
| `====`    | example (and, with a style, admonition) |
| `****`    | sidebar                                 |
| `____`    | quote                                   |
| `--`      | open (exactly two hyphens)              |
| `\|===`   | table                                   |
| `++++`    | passthrough                             |
| `////`    | comment                                 |

Metadata sits directly above the delimiter, no blank line between:

```adoc
.A block title
[#custom-id.role-one.role-two%option,attr=value]
----
content
----
```

- `.Title` — block title.
- `#id` — the ID, in the attribute list shorthand.
- `.role` — a CSS class. Repeatable.
- `%option` — an option, e.g. `%collapsible`, `%header`, `%autowidth`.
- The first positional attribute is the **block style**, which can make one delimiter
  behave as another (`[quote]` on `====`, `[source]` on `----`). This is _block
  masquerading_.

`blocks/`, `blocks/delimited/`, `attributes/element-attributes/`, `blocks/masquerading/`

## Text formatting

| markup                          | result                  | note                               |
| ------------------------------- | ----------------------- | ---------------------------------- |
| `*bold*` / `**bold**`           | bold                    | double form required mid-word      |
| `_italic_` / `__italic__`       | italic                  | same                               |
| `` `mono` ``                    | monospace               | subs still apply inside            |
| `` `+literal+` ``               | monospace, no subs      | use for anything with `{}` or `<>` |
| `#highlight#` / `##highlight##` | mark                    |                                    |
| `[.role]#text#`                 | span with a class       | the general escape hatch           |
| `~sub~` / `^sup^`               | subscript / superscript |                                    |

The single-mark ("constrained") form only applies when the marks sit at a word boundary.
`hard*coded*text` is literal asterisks; `hard**coded**text` is bold. This is the single
most common formatting surprise.

`text/`, `text/troubleshoot-unconstrained-formatting/`

## Lists

```adoc
* first
* second
** nested
+
Attached paragraph — the `+` continuation binds it to the item above.

. ordered
. ordered

term:: definition
another term:: definition

* [ ] unchecked task
* [x] checked task
```

- Nesting is marker repetition (`*`, `**`, `***`), not indentation.
- A blank line alone does not end a list; adjacent non-list content does. Two adjacent
  lists that should stay separate need `//-` (an empty comment line) between them.
- Anything other than a plain paragraph attached to an item needs `+` on its own line
  before it — including nested blocks, source blocks and admonitions.

`lists/unordered/`, `lists/ordered/`, `lists/description/`, `lists/continuation/`,
`lists/checklist/`, `lists/separating/`

## Links and cross references

```adoc
https://example.com[Link text]
https://example.com[Link text^]              open in a new tab
link:https://example.com[Text]               explicit macro; needed when the URL is not bare
mailto:a@example.com[Mail us]

xref:page.adoc[Text]                          Antora resource ID — see docouture-writing-docs-pages SKILL.md
xref:page.adoc#section-id[Text]
xref:#local-section[Text]                     same page
<<local-section,Text>>                        same page, alternate form
```

- Empty xref text (`xref:page.adoc[]`) renders the target page's title. Prefer it — it
  stays correct when the title changes.
- A URL containing `[`, `]` or a trailing `.` needs the `link:` macro or attribute
  wrapping.
- Antora validates every xref. An unresolved one fails the build.

`macros/links/`, `macros/xref/`, `macros/inter-document-xref/`

## Images and icons

```adoc
image::name.png[Alt text,640,480]             block image
image:name.png[Alt text,24,24]                inline image (single colon)
image::name.png[Alt,link=https://example.com]
icon:check[]                                  font icon — icons=font is set
kbd:[Ctrl+C]                                  requires experimental (it is set)
btn:[Save]
menu:File[Save As]
```

Antora resolves `image::name.png[]` against the module's `images/` directory. Do not
write `../images/name.png` and do not set `:imagesdir:` — Antora manages it.

`macros/images/`, `macros/icons/`, `macros/keyboard-macro/`, `macros/ui-macros/`

## Source blocks

```adoc
[source,typescript]
----
const answer = 42
----

[source,json,highlight=2..3]
----
{ "a": 1 }
----
```

- `source-highlighter=highlight.js` is Antora's default and is in force here. The
  language token must be one highlight.js knows.
- `[,typescript]` (empty first positional) is shorthand for `[source,typescript]`.
- Callouts mark lines with `<1>` and are explained in a following colon list:

```adoc
[source,js]
----
const x = 1 // <1>
----
<1> Explanation.
```

- Attribute references are **not** substituted inside a source block unless the block
  carries `subs=attributes+`.

`verbatim/source-blocks/`, `verbatim/callouts/`, `verbatim/highlight-lines/`

## Admonitions

```adoc
NOTE: One-line form.

[WARNING]
====
Multi-line form. Any blocks can go inside.
====
```

Five types only: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`. A custom type needs a
role plus CSS.

`blocks/admonitions/`

## Tables

```adoc
.Optional title
[cols="1,2,1",options="header",%autowidth]
|===
|Column A |Column B |Column C

|cell
|cell
|cell
|===
```

- `cols` takes proportional widths (`1,2,1`), percentages (`25%,50%,25%`), or a repeat
  (`3*` = three equal columns).
- A column or cell specifier prefixes the width: alignment `<` `^` `>` (horizontal),
  `.<` `.^` `.>` (vertical), and a style suffix:

| suffix | cell content treated as                          |
| ------ | ------------------------------------------------ |
| `a`    | AsciiDoc — the only way to nest blocks in a cell |
| `l`    | literal                                          |
| `m`    | monospace                                        |
| `h`    | header                                           |
| `s`    | strong                                           |
| `d`    | default (prose)                                  |

- Spans: `2+|` spans two columns, `.3+|` three rows, `2.3+|` both. `3*|` duplicates a
  cell across three columns.
- A cell containing a `|` needs it escaped as `\|`.

`tables/build-a-basic-table/`, `tables/format-column-content/`, `tables/span-cells/`,
`tables/table-ref/`

## Includes

```adoc
include::partial$intro.adoc[]
include::example$config.json[]
include::partial$file.adoc[tag=setup]
include::example$app.ts[lines=10..20]
include::partial$chapter.adoc[leveloffset=+1]
include::example$snippet.js[indent=0]
```

Tagged regions are marked in the _included_ file with comments in that file's own comment
syntax:

```js
// tag::setup[]
const app = createApp()
// end::setup[]
```

- `leveloffset=+1` demotes every section title in the included file — required when
  including a file that has its own `=` title.
- `indent=0` normalises leading whitespace, so a tagged region extracted from indented
  code renders flush left.
- Antora restricts targets to the resource families. `include::../other.adoc[]` and
  `include::https://…[]` do not work.

`directives/include/`, `directives/include-tagged-regions/`,
`directives/include-lines/`, `directives/include-with-leveloffset/`

## Conditionals

```adoc
ifdef::experimental[]
Shown when the attribute is set.
endif::[]

ifndef::backend-html5[]
Shown when it is not set.
endif::[]

ifeval::[{sectnumlevels} > 2]
Shown when the expression is true.
endif::[]
```

`ifdef::attr-one,attr-two[]` is OR; `ifdef::attr-one+attr-two[]` is AND. The single-line
form `ifdef::attr[content]` exists for one line of content.

`directives/conditionals/`, `directives/ifdef-ifndef/`, `directives/ifeval/`

## Substitutions

Applied to normal blocks in this fixed order:

1. `specialchars` — `<`, `>`, `&` escaped
2. `quotes` — the formatting marks above
3. `attributes` — `{name}` references resolved
4. `replacements` — `(C)`, `--`, `...` and friends
5. `macros` — link, image, icon, xref
6. `post_replacements` — the `+` line break

Verbatim blocks (`----`, `....`) get `specialchars` and `callouts` only. Passthrough gets
nothing.

Override per block or per inline span:

```adoc
[subs="attributes+"]                incremental — add to the defaults
[subs="+macros,-callouts"]          add one, remove another
[subs="verbatim,quotes"]            absolute — replaces the defaults entirely
```

Escape a single substitution with a leading backslash (`\{attr}`, `\*not bold*`), or use
an inline passthrough:

```adoc
+literal text+                       no subs
pass:[<b>raw</b>]                    no subs, raw output
pass:attributes[{version}]           only the listed subs
```

`subs/`, `subs/apply-subs-to-blocks/`, `subs/prevent/`, `pass/`

## Attributes

```adoc
:name: value
:name!:                              unset
:!name:                              unset, alternate form
:name: {other} suffix                references resolve at definition time
```

Precedence, highest first: CLI/API → playbook `asciidoc.attributes` → `antora.yml` →
page header. A playbook attribute ending in `@` becomes _soft-set_ and can be overridden
by a page; without `@` it cannot.

`attributes/document-attributes/`, `attributes/assignment-precedence/`,
`attributes/document-attributes-ref/`

## Other blocks worth knowing

```adoc
[%collapsible]
====
Rendered as a <details> element.
====

[quote,Author,Source]
____
Quotation.
____

[sidebar]                            or ****
****
Aside content.
****

--
An open block — groups content with no semantics of its own. The usual way to
attach several blocks to one list item.
--

toc::[]                              macro TOC; needs :toc: in the header
```

`blocks/collapsible/`, `blocks/blockquotes/`, `blocks/sidebars/`, `blocks/open-blocks/`,
`toc/`

## URL index — the long tail

Not summarised above; fetch when needed.

| topic                                                         | page                                    |
| ------------------------------------------------------------- | --------------------------------------- |
| Syntax quick reference                                        | `syntax-quick-reference/`               |
| Document attributes reference (every built-in)                | `attributes/document-attributes-ref/`   |
| Character replacements (`(C)`, `->`, …)                       | `attributes/character-replacement-ref/` |
| Text span and built-in roles                                  | `text/text-span-built-in-roles/`        |
| Quotation marks and apostrophes                               | `text/quotation-marks-and-apostrophes/` |
| Footnotes                                                     | `macros/footnote/`                      |
| Audio and video                                               | `macros/audio-and-video/`               |
| SVG images                                                    | `macros/image-svg/`                     |
| Image sizing / positioning reference                          | `macros/image-ref/`                     |
| STEM (equations, formulas)                                    | `stem/`                                 |
| Docinfo files                                                 | `docinfo/`                              |
| Book parts, chapters, appendix, glossary, bibliography, index | `sections/styles/`                      |
| Special section titles and numbering                          | `sections/special-section-titles/`      |
| Verses                                                        | `blocks/verses/`                        |
| CSV / TSV / DSV table data                                    | `tables/data-format/`                   |
| Nested tables                                                 | `tables/nested/`                        |
| Hard line breaks                                              | `blocks/hard-line-breaks/`              |
| Discrete headings                                             | `blocks/discrete-headings/`             |
| Preamble and lead style                                       | `blocks/preamble-and-lead/`             |
| AsciiDoc vs Markdown                                          | `asciidoc-vs-markdown/`                 |
| Glossary of terms                                             | `glossary/`                             |
| FAQ                                                           | `faq/`                                  |

Antora's own layer — resource IDs, families, nav, page attributes, the content catalog —
is documented separately at `https://docs.antora.org/antora/latest/`.
