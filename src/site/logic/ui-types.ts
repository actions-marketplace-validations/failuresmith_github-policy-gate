import type {
  ExpressionDraft,
  GeneratorOutput,
  GeneratorState,
  QuickStartPolicyPresetId,
} from '../../generator/types';

export type CopyTarget = 'workflow' | 'policy' | null;

export type QuickStartWizardStepId =
  | 'baseline'
  | 'review'
  | 'code'
  | 'operations'
  | 'export';

export type ExpressionModalMode =
  | 'create-root'
  | 'edit'
  | 'add-sibling'
  | 'add-child';

export interface ExpressionFormState {
  draftKind: 'predicate' | 'combinator';
  predicateType:
    | 'changed'
    | 'exists'
    | 'body'
    | 'title'
    | 'has_label'
    | 'approval_count_at_least'
    | 'file_contains';
  combinatorType: 'all' | 'any' | 'not';
  primaryLines: string;
  secondaryLines: string;
  approvals: string;
}

export interface ExpressionModalState {
  policyUid: string;
  section: 'when' | 'require';
  path: number[];
  mode: ExpressionModalMode;
  form: ExpressionFormState;
}

export interface AppRenderModel {
  state: GeneratorState;
  output: GeneratorOutput;
  quickStartPreviews: Partial<Record<QuickStartPolicyPresetId, string>>;
  copiedTarget: CopyTarget;
  activeQuickStartStep: QuickStartWizardStepId;
}

export interface ExpressionModalRenderModel {
  modalState: ExpressionModalState;
  existingExpression?: ExpressionDraft | undefined;
}
