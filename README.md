# GitHub Policy Gate

[![CI](https://github.com/failuresmith/github-policy-gate/actions/workflows/ci.yml/badge.svg)](https://github.com/failuresmith/github-policy-gate/actions/workflows/ci.yml)
[![Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue.svg)](https://github.com/marketplace/actions/github-policy-gate)

GitHub's branch protection can require approvals and passing checks — but it can't say _which_ files changed or _what_ the PR description contains. That gap is where teams get burned:

- auth code merged without a second reviewer
- API changes shipped without a changelog entry
- CI workflows changed with no rollback plan in the PR body

**GitHub Policy Gate** Action closes that gap. You write rules in YAML; the action enforces them on every PR.

```yaml
# .github/policy-gate.yml
policies:
  - id: auth-needs-two-approvals
    severity: error
    when:
      changed: ['src/auth/**']
    require:
      approval_count_at_least: 2
    message: 'Auth changes require at least 2 approvals.'

  - id: api-change-needs-changelog
    severity: error
    when:
      changed: ['src/api/public/**']
    require:
      any:
        - changed: ['CHANGELOG.md']
        - has_label: ['skip-changelog']
    message: 'Public API changes must update CHANGELOG.md or carry the skip-changelog label.'
```

Rules are triggered by changed files, then check title, body, labels, approvals, file existence, and file content — combined with `all`, `any`, `not`.

No bot. No external service. Just a GitHub Action and a YAML file.

---

## Setup

**1.** Create `.github/workflows/policy.yml`:

```yaml
name: policy-gate
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: failuresmith/github-policy-gate@v1
```

**2.** Create `.github/policy-gate.yml` with your first rule:

```yaml
policies:
  - id: pr-title-format
    severity: error
    require:
      title:
        - '^(feat|fix|docs|refactor|test|chore): .+'
    message: 'PR title must match: feat|fix|docs|refactor|test|chore: <description>'
```

Open a PR — the action runs, reports violations as annotations, and fails the check if any `error`-severity rule is violated.

---

## What you can check

| Predicate | What it matches |
|---|---|
| `changed` | Files added, modified, renamed, or deleted (glob) |
| `exists` | Files present in the repo (glob) |
| `title` | PR title (regex) |
| `body` | PR description (regex) |
| `has_label` | PR labels |
| `approval_count_at_least` | Number of approving reviews |
| `file_contains` | Content inside specific files (glob + regex) |

Combine predicates with `all`, `any`, `not`. Use `when` to make a rule conditional on other predicates.

---

## Documentation

- [How It Works](docs/how-it-works.md)
- [Quick Start Tutorial](docs/quick-start.md)
- [Configuration Reference](docs/configuration.md)
- [Policy Examples](docs/policy-examples.md)
- [Architecture](docs/architecture.md)
- [FAQ](docs/faq.md)
- [Contributing](docs/contributing.md)

## License

Apache 2.0. See [LICENSE](LICENSE).
