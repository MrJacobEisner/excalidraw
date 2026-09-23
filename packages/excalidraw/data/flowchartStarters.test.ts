import { isArrowElement } from "@excalidraw/element";

import { FLOWCHART_STARTER_ITEMS } from "./flowchartStarters";

describe("flowchart starter templates", () => {
  it("provides distinct editable starter patterns", () => {
    expect(FLOWCHART_STARTER_ITEMS.map((item) => item.name)).toEqual([
      "Linear process",
      "Decision branch",
      "Repeat loop",
    ]);

    for (const starter of FLOWCHART_STARTER_ITEMS) {
      const nodes = starter.elements.filter(
        (element) =>
          element.type === "rectangle" ||
          element.type === "diamond" ||
          element.type === "ellipse",
      );
      const labels = starter.elements.filter(
        (element) => element.type === "text",
      );
      const arrows = starter.elements.filter(isArrowElement);

      expect(nodes.length).toBeGreaterThanOrEqual(2);
      expect(labels.length).toBe(nodes.length);
      expect(arrows.length).toBeGreaterThanOrEqual(1);
      expect(labels.every((label) => label.containerId)).toBe(true);
      expect(
        arrows.every(
          (arrow) =>
            arrow.startBinding?.elementId && arrow.endBinding?.elementId,
        ),
      ).toBe(true);
    }
  });

  it("keeps arrow and label bindings on the starter nodes", () => {
    for (const starter of FLOWCHART_STARTER_ITEMS) {
      const elementsById = new Map(
        starter.elements.map((element) => [element.id, element]),
      );

      for (const arrow of starter.elements.filter(isArrowElement)) {
        for (const binding of [arrow.startBinding, arrow.endBinding]) {
          const node = binding && elementsById.get(binding.elementId);
          expect(node?.boundElements).toEqual(
            expect.arrayContaining([{ type: "arrow", id: arrow.id }]),
          );
        }
      }
    }
  });
});
