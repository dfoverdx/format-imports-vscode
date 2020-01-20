import {
  ImportDeclaration,
  ImportEqualsDeclaration,
  SourceFile,
  StringLiteral,
  SyntaxKind,
  NamedImportBindings,
} from 'typescript';

import {
  composeComments,
  ComposeConfig,
  composeNodeAsParts,
  composeNodeAsNames,
} from '../compose';
import {
  assertNonNull,
  normalizePath,
} from '../utils';
import { parseLineRanges } from './lines';
import {
  LineRange,
  NameBinding,
  NodeComment,
  Pos,
  RangeAndEmptyLines,
  Binding,
} from './types';

export default class ImportNode {
  private readonly node_: ImportDeclaration | ImportEqualsDeclaration;

  private moduleIdentifier_: string;
  private isScript_: boolean;
  private defaultName_?: string;
  private binding_?: Binding;
  private disabled_: boolean; // Whether import sorting is disable for this node.

  private fullStart_: Pos;
  private leadingNewLines_: number;
  private leadingComments_?: NodeComment[];
  // private declLineRange_: LineRange;
  // private trailingComments_?: NodeComment[];
  private trailingCommentsText_: string;
  private declAndCommentsLineRange_: LineRange;
  private trailingNewLines_: number;
  private fullEnd_: Pos;
  private eof_: boolean;

  static fromDecl(node: ImportDeclaration, sourceFile: SourceFile, sourceText: string) {
    const { importClause, moduleSpecifier } = node;

    // moduleIdentifier
    if (moduleSpecifier.kind !== SyntaxKind.StringLiteral) return undefined;
    const moduleIdentifier = (moduleSpecifier as StringLiteral).text;

    // import 'some/scripts'
    if (!importClause) return new ImportNode(node, sourceFile, sourceText, moduleIdentifier, true);

    // defaultName & names
    const { name, namedBindings } = importClause;
    const defaultName = name && name.text;
    const binding = getBinding(namedBindings);

    return new ImportNode(
      node,
      sourceFile,
      sourceText,
      moduleIdentifier,
      false,
      defaultName,
      binding,
    );
  }

  static fromEqDecl(node: ImportEqualsDeclaration, sourceFile: SourceFile, sourceText: string) {
    const { moduleReference } = node;
    if (moduleReference.kind !== SyntaxKind.ExternalModuleReference) return undefined;
    const { expression } = moduleReference;
    if (expression.kind !== SyntaxKind.StringLiteral) return undefined;
    const moduleIdentifier = (expression as StringLiteral).text;
    const defaultName = node.name.text;
    return new ImportNode(node, sourceFile, sourceText, moduleIdentifier, false, defaultName);
  }

  get rangeAndEmptyLines(): RangeAndEmptyLines {
    return {
      ...this.declAndCommentsLineRange_,
      fullStart: this.fullStart_,
      leadingNewLines: this.leadingNewLines_,
      trailingNewLines: this.trailingNewLines_,
      fullEnd: this.fullEnd_,
      eof: this.eof_,
    };
  }

  get isScriptImport() {
    return this.isScript_;
  }

  get disabled() {
    return this.disabled_;
  }

  removeUnusedNames(allNames: Set<string>) {
    if (this.isScript_) return this;
    if (!isNameUsed(this.defaultName_, allNames)) this.defaultName_ = undefined;
    if (this.binding_) {
      if (this.binding_.type === 'named') {
        this.binding_.names.filter(n => isNameUsed(n, allNames));
        if (!this.binding_.names.length) this.binding_ = undefined;
      } else if (!isNameUsed(this.binding_.alias, allNames)) this.binding_ = undefined;
    }
    return this.defaultName_ || this.binding_ ? this : undefined;
  }

  match(regex: string) {
    return new RegExp(regex).test(this.moduleIdentifier_);
  }

  compare(node: ImportNode) {
    return (
      idComparator(this.moduleIdentifier_, node.moduleIdentifier_) ||
      defaultNameComparator(this.defaultName_, node.defaultName_) ||
      bindingComparator(this.binding_, node.binding_)
    );
  }

  compose(config: ComposeConfig) {
    const leadingText = composeComments(this.leadingComments_) ?? '';
    const importText = this.composeImport(config);
    const trailingText = this.trailingCommentsText_;
    return leadingText + importText + trailingText;
  }

  /**
   * @returns true if `node` is fully merged to `this`; Or false if `node` still has names thus can't be ignored.
   */
  merge(node: ImportNode) {
    const { moduleIdentifier_, node_ } = node;
    if (
      this.moduleIdentifier_ !== moduleIdentifier_ ||
      this.node_.kind !== node_.kind ||
      (this.hasLeadingComments && node.hasLeadingComments) ||
      (this.hasTrailingComments && node.hasTrailingComments)
    )
      return false;
    const r1 = this.mergeBinding(node);
    const r2 = this.mergeDefaultName(node);
    const r = r1 && r2;
    // Take comments if can merge
    if (r) {
      if (!this.leadingComments_) this.leadingComments_ = node.leadingComments_;
      if (!this.trailingCommentsText_) this.trailingCommentsText_ = node.trailingCommentsText_;
      node.leadingComments_ = undefined;
      node.trailingCommentsText_ = '';
    }
    return r;
  }

  mergeBinding(node: ImportNode) {
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
    this.binding_.names.concat(node.binding_.names);
    node.binding_ = undefined;
    return true;
  }

  mergeDefaultName(node: ImportNode) {
    if (this.defaultName_ && node.defaultName_ && this.defaultName_ !== node.defaultName_)
      return false;
    if (!this.defaultName_) this.defaultName_ = node.defaultName_;
    node.defaultName_ = undefined;
    return true;
  }

  private constructor(
    node: ImportDeclaration | ImportEqualsDeclaration,
    sourceFile: SourceFile,
    sourceText: string,
    moduleIdentifier: string,
    isScript: boolean,
    defaultName?: string,
    binding?: Binding,
  ) {
    this.node_ = node;
    this.moduleIdentifier_ = normalizePath(moduleIdentifier);
    this.isScript_ = isScript;
    this.defaultName_ = defaultName;
    this.binding_ = binding;
    const {
      disabled,
      fullStart,
      leadingNewLines,
      leadingComments,
      // declLineRange,
      // trailingComments,
      trailingCommentsText,
      declAndCommentsLineRange,
      trailingNewLines,
      fullEnd,
      eof,
    } = parseLineRanges(node, sourceFile, sourceText);
    this.fullStart_ = fullStart;
    this.leadingNewLines_ = leadingNewLines;
    this.leadingComments_ = leadingComments;
    // this.declLineRange_ = declLineRange;
    // this.trailingComments_ = trailingComments;
    this.trailingCommentsText_ = trailingCommentsText;
    this.declAndCommentsLineRange_ = declAndCommentsLineRange;
    this.trailingNewLines_ = trailingNewLines;
    this.fullEnd_ = fullEnd;
    this.eof_ = eof;
    this.disabled_ = disabled;
  }

  private get hasLeadingComments() {
    return !!this.leadingComments_ && this.leadingComments_.length > 0;
  }

  private get hasTrailingComments() {
    return !!this.trailingCommentsText_;
  }

  private composeImport(config: ComposeConfig) {
    switch (this.node_.kind) {
      case SyntaxKind.ImportDeclaration:
        return this.composeDecl(config);
      case SyntaxKind.ImportEqualsDeclaration:
        return this.composeEqDecl(config);
    }
  }

  // import A = require('B');
  composeEqDecl(config: ComposeConfig) {
    const { quote, semi } = config;
    const path = this.moduleIdentifier_;
    const name = this.defaultName_;
    assertNonNull(name);
    const parts = [`${name} =`];
    const from = `require(${quote(path)})${semi}`;
    return composeNodeAsParts(parts, from, config);
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
   * ```
   */
  composeDecl(config: ComposeConfig) {
    const { quote, semi } = config;
    const path = this.moduleIdentifier_;
    const ending = quote(path) + semi;
    if (this.isScript_) return `import ${ending}`;
    const from = `from ${ending}`;
    if (this.binding_?.type === 'named')
      return composeNodeAsNames(this.defaultName_, this.binding_.names, from, config);
    const parts = [];
    if (this.defaultName_) parts.push(this.defaultName_);
    if (this.binding_?.type === 'namespace') parts.push(`* as ${this.binding_.alias}`);
    return composeNodeAsParts(parts, from, config);
  }
}

function isNameUsed(name: NameBinding | string | undefined, allNames: Set<string>) {
  if (!name) return false;
  const n = typeof name === 'string' ? name : name.aliasName ?? name.propertyName;
  return !!n && allNames.has(n);
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

function idComparator(aa: string | undefined, bb: string | undefined) {
  if (aa === undefined) return bb === undefined ? 0 : -1;
  if (bb === undefined) return 1;
  const a = aa.toLowerCase();
  const b = bb.toLowerCase();
  return a < b ? -1 : a > b ? 1 : aa < bb ? -1 : aa > bb ? 1 : 0;
}

function defaultNameComparator(a: string | undefined, b: string | undefined) {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  return idComparator(a, b);
}

function bindingComparator(a: Binding | undefined, b: Binding | undefined) {
  if (a === undefined) return b === undefined ? 0 : -1;
  if (b === undefined) return 1;
  if (a.type === 'named' && b.type === 'named') return nameComparator(a.names[0], b.names[0]);
  if (a.type === 'named') return 1;
  if (b.type === 'named') return -1;
  return idComparator(a.alias, b.alias);
}

function nameComparator(a: NameBinding | undefined, b: NameBinding | undefined) {
  if (!a) return b ? -1 : 0;
  else if (!b) return 1;
  const { propertyName: pa, aliasName: aa } = a;
  const { propertyName: pb, aliasName: ab } = b;
  return idComparator(pa, pb) || idComparator(aa, ab);
}
