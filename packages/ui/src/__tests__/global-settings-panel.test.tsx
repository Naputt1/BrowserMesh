import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlobalSettingsPanel } from "../global-settings-panel.js";

describe("GlobalSettingsPanel", () => {
  it("renders all major sections", () => {
    render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Timing")).toBeTruthy();
    expect(screen.getByText("Pages")).toBeTruthy();
    expect(screen.getByText("State Persistence")).toBeTruthy();
    expect(screen.getByText("Output Type")).toBeTruthy();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe("Timing section", () => {
    it("renders timing inputs with default values", () => {
      render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
      expect(screen.getByText("Instant")).toBeTruthy();
      expect(screen.getByText("Fast")).toBeTruthy();
    });

    it("displays timing values from settings", () => {
      const settings = {
        timing: {
          minDelayMs: 100,
          maxDelayMs: 500,
          typingSpeed: "human" as const,
          requestJitter: true,
          scrollSimulation: false,
          randomMouseMovement: true,
        },
      };
      const { container } = render(<GlobalSettingsPanel settings={settings} onChange={() => {}} onClose={() => {}} />);
      expect(screen.getByDisplayValue("100")).toBeTruthy();
      expect(screen.getByDisplayValue("500")).toBeTruthy();
      expect(container.textContent).toContain("Human");
      expect(screen.getByText("Request jitter")).toBeTruthy();
      expect(screen.getByText("Random mouse movement")).toBeTruthy();
    });

    it("calls onChange when min delay changes", () => {
      const onChange = vi.fn();
      render(<GlobalSettingsPanel settings={{ timing: {} }} onChange={onChange} onClose={() => {}} />);
      const inputs = screen.getAllByDisplayValue("");
      fireEvent.change(inputs[0], { target: { value: "200" } });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("Pages section", () => {
    it("renders multi-page checkbox unchecked by default", () => {
      render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
      const checkbox = screen.getByText("Enable multi-page mode").previousElementSibling as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it("shows multi-page checkbox checked when enabled", () => {
      render(<GlobalSettingsPanel settings={{ multiPage: true }} onChange={() => {}} onClose={() => {}} />);
      const checkbox = screen.getByText("Enable multi-page mode").previousElementSibling as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe("State Persistence section", () => {
    it("renders state persistence checkbox", () => {
      render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
      expect(screen.getByText("Enable state persistence")).toBeTruthy();
    });
  });

  describe("Output Type section", () => {
    it("renders root type name input", () => {
      render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
      expect(screen.getByPlaceholderText("Output")).toBeTruthy();
    });

    it("renders kind selector with default object", () => {
      render(<GlobalSettingsPanel settings={{}} onChange={() => {}} onClose={() => {}} />);
      expect(screen.getByDisplayValue("object")).toBeTruthy();
    });

    it("displays output type name from settings", () => {
      render(
        <GlobalSettingsPanel
          settings={{ outputType: { kind: "object", name: "Article", fields: [] } }}
          onChange={() => {}}
          onClose={() => {}}
        />,
      );
      expect(screen.getByDisplayValue("Article")).toBeTruthy();
    });

    it("calls onChange when root type name changes", () => {
      const onChange = vi.fn();
      render(<GlobalSettingsPanel settings={{}} onChange={onChange} onClose={() => {}} />);
      fireEvent.change(screen.getByPlaceholderText("Output"), { target: { value: "Product" } });
      expect(onChange).toHaveBeenCalled();
    });
  });
});
