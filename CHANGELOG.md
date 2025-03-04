<!-- markdownlint-configure-file
{
  "no-duplicate-heading": {
    "siblings_only": true
  }
}
-->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- [Stacked changes]
-->

## [7.4.1] - 2021-06-27

### Added

- Support ESLint [eol-last](https://eslint.org/docs/rules/eol-last) rule.

### Changed

- Fix Prettier option `"trailingComma": "es5"`.

## [7.4.0] - 2021-04-29

### Added

- Add `ignoreESLintRules` config to ignore specific ESLint rules.

### Changed

- Update default `GroupRules` to group [`node:` imports](https://nodejs.org/api/esm.html#esm_node_imports) separately.

## [7.3.2] - 2021-04-10

## Added

- Register code action `"source.organizeImports.sortImports"`.

## [7.3.1] - 2021-04-09

### Added

- Support ESLint [indent](https://eslint.org/docs/rules/indent) and
  [@typescript-eslint/indent](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/indent.md)
  rules.

### Changed

- `tabWidth` from ESLint [max-len](https://eslint.org/docs/rules/max-len) doesn't impact `tabSize` config.

## [7.3.0] - 2021-04-06

### Added

- Add `wrappingStyle.ignoreComments` to skip trailing comments when counting line length.
- Support ESLint [max-len](https://eslint.org/docs/rules/max-len) rule.

## [7.2.0] - 2021-02-22

### Added

- Add `importType` to `GroupRule` to distinguish `import` and `import type`.

## [7.1.0] - 2021-02-19

### Changed

- Config `sortRules` can also be `"none"` which means both `paths` and `names` are `"none"`.

## [7.0.0] - 2021-02-14

### Added

- Config `wrappingStyle` which can be either a preset style `"prettier"` or an object of:
  - `maxBindingNamesPerLine`
  - `maxDefaultAndBindingNamesPerLine`
  - `maxExportNamesPerLine`
  - `maxNamesPerWrappedLine`

### Removed

- Top level config:
  - `maxBindingNamesPerLine`
  - `maxDefaultAndBindingNamesPerLine`
  - `maxExportNamesPerLine`
  - `maxNamesPerWrappedLine`

## [6.0.0] - 2021-02-10

### Changed

- Separate core formatting logic as CLI and library in [Format-Imports](https://github.com/daidodo/format-imports).

## [5.0.0] - 2020-12-21

### Added

- Add config `removeLastSlashInPath` and `removeLastIndexInPath`.
- Respect [import/newline-after-import](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/newline-after-import.md) rules.
- Respect [import/no-useless-path-segments](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/no-useless-path-segments.md) rules.

### Changed

- Change config `EmptyLinesBetweenGroups` to `emptyLinesBetweenGroups`.

## [4.2.0] - 2020-12-19

### Added

- Add `emptyLinesAfterAllImports`: Number of empty lines after all import statements.

## [4.1.0] - 2020-12-11

### Added

- Work with [ESLint sort-imports](https://eslint.org/docs/rules/sort-imports) rules.
- Add `development.enableDebug` in VS Code user settings for detailed logs.

## [4.0.0] - 2020-11-30

### Added

- Extend grouping rules to support [more types of imports](https://github.com/daidodo/format-imports/wiki/Grouping-Rules#types-of-imports).

### Changed

- Change option `flag` to `flags` in [Grouping Rules](https://github.com/daidodo/format-imports/wiki/Grouping-Rules).

## [3.1.0] - 2020-11-27

### Added

- Add global `"sortImportsBy"` config.
- Add `"sortImportsBy"` option to group rules.
- Support sorting import statements by paths or imported names.

## [3.0.0] - 2020-08-21

### Added

- Add `"named"` option to group's `flag` config.
- Infer a group's `flag` from its parent and sub-groups when not set.

## [2.2.0] - 2020-07-10

### Added

- Add `EmptyLinesBetweenGroups` config.

## [2.1.4] - 2020-05-23

### Added

- Support [Type-Only imports/exports](https://devblogs.microsoft.com/typescript/announcing-typescript-3-8/#type-only-imports-exports).

## [2.1.0] - 2020-05-17

### Added

- Support keeping unused imports.
- Add `keepUnused` config.

## [2.0.0] - 2020-05-03

### Added

- Support formatting exports.
- Add `"formatExports"`.
- Add `"maxExportNamesPerLine"`.
- Support `'none'` as [Sorting Rules](https://github.com/daidodo/format-imports/wiki/Sorting-Rules).
- Support `h` ([Stencil](https://stenciljs.com/)).

### Changed

- Rename `"maximumBindingNamesPerLine"` to `"maxBindingNamesPerLine"`.
- Rename `"maximumDefaultAndBindingNamesPerLine"` to `"maxDefaultAndBindingNamesPerLine"`.
- Rename `"maximumNamesPerWrappedLine"` to `"maxNamesPerWrappedLine"`.
- Rename `"maximumLineLength"` to `"maxLineLength"`.

## [1.2.6] - 2020-04-17

### Added

- Support [Sorting Rules](https://github.com/daidodo/format-imports/wiki/Sorting-Rules).
- Add `"tsImportSorter.configuration.sortRules.paths"`.
- Add `"tsImportSorter.configuration.sortRules.names"`.
- Support shebang (`#!`).

## [1.2.1] - 2020-04-06

### Changed

- Change `"tsImportSorter.configuration.groupRules"` content.
- Improve [Grouping Rules](https://github.com/daidodo/format-imports/wiki/Grouping-Rules).
- Support sub-groups.

## [1.1.0] - 2020-03-21

### Added

- Command / shortcut / context menu support.
- Add `"tsImportSorter.configuration.autoFormat"`.
- Support glob patterns to exclude files.

### Removed

- Auto format when `"editor.formatOnSave"` is `true`.

## [1.0.0] - 2020-01-29

### Added

- Support regex patterns to exclude files.
- Support comments to exclude files or imports.
- Add Javascript support.
- Preserve global comments and `'use strict'`.
- Respect VS Code `editor` config.
- Respect Prettier and EditorConfig config.
- Support multi-root projects.

## [0.0.2] - 2020-01-18

### Added

- Auto sort on save. No need for commands or clicks.
- Auto merge imports, deduplicate names.
- Auto delete unused names and handle `React` with JSX properly.
- Group by customizable rules.
- Preserve leading and trailing comments with imports.
- Support config both in `package.json` and `import-sorter.json`.
