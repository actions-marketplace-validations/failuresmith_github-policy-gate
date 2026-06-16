import type { WorkflowOptions } from './types';

function appendLine(lines: string[], level: number, value: string): void {
  lines.push(`${'  '.repeat(level)}${value}`);
}

export function generateWorkflowYaml(options: WorkflowOptions): string {
  const lines: string[] = [];
  appendLine(lines, 0, 'name: policy-gate');
  appendLine(lines, 0, 'on: [pull_request]');
  appendLine(lines, 0, 'jobs:');
  appendLine(lines, 1, 'check-policy:');
  appendLine(lines, 2, 'runs-on: ubuntu-latest');
  appendLine(lines, 2, 'permissions:');
  appendLine(lines, 3, 'contents: read');
  appendLine(lines, 3, 'pull-requests: read');
  appendLine(lines, 2, 'steps:');
  appendLine(lines, 3, '- uses: actions/checkout@v4');
  appendLine(
    lines,
    3,
    `- uses: failuresmith/github-policy-gate@${options.actionRef}`,
  );

  if (options.failOnWarn || options.configPath !== '.github/policy-gate.yml') {
    appendLine(lines, 4, 'with:');
    if (options.configPath !== '.github/policy-gate.yml') {
      appendLine(lines, 5, `config-path: ${options.configPath}`);
    }
    if (options.failOnWarn) {
      appendLine(lines, 5, 'fail-on-warn: true');
    }
  }

  return `${lines.join('\n')}\n`;
}
