import { useRef, useEffect } from "react";
import type { WorkflowEvent } from "@browsermesh/workflow";

export type TaskConsoleProps = {
  readonly events: readonly WorkflowEvent[];
};

const eventColors: Record<string, string> = {
  task_started: "text-blue-600",
  step_started: "text-amber-600",
  step_completed: "text-green-600",
  partial_data: "text-purple-600",
  log: "text-gray-600",
  progress: "text-teal-600",
  task_completed: "text-green-700 font-semibold",
  task_failed: "text-red-600 font-semibold",
};

const eventLabels: Record<string, string> = {
  task_started: "Started",
  step_started: "Step",
  step_completed: "Done",
  partial_data: "Data",
  log: "Log",
  progress: "Progress",
  task_completed: "Completed",
  task_failed: "Failed",
};

export function TaskConsole({ events }: TaskConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg border overflow-hidden flex flex-col h-full">
      <div className="px-3 py-1.5 border-b border-gray-700 text-xs font-medium text-gray-400">
        Task Console
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-0.5">
        {events.length === 0 ? (
          <div className="text-gray-500 italic p-2">No events yet</div>
        ) : (
          events.map((event, i) => (
            <div key={i} className={`${eventColors[event.type] ?? "text-gray-400"} hover:bg-gray-800 px-1 py-0.5 rounded`}>
              <span className="text-gray-500 mr-2">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className="font-medium mr-1">[{eventLabels[event.type] ?? event.type}]</span>
              {renderEventMessage(event)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function renderEventMessage(event: WorkflowEvent): string {
  switch (event.type) {
    case "task_started":
      return event.workflowId;
    case "step_started":
      return `${event.stepType}: ${event.stepId}`;
    case "step_completed":
      return event.stepId;
    case "partial_data":
      return `${event.path} = ${JSON.stringify(event.value)}`;
    case "log":
      return event.message;
    case "progress":
      return `${event.message ?? `${event.completedSteps}/${event.totalSteps} steps`}`;
    case "task_completed":
      return event.result ? JSON.stringify(event.result) : "Done";
    case "task_failed":
      return event.message;
    default:
      return JSON.stringify(event);
  }
}
