import { QUICK_START_PRESET_META } from '../../generator/presets';
import { summarizeExpression } from '../../generator/expressions';
import type {
  DocsRunbookEvidencePresetState,
  ExpressionDraft,
  GeneratorState,
  PolicyDraft,
  PrBodyRequiredPresetState,
  QuickStartPolicyPresetId,
  ReleaseSafetyPresetState,
  SensitivePathsPresetState,
  TestsForSourceChangesPresetState,
  TitleFormatPresetState,
} from '../../generator/types';
import type {
  AppRenderModel,
  ExpressionModalRenderModel,
  QuickStartWizardStepId,
} from './ui-types';

const QUICK_START_STEPS: Array<{
  id: QuickStartWizardStepId;
  label: string;
  title: string;
  description: string;
}> = [
  {
    id: 'baseline',
    label: 'Start',
    title: 'Start with a baseline',
    description: 'Pick the default pack, then trim what you do not need.',
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Shape review hygiene',
    description: 'Decide how strict titles and PR descriptions should be.',
  },
  {
    id: 'code',
    label: 'Code',
    title: 'Protect code changes',
    description: 'Choose whether tests and extra approvals matter here.',
  },
  {
    id: 'operations',
    label: 'Ops',
    title: 'Cover operational risk',
    description: 'Add rollout, rollback, and docs evidence where it helps.',
  },
  {
    id: 'export',
    label: 'Export',
    title: 'Review the generated files',
    description: 'Copy or download the workflow and policy YAML.',
  },
];

const DOWNLOAD_ICON = `
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 1.5a.75.75 0 0 1 .75.75v6.69l2.22-2.22a.75.75 0 1 1 1.06 1.06L8.53 11.3a.75.75 0 0 1-1.06 0L3.97 7.78a.75.75 0 0 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5ZM2.75 11.75a.75.75 0 0 1 .75.75v.75h9v-.75a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-.75.75h-10.5A.75.75 0 0 1 2 14v-1.5a.75.75 0 0 1 .75-.75Z" />
  </svg>
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderLines(values: string[]): string {
  return escapeHtml(values.join('\n'));
}

function renderModeButton(
  mode: GeneratorState['mode'],
  currentMode: GeneratorState['mode'],
  title: string,
): string {
  return `
    <button
      type="button"
      class="mode-pill ${mode === currentMode ? 'is-active' : ''}"
      data-action="set-mode"
      data-mode="${mode}"
    >
      ${escapeHtml(title)}
    </button>
  `;
}

function renderSeverityToggle(
  presetId: QuickStartPolicyPresetId,
  value: 'error' | 'warn',
): string {
  return `
    <div class="binary-toggle" role="radiogroup" aria-label="Severity">
      <label class="binary-toggle__item ${value === 'error' ? 'is-active' : ''}">
        <input
          type="radio"
          name="severity-${presetId}"
          value="error"
          ${value === 'error' ? 'checked' : ''}
          data-action="preset-severity"
          data-preset-id="${presetId}"
        />
        <span>Fail</span>
      </label>
      <label class="binary-toggle__item ${value === 'warn' ? 'is-active' : ''}">
        <input
          type="radio"
          name="severity-${presetId}"
          value="warn"
          ${value === 'warn' ? 'checked' : ''}
          data-action="preset-severity"
          data-preset-id="${presetId}"
        />
        <span>Warn</span>
      </label>
    </div>
  `;
}

function renderArrayField(
  presetId: QuickStartPolicyPresetId,
  field: string,
  label: string,
  values: string[],
  rows = 3,
): string {
  return `
    <label class="form-label tiny-label">${escapeHtml(label)}</label>
    <textarea
      class="form-control form-control-sm code-input"
      rows="${rows}"
      data-action="preset-lines"
      data-preset-id="${presetId}"
      data-field="${field}"
    >${renderLines(values)}</textarea>
  `;
}

function renderMessageField(
  presetId: QuickStartPolicyPresetId,
  message: string,
): string {
  return `
    <label class="form-label tiny-label">Message</label>
    <input
      class="form-control form-control-sm"
      type="text"
      value="${escapeHtml(message)}"
      data-action="preset-message"
      data-preset-id="${presetId}"
    />
  `;
}

function renderPresetSettings(
  presetId: QuickStartPolicyPresetId,
  preset:
    | TitleFormatPresetState
    | TestsForSourceChangesPresetState
    | SensitivePathsPresetState
    | ReleaseSafetyPresetState
    | DocsRunbookEvidencePresetState
    | PrBodyRequiredPresetState,
): string {
  switch (presetId) {
    case 'title-format': {
      const titlePreset = preset as TitleFormatPresetState;
      return `
        <div class="policy-card__main">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, titlePreset.severity)}
          </div>
        </div>
        <details class="policy-card__details">
          <summary>Customize</summary>
          <div class="field-grid compact-grid">
            <div class="field-grid__span-2">${renderArrayField(presetId, 'patterns', 'Accepted title patterns', titlePreset.patterns)}</div>
            <div class="field-grid__span-2">${renderMessageField(presetId, titlePreset.message)}</div>
          </div>
        </details>
      `;
    }
    case 'pr-body-required': {
      const bodyPreset = preset as PrBodyRequiredPresetState;
      return `
        <div class="policy-card__main">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, bodyPreset.severity)}
          </div>
        </div>
        <details class="policy-card__details">
          <summary>Customize</summary>
          <div class="field-grid compact-grid">
            <div class="field-grid__span-2">${renderArrayField(presetId, 'patterns', 'Required body patterns', bodyPreset.patterns)}</div>
            <div class="field-grid__span-2">${renderMessageField(presetId, bodyPreset.message)}</div>
          </div>
        </details>
      `;
    }
    case 'tests-for-source-changes': {
      const testsPreset = preset as TestsForSourceChangesPresetState;
      return `
        <div class="field-grid compact-grid">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, testsPreset.severity)}
          </div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'sourceGlobs', 'Source paths', testsPreset.sourceGlobs)}</div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'testGlobs', 'Test paths', testsPreset.testGlobs)}</div>
        </div>
        <details class="policy-card__details">
          <summary>Customize message</summary>
          ${renderMessageField(presetId, testsPreset.message)}
        </details>
      `;
    }
    case 'sensitive-paths': {
      const sensitivePreset = preset as SensitivePathsPresetState;
      return `
        <div class="field-grid compact-grid">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, sensitivePreset.severity)}
          </div>
          <div>
            <label class="form-label tiny-label">Approvals</label>
            <input
              class="form-control form-control-sm"
              type="number"
              min="0"
              step="1"
              value="${sensitivePreset.approvals}"
              data-action="preset-number"
              data-preset-id="${presetId}"
              data-field="approvals"
            />
          </div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'globs', 'Protected paths', sensitivePreset.globs)}</div>
        </div>
        <details class="policy-card__details">
          <summary>Customize message</summary>
          ${renderMessageField(presetId, sensitivePreset.message)}
        </details>
      `;
    }
    case 'release-safety': {
      const releasePreset = preset as ReleaseSafetyPresetState;
      return `
        <div class="field-grid compact-grid">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, releasePreset.severity)}
          </div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'globs', 'Operational paths', releasePreset.globs)}</div>
        </div>
        <details class="policy-card__details">
          <summary>Customize</summary>
          <div class="field-grid compact-grid">
            <div>${renderArrayField(presetId, 'rolloutPatterns', 'Rollout words', releasePreset.rolloutPatterns)}</div>
            <div>${renderArrayField(presetId, 'rollbackPatterns', 'Rollback words', releasePreset.rollbackPatterns)}</div>
            <div class="field-grid__span-2">${renderMessageField(presetId, releasePreset.message)}</div>
          </div>
        </details>
      `;
    }
    case 'docs-runbook-evidence': {
      const docsPreset = preset as DocsRunbookEvidencePresetState;
      return `
        <div class="field-grid compact-grid">
          <div>
            <label class="form-label tiny-label">Effect</label>
            ${renderSeverityToggle(presetId, docsPreset.severity)}
          </div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'globs', 'Operational paths', docsPreset.globs)}</div>
          <div class="field-grid__span-2">${renderArrayField(presetId, 'evidenceGlobs', 'Docs or runbook paths', docsPreset.evidenceGlobs)}</div>
        </div>
        <details class="policy-card__details">
          <summary>Customize message</summary>
          ${renderMessageField(presetId, docsPreset.message)}
        </details>
      `;
    }
  }
}

function renderPresetCard(
  presetId: QuickStartPolicyPresetId,
  preset:
    | TitleFormatPresetState
    | TestsForSourceChangesPresetState
    | SensitivePathsPresetState
    | ReleaseSafetyPresetState
    | DocsRunbookEvidencePresetState
    | PrBodyRequiredPresetState,
): string {
  const meta = QUICK_START_PRESET_META[presetId];
  return `
    <section class="policy-card ${preset.enabled ? 'is-enabled' : 'is-disabled'}">
      <div class="policy-card__top">
        <div>
          <h3 class="policy-card__title">${escapeHtml(meta.title)}</h3>
          <p class="policy-card__description">${escapeHtml(meta.description)}</p>
        </div>
        <label class="switch-toggle" aria-label="${escapeHtml(meta.title)}">
          <input
            type="checkbox"
            role="switch"
            ${preset.enabled ? 'checked' : ''}
            data-action="toggle-preset"
            data-preset-id="${presetId}"
          />
          <span>${preset.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      ${
        preset.enabled
          ? `<div class="policy-card__content">${renderPresetSettings(
              presetId,
              preset,
            )}</div>`
          : '<div class="policy-card__hint">Off for now.</div>'
      }
    </section>
  `;
}

function renderWizardStepper(activeStep: QuickStartWizardStepId): string {
  const activeIndex = QUICK_START_STEPS.findIndex(
    (step) => step.id === activeStep,
  );
  return `
    <nav class="wizard-steps" aria-label="Quick start steps">
      ${QUICK_START_STEPS.map((step, index) => {
        const stateClass =
          step.id === activeStep
            ? 'is-active'
            : index < activeIndex
              ? 'is-complete'
              : '';
        return `
          <button
            type="button"
            class="wizard-step ${stateClass}"
            data-action="set-quick-start-step"
            data-step-id="${step.id}"
          >
            <span class="wizard-step__number">${index + 1}</span>
            <span class="wizard-step__label">${escapeHtml(step.label)}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

function renderWizardFooter(activeStep: QuickStartWizardStepId): string {
  const activeIndex = QUICK_START_STEPS.findIndex(
    (step) => step.id === activeStep,
  );
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === QUICK_START_STEPS.length - 1;
  return `
    <div class="wizard-footer">
      <button
        class="btn btn-outline-secondary"
        type="button"
        ${isFirst ? 'disabled' : ''}
        data-action="shift-quick-start-step"
        data-direction="previous"
      >
        Back
      </button>
      <button
        class="btn btn-primary"
        type="button"
        ${isLast ? 'disabled' : ''}
        data-action="shift-quick-start-step"
        data-direction="next"
      >
        Next
      </button>
    </div>
  `;
}

function renderBaselineStep(model: AppRenderModel): string {
  const safeDefault = model.state.quickStart.presets['safe-default'].enabled;
  return `
    <section class="wizard-panel">
      <div class="wizard-panel__intro">
        <p class="wizard-panel__eyebrow">Step 1</p>
        <h2>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'baseline')!.title,
        )}</h2>
        <p>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'baseline')!.description,
        )}</p>
      </div>
      <section class="baseline-card">
        <div class="baseline-card__header">
          <div>
            <h3>Safe default pack</h3>
            <p>Turns on the most common guardrails in one move.</p>
          </div>
          <label class="switch-toggle switch-toggle--large" aria-label="Safe default pack">
            <input
              type="checkbox"
              role="switch"
              ${safeDefault ? 'checked' : ''}
              data-action="toggle-preset"
              data-preset-id="safe-default"
            />
            <span>${safeDefault ? 'On' : 'Off'}</span>
          </label>
        </div>
        <div class="tag-row">
          <span class="tag-chip">Title format</span>
          <span class="tag-chip">PR body</span>
          <span class="tag-chip">Tests</span>
          <span class="tag-chip">Sensitive paths</span>
          <span class="tag-chip">Release safety</span>
        </div>
      </section>
      ${renderWizardFooter(model.activeQuickStartStep)}
    </section>
  `;
}

function renderQuickStartSummary(model: AppRenderModel): string {
  const enabledPresets = (
    [
      'title-format',
      'pr-body-required',
      'tests-for-source-changes',
      'sensitive-paths',
      'release-safety',
      'docs-runbook-evidence',
    ] as QuickStartPolicyPresetId[]
  ).filter((presetId) => model.state.quickStart.presets[presetId].enabled);

  return `
    <section class="summary-card">
      <p class="summary-card__count">${enabledPresets.length} policies selected</p>
      <div class="tag-row">
        ${enabledPresets
          .map(
            (presetId) =>
              `<span class="tag-chip">${escapeHtml(
                QUICK_START_PRESET_META[presetId].title,
              )}</span>`,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderReviewStep(model: AppRenderModel): string {
  return `
    <section class="wizard-panel">
      <div class="wizard-panel__intro">
        <p class="wizard-panel__eyebrow">Step 2</p>
        <h2>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'review')!.title,
        )}</h2>
        <p>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'review')!.description,
        )}</p>
      </div>
      <div class="policy-stack">
        ${renderPresetCard(
          'title-format',
          model.state.quickStart.presets['title-format'],
        )}
        ${renderPresetCard(
          'pr-body-required',
          model.state.quickStart.presets['pr-body-required'],
        )}
      </div>
      ${renderWizardFooter(model.activeQuickStartStep)}
    </section>
  `;
}

function renderCodeStep(model: AppRenderModel): string {
  return `
    <section class="wizard-panel">
      <div class="wizard-panel__intro">
        <p class="wizard-panel__eyebrow">Step 3</p>
        <h2>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'code')!.title,
        )}</h2>
        <p>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'code')!.description,
        )}</p>
      </div>
      <div class="policy-stack">
        ${renderPresetCard(
          'tests-for-source-changes',
          model.state.quickStart.presets['tests-for-source-changes'],
        )}
        ${renderPresetCard(
          'sensitive-paths',
          model.state.quickStart.presets['sensitive-paths'],
        )}
      </div>
      ${renderWizardFooter(model.activeQuickStartStep)}
    </section>
  `;
}

function renderOperationsStep(model: AppRenderModel): string {
  return `
    <section class="wizard-panel">
      <div class="wizard-panel__intro">
        <p class="wizard-panel__eyebrow">Step 4</p>
        <h2>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'operations')!.title,
        )}</h2>
        <p>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'operations')!
            .description,
        )}</p>
      </div>
      <div class="policy-stack">
        ${renderPresetCard(
          'release-safety',
          model.state.quickStart.presets['release-safety'],
        )}
        ${renderPresetCard(
          'docs-runbook-evidence',
          model.state.quickStart.presets['docs-runbook-evidence'],
        )}
      </div>
      ${renderWizardFooter(model.activeQuickStartStep)}
    </section>
  `;
}

function renderValidationErrors(model: AppRenderModel): string {
  if (model.output.errors.length === 0) {
    return '';
  }

  return `
    <div class="alert alert-warning border-0 error-panel" role="alert">
      <div class="fw-semibold mb-2">Fix these before using the YAML</div>
      <ul class="error-list mb-0">
        ${model.output.errors
          .map(
            (error) =>
              `<li><code>${escapeHtml(error.path)}</code> ${escapeHtml(
                error.message,
              )}</li>`,
          )
          .join('')}
      </ul>
    </div>
  `;
}

function renderOutputCard(
  title: string,
  target: 'workflow' | 'policy',
  path: string,
  content: string,
  copiedTarget: AppRenderModel['copiedTarget'],
  open = false,
): string {
  return `
    <details class="output-card" data-output-panel="${target}" ${
      open ? 'open' : ''
    }>
      <summary>
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(path)}</p>
        </div>
      </summary>
      <div class="output-card__body">
        <div class="output-card__actions">
          <button
            class="btn btn-outline-secondary btn-sm"
            type="button"
            data-action="copy-output"
            data-target="${target}"
          >
            ${copiedTarget === target ? 'Copied' : 'Copy'}
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="Download ${escapeHtml(title)}"
            title="Download ${escapeHtml(title)}"
            data-action="download-output"
            data-target="${target}"
          >
            ${DOWNLOAD_ICON}
          </button>
        </div>
        <pre class="preview-code"><code>${escapeHtml(content)}</code></pre>
      </div>
    </details>
  `;
}

function renderExportStep(model: AppRenderModel): string {
  return `
    <section class="wizard-panel">
      <div class="wizard-panel__intro">
        <p class="wizard-panel__eyebrow">Step 5</p>
        <h2>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'export')!.title,
        )}</h2>
        <p>${escapeHtml(
          QUICK_START_STEPS.find((step) => step.id === 'export')!.description,
        )}</p>
      </div>
      ${renderQuickStartSummary(model)}
      ${renderValidationErrors(model)}
      <div class="output-stack">
        ${renderOutputCard(
          'Workflow YAML',
          'workflow',
          '.github/workflows/policy.yml',
          model.output.workflowYaml,
          model.copiedTarget,
          true,
        )}
        ${renderOutputCard(
          'Policy YAML',
          'policy',
          '.github/pull-request-policy.yml',
          model.output.policyYaml,
          model.copiedTarget,
        )}
      </div>
      ${renderWizardFooter(model.activeQuickStartStep)}
    </section>
  `;
}

function renderQuickStartSection(model: AppRenderModel): string {
  let content = '';
  switch (model.activeQuickStartStep) {
    case 'baseline':
      content = renderBaselineStep(model);
      break;
    case 'review':
      content = renderReviewStep(model);
      break;
    case 'code':
      content = renderCodeStep(model);
      break;
    case 'operations':
      content = renderOperationsStep(model);
      break;
    case 'export':
      content = renderExportStep(model);
      break;
  }

  return `
    <section class="stacked-section">
      ${renderWizardStepper(model.activeQuickStartStep)}
      ${content}
    </section>
  `;
}

function renderPolicyField(
  policy: PolicyDraft,
  field: 'id' | 'description' | 'message',
  label: string,
  type: 'text' | 'textarea' = 'text',
): string {
  if (type === 'textarea') {
    return `
      <label class="form-label tiny-label">${escapeHtml(label)}</label>
      <textarea
        class="form-control form-control-sm"
        rows="3"
        data-action="policy-field"
        data-policy-uid="${policy.uid}"
        data-field="${field}"
      >${escapeHtml(policy[field])}</textarea>
    `;
  }

  return `
    <label class="form-label tiny-label">${escapeHtml(label)}</label>
    <input
      class="form-control form-control-sm"
      type="text"
      value="${escapeHtml(policy[field])}"
      data-action="policy-field"
      data-policy-uid="${policy.uid}"
      data-field="${field}"
    />
  `;
}

function renderExpressionControls(
  policy: PolicyDraft,
  section: 'when' | 'require',
  path: number[],
  node: ExpressionDraft,
): string {
  const pathValue = path.join('.');
  return `
    <div class="expression-controls btn-group btn-group-sm" role="group">
      <button class="btn btn-outline-secondary" type="button" data-action="expression-modal" data-policy-uid="${policy.uid}" data-section="${section}" data-mode="edit" data-path="${pathValue}">Edit</button>
      <button class="btn btn-outline-secondary" type="button" data-action="expression-modal" data-policy-uid="${policy.uid}" data-section="${section}" data-mode="add-sibling" data-path="${pathValue}">Add sibling</button>
      ${
        node.kind === 'combinator' && node.operator !== 'not'
          ? `<button class="btn btn-outline-secondary" type="button" data-action="expression-modal" data-policy-uid="${policy.uid}" data-section="${section}" data-mode="add-child" data-path="${pathValue}">Add child</button>`
          : ''
      }
      <button class="btn btn-outline-secondary" type="button" data-action="wrap-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-operator="all" data-path="${pathValue}">Wrap all</button>
      <button class="btn btn-outline-secondary" type="button" data-action="wrap-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-operator="any" data-path="${pathValue}">Wrap any</button>
      <button class="btn btn-outline-secondary" type="button" data-action="wrap-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-operator="not" data-path="${pathValue}">Wrap not</button>
      <button class="btn btn-outline-secondary" type="button" data-action="move-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-direction="up" data-path="${pathValue}">Up</button>
      <button class="btn btn-outline-secondary" type="button" data-action="move-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-direction="down" data-path="${pathValue}">Down</button>
      <button class="btn btn-outline-danger" type="button" data-action="remove-expression" data-policy-uid="${policy.uid}" data-section="${section}" data-path="${pathValue}">Delete</button>
    </div>
  `;
}

function renderExpressionNode(
  policy: PolicyDraft,
  section: 'when' | 'require',
  node: ExpressionDraft,
  path: number[],
): string {
  const summary = summarizeExpression(node);
  const typeLabel =
    node.kind === 'predicate'
      ? node.predicate.replaceAll('_', ' ')
      : node.operator.toUpperCase();
  const childrenHtml =
    node.kind !== 'combinator'
      ? ''
      : node.operator === 'not'
        ? node.child
          ? `<div class="expression-children">${renderExpressionNode(
              policy,
              section,
              node.child,
              [...path, 0],
            )}</div>`
          : '<div class="expression-empty">Add a child expression to make this group valid.</div>'
        : `<div class="expression-children">${node.children
            .map((child, index) =>
              renderExpressionNode(policy, section, child, [...path, index]),
            )
            .join('')}</div>`;

  return `
    <div class="expression-node">
      <div class="expression-node__header">
        <div>
          <span class="badge text-bg-light">${escapeHtml(typeLabel)}</span>
          <div class="expression-summary">${escapeHtml(summary)}</div>
        </div>
        ${renderExpressionControls(policy, section, path, node)}
      </div>
      ${childrenHtml}
    </div>
  `;
}

function renderExpressionSection(
  policy: PolicyDraft,
  section: 'when' | 'require',
  expression: ExpressionDraft | undefined,
): string {
  return `
    <section class="expression-section">
      <div class="d-flex justify-content-between align-items-center gap-3">
        <div>
          <h4 class="h6 mb-1">${section === 'when' ? 'When' : 'Require'}</h4>
          <p class="text-secondary small mb-0">
            ${
              section === 'when'
                ? 'Optional trigger condition.'
                : 'Required condition that must pass.'
            }
          </p>
        </div>
        ${
          expression
            ? ''
            : `<button class="btn btn-sm btn-outline-primary" type="button" data-action="expression-modal" data-policy-uid="${policy.uid}" data-section="${section}" data-mode="create-root" data-path="">Add expression</button>`
        }
      </div>
      <div class="mt-3">
        ${
          expression
            ? renderExpressionNode(policy, section, expression, [])
            : '<div class="expression-empty">No expression configured yet.</div>'
        }
      </div>
    </section>
  `;
}

function renderAdvancedPolicy(policy: PolicyDraft): string {
  return `
    <section class="card shadow-sm border-0 generator-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h3 class="h6 mb-1">${escapeHtml(policy.id || 'Untitled policy')}</h3>
            <p class="text-secondary mb-0">Build a policy using supported predicates and nested combinators.</p>
          </div>
          <button
            class="btn btn-sm btn-outline-danger"
            type="button"
            data-action="remove-policy"
            data-policy-uid="${policy.uid}"
          >
            Remove
          </button>
        </div>
        <div class="field-grid mt-3">
          <div>${renderPolicyField(policy, 'id', 'Policy id')}</div>
          <div>
            <label class="form-label tiny-label">Severity</label>
            <select
              class="form-select form-select-sm"
              data-action="policy-severity"
              data-policy-uid="${policy.uid}"
            >
              <option value="error" ${policy.severity === 'error' ? 'selected' : ''}>error</option>
              <option value="warn" ${policy.severity === 'warn' ? 'selected' : ''}>warn</option>
            </select>
          </div>
          <div class="field-grid__span-2">${renderPolicyField(policy, 'description', 'Description')}</div>
          <div class="field-grid__span-2">${renderPolicyField(policy, 'message', 'Message', 'textarea')}</div>
        </div>
        <div class="advanced-grid mt-4">
          ${renderExpressionSection(policy, 'when', policy.when)}
          ${renderExpressionSection(policy, 'require', policy.require)}
        </div>
      </div>
    </section>
  `;
}

function renderAdvancedSection(model: AppRenderModel): string {
  return `
    <section class="stacked-section">
      <section class="wizard-panel">
        <div class="wizard-panel__intro">
          <p class="wizard-panel__eyebrow">Advanced</p>
          <h2>Build a custom policy tree</h2>
          <p>Use this only when the quick path is too small.</p>
        </div>
        <div class="section-heading">
          <div></div>
          <button class="btn btn-primary btn-sm" type="button" data-action="add-policy">Add policy</button>
        </div>
        <div class="stacked-cards mt-3">
          ${
            model.state.advanced.policies.length > 0
              ? model.state.advanced.policies.map(renderAdvancedPolicy).join('')
              : '<div class="empty-panel">No advanced policies yet.</div>'
          }
        </div>
      </section>
      <section class="wizard-panel">
        <div class="wizard-panel__intro">
          <p class="wizard-panel__eyebrow">Output</p>
          <h2>Generated files</h2>
          <p>Fold these open when you want the raw YAML.</p>
        </div>
        ${renderValidationErrors(model)}
        <div class="output-stack">
          ${renderOutputCard(
            'Workflow YAML',
            'workflow',
            '.github/workflows/policy.yml',
            model.output.workflowYaml,
            model.copiedTarget,
            true,
          )}
          ${renderOutputCard(
            'Policy YAML',
            'policy',
            '.github/pull-request-policy.yml',
            model.output.policyYaml,
            model.copiedTarget,
          )}
        </div>
      </section>
    </section>
  `;
}

export function renderApp(model: AppRenderModel): string {
  return `
    <div class="app-shell container-xl py-5">
      <header class="hero-panel">
        <span class="eyebrow">Pull Request Policy</span>
        <h1>Build the policy in a few clicks.</h1>
        <p>Less text. Smaller choices. One step at a time.</p>
      </header>
      <section class="mode-switcher" aria-label="Mode">
        ${renderModeButton('quick-start', model.state.mode, 'Quick Start')}
        ${renderModeButton('advanced', model.state.mode, 'Advanced')}
      </section>
      ${
        model.state.mode === 'quick-start'
          ? renderQuickStartSection(model)
          : renderAdvancedSection(model)
      }
    </div>
  `;
}

function renderPredicateFields(
  modalState: ExpressionModalRenderModel['modalState'],
): string {
  const form = modalState.form;
  switch (form.predicateType) {
    case 'changed':
    case 'exists':
      return `
        <label class="form-label tiny-label">Globs</label>
        <textarea class="form-control code-input" rows="6" data-action="modal-field" data-field="primaryLines">${escapeHtml(form.primaryLines)}</textarea>
      `;
    case 'body':
    case 'title':
      return `
        <label class="form-label tiny-label">Patterns</label>
        <textarea class="form-control code-input" rows="6" data-action="modal-field" data-field="primaryLines">${escapeHtml(form.primaryLines)}</textarea>
      `;
    case 'has_label':
      return `
        <label class="form-label tiny-label">Labels</label>
        <textarea class="form-control code-input" rows="4" data-action="modal-field" data-field="primaryLines">${escapeHtml(form.primaryLines)}</textarea>
      `;
    case 'approval_count_at_least':
      return `
        <label class="form-label tiny-label">Approval threshold</label>
        <input class="form-control" type="number" min="0" step="1" value="${escapeHtml(form.approvals)}" data-action="modal-field" data-field="approvals" />
      `;
    case 'file_contains':
      return `
        <label class="form-label tiny-label">Target file globs</label>
        <textarea class="form-control code-input" rows="4" data-action="modal-field" data-field="primaryLines">${escapeHtml(form.primaryLines)}</textarea>
        <label class="form-label tiny-label mt-3">Patterns</label>
        <textarea class="form-control code-input" rows="4" data-action="modal-field" data-field="secondaryLines">${escapeHtml(form.secondaryLines)}</textarea>
      `;
    default:
      return '';
  }
}

export function renderExpressionModal(
  model: ExpressionModalRenderModel,
): string {
  const { modalState, existingExpression } = model;
  const form = modalState.form;
  const title =
    modalState.mode === 'edit'
      ? 'Edit expression'
      : modalState.mode === 'create-root'
        ? `Add ${modalState.section} expression`
        : modalState.mode === 'add-child'
          ? 'Add child expression'
          : 'Add sibling expression';
  const currentSummary = existingExpression
    ? `<div class="current-expression">Current: ${escapeHtml(
        summarizeExpression(existingExpression),
      )}</div>`
    : '';

  return `
    <div class="modal-header">
      <div>
        <h2 class="modal-title fs-5">${escapeHtml(title)}</h2>
        ${currentSummary}
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
    </div>
    <form class="modal-content-shell" data-action="submit-expression-form">
      <div class="modal-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label tiny-label">Expression type</label>
            <select class="form-select" data-action="modal-field" data-field="draftKind">
              <option value="predicate" ${form.draftKind === 'predicate' ? 'selected' : ''}>Predicate</option>
              <option value="combinator" ${form.draftKind === 'combinator' ? 'selected' : ''}>Combinator</option>
            </select>
          </div>
          ${
            form.draftKind === 'predicate'
              ? `
                <div class="col-md-6">
                  <label class="form-label tiny-label">Predicate</label>
                  <select class="form-select" data-action="modal-field" data-field="predicateType">
                    <option value="changed" ${form.predicateType === 'changed' ? 'selected' : ''}>changed</option>
                    <option value="exists" ${form.predicateType === 'exists' ? 'selected' : ''}>exists</option>
                    <option value="body" ${form.predicateType === 'body' ? 'selected' : ''}>body</option>
                    <option value="title" ${form.predicateType === 'title' ? 'selected' : ''}>title</option>
                    <option value="has_label" ${form.predicateType === 'has_label' ? 'selected' : ''}>has_label</option>
                    <option value="approval_count_at_least" ${form.predicateType === 'approval_count_at_least' ? 'selected' : ''}>approval_count_at_least</option>
                    <option value="file_contains" ${form.predicateType === 'file_contains' ? 'selected' : ''}>file_contains</option>
                  </select>
                </div>
                <div class="col-12">${renderPredicateFields(modalState)}</div>
              `
              : `
                <div class="col-md-6">
                  <label class="form-label tiny-label">Combinator</label>
                  <select class="form-select" data-action="modal-field" data-field="combinatorType">
                    <option value="all" ${form.combinatorType === 'all' ? 'selected' : ''}>all</option>
                    <option value="any" ${form.combinatorType === 'any' ? 'selected' : ''}>any</option>
                    <option value="not" ${form.combinatorType === 'not' ? 'selected' : ''}>not</option>
                  </select>
                </div>
                <div class="col-12">
                  <p class="text-secondary small mb-0">
                    Create an empty group here, then add child expressions from the policy card.
                  </p>
                </div>
              `
          }
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save expression</button>
      </div>
    </form>
  `;
}
