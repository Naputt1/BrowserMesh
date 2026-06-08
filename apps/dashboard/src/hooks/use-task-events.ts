import { useEffect, useRef } from 'react';
import { subscribeTaskEvents } from '../lib/api';
import { useTaskStore } from '../stores/workflow-store';
import type { WorkflowEvent } from '@browsermesh/sdk';

export function useTaskEvents(taskId: string | null) {
  const addEvent = useTaskStore((s) => s.addEvent);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!taskId) return;

    cleanupRef.current?.();
    cleanupRef.current = subscribeTaskEvents(taskId, (event: WorkflowEvent) => {
      addEvent(taskId, event);
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [taskId, addEvent]);
}
