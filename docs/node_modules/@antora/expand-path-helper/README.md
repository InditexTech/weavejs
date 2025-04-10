# @antora/expand-path-helper

A Node.js module that provides a helper function to expand a path to a normalized absolute path.
This function also expands the following shorthand expressions when used as the first path segment: dot (`.`), tilde (`~`), or tilde plus (`~+`).
The expanded path is system dependent.
Developed for use in Antora.

## Install

```console
$ npm i @antora/expand-path-helper
```

## API

```js
function expandPath (path[, context])
```

Expands the specified path to a normalized absolute path.
The main purpose of this function is path expansion and normalization.

* `path` &lt;string> - The path to expand.
This parameter is required.
If the path is already absolute, the path is normalized and returned.
* `context` &lt;Object> - Named parameters that control how the path is resolved.
All named parameters are optional.
This parameter can also be specified as a String, in which case it’s used as the base context argument.
**Default:** `{}`.
  * `base` &lt;string> - The base directory from which to resolve a relative path instead of the working directory.
  **Default:** `~+`
  * `cwd` &lt;string> - The absolute directory to use as the working directory instead of the current working directory.
  If not specified, the current working directory is used.
  **Default:** `undefined`
  * `dot` &lt;string> - The value to use to replace a leading dot (`.`) segment.
  If the value is `.`, the value of the `base` context argument is used instead.
  **Default:** `.`

If the first segment of the path argument, the base context argument, or the dot context argument is `~` or `~+`, that value is expanded to the user’s home directory or current working directory, respectively.
If the first segment of the path argument is `.`, that value is replaced with the dot context argument after the dot context argument is expanded.

## Usage

The output of `expandPath` depends on the system on which it is run (specifically on the `path.sep` value).

### *nix

```js
const expandPath = require('@antora/expand-path-helper')

expandPath('/absolute/path')
//=> /absolute/path

expandPath('/absolute/./path/..')
//=> /absolute

expandPath('foo/bar')
//=> $PWD/foo/bar

expandPath('./foo/bar')
//=> $PWD/foo/bar

expandPath('~/foo/bar')
//=> $HOME/foo/bar

expandPath('~+/foo/bar')
//=> $PWD/foo/bar

expandPath('~+/foo/bar', { cwd: '/working/dir' })
//=> /working/dir/foo/bar

expandPath('foo/bar', '/base/dir')
//=> /base/dir/foo/bar

expandPath('foo/bar', { base: '/base/dir' })
//=> /base/dir/foo/bar

expandPath('./foo/bar', { base: '/base/dir' })
//=> /base/dir/foo/bar

expandPath('./foo/bar', { dot: '/dot/dir' })
//=> /dot/dir/foo/bar
```

### Windows

```js
const expandPath = require('@antora/expand-path-helper')

expandPath('C:\\absolute\\path')
//=> C:\absolute\path

expandPath('C:/absolute/path')
//=> C:\absolute\path

expandPath('C:\\absolute\\.\\path\\..')
//=> C:\absolute

expandPath('foo\\bar')
//=> C:\current\directory\foo\bar

expandPath('.\\foo\\bar')
//=> C:\current\directory\foo\bar

expandPath('~\\foo\\bar')
//=> C:\Users\user\foo\bar

expandPath('~+\\foo\\bar')
//=> C:\current\directory\foo\bar

expandPath('~+\\foo\\bar', { cwd: 'C:\\working\\dir' })
//=> C:\working\dir\foo\bar

expandPath('foo\\bar', 'C:\\base\\dir')
//=> C:\base\dir\foo\bar

expandPath('foo\\bar', { base: 'C:\\base\\dir' })
//=> C:\base\dir\foo\bar

expandPath('.\\foo\\bar', { base: 'C:\\base\\dir' })
//=> C:\base\dir\foo\bar

expandPath('.\\foo\\bar', { dot: 'C:\\dot\\dir' })
//=> C:\dot\dir\foo\bar
```

On Windows, the input path may use forward slashes, but the expanded path will always have backslashes.

## Copyright and License

Copyright (C) 2018-present by OpenDevise Inc. and the individual contributors to Antora.

Use of this software is granted under the terms of the [Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/) (MPL-2.0).
