import { isArrowElement } from "@excalidraw/element";

import { createFlowchartElements } from "./elements";
import { FLOW_TEMPLATES } from "./model";

describe("flowchart native elements", () => {
  it.each(["down", "right"] as const)(
    "creates bound, editable nodes and arrows facing %s",
    (direction) => {
      for (const template of FLOW_TEMPLATES) {
        const elements = createFlowchartElements(template.graph, direction);
        const arrows = elements.filter(isArrowElement);
        expect(arrows).toHaveLength(template.graph.edges.length);
        for (const arrow of arrows) {
          expect(arrow.startBinding).not.toBeNull();
          expect(arrow.endBinding).not.toBeNull();
          const start = elements.find(
            (element) => element.id === arrow.startBinding?.elementId,
          );
          const end = elements.find(
            (element) => element.id === arrow.endBinding?.elementId,
          );
          expect(start?.boundElements).toContainEqual({
            id: arrow.id,
            type: "arrow",
          });
          expect(end?.boundElements).toContainEqual({
            id: arrow.id,
            type: "arrow",
          });
        }
        for (const node of template.graph.nodes) {
          expect(
            elements.some(
              (element) =>
                element.type === "text" && element.originalText === node.label,
            ),
          ).toBe(true);
        }
      }
    },
  );

  it("generates independent IDs for repeated insertions", () => {
    const graph = FLOW_TEMPLATES[0].graph;
    const firstIds = new Set(
      createFlowchartElements(graph, "down").map((element) => element.id),
    );
    const second = createFlowchartElements(graph, "down", { x: 500, y: 300 });
    expect(second.every((element) => !firstIds.has(element.id))).toBe(true);
  });

  it("rejects missing connection endpoints", () => {
    expect(() =>
      createFlowchartElements(
        {
          nodes: [{ id: "start", label: "Start", kind: "start" }],
          edges: [{ from: "start", to: "missing" }],
        },
        "down",
      ),
    ).toThrow();
  });
});
