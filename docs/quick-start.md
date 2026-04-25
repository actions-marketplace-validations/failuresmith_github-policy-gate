# Quick Start Tutorial

Get your pull request guardrails up and running in minutes, then grow them step by step.

This tutorial teaches `github-policy-gate` by example. Start with the smallest possible rule, then add more expressive policies as your team needs them.

## 1. Add the Workflow

Create `.github/workflows/policy.yml` in your repository:

```yaml
name: policy-gate
on: [pull_request]

jobs:
  check-policy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: failuresmith/github-policy-gate@v1
```

This workflow file only runs the action. Do not put `policies:` inside `.github/workflows/policy.yml`.

## Your repo should now contain these two files

- `.github/workflows/policy.yml` runs `github-policy-gate` during pull request CI.
- `.github/policy-gate.yml` is the separate policy config file that contains `policies:`.

## 2. Start with the simplest policy

Now create the separate policy config file at `.github/policy-gate.yml` with one small, obvious rule:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must start with feat:, fix:, docs:, refactor:, test:, or chore:.'
```

This uses the `title(...)` predicate and is often the easiest first policy to adopt.

## 3. Require tests for critical code changes

Once the team is comfortable, add a path-based rule:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must start with feat:, fix:, docs:, refactor:, test:, or chore:.'

  - id: critical-code-needs-tests
    severity: error
    when:
      changed:
        - 'src/core/**'
        - 'src/security/**'
    require:
      changed:
        - 'tests/**'
    message: 'Changes to core or security code must include tests.'
```

This is the most common policy shape:

- `when` decides when the policy applies.
- `require` defines what must be true for those PRs.

## 4. Allow explicit exemptions with labels

Many teams need a narrow escape hatch that is still visible in review:

```yaml
policies:
  - id: public-api-needs-docs-or-label
    severity: warn
    when:
      changed:
        - 'api/public/**'
    require:
      any:
        - changed:
            - 'docs/**'
            - 'README.md'
            - 'CHANGELOG.md'
        - has_label:
            - 'docs-exempt'
    message: 'Public API changes should include docs or carry a docs-exempt label.'
```

This introduces:

- `changed(...)` for changed files
- `has_label(...)` for explicit reviewer intent
- `any(...)` for "one of these conditions must be true"

## 5. Require stronger review for sensitive changes

Approvals are useful when certain paths deserve higher scrutiny:

```yaml
policies:
  - id: sensitive-path-needs-extra-review
    severity: error
    when:
      changed:
        - '.github/workflows/**'
        - 'infra/**'
        - 'src/auth/**'
    require:
      approval_count_at_least: 2
    message: 'Workflow, infra, and auth changes require at least 2 approvals.'
```

This keeps the policy deterministic and easy to reason about: if sensitive files changed, the approval threshold increases.

## 6. Require PR body evidence for risky work

The PR body is a good place to enforce lightweight change-management habits:

```yaml
policies:
  - id: infra-pr-needs-rollout-plan
    severity: error
    when:
      changed:
        - 'infra/**'
        - 'deploy/**'
    require:
      body:
        - '(?i)rollout'
        - '(?i)rollback'
    message: 'Infra and deploy changes must mention rollout and rollback in the PR body.'
```

Use this for:

- rollout and rollback notes
- linked issue or incident references
- migration or recovery plans

## 7. Check file contents, not just file names

For documentation-heavy or operations-heavy repos, you can check targeted files for expected text:

```yaml
policies:
  - id: infra-change-needs-runbook-evidence
    severity: error
    when:
      changed:
        - 'infra/**'
    require:
      file_contains:
        globs:
          - 'docs/**/*.md'
          - 'runbooks/**/*.md'
        patterns:
          - '(?i)rollback'
          - '(?i)recovery'
    message: 'Infra changes require docs or runbooks that mention rollback and recovery.'
```

`file_contains(...)` only reads the files you target. It is the most advanced built-in predicate because it lets you enforce operational evidence while staying deterministic.

## 8. Combine rules into a more realistic policy

Here is a more advanced policy that allows either strong review or an explicit fast-track path:

```yaml
policies:
  - id: sensitive-change-needs-review-or-explicit-exception
    severity: error
    when:
      changed:
        - '.github/workflows/**'
        - 'src/security/**'
    require:
      any:
        - approval_count_at_least: 2
        - all:
            - approval_count_at_least: 1
            - has_label:
                - 'fast-track'
    message: 'Sensitive changes require 2 approvals, or 1 approval plus a fast-track label.'
```

This introduces `all(...)`, which is useful when two conditions must both hold.

## 9. Full Example

This example combines the patterns above into a practical starter config:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must follow the agreed format.'

  - id: critical-code-needs-tests
    severity: error
    when:
      changed:
        - 'src/core/**'
        - 'src/security/**'
    require:
      changed:
        - 'tests/**'
    message: 'Changes to core or security code must include tests.'

  - id: public-api-needs-docs
    severity: warn
    when:
      changed:
        - 'api/public/**'
    require:
      any:
        - changed:
            - 'README.md'
            - 'docs/**'
            - 'CHANGELOG.md'
        - has_label:
            - 'docs-exempt'
    message: 'Public API changes should include docs or carry a docs-exempt label.'

  - id: sensitive-path-needs-extra-review
    severity: error
    when:
      changed:
        - '.github/workflows/**'
        - 'infra/**'
        - 'src/auth/**'
    require:
      approval_count_at_least: 2
    message: 'Workflow, infra, and auth changes require at least 2 approvals.'

  - id: infra-pr-needs-rollout-plan
    severity: error
    when:
      changed:
        - 'infra/**'
        - 'deploy/**'
    require:
      body:
        - '(?i)rollout'
        - '(?i)rollback'
    message: 'Infra and deploy changes must mention rollout and rollback in the PR body.'

  - id: infra-change-needs-runbook-evidence
    severity: error
    when:
      changed:
        - 'infra/**'
    require:
      file_contains:
        globs:
          - 'docs/**/*.md'
          - 'runbooks/**/*.md'
        patterns:
          - '(?i)rollback'
          - '(?i)recovery'
    message: 'Infra changes require docs or runbooks that mention rollback and recovery.'
```

## 10. Open a Pull Request

Once you push these files, the action will:

1. Gather PR facts (changed files, labels, title, body, approvals, and targeted file content).
2. Evaluate each policy against those facts.
3. Provide a summary in the action logs.
4. Add annotations to the PR for any violations.
5. Fail the build if any `error` level policies are violated.

## What this action can enforce

Everything in this tutorial stays within the current feature set:

- changed, added, removed, and renamed files
- PR title and body text
- labels
- approval count
- file existence
- targeted file content

If you need more copy-paste patterns, see [Policy Examples](policy-examples.md). If you need the exact schema, see the [Configuration Reference](configuration.md).

## Missing Config?

If you add the action but forget the config file, `github-policy-gate` will generate a temporary advisory config. It will not block your PRs. It will show an example configuration in the logs so you can adopt the action safely.
