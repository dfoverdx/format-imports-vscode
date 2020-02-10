# JS/TS Import Sorter

Automatically sort imports for **JavaScript** and **TypeScript** source code. ([Install](https://marketplace.visualstudio.com/items?itemName=dozerg.tsimportsorter))

## Features

- Auto format on save when `"editor.formatOnSave"` is `true`.
- Auto merge imports, remove unused or duplicated names.
- Group imports by customizable rules.
- Support multi-root projects.
- Ignore specific files or imports.
- Preserve `'use strict'`, `///` directives and global comments, e.g. license.
- Recognize JSX elements and keep `React` import.
- Keep comments with imports when sorting.
- Respect config from [Prettier](https://prettier.io), [EditorConfig](https://editorconfig.org) and VS Code editor settings.

### Example

Before:

```typescript
import { window } from 'vscode';
import sortImports from '../sort';
import { TextDocument } from 'vscode';
import { getEdits
 } from '@edit';
import { getDeleteEdits } from '@edit';
import { getUnusedIds
, parseSource } from '../parser';
import { TextDocumentWillSaveEvent, TextEditor, Workspace, ImportEqualsDeclaration } from 'vscode';
import loadConfig from '@config';
import ts from 'typescript';
import composeInsertSource from '../compose';
```

After:

```typescript
import ts from 'typescript';
import {
  TextDocument,
  TextDocumentWillSaveEvent,
  TextEditor,
  window,
  Workspace,
} from 'vscode';

import loadConfig from '@config';
import {
  getDeleteEdits,
  getEdits,
} from '@edit';

import composeInsertSource from '../compose';
import {
  getUnusedIds,
  parseSource,
} from '../parser';
import sortImports from '../sort';
```

_Note: Code style is configurable._

## Extension Settings

All VS Code settings under `"tsImportSorter"` section and their default values:

```json
// Configuration file name.
"tsImportSorter.configuration.configurationFileName": "import-sorter.json",

// Disable sorting for files matching regular expressions.
"tsImportSorter.configuration.exclude": [],

// Grouping rules for path patterns. Everything else has a default level of 20.
"tsImportSorter.configuration.groupRules": [
  {
    "regex": "^react(-dom)?$",
    "level": 10
  },
  {
    "regex": "^@angular/",
    "level": 11
  },
  {
    "regex": "^vue$",
    "level": 12
  },
  {
    "regex": "^[@]",
    "level": 30
  },
  {
    "regex": "^[.]",
    "level": 40
  }
],

// Max binding names per line before wrapping. 0 for no limit.
"tsImportSorter.configuration.maximumBindingNamesPerLine": 1,

// Max default and binding names per line before wrapping. 0 for no limit.
"tsImportSorter.configuration.maximumDefaultAndBindingNamesPerLine": 2,

// Max names on wrapped lines. 0 for no limit.
"tsImportSorter.configuration.maximumNamesPerWrappedLine": 1,
```

## Configuration

JS/TS Import Sorter reads configurations from the following sources (in precedence from high to low):

- `"importSorter"` section in `package.json`
- `import-sorter.json` (configurable)
- [Prettier configuration](https://github.com/prettier/prettier-vscode#configuration) if installed
- `.editorconfig`
- VS Code `"editor"` and `"files"` settings
- VS Code `"tsImportSorter"` settings

Here are all config in `package.json` under `"importSorter"` section and their default values:

```json
{
  "importSorter": {
    // Disable sorting for files matching regular expressions.
    "exclude": [],

    // Grouping rules for path patterns. Everything else has a default level of 20.
    "groupRules": [
      {
        "regex": "^react(-dom)?$",
        "level": 10
      },
      {
        "regex": "^@angular/",
        "level": 11
      },
      {
        "regex": "^vue$",
        "level": 12
      },
      {
        "regex": "^[@]",
        "level": 30
      },
      {
        "regex": "^[.]",
        "level": 40
      }
    ],

    // Max line length before wrapping. 0 for no limit.
    "maximumLineLength": 80,

    // Max binding names per line before wrapping. 0 for no limit.
    "maximumBindingNamesPerLine": 1,

    // Max default and binding names per line before wrapping. 0 for no limit.
    "maximumDefaultAndBindingNamesPerLine": 2,

    // Max names on wrapped lines. 0 for no limit.
    "maximumNamesPerWrappedLine": 1,

    // Number of spaces to replace a TAB.
    "tabSize": 2,

    // Indent lines with tabs or spaces. Valid values are 'tab' or 'space'.
    "tabType": "space",

    // Use single or double quotes. Valid values are 'single' or 'double'.
    "quoteMark": "single",

    // Whether to add trailing commas when multi-line. Valid values are 'none' or 'multiLine'.
    "trailingComma": "multiLine",

    // Whether to add semicolons at the ends of statements.
    "hasSemicolon": true,

    // Whether to end files with a new line.
    "insertFinalNewline": true,

    // Whether to add spaces between brackets. true for '{ id }' and false for '{id}'.
    "bracketSpacing": true,
  }
}
```

`import-sorter.json` has all config above, too. Example:

```json
{
  "maximumLineLength": 100,
  "quoteMark": "double",
  "tabSize": 4,
  "insertFinalNewline": false
}
```

### Multi-root projects support

JS/TS Import Sorter respects [VS Code user and workspace settings](https://code.visualstudio.com/docs/getstarted/settings) and supports [multi-root workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces).

`package.json` is searched in the following order:

- The same folder of the edited file.
- If not found, then go to the parent folder.
- Continue if still not found, till the root folder (`/`)

`import-sorter.json` is searched in a similar way if it's a relative path.

If `"tsImportSorter.configuration.configurationFileName"` is an absolute path, e.g. `/path/to/import-sorter.json` or `C:\path\to\import-sorter.json`, no search is needed.

### Ignore files or import declarations

There are a few ways to exclude files from inspection:

- Add path patterns to user or workspace settings in VSCode.
  ```json
  "tsImportSorter.configuration.exclude": ["pathPattern"],
  ```
- Add path patterns to `package.json` or `import-sorter.json`.
- Add the following comment at the beginning of the source file and keep at least one empty line from the next statement:

_Note: All path patterns are **merged** together instead of overwritten._

```ts
// ts-import-sorter: disable

[Other code]
```

or

```ts
/* ts-import-sorter: disable */

[Other code]
```

To exclude a specific `import` declaration from sorting, please add the following as its leading or trailing comments:

```ts
// ts-import-sorter: disable
import Excluded from 'import/sorter';
```

or

```ts
import Excluded from 'import/sorter'; /* ts-import-sorter: disable */
```

### Maximum names per line

When deciding whether to wrap an import statement or not, JS/TS Import Sorter looks up both `maximumLineLength` and the following values:


#### `maximumBindingNamesPerLine`

For a statement importing only *binding names*, this value determines how many names are allowed before wrapping.

For example, if you set:
```json
"maximumBindingNamesPerLine": 2,
```
then
```typescript
import { A } from 'foo';    // No wrap as there is 1 name
import { B, C } from 'bar'; // No wrap as there are 2 names

import {
  D,
  E,
  F,
} from 'tea';   // Wrapped as there are more than 2 names
```

#### `maximumDefaultAndBindingNamesPerLine`

For a statement importing *default* and *binding names*, this value determines how many names are allowed before wrapping.

For example, if you set:
```json
"maximumDefaultAndBindingNamesPerLine": 2,
```
then
```typescript
import A from 'foo';        // No wrap as there is 1 name
import B, { C } from 'foo'; // No wrap as there are 2 names
import D, {
  E,
  F,
} from 'bar'; // Wrapped as there are more than 2 names
```

#### `maximumNamesPerWrappedLine`

If an import statement is wrapped, this values decides how many names there are per line.

For example, if you set:
```json
"maximumNamesPerWrappedLine": 2,
```
then
```typescript
import {
  A, B,
  C, D,
  E,
} from 'bar'; // There are 2 names at most per wrapped line
```

## Thanks

The initiative came from [import-sorter](https://github.com/SoominHan/import-sorter).

## License

MIT
