import { create } from "zustand";
import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";

type StoredWorkflow = {
  id: string;
  name: string;
  workflow: WorkflowDefinition;
  updatedAt: string;
};

interface WorkflowStore {
  workflows: StoredWorkflow[];
  saveWorkflow: (workflow: WorkflowDefinition) => void;
  deleteWorkflow: (id: string) => void;
  getWorkflow: (id: string) => StoredWorkflow | undefined;
}

const STORAGE_KEY = "browsermesh-workflows";

function loadWorkflows(): StoredWorkflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWorkflows(workflows: StoredWorkflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: loadWorkflows(),

  saveWorkflow: (workflow: WorkflowDefinition) => {
    const existing = get().workflows.find((w) => w.id === workflow.id);
    const entry: StoredWorkflow = {
      id: workflow.id,
      name: workflow.name ?? `Workflow ${workflow.id.slice(0, 8)}`,
      workflow,
      updatedAt: new Date().toISOString(),
    };
    const updated = existing
      ? get().workflows.map((w) => (w.id === workflow.id ? entry : w))
      : [...get().workflows, entry];
    set({ workflows: updated });
    saveWorkflows(updated);
  },

  deleteWorkflow: (id: string) => {
    const updated = get().workflows.filter((w) => w.id !== id);
    set({ workflows: updated });
    saveWorkflows(updated);
  },

  getWorkflow: (id: string) => {
    return get().workflows.find((w) => w.id === id);
  },
}));

interface TaskStore {
  eventsByTaskId: Record<string, WorkflowEvent[]>;
  addEvent: (taskId: string, event: WorkflowEvent) => void;
  clearEvents: (taskId: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  eventsByTaskId: {},

  addEvent: (taskId: string, event: WorkflowEvent) => {
    set((state) => ({
      eventsByTaskId: {
        ...state.eventsByTaskId,
        [taskId]: [...(state.eventsByTaskId[taskId] ?? []), event],
      },
    }));
  },

  clearEvents: (taskId: string) => {
    set((state) => ({
      eventsByTaskId: {
        ...state.eventsByTaskId,
        [taskId]: [],
      },
    }));
  },
}));
