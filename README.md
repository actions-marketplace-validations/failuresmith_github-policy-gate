# GitHub Policy Gate

[![CI](https://github.com/failuresmith/github-policy-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/failuresmith/github-policy-gate/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue.svg)](https://github.com/marketplace/actions/github-policy-gate)

`github-policy-gate` is a lightweight, zero-infrastructure GitHub Action that implements **Policy as Code** for your pull requests. It provides simple, declarative guardrails to ensure safer merges by checking file changes, labels, approvals, and more.

## Why GitHub Policy Gate?

- **Zero Infrastructure**: No bots, no webhooks, no databases, and no external services.
- **Human Friendly**: Policies are written in simple YAML that anyone on the team can read and update.
- **Safe by Default**: If no config is found, the action runs in advisory mode. It will not block your PRs by surprise.
- **Fast and Focused**: Only reads the data it needs to evaluate your specific policies.

## How it Works

```mermaid
graph TD
    PR[Pull Request Event] --> Action[GitHub Policy Gate]
    Action --> Config{Load Config}
    Config -->|Missing| Default[Generate Advisory Config]
    Config -->|Exists| Load[Load .github/policy-gate.yml]
    Default --> Facts[Gather PR Facts]
    Load --> Facts
    Facts --> Engine[Evaluate Pure Logic Engine]
    Engine --> Results[Report Results]
    Results --> Annotate[PR Annotations]
    Results --> Fail{Fail Build?}
    Fail -->|Yes| Block[Block Merge]
    Fail -->|No| Pass[Allow Merge]
```

## Start Here

The fastest way to adopt `github-policy-gate` is the [Quick Start Tutorial](docs/quick-start.md). It teaches the action by example, starting with the smallest useful policy and building up to combined rules that use changed files, labels, approvals, PR text, and targeted file content checks.

### 1. Add these two files

Create `.github/workflows/policy.yml`:

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

The workflow file only runs the action. Do not put `policies:` in `.github/workflows/policy.yml`; put them in a separate `.github/policy-gate.yml` file.

Create `.github/policy-gate.yml`:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must start with feat:, fix:, docs:, refactor:, test:, or chore:.'
```

These two files are the minimal setup:

- `.github/workflows/policy.yml` runs the action in pull request CI.
- `.github/policy-gate.yml` defines the `policies:` the action evaluates.

### 2. Grow your policy file from the tutorial

Follow the [Quick Start Tutorial](docs/quick-start.md) to extend `.github/policy-gate.yml` incrementally. The tutorial walks through:

- title checks
- test requirements for changed paths
- label-based exceptions
- approval thresholds for sensitive changes
- PR body requirements
- targeted `file_contains` checks for docs and runbooks

## Inputs

| Input          | Description                                  | Default                   |
| :------------- | :------------------------------------------- | :------------------------ |
| `config-path`  | Optional path to a custom YAML policy file   | `.github/policy-gate.yml` |
| `github-token` | GitHub token for reading PR facts            | `${{ github.token }}`     |
| `fail-on-warn` | Whether to fail the job on `warn` violations | `false`                   |

## Advanced Use Cases

GitHub Policy Gate supports complex logic using `all`, `any`, and `not` combinators:

```yaml
require:
  any:
    - approval_count_at_least: 2
    - has_label: ['fast-track']
    - all:
        - approval_count_at_least: 1
        - has_label: ['minor-fix']
```

## Documentation

- 🚀 [Quick Start Tutorial](docs/quick-start.md) - Learn the action through examples from simplest to most advanced.
- 📖 [Configuration Reference](docs/configuration.md) - All available predicates and settings.
- 💡 [Policy Examples](docs/policy-examples.md) - Copy-paste patterns for common team guardrails.
- 🏗️ [Architecture](docs/architecture.md) - How the engine works.

## Local Development

```bash
make install    # Install dependencies
make check      # Run lints and types
make validate   # Run all tests
make build      # Build the production bundle
```

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
