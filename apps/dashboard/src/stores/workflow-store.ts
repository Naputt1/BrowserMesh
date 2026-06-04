import { create } from 'zustand';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';

type StoredWorkflow = {
  id: string;
  name: string;
  workflow: WorkflowDefinition;
  type: 'visual' | 'compiled';
  source?: string;
  updatedAt: string;
};

interface WorkflowStore {
  workflows: StoredWorkflow[];
  loaded: boolean;
  loading: boolean;
  loadWorkflows: () => Promise<void>;
  saveWorkflow: (record: {
    id?: string;
    name?: string;
    workflow: WorkflowDefinition;
    type?: 'visual' | 'compiled';
    source?: string;
  }) => Promise<StoredWorkflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  getLocalWorkflow: (id: string) => StoredWorkflow | undefined;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const STORAGE_KEY = 'browsermesh-workflows';

function loadLocal(): StoredWorkflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(workflows: StoredWorkflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: loadLocal(),
  loaded: false,
  loading: false,

  loadWorkflows: async () => {
    set({ loading: true });
    try {
      const { listWorkflows } = await import('../lib/api');
      const records = await listWorkflows();
      const mapped: StoredWorkflow[] = records.map((r) => ({
        id: r.id,
        name: r.name,
        workflow: r.workflow,
        type: r.type,
        source: r.source,
        updatedAt: r.updatedAt,
      }));
      set({ workflows: mapped, loaded: true, loading: false });
      saveLocal(mapped);
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  saveWorkflow: async (record) => {
    const { saveWorkflow: apiSave } = await import('../lib/api');
    const saved = await apiSave(record);
    const entry: StoredWorkflow = {
      id: saved.id,
      name: saved.name,
      workflow: saved.workflow,
      type: saved.type,
      source: saved.source,
      updatedAt: saved.updatedAt,
    };
    const existing = get().workflows.find((w) => w.id === entry.id);
    const updated = existing
      ? get().workflows.map((w) => (w.id === entry.id ? entry : w))
      : [...get().workflows, entry];
    set({ workflows: updated });
    saveLocal(updated);
    return saved;
  },

  deleteWorkflow: async (id: string) => {
    const { deleteWorkflow: apiDelete } = await import('../lib/api');
    await apiDelete(id);
    const updated = get().workflows.filter((w) => w.id !== id);
    set({ workflows: updated });
    saveLocal(updated);
  },

  getLocalWorkflow: (id: string) => {
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
