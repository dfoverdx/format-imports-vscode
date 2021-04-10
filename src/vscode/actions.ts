import {
  CodeAction,
  CodeActionKind,
  CodeActionProvider,
  Command,
  ProviderResult,
} from 'vscode';

import type { TriggeredFrom } from './types';

const CODE_ACTIONS = [
  {
    title: 'Sort Imports/Exports',
    // source.organizeImports.formatImports
    kind: CodeActionKind.SourceOrganizeImports.append('formatImports'),
    command: 'tsImportSorter.command.sortImports',
    tooltip: 'Format imports with JS/TS Import/Export Sorter',
  },
];

export default class SortActionProvider implements CodeActionProvider {
  static readonly ACTION_KINDS = CODE_ACTIONS.map(action => action.kind);
  static readonly ACTION_COMMANDS = CODE_ACTIONS.map(({ title, kind, command, tooltip }) => {
    const action = new CodeAction(title, kind);
    const from: TriggeredFrom = 'codeAction';
    action.command = { command, title, tooltip, arguments: [from] };
    return action;
  });

  provideCodeActions(): ProviderResult<(CodeAction | Command)[]> {
    return SortActionProvider.ACTION_COMMANDS;
  }
}
