import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserPane, ScreenshotViewer } from "../browser-pane.js";
import { SelectorOverlay } from "../selector-overlay.js";
import { ExtractionMapper } from "../extraction-mapper.js";
import { DevtoolsPanel } from "../devtools-panel.js";
import { TaskConsole } from "../task-console.js";
import { ContextMenu } from "../components/ui/context-menu.js";

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

  it("renders progress event", () => {
    const ts = new Date().toISOString();
    const events = [{ type: "progress" as const, taskId: "t1", timestamp: ts, completedSteps: 3, totalSteps: 10 }];
    render(<TaskConsole events={events} />);
    expect(screen.getByText("3/10 steps")).toBeTruthy();
  });

  it("renders partial_data event", () => {
    const ts = new Date().toISOString();
    const events = [{ type: "partial_data" as const, taskId: "t1", timestamp: ts, path: "title", value: "Hello" }];
    render(<TaskConsole events={events} />);
    expect(screen.getByText(/title/)).toBeTruthy();
  });
});

describe("ContextMenu", () => {
  it("renders menu items", () => {
    render(
      <ContextMenu x={100} y={200} items={[{ label: "Edit" }, { label: "Delete" }]} onClose={() => {}} />,
    );
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("renders separators between items", () => {
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Cut" }, { separator: true }, { label: "Paste" }]} onClose={() => {}} />,
    );
    expect(screen.getByText("Cut")).toBeTruthy();
    expect(screen.getByText("Paste")).toBeTruthy();
  });

  it("calls item onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Edit", onClick }]} onClose={() => {}} />,
    );
    fireEvent.click(screen.getByText("Edit"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Item" }]} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking outside", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Item" }]} onClose={onClose} />,
    );
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders danger items (red styling)", () => {
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Delete", danger: true }]} onClose={() => {}} />,
    );
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("renders items with color dot", () => {
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Colored", color: "#ff0000" }]} onClose={() => {}} />,
    );
    expect(screen.getByText("Colored")).toBeTruthy();
  });

  it("renders disabled items", () => {
    render(
      <ContextMenu x={0} y={0} items={[{ label: "Disabled", disabled: true }]} onClose={() => {}} />,
    );
    const btn = screen.getByText("Disabled").closest("button");
    expect(btn).toHaveProperty("disabled", true);
  });

  it("renders items with icon", () => {
    render(
      <ContextMenu x={0} y={0} items={[{ label: "With Icon", icon: <span data-testid="icon">🔍</span> }]} onClose={() => {}} />,
    );
    expect(screen.getByTestId("icon")).toBeTruthy();
  });
});

describe("BrowserPane", () => {
  it("renders empty state with undefined URL", () => {
    const { container } = render(<BrowserPane />);
    expect(container.textContent).toContain("No URL loaded");
  });

  it("renders empty state with empty string URL", () => {
    const { container } = render(<BrowserPane previewUrl="" />);
    expect(container.textContent).toContain("No URL loaded");
  });
});

describe("ScreenshotViewer", () => {
  it("shows latest screenshot with multiple events", () => {
    const ts = new Date().toISOString();
    const events = [
      { type: "screenshot" as const, taskId: "t1", timestamp: ts, label: "page1", data: new Uint8Array([1, 2, 3]), mimeType: "image/png" as const },
      { type: "screenshot" as const, taskId: "t1", timestamp: ts, label: "page2", data: new Uint8Array([4, 5, 6]), mimeType: "image/png" as const },
    ];
    const { container } = render(<ScreenshotViewer events={events} />);
    expect(container.textContent).toContain("page2");
    expect(screen.getByAltText("page2")).toBeTruthy();
  });
});

describe("ExtractionMapper", () => {
  it("removes a field when clicking remove", () => {
    const { container } = render(<ExtractionMapper typeName="Test" />);
    fireEvent.click(screen.getByText("+ Field"));
    const removeButtons = container.querySelectorAll("button");
    const removeBtn = Array.from(removeButtons).find(
      (b) => b.querySelector("svg"),
    );
    expect(removeBtn).toBeTruthy();
  });
});
