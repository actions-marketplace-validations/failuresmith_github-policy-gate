import type { PredicateExpression } from '../config/schema';
import type {
  CombinatorDraft,
  ExpressionDraft,
  NormalizedExpressionResult,
  ValidationError,
} from './types';

function trimValues(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function withError(path: string, message: string): ValidationError[] {
  return [{ path, message }];
}

export function normalizeExpressionDraft(
  draft: ExpressionDraft | undefined,
  path: string,
): NormalizedExpressionResult {
  if (!draft) {
    return {
      errors: withError(path, 'Expression is required.'),
    };
  }

  if (draft.kind === 'predicate') {
    switch (draft.predicate) {
      case 'changed': {
        const globs = trimValues(draft.globs);
        return globs.length > 0
          ? { expression: { changed: globs }, errors: [] }
          : { errors: withError(path, 'Changed globs cannot be empty.') };
      }
      case 'exists': {
        const globs = trimValues(draft.globs);
        return globs.length > 0
          ? { expression: { exists: globs }, errors: [] }
          : { errors: withError(path, 'Exists globs cannot be empty.') };
      }
      case 'body': {
        const patterns = trimValues(draft.patterns);
        return patterns.length > 0
          ? { expression: { body: patterns }, errors: [] }
          : { errors: withError(path, 'Body patterns cannot be empty.') };
      }
      case 'title': {
        const patterns = trimValues(draft.patterns);
        return patterns.length > 0
          ? { expression: { title: patterns }, errors: [] }
          : { errors: withError(path, 'Title patterns cannot be empty.') };
      }
      case 'has_label': {
        const labels = trimValues(draft.labels);
        return labels.length > 0
          ? { expression: { has_label: labels }, errors: [] }
          : { errors: withError(path, 'Labels cannot be empty.') };
      }
      case 'approval_count_at_least': {
        const approvals = draft.approvals;
        return typeof approvals === 'number' &&
          Number.isInteger(approvals) &&
          approvals >= 0
          ? {
              expression: { approval_count_at_least: approvals },
              errors: [],
            }
          : {
              errors: withError(
                path,
                'Approval threshold must be a non-negative integer.',
              ),
            };
      }
      case 'file_contains': {
        const globs = trimValues(draft.globs);
        const patterns = trimValues(draft.patterns);
        const errors: ValidationError[] = [];
        if (globs.length === 0) {
          errors.push({
            path,
            message: 'file_contains globs cannot be empty.',
          });
        }
        if (patterns.length === 0) {
          errors.push({
            path,
            message: 'file_contains patterns cannot be empty.',
          });
        }
        return errors.length > 0
          ? { errors }
          : {
              expression: { file_contains: { globs, patterns } },
              errors: [],
            };
      }
    }
  }

  if (draft.operator === 'not') {
    if (!draft.child) {
      return {
        errors: withError(
          path,
          '`not` must contain exactly one child expression.',
        ),
      };
    }
    const child = normalizeExpressionDraft(draft.child, `${path}.not`);
    return child.expression
      ? { expression: { not: child.expression }, errors: child.errors }
      : child;
  }

  if (draft.children.length === 0) {
    return {
      errors: withError(
        path,
        `\`${draft.operator}\` must contain at least one child.`,
      ),
    };
  }

  const expressions: PredicateExpression[] = [];
  const errors: ValidationError[] = [];
  draft.children.forEach((childDraft, index) => {
    const child = normalizeExpressionDraft(
      childDraft,
      `${path}.${draft.operator}[${index}]`,
    );
    if (child.expression) {
      expressions.push(child.expression);
    }
    errors.push(...child.errors);
  });

  if (errors.length > 0) {
    return { errors };
  }

  return draft.operator === 'all'
    ? { expression: { all: expressions }, errors: [] }
    : { expression: { any: expressions }, errors: [] };
}

export function summarizeExpression(
  draft: ExpressionDraft | undefined,
): string {
  if (!draft) {
    return 'Not configured';
  }

  if (draft.kind === 'predicate') {
    switch (draft.predicate) {
      case 'changed':
      case 'exists':
        return `${draft.predicate}(${draft.globs.length})`;
      case 'body':
      case 'title':
        return `${draft.predicate}(${draft.patterns.length})`;
      case 'has_label':
        return `has_label(${draft.labels.length})`;
      case 'approval_count_at_least':
        return `approval_count_at_least(${draft.approvals === '' ? '?' : draft.approvals})`;
      case 'file_contains':
        return `file_contains(${draft.globs.length} globs, ${draft.patterns.length} patterns)`;
    }
  }

  if (draft.operator === 'not') {
    return `not(${summarizeExpression(draft.child)})`;
  }

  return `${draft.operator}(${draft.children.length})`;
}

function cloneExpression(draft: ExpressionDraft): ExpressionDraft {
  return globalThis.structuredClone(draft);
}

function updateChildren(
  draft: CombinatorDraft,
  updater: (children: ExpressionDraft[]) => ExpressionDraft[],
): CombinatorDraft {
  if (draft.operator === 'not') {
    return draft;
  }

  return {
    ...draft,
    children: updater(draft.children),
  };
}

export function updateExpressionAtPath(
  root: ExpressionDraft,
  path: number[],
  updater: (draft: ExpressionDraft) => ExpressionDraft,
): ExpressionDraft {
  if (path.length === 0) {
    return updater(cloneExpression(root));
  }

  const [index, ...rest] = path;
  if (root.kind !== 'combinator') {
    return root;
  }

  if (root.operator === 'not') {
    if (index !== 0 || !root.child) {
      return root;
    }
    return {
      ...root,
      child: updateExpressionAtPath(root.child, rest, updater),
    };
  }

  return updateChildren(root, (children) =>
    children.map((child, childIndex) =>
      childIndex === index
        ? updateExpressionAtPath(child, rest, updater)
        : child,
    ),
  );
}

export function replaceExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
  replacement: ExpressionDraft,
): ExpressionDraft {
  if (!root || path.length === 0) {
    return replacement;
  }

  return updateExpressionAtPath(root, path, () => replacement);
}

export function removeExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
): ExpressionDraft | undefined {
  if (!root) {
    return undefined;
  }

  if (path.length === 0) {
    return undefined;
  }

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  if (index === undefined) {
    return root;
  }

  return updateExpressionAtPath(root, parentPath, (draft) => {
    if (draft.kind !== 'combinator') {
      return draft;
    }

    if (draft.operator === 'not') {
      return { kind: 'combinator', operator: 'not' };
    }

    return {
      ...draft,
      children: draft.children.filter((_, childIndex) => childIndex !== index),
    };
  });
}

export function addSiblingExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
  sibling: ExpressionDraft,
): ExpressionDraft | undefined {
  if (!root || path.length === 0) {
    return root;
  }

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  if (index === undefined) {
    return root;
  }

  return updateExpressionAtPath(root, parentPath, (draft) => {
    if (draft.kind !== 'combinator' || draft.operator === 'not') {
      return draft;
    }

    const children = [...draft.children];
    children.splice(index + 1, 0, sibling);
    return { ...draft, children };
  });
}

export function addChildExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
  child: ExpressionDraft,
): ExpressionDraft | undefined {
  if (!root) {
    return root;
  }

  return updateExpressionAtPath(root, path, (draft) => {
    if (draft.kind !== 'combinator' || draft.operator === 'not') {
      return draft;
    }

    return {
      ...draft,
      children: [...draft.children, child],
    };
  });
}

export function wrapExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
  operator: 'all' | 'any' | 'not',
): ExpressionDraft | undefined {
  if (!root) {
    return root;
  }

  return updateExpressionAtPath(root, path, (draft) =>
    operator === 'not'
      ? { kind: 'combinator', operator: 'not', child: draft }
      : { kind: 'combinator', operator, children: [draft] },
  );
}

export function moveExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
  direction: 'up' | 'down',
): ExpressionDraft | undefined {
  if (!root || path.length === 0) {
    return root;
  }

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  if (index === undefined) {
    return root;
  }

  return updateExpressionAtPath(root, parentPath, (draft) => {
    if (draft.kind !== 'combinator' || draft.operator === 'not') {
      return draft;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.children.length) {
      return draft;
    }

    const children = [...draft.children];
    const [moved] = children.splice(index, 1);
    if (!moved) {
      return draft;
    }
    children.splice(targetIndex, 0, moved);
    return { ...draft, children };
  });
}

export function getExpressionAtPath(
  root: ExpressionDraft | undefined,
  path: number[],
): ExpressionDraft | undefined {
  if (!root) {
    return undefined;
  }

  if (path.length === 0) {
    return root;
  }

  const [index, ...rest] = path;
  if (index === undefined) {
    return undefined;
  }

  if (root.kind !== 'combinator') {
    return undefined;
  }

  if (root.operator === 'not') {
    if (index !== 0 || !root.child) {
      return undefined;
    }
    return getExpressionAtPath(root.child, rest);
  }

  return getExpressionAtPath(root.children[index], rest);
}
