function repeatIndent(level: number): string {
  return '  '.repeat(level);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainSafeString(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  if (/^(true|false|null|~)$/iu.test(value)) {
    return false;
  }

  if (/^[\s]|[\s]$/u.test(value)) {
    return false;
  }

  if (/:\s/u.test(value)) {
    return false;
  }

  if (/[[\]{}&|>@`"]/u.test(value)) {
    return false;
  }

  if (/^[-?:!&*#|>@`%]/u.test(value)) {
    return false;
  }

  return true;
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') {
    if (isPlainSafeString(value)) {
      return value;
    }

    return `'${value.replaceAll("'", "''")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  throw new Error('Unsupported YAML scalar.');
}

function renderObjectEntries(
  entries: Array<[string, unknown]>,
  indentLevel: number,
  lines: string[],
): void {
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${repeatIndent(indentLevel)}${key}: []`);
        continue;
      }

      lines.push(`${repeatIndent(indentLevel)}${key}:`);
      renderArray(value, indentLevel + 1, lines);
      continue;
    }

    if (isObject(value)) {
      const nestedEntries = Object.entries(value);
      if (nestedEntries.length === 0) {
        lines.push(`${repeatIndent(indentLevel)}${key}: {}`);
        continue;
      }

      lines.push(`${repeatIndent(indentLevel)}${key}:`);
      renderObjectEntries(nestedEntries, indentLevel + 1, lines);
      continue;
    }

    lines.push(`${repeatIndent(indentLevel)}${key}: ${formatScalar(value)}`);
  }
}

function renderArray(
  values: unknown[],
  indentLevel: number,
  lines: string[],
): void {
  for (const value of values) {
    if (Array.isArray(value)) {
      lines.push(`${repeatIndent(indentLevel)}-`);
      renderArray(value, indentLevel + 1, lines);
      continue;
    }

    if (isObject(value)) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        lines.push(`${repeatIndent(indentLevel)}- {}`);
        continue;
      }

      const firstEntry = entries[0];
      if (!firstEntry) {
        lines.push(`${repeatIndent(indentLevel)}- {}`);
        continue;
      }

      const [firstKey, firstValue] = firstEntry;
      if (Array.isArray(firstValue)) {
        lines.push(`${repeatIndent(indentLevel)}- ${firstKey}:`);
        renderArray(firstValue, indentLevel + 2, lines);
      } else if (isObject(firstValue)) {
        lines.push(`${repeatIndent(indentLevel)}- ${firstKey}:`);
        renderObjectEntries(Object.entries(firstValue), indentLevel + 2, lines);
      } else {
        lines.push(
          `${repeatIndent(indentLevel)}- ${firstKey}: ${formatScalar(firstValue)}`,
        );
      }

      renderObjectEntries(entries.slice(1), indentLevel + 1, lines);
      continue;
    }

    lines.push(`${repeatIndent(indentLevel)}- ${formatScalar(value)}`);
  }
}

export function dumpYaml(value: Record<string, unknown>): string {
  const lines: string[] = [];
  renderObjectEntries(Object.entries(value), 0, lines);
  return `${lines.join('\n')}\n`;
}
