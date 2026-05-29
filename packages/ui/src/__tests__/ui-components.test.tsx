import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserPane, ScreenshotViewer } from "../browser-pane.js";
import { SelectorOverlay } from "../selector-overlay.js";
import { ExtractionMapper } from "../extraction-mapper.js";
import { DevtoolsPanel } from "../devtools-panel.js";
import { TaskConsole } from "../task-console.js";

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

describe("BrowserPane", () => {
  it("renders empty state", () => {
    const { container } = render(<BrowserPane />);
    expect(container.textContent).toContain("No URL loaded");
  });

  it("displays URL in chrome bar", () => {
    render(<BrowserPane previewUrl="https://example.com" />);
    expect(screen.getByText("https://example.com")).toBeTruthy();
  });
});

describe("ScreenshotViewer", () => {
  it("shows empty state when no screenshots", () => {
    render(<ScreenshotViewer />);
    expect(screen.getByText("No screenshots captured")).toBeTruthy();
  });

  it("shows empty state with empty events array", () => {
    render(<ScreenshotViewer events={[]} />);
    expect(screen.getByText("No screenshots captured")).toBeTruthy();
  });
});

describe("SelectorOverlay", () => {
  it("renders with input and button", () => {
    render(<SelectorOverlay />);
    expect(screen.getByPlaceholderText(".class, #id, div > p")).toBeTruthy();
    expect(screen.getByText("Apply")).toBeTruthy();
  });

  it("shows inactive message when not active", () => {
    render(<SelectorOverlay active={false} />);
    expect(screen.getByText("Connect to a browser to use live selection")).toBeTruthy();
  });
});

describe("ExtractionMapper", () => {
  it("renders with type name", () => {
    render(<ExtractionMapper typeName="Article" />);
    expect(screen.getByText("Article")).toBeTruthy();
    expect(screen.getByText("Type:")).toBeTruthy();
  });

  it("shows empty state", () => {
    render(<ExtractionMapper typeName="Product" />);
    expect(screen.getByText("No fields defined. Add a field to start mapping.")).toBeTruthy();
  });

  it("adds field when clicking + Field", () => {
    render(<ExtractionMapper typeName="Book" />);
    fireEvent.click(screen.getByText("+ Field"));
    const inputs = screen.getAllByDisplayValue(/^$/);
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });
});

describe("DevtoolsPanel", () => {
  it("renders with console tab active by default", () => {
    render(<DevtoolsPanel />);
    expect(screen.getByText("Console")).toBeTruthy();
    expect(screen.getByText("Network")).toBeTruthy();
    expect(screen.getByText("No log entries")).toBeTruthy();
  });

  it("renders log events with correct level styling", () => {
    const logs = [
      { type: "log" as const, taskId: "t1", timestamp: new Date().toISOString(), level: "info" as const, message: "page loaded" },
      { type: "log" as const, taskId: "t1", timestamp: new Date().toISOString(), level: "warn" as const, message: "slow selector" },
      { type: "log" as const, taskId: "t1", timestamp: new Date().toISOString(), level: "error" as const, message: "timeout" },
    ];
    render(<DevtoolsPanel logs={logs} />);
    expect(screen.getByText("page loaded")).toBeTruthy();
    expect(screen.getByText("slow selector")).toBeTruthy();
    expect(screen.getByText("timeout")).toBeTruthy();
  });
});

describe("TaskConsole", () => {
  it("shows empty state", () => {
    render(<TaskConsole events={[]} />);
    expect(screen.getByText("No events yet")).toBeTruthy();
  });

  it("renders different event types", () => {
    const ts = new Date().toISOString();
    const events = [
      { type: "task_started" as const, taskId: "t1", timestamp: ts, workflowId: "w1" },
      { type: "step_started" as const, taskId: "t1", timestamp: ts, stepId: "n1", stepType: "navigate" as const },
      { type: "step_completed" as const, taskId: "t1", timestamp: ts, stepId: "n1" },
      { type: "log" as const, taskId: "t1", timestamp: ts, level: "info" as const, message: "navigating" },
      { type: "task_completed" as const, taskId: "t1", timestamp: ts, result: { ok: true } },
    ];
    render(<TaskConsole events={events} />);
    expect(screen.getByText("w1")).toBeTruthy();
    expect(screen.getByText(/navigating/)).toBeTruthy();
    expect(screen.getByText("[Started]")).toBeTruthy();
    expect(screen.getByText("[Done]")).toBeTruthy();
    expect(screen.getByText("[Completed]")).toBeTruthy();
  });

  it("renders failed event", () => {
    const ts = new Date().toISOString();
    const events = [
      { type: "task_failed" as const, taskId: "t1", timestamp: ts, errorCode: "TIMEOUT", message: "page did not load", retryable: false },
    ];
    render(<TaskConsole events={events} />);
    expect(screen.getByText("page did not load")).toBeTruthy();
    expect(screen.getByText("[Failed]")).toBeTruthy();
  });
});
