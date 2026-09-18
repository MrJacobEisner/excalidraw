import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { FlowchartLab } from "./FlowchartLab";

describe("Flowchart lab authoring approaches", () => {
  it("builds an editable sequence and inserts in the selected direction", () => {
    const onInsert = vi.fn();
    render(<FlowchartLab onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Step 2 label"), {
      target: { value: "Check inventory" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Horizontal/ }));
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    const [graph, direction] = onInsert.mock.calls[0];
    expect(graph.nodes[1].label).toBe("Check inventory");
    expect(graph.edges).toHaveLength(3);
    expect(direction).toBe("right");
    expect(screen.getByRole("status")).toHaveTextContent("Inserted 4 nodes");
  });

  it("prevents empty step labels and keeps at least one step", () => {
    render(<FlowchartLab onInsert={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Step 1 label"), {
      target: { value: " " },
    });
    expect(
      screen.getByRole("button", { name: /Insert flowchart/ }),
    ).toBeDisabled();
    for (let index = 0; index < 3; index++) {
      fireEvent.click(
        screen.getAllByRole("button", { name: /Remove step/ })[0],
      );
    }
    expect(screen.getByRole("button", { name: /Remove step/ })).toBeDisabled();
  });

  it("inserts the selected template", () => {
    const onInsert = vi.fn();
    render(<FlowchartLab onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
    fireEvent.click(screen.getByRole("button", { name: /Incident response/ }));
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    expect(onInsert.mock.calls[0][0].nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Critical?" })]),
    );
  });

  it("validates text and recovers without inserting invalid input", () => {
    const onInsert = vi.fn();
    render(<FlowchartLab onInsert={onInsert} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Text" }));
    const source = screen.getByLabelText("Describe the connections");
    fireEvent.change(source, { target: { value: "Start ->" } });
    expect(screen.getByRole("alert")).toHaveTextContent("expected a node");
    expect(
      screen.getByRole("button", { name: /Insert flowchart/ }),
    ).toBeDisabled();
    expect(onInsert).not.toHaveBeenCalled();
    fireEvent.change(source, {
      target: { value: "Start -> Ready?\nReady? -Yes-> Done" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    expect(onInsert.mock.calls[0][0].edges[1].label).toBe("Yes");
  });

  it("closes with Escape even while typing", () => {
    const onClose = vi.fn();
    render(<FlowchartLab onInsert={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("Step 1 label"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
