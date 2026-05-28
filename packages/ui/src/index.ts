import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";

export type WorkflowBuilderProps = {
  readonly workflow?: WorkflowDefinition;
  readonly events?: readonly WorkflowEvent[];
  readonly onWorkflowChange?: (workflow: WorkflowDefinition) => void;
};

export type BrowserPaneProps = {
  readonly previewUrl?: string;
};

export type SelectorOverlayProps = {
  readonly active?: boolean;
  readonly onSelectorPick?: (selector: string) => void;
};

export type ExtractionMapperProps = {
  readonly typeName: string;
  readonly scopeId?: string;
};

export type DevtoolsPanelProps = {
  readonly logs?: readonly WorkflowEvent[];
};

export type TaskConsoleProps = {
  readonly events: readonly WorkflowEvent[];
};

export function WorkflowBuilder(_props: WorkflowBuilderProps): null {
  return null;
}

export function WorkflowCanvas(_props: WorkflowBuilderProps): null {
  return null;
}

export function BrowserPane(_props: BrowserPaneProps): null {
  return null;
}

export function SelectorOverlay(_props: SelectorOverlayProps): null {
  return null;
}

export function ExtractionMapper(_props: ExtractionMapperProps): null {
  return null;
}

export function DevtoolsPanel(_props: DevtoolsPanelProps): null {
  return null;
}

export function TaskConsole(_props: TaskConsoleProps): null {
  return null;
}

