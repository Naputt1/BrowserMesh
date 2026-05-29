import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NodeConfigPanel } from "../node-config-panel.js";

describe("NodeConfigPanel", () => {
  it("shows empty state when node is null", () => {
    render(<NodeConfigPanel node={null} onUpdate={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("Select a node to edit")).toBeTruthy();
  });

  it("renders node label and type", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "My Node", type: "navigate", config: { url: "https://example.com" } }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("My Node")).toBeTruthy();
    expect(screen.getByText("navigate")).toBeTruthy();
  });

  it("renders category from definition", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Nav", type: "navigate", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("action")).toBeTruthy();
  });

  it("calls onUpdate with label change", () => {
    const onUpdate = vi.fn();
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Old", type: "start", config: {} }}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onUpdate).toHaveBeenCalledWith("n1", { label: "New" });
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Test", type: "start", config: {} }}
        onUpdate={() => {}}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete Node"));
    expect(onDelete).toHaveBeenCalledWith("n1");
  });

  const noConfigTypes = ["start", "end", "break", "continue", "if", "and", "or", "not"];
  for (const type of noConfigTypes) {
    it(`shows 'No configuration needed' for ${type}`, () => {
      render(
        <NodeConfigPanel
          node={{ id: "n1", label: type, type: type as any, config: {} }}
          onUpdate={() => {}}
          onDelete={() => {}}
        />,
      );
      expect(screen.getByText("No configuration needed")).toBeTruthy();
    });
  }

  it("renders navigate URL input", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Nav", type: "navigate", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("https://example.com")).toBeTruthy();
    expect(screen.getByText("Wait Until")).toBeTruthy();
  });

  it("renders click selector input", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Click", type: "click", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(".btn, #submit")).toBeTruthy();
  });

  it("renders type selector and value inputs", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Type", type: "type", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("#search")).toBeTruthy();
    expect(screen.getByPlaceholderText("text to type")).toBeTruthy();
  });

  it("renders wait duration and selector inputs", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Wait", type: "wait", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("1000")).toBeTruthy();
    expect(screen.getByPlaceholderText(".loaded")).toBeTruthy();
  });

  it("renders scroll direction selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Scroll", type: "scroll", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Down")).toBeTruthy();
    expect(screen.getByText("Up")).toBeTruthy();
  });

  it("renders select mode and index inputs", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Select", type: "select", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText(".item, h1, a")).toBeTruthy();
    expect(screen.getByText("Select One (single element)")).toBeTruthy();
    expect(screen.getByText("Select All (multiple elements)")).toBeTruthy();
  });

  it("renders extract property selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Extract", type: "extract", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Text Content")).toBeTruthy();
    expect(screen.getByText("Attribute")).toBeTruthy();
  });

  it("shows attribute name input when extract property is attribute", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Extract", type: "extract", config: { property: "attribute" } }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("href, src, title")).toBeTruthy();
  });

  it("renders loop config", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Loop", type: "loop", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("10")).toBeTruthy();
  });

  it("renders custom handler name input", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Custom", type: "custom", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByPlaceholderText("myHandler")).toBeTruthy();
  });

  it("renders fetch config with method selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Fetch", type: "fetch", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByDisplayValue("GET")).toBeTruthy();
  });

  it("renders listen config", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Listen", type: "listen", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("URL Patterns")).toBeTruthy();
    expect(screen.getByText("Capture response body")).toBeTruthy();
    expect(screen.getByText("Re-inject on navigation")).toBeTruthy();
  });

  it("renders state config with operation selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "State", type: "state", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Get")).toBeTruthy();
    expect(screen.getByText("Set")).toBeTruthy();
    expect(screen.getByText("Increment")).toBeTruthy();
  });

  it("renders page config with action selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Page", type: "page", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Create Tab")).toBeTruthy();
    expect(screen.getByText("Select Tab")).toBeTruthy();
    expect(screen.getByText("Close Tab")).toBeTruthy();
  });

  it("renders switch config with case list", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Switch", type: "switch", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Cases")).toBeTruthy();
    expect(screen.getByText("+ Add case")).toBeTruthy();
  });

  it("renders compare config with operator selector", () => {
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Compare", type: "compare", config: {} }}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Equals (==)")).toBeTruthy();
    expect(screen.getByText("Not equals (!=)")).toBeTruthy();
    expect(screen.getByText("Greater than (>)")).toBeTruthy();
  });

  it("calls onUpdate when navigate URL changes", () => {
    const onUpdate = vi.fn();
    render(
      <NodeConfigPanel
        node={{ id: "n1", label: "Nav", type: "navigate", config: { url: "" } }}
        onUpdate={onUpdate}
        onDelete={() => {}}
      />,
    );
    const urlInput = screen.getByPlaceholderText("https://example.com");
    fireEvent.change(urlInput, { target: { value: "https://example.com" } });
    expect(onUpdate).toHaveBeenCalledWith("n1", { config: { url: "https://example.com" } });
  });
});
