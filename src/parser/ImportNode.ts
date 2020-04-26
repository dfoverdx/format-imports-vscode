import {
  ImportClause,
  ImportDeclaration,
  ImportEqualsDeclaration,
  NamedImportBindings,
  StringLiteral,
  SyntaxKind,
} from 'typescript';

import {
  composeNodeAsNames,
  composeNodeAsParts,
} from '../compose';
import { ComposeConfig } from '../config';
import {
  assertNonNull,
  normalizePath,
} from '../utils';
import Statement, { StatementArgs } from './Statement';
import {
  Binding,
  NameBinding,
  UnusedId,
} from './types';
import { UnusedCode } from './unused';

export default class ImportNode extends Statement {
  private readonly node_: ImportDeclaration | ImportEqualsDeclaration;

  readonly moduleIdentifier: string;
  private defaultName_?: string;
  private binding_?: Binding;

  static fromDecl(node: ImportDeclaration, args: StatementArgs) {
    const { importClause, moduleSpecifier } = node;
    if (moduleSpecifier.kind !== SyntaxKind.StringLiteral) return undefined;
    const moduleIdentifier = (moduleSpecifier as StringLiteral).text;
    if (!moduleIdentifier.trim()) return undefined;
    const { defaultName, binding } = getDefaultAndBinding(importClause);
    return new ImportNode(node, moduleIdentifier, args, defaultName, binding);
  }

  static fromEqDecl(node: ImportEqualsDeclaration, args: StatementArgs) {
    const { moduleReference } = node;
    if (moduleReference.kind !== SyntaxKind.ExternalModuleReference) return undefined;
    const { expression } = moduleReference;
    if (expression.kind !== SyntaxKind.StringLiteral) return undefined;
    const moduleIdentifier = (expression as StringLiteral).text;
    const defaultName = node.name.text;
    return new ImportNode(node, moduleIdentifier, args, defaultName);
  }

  private constructor(
    node: ImportDeclaration | ImportEqualsDeclaration,
    moduleIdentifier: string,
    args: StatementArgs,
    defaultName?: string,
    binding?: Binding,
  ) {
    super(args);
    this.node_ = node;
    this.moduleIdentifier = normalizePath(moduleIdentifier);
    this.defaultName_ = defaultName;
    this.binding_ = binding;
  }

  get isScript() {
    return !this.defaultName_ && !this.binding_;
  }

  get defaultName() {
    return this.defaultName_;
  }

  get binding() {
    return this.binding_;
  }

  removeUnusedNames(
    //allNames: Set<string>,
    unusedIds: UnusedId[],
  ) {
    if (this.isScript) return this;
    const withinRange = unusedIds.filter(r => this.withinDeclRange(r.pos));
    if (withinRange.some(u => u.code === UnusedCode.ALL)) return undefined;
    const unusedNames = new Set(withinRange.map(r => r.id).filter((id): id is string => !!id));
    if (!isNameUsed(this.defaultName_, unusedNames)) this.defaultName_ = undefined;
    if (this.binding_) {
      if (this.binding_.type === 'named') {
        this.binding_.names = this.binding_.names.filter(n => isNameUsed(n, unusedNames));
        if (!this.binding_.names.length) this.binding_ = undefined;
      } else if (!isNameUsed(this.binding_.alias, unusedNames)) this.binding_ = undefined;
    }
    return this.defaultName_ || this.binding_ ? this : undefined;
  }

  compose(config: ComposeConfig) {
    const { leadingText, trailingText } = this.composeComments(config);
    const cmLen = trailingText.split(/\r?\n/)?.[0]?.length ?? 0;
    const importText = this.composeImport(cmLen, config);
    return leadingText + importText + trailingText;
  }

  /**
   * @returns true if `node` is fully merged to `this`;
   *          false if `node` still has names thus can't be ignored.
   */
  merge(node: ImportNode) {
    const { moduleIdentifier, node_ } = node;
    if (
      this.moduleIdentifier !== moduleIdentifier ||
      this.node_.kind !== node_.kind ||
      !this.canMerge(node)
    )
      return false;
    return this.mergeBinding(node) && this.mergeDefaultName(node) && this.mergeComments(node);
  }

  private withinDeclRange(pos: number) {
    const { start, end } = this.range;
    return start.pos <= pos && pos < end.pos;
  }

  private mergeBinding(node: ImportNode) {
    if (!node.binding_) return true;
    else if (this.binding_ === undefined) {
      this.binding_ = node.binding_;
      node.binding_ = undefined;
      return true;
    } else if (this.binding_.type === 'namespace') {
      if (node.binding_.type === 'namespace' && this.binding_.alias === node.binding_.alias) {
        node.binding_ = undefined;
        return true;
      }
      return false;
    } else if (node.binding_.type === 'namespace') return false;
    this.binding_.names = [...this.binding_.names, ...node.binding_.names];
    node.binding_ = undefined;
    return true;
  }

  private mergeDefaultName(node: ImportNode) {
    if (this.defaultName_ && node.defaultName_ && this.defaultName_ !== node.defaultName_)
      return false;
    if (!this.defaultName_) this.defaultName_ = node.defaultName_;
    node.defaultName_ = undefined;
    return true;
  }

  private composeImport(commentLength: number, config: ComposeConfig) {
    switch (this.node_.kind) {
      case SyntaxKind.ImportDeclaration:
        return this.composeDecl(commentLength, config);
      case SyntaxKind.ImportEqualsDeclaration:
        return this.composeEqDecl(commentLength, config);
    }
  }

  // import A = require('B');
  private composeEqDecl(commentLength: number, config: ComposeConfig) {
    const { quote, semi } = config;
    const path = this.moduleIdentifier;
    const name = this.defaultName_;
    assertNonNull(name);
    const parts = [`${name} =`];
    const from = `require(${quote(path)})${semi}`;
    return composeNodeAsParts(parts, from, commentLength, config);
  }

  /**
   * Script import:
   * ```
   *    import 'A';
   * ```
   *
   * Default import:
   * ```
   *    import A from 'B';
   * ```
   *
   * Binding names import:
   * ```
   *    import { A, B as C } from 'D';
   *    import {
   *      A, B,
   *      C as D,
   *    } from 'E';
   * ```
   *
   * Namespace import:
   * ```
   *    import * as A from 'B';
   * ```
   *
   * Mixed examples:
   * ```
   *    import A, { B, C } from 'D';
   *    import A, {
   *      B,
   *      C as D,
   *      E,
   *    } from 'F';
   *    import A, * as B from 'C';
   *    import A, { default as B, C, D } from 'E';
   * ```
   */
  private composeDecl(commentLength: number, config: ComposeConfig) {
    const { quote, semi } = config;
    const path = this.moduleIdentifier;
    const ending = quote(path) + semi;
    if (this.isScript) return `import ${ending}`;
    const from = `from ${ending}`;
    if (this.binding_?.type === 'named')
      return composeNodeAsNames(
        this.defaultName_,
        this.binding_.names,
        from,
        commentLength,
        config,
      );
    const parts = [];
    if (this.defaultName_) parts.push(this.defaultName_);
    if (this.binding_?.type === 'namespace') parts.push(`* as ${this.binding_.alias}`);
    return composeNodeAsParts(parts, from, commentLength, config);
  }
}

function isNameUsed(
  name: NameBinding | string | undefined,
  // allNames: Set<string>,
  unusedNames: Set<string>,
) {
  if (!name) return false;
  const n = typeof name === 'string' ? name : name.aliasName ?? name.propertyName;
  // `unusedNames` (from TS compiler) gives more accurate results
  // than `allNames` (from manual parsing).
  // return !!n && allNames.has(n) && !unusedNames.has(n);
  return !!n && !unusedNames.has(n);
}

function getDefaultAndBinding(importClause: ImportClause | undefined) {
  if (!importClause) return {};
  const { name, namedBindings } = importClause;
  let defaultName = name && name.text;
  const binding = getBinding(namedBindings);
  if (!defaultName && binding?.type === 'named') {
    const { names } = binding;
    const i = names.findIndex(n => n.propertyName === 'default' && n.aliasName);
    if (i >= 0) {
      defaultName = names[i].aliasName;
      names.splice(i, 1);
    }
  }
  return { defaultName, binding };
}

function getBinding(nb: NamedImportBindings | undefined): Binding | undefined {
  if (!nb) return;
  if (nb.kind === SyntaxKind.NamespaceImport) return { type: 'namespace', alias: nb.name.text };
  const names = nb.elements.map(e => {
    const { name, propertyName } = e;
    return propertyName
      ? { aliasName: name.text, propertyName: propertyName.text }
      : { propertyName: name.text };
  });
  return { type: 'named', names };
}
