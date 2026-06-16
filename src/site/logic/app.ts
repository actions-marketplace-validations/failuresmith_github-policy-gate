import Modal from 'bootstrap/js/dist/modal';

import {
  addChildExpressionAtPath,
  addSiblingExpressionAtPath,
  getExpressionAtPath,
  moveExpressionAtPath,
  removeExpressionAtPath,
  replaceExpressionAtPath,
  wrapExpressionAtPath,
} from '../../generator/expressions';
import {
  createDefaultGeneratorState,
  createEmptyPolicyDraft,
  setSafeDefaultEnabled,
  syncSafeDefaultEnabled,
} from '../../generator/presets';
import {
  buildQuickStartPolicyMap,
  generateOutput,
  generatePolicyYaml,
} from '../../generator/policies';
import type {
  ExpressionDraft,
  GeneratorMode,
  GeneratorState,
  PolicyDraft,
  QuickStartPolicyPresetId,
} from '../../generator/types';
import { renderApp, renderExpressionModal } from './render';
import type {
  AppRenderModel,
  CopyTarget,
  ExpressionFormState,
  ExpressionModalMode,
  ExpressionModalState,
  QuickStartWizardStepId,
} from './ui-types';

const MODE_STORAGE_KEY = 'github-policy-gate-generator-mode';
const QUICK_START_WIZARD_STEPS: QuickStartWizardStepId[] = [
  'baseline',
  'review',
  'code',
  'operations',
  'export',
];

function isQuickStartWizardStepId(
  value: string | undefined,
): value is QuickStartWizardStepId {
  return (
    value === 'baseline' ||
    value === 'review' ||
    value === 'code' ||
    value === 'operations' ||
    value === 'export'
  );
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parsePath(pathValue: string): number[] {
  return pathValue.length === 0
    ? []
    : pathValue.split('.').map((segment) => Number.parseInt(segment, 10));
}

function createDefaultExpressionFormState(): ExpressionFormState {
  return {
    draftKind: 'predicate',
    predicateType: 'changed',
    combinatorType: 'all',
    primaryLines: '',
    secondaryLines: '',
    approvals: '1',
  };
}

function createExpressionFormState(
  expression?: ExpressionDraft,
): ExpressionFormState {
  if (!expression) {
    return createDefaultExpressionFormState();
  }

  if (expression.kind === 'predicate') {
    switch (expression.predicate) {
      case 'changed':
      case 'exists':
        return {
          draftKind: 'predicate',
          predicateType: expression.predicate,
          combinatorType: 'all',
          primaryLines: expression.globs.join('\n'),
          secondaryLines: '',
          approvals: '1',
        };
      case 'body':
      case 'title':
        return {
          draftKind: 'predicate',
          predicateType: expression.predicate,
          combinatorType: 'all',
          primaryLines: expression.patterns.join('\n'),
          secondaryLines: '',
          approvals: '1',
        };
      case 'has_label':
        return {
          draftKind: 'predicate',
          predicateType: 'has_label',
          combinatorType: 'all',
          primaryLines: expression.labels.join('\n'),
          secondaryLines: '',
          approvals: '1',
        };
      case 'approval_count_at_least':
        return {
          draftKind: 'predicate',
          predicateType: 'approval_count_at_least',
          combinatorType: 'all',
          primaryLines: '',
          secondaryLines: '',
          approvals: String(expression.approvals),
        };
      case 'file_contains':
        return {
          draftKind: 'predicate',
          predicateType: 'file_contains',
          combinatorType: 'all',
          primaryLines: expression.globs.join('\n'),
          secondaryLines: expression.patterns.join('\n'),
          approvals: '1',
        };
    }
  }

  return {
    draftKind: 'combinator',
    predicateType: 'changed',
    combinatorType: expression.operator,
    primaryLines: '',
    secondaryLines: '',
    approvals: '1',
  };
}

function createExpressionDraftFromForm(
  form: ExpressionFormState,
  existingExpression?: ExpressionDraft,
): ExpressionDraft {
  if (form.draftKind === 'predicate') {
    switch (form.predicateType) {
      case 'changed':
        return {
          kind: 'predicate',
          predicate: 'changed',
          globs: splitLines(form.primaryLines),
        };
      case 'exists':
        return {
          kind: 'predicate',
          predicate: 'exists',
          globs: splitLines(form.primaryLines),
        };
      case 'body':
        return {
          kind: 'predicate',
          predicate: 'body',
          patterns: splitLines(form.primaryLines),
        };
      case 'title':
        return {
          kind: 'predicate',
          predicate: 'title',
          patterns: splitLines(form.primaryLines),
        };
      case 'has_label':
        return {
          kind: 'predicate',
          predicate: 'has_label',
          labels: splitLines(form.primaryLines),
        };
      case 'approval_count_at_least':
        return {
          kind: 'predicate',
          predicate: 'approval_count_at_least',
          approvals:
            form.approvals.trim().length === 0
              ? ''
              : Number.parseInt(form.approvals, 10),
        };
      case 'file_contains':
        return {
          kind: 'predicate',
          predicate: 'file_contains',
          globs: splitLines(form.primaryLines),
          patterns: splitLines(form.secondaryLines),
        };
    }
  }

  if (!existingExpression || existingExpression.kind === 'predicate') {
    return form.combinatorType === 'not'
      ? { kind: 'combinator', operator: 'not' }
      : { kind: 'combinator', operator: form.combinatorType, children: [] };
  }

  if (form.combinatorType === existingExpression.operator) {
    return existingExpression;
  }

  if (form.combinatorType === 'not') {
    const child =
      existingExpression.operator === 'not'
        ? existingExpression.child
        : existingExpression.children[0];
    return child
      ? { kind: 'combinator', operator: 'not', child }
      : { kind: 'combinator', operator: 'not' };
  }

  const children =
    existingExpression.operator === 'not'
      ? existingExpression.child
        ? [existingExpression.child]
        : []
      : existingExpression.children;
  return {
    kind: 'combinator',
    operator: form.combinatorType,
    children,
  };
}

function toQuickStartPreviewMap(state: GeneratorState['quickStart']) {
  const policyMap = buildQuickStartPolicyMap(state);
  const previews: Partial<Record<QuickStartPolicyPresetId, string>> = {};
  for (const [presetId, policy] of Object.entries(policyMap)) {
    if (!policy) {
      continue;
    }
    previews[presetId as QuickStartPolicyPresetId] = generatePolicyYaml([
      policy,
    ]);
  }
  return previews;
}

export class PolicyGeneratorApp {
  private readonly modalElement: HTMLElement;

  private readonly modalBody: HTMLElement;

  private readonly bootstrapModal: Modal;

  private state = createDefaultGeneratorState();

  private copiedTarget: CopyTarget = null;

  private copyResetHandle?: ReturnType<typeof globalThis.setTimeout>;

  private modalState: ExpressionModalState | null = null;

  private activeQuickStartStep: QuickStartWizardStepId = 'baseline';

  public constructor(
    private readonly container: HTMLElement,
    modalElement: HTMLElement,
  ) {
    this.modalElement = modalElement;
    const modalBody = modalElement.querySelector('[data-modal-body]');
    if (!(modalBody instanceof HTMLElement)) {
      throw new Error('Modal body container is required.');
    }
    this.modalBody = modalBody;
    this.bootstrapModal = new Modal(modalElement);
  }

  public initialize(): void {
    this.restoreMode();
    this.container.addEventListener('click', (event) => {
      void this.handleClick(event);
    });
    this.container.addEventListener('change', this.handleChange);
    this.container.addEventListener('input', this.handleInput);
    this.modalElement.addEventListener('change', this.handleModalInput);
    this.modalElement.addEventListener('input', this.handleModalInput);
    this.modalElement.addEventListener('submit', this.handleModalSubmit);
    this.modalElement.addEventListener('hidden.bs.modal', () => {
      this.modalState = null;
      this.modalBody.innerHTML = '';
    });
    this.render();
  }

  private restoreMode(): void {
    const storedMode = globalThis.localStorage.getItem(MODE_STORAGE_KEY);
    if (storedMode === 'quick-start' || storedMode === 'advanced') {
      this.state = {
        ...this.state,
        mode: storedMode,
      };
    }
  }

  private persistMode(mode: GeneratorMode): void {
    globalThis.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }

  private render(): void {
    const model: AppRenderModel = {
      state: this.state,
      output: generateOutput(this.state),
      quickStartPreviews: toQuickStartPreviewMap(this.state.quickStart),
      copiedTarget: this.copiedTarget,
      activeQuickStartStep: this.activeQuickStartStep,
    };

    this.container.innerHTML = renderApp(model);

    if (this.modalState) {
      this.renderModal();
    }
  }

  private renderModal(): void {
    if (!this.modalState) {
      return;
    }

    const policy = this.state.advanced.policies.find(
      (candidate) => candidate.uid === this.modalState?.policyUid,
    );
    const existingExpression = policy
      ? getExpressionAtPath(
          policy[this.modalState.section],
          this.modalState.path,
        )
      : undefined;
    this.modalBody.innerHTML = renderExpressionModal(
      existingExpression
        ? {
            modalState: this.modalState,
            existingExpression,
          }
        : {
            modalState: this.modalState,
          },
    );
  }

  private readonly handleClick = async (event: Event): Promise<void> => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionElement = target.closest<HTMLElement>('[data-action]');
    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;
    if (!action) {
      return;
    }

    if (action === 'set-mode') {
      const mode = actionElement.dataset.mode;
      if (mode === 'quick-start' || mode === 'advanced') {
        this.state = { ...this.state, mode };
        this.persistMode(mode);
        this.render();
      }
      return;
    }

    if (action === 'set-quick-start-step') {
      const stepId = actionElement.dataset.stepId;
      if (!isQuickStartWizardStepId(stepId)) {
        return;
      }
      this.activeQuickStartStep = stepId;
      this.render();
      return;
    }

    if (action === 'shift-quick-start-step') {
      const direction = actionElement.dataset.direction;
      const currentIndex = QUICK_START_WIZARD_STEPS.indexOf(
        this.activeQuickStartStep,
      );
      const nextIndex =
        direction === 'next'
          ? Math.min(currentIndex + 1, QUICK_START_WIZARD_STEPS.length - 1)
          : Math.max(currentIndex - 1, 0);
      this.activeQuickStartStep =
        QUICK_START_WIZARD_STEPS[nextIndex] ?? this.activeQuickStartStep;
      this.render();
      return;
    }

    if (action === 'add-policy') {
      const sequence = this.state.advanced.nextPolicyNumber;
      this.state = {
        ...this.state,
        mode: 'advanced',
        advanced: {
          policies: [
            ...this.state.advanced.policies,
            createEmptyPolicyDraft(sequence),
          ],
          nextPolicyNumber: sequence + 1,
        },
      };
      this.persistMode('advanced');
      this.render();
      return;
    }

    if (action === 'remove-policy') {
      const policyUid = actionElement.dataset.policyUid;
      if (!policyUid) {
        return;
      }
      this.state = {
        ...this.state,
        advanced: {
          ...this.state.advanced,
          policies: this.state.advanced.policies.filter(
            (policy) => policy.uid !== policyUid,
          ),
        },
      };
      this.render();
      return;
    }

    if (action === 'copy-output') {
      const copyTarget = actionElement.dataset.target;
      const output = generateOutput(this.state);
      const content =
        copyTarget === 'workflow' ? output.workflowYaml : output.policyYaml;
      await globalThis.navigator.clipboard.writeText(content);
      this.copiedTarget = copyTarget === 'workflow' ? 'workflow' : 'policy';
      if (this.copyResetHandle) {
        globalThis.clearTimeout(this.copyResetHandle);
      }
      this.copyResetHandle = globalThis.setTimeout(() => {
        this.copiedTarget = null;
        this.render();
      }, 1500);
      this.render();
      return;
    }

    if (action === 'download-output') {
      const downloadTarget = actionElement.dataset.target;
      const output = generateOutput(this.state);
      const fileName =
        downloadTarget === 'workflow'
          ? 'policy-workflow.yml'
          : 'policy-gate.yml';
      const content =
        downloadTarget === 'workflow' ? output.workflowYaml : output.policyYaml;
      const url = globalThis.URL.createObjectURL(
        new Blob([content], { type: 'text/yaml;charset=utf-8' }),
      );
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      globalThis.URL.revokeObjectURL(url);
      return;
    }

    if (action === 'expression-modal') {
      const policyUid = actionElement.dataset.policyUid;
      const section = actionElement.dataset.section;
      const mode = actionElement.dataset.mode as
        | ExpressionModalMode
        | undefined;
      if (
        !policyUid ||
        (section !== 'when' && section !== 'require') ||
        !mode
      ) {
        return;
      }
      const path = parsePath(actionElement.dataset.path ?? '');
      const policy = this.state.advanced.policies.find(
        (candidate) => candidate.uid === policyUid,
      );
      const existingExpression = policy
        ? getExpressionAtPath(policy[section], path)
        : undefined;
      this.modalState = {
        policyUid,
        section,
        path,
        mode,
        form: createExpressionFormState(existingExpression),
      };
      this.renderModal();
      this.bootstrapModal.show();
      return;
    }

    if (action === 'wrap-expression') {
      const policyUid = actionElement.dataset.policyUid;
      const section = actionElement.dataset.section;
      const operator = actionElement.dataset.operator;
      if (
        !policyUid ||
        (section !== 'when' && section !== 'require') ||
        (operator !== 'all' && operator !== 'any' && operator !== 'not')
      ) {
        return;
      }
      this.updatePolicy(policyUid, (policy) => ({
        ...policy,
        [section]: wrapExpressionAtPath(
          policy[section],
          parsePath(actionElement.dataset.path ?? ''),
          operator,
        ),
      }));
      return;
    }

    if (action === 'remove-expression') {
      const policyUid = actionElement.dataset.policyUid;
      const section = actionElement.dataset.section;
      if (!policyUid || (section !== 'when' && section !== 'require')) {
        return;
      }
      this.updatePolicy(policyUid, (policy) => ({
        ...policy,
        [section]: removeExpressionAtPath(
          policy[section],
          parsePath(actionElement.dataset.path ?? ''),
        ),
      }));
      return;
    }

    if (action === 'move-expression') {
      const policyUid = actionElement.dataset.policyUid;
      const section = actionElement.dataset.section;
      const direction = actionElement.dataset.direction;
      if (
        !policyUid ||
        (section !== 'when' && section !== 'require') ||
        (direction !== 'up' && direction !== 'down')
      ) {
        return;
      }
      this.updatePolicy(policyUid, (policy) => ({
        ...policy,
        [section]: moveExpressionAtPath(
          policy[section],
          parsePath(actionElement.dataset.path ?? ''),
          direction,
        ),
      }));
    }
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === 'toggle-preset') {
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const presetId = target.dataset.presetId;
      if (!presetId) {
        return;
      }
      if (presetId === 'safe-default') {
        this.state = {
          ...this.state,
          quickStart: setSafeDefaultEnabled(
            this.state.quickStart,
            target.checked,
          ),
        };
      } else {
        const presets = {
          ...this.state.quickStart.presets,
          [presetId]: {
            ...this.state.quickStart.presets[
              presetId as QuickStartPolicyPresetId
            ],
            enabled: target.checked,
          },
        };
        this.state = {
          ...this.state,
          quickStart: syncSafeDefaultEnabled({ presets: presets as never }),
        };
      }
      this.render();
      return;
    }

    if (action === 'preset-severity') {
      const presetId = target.dataset.presetId as
        | QuickStartPolicyPresetId
        | undefined;
      if (!presetId || (target.value !== 'error' && target.value !== 'warn')) {
        return;
      }
      this.state = {
        ...this.state,
        quickStart: {
          presets: {
            ...this.state.quickStart.presets,
            [presetId]: {
              ...this.state.quickStart.presets[presetId],
              severity: target.value as PolicyDraft['severity'],
            },
          } as GeneratorState['quickStart']['presets'],
        },
      };
      this.render();
      return;
    }

    if (action === 'policy-severity') {
      const policyUid = target.dataset.policyUid;
      if (!policyUid || (target.value !== 'error' && target.value !== 'warn')) {
        return;
      }
      this.updatePolicy(policyUid, (policy) => ({
        ...policy,
        severity: target.value as PolicyDraft['severity'],
      }));
    }
  };

  private readonly handleInput = (event: Event): void => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === 'preset-lines') {
      const presetId = target.dataset.presetId as
        | QuickStartPolicyPresetId
        | undefined;
      const field = target.dataset.field;
      if (!presetId || !field || !(target instanceof HTMLTextAreaElement)) {
        return;
      }
      this.updateQuickStartPreset(presetId, field, splitLines(target.value));
      return;
    }

    if (action === 'preset-message') {
      const presetId = target.dataset.presetId as
        | QuickStartPolicyPresetId
        | undefined;
      if (!presetId || !(target instanceof HTMLInputElement)) {
        return;
      }
      this.updateQuickStartPreset(presetId, 'message', target.value);
      return;
    }

    if (action === 'preset-number') {
      const presetId = target.dataset.presetId as
        | QuickStartPolicyPresetId
        | undefined;
      const field = target.dataset.field;
      if (
        !presetId ||
        field !== 'approvals' ||
        !(target instanceof HTMLInputElement)
      ) {
        return;
      }
      this.updateQuickStartPreset(
        presetId,
        field,
        Number.parseInt(target.value || '0', 10),
      );
      return;
    }

    if (action === 'policy-field') {
      const policyUid = target.dataset.policyUid;
      const field = target.dataset.field as keyof Pick<
        PolicyDraft,
        'id' | 'description' | 'message'
      >;
      if (!policyUid || !field) {
        return;
      }
      this.updatePolicy(policyUid, (policy) => ({
        ...policy,
        [field]: target.value,
      }));
    }
  };

  private readonly handleModalInput = (event: Event): void => {
    if (!this.modalState) {
      return;
    }

    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
    ) {
      return;
    }

    const action = target.dataset.action;
    const field = target.dataset.field;
    if (action !== 'modal-field' || !field) {
      return;
    }

    this.modalState = {
      ...this.modalState,
      form: {
        ...this.modalState.form,
        [field]: target.value,
      },
    };
    this.renderModal();
  };

  private readonly handleModalSubmit = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    event.preventDefault();
    if (!this.modalState) {
      return;
    }

    const policy = this.state.advanced.policies.find(
      (candidate) => candidate.uid === this.modalState?.policyUid,
    );
    if (!policy) {
      return;
    }

    const existingExpression = getExpressionAtPath(
      policy[this.modalState.section],
      this.modalState.path,
    );
    const expression = createExpressionDraftFromForm(
      this.modalState.form,
      existingExpression,
    );

    this.updatePolicy(this.modalState.policyUid, (currentPolicy) => {
      const currentRoot = currentPolicy[this.modalState!.section];
      let nextRoot = currentRoot;
      switch (this.modalState?.mode) {
        case 'create-root':
          nextRoot = expression;
          break;
        case 'edit':
          nextRoot = replaceExpressionAtPath(
            currentRoot,
            this.modalState.path,
            expression,
          );
          break;
        case 'add-sibling':
          nextRoot = addSiblingExpressionAtPath(
            currentRoot,
            this.modalState.path,
            expression,
          );
          break;
        case 'add-child':
          nextRoot = addChildExpressionAtPath(
            currentRoot,
            this.modalState.path,
            expression,
          );
          break;
      }

      return {
        ...currentPolicy,
        [this.modalState!.section]: nextRoot,
      };
    });

    this.bootstrapModal.hide();
  };

  private updateQuickStartPreset(
    presetId: QuickStartPolicyPresetId,
    field: string,
    value: string[] | string | number,
  ): void {
    this.state = {
      ...this.state,
      quickStart: {
        presets: {
          ...this.state.quickStart.presets,
          [presetId]: {
            ...this.state.quickStart.presets[presetId],
            [field]: value,
          },
        } as GeneratorState['quickStart']['presets'],
      },
    };
    this.render();
  }

  private updatePolicy(
    policyUid: string,
    updater: (policy: PolicyDraft) => PolicyDraft,
  ): void {
    this.state = {
      ...this.state,
      advanced: {
        ...this.state.advanced,
        policies: this.state.advanced.policies.map((policy) =>
          policy.uid === policyUid ? updater(policy) : policy,
        ),
      },
    };
    this.render();
  }
}
