import { convertToExcalidrawElements } from "@excalidraw/element";
import { pointFrom } from "@excalidraw/math";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element/transform";
import type { LocalPoint } from "@excalidraw/math";

import { layoutFlowGraph } from "./model";

import type { FlowGraph } from "./model";

/** Use native elements so charts retain bindings, editing, export, and undo. */
export const createFlowchartElements = (
  graph: FlowGraph,
  direction: "down" | "right",
  offset = { x: 0, y: 0 },
) => {
  const positions = layoutFlowGraph(graph, direction);
  const skeletons: ExcalidrawElementSkeleton[] = positions.map((node) => ({
    id: node.id,
    type:
      node.kind === "decision"
        ? "diamond"
        : node.kind === "start" || node.kind === "end"
        ? "ellipse"
        : "rectangle",
    x: offset.x + node.x,
    y: offset.y + node.y,
    width: 200,
    height: node.kind === "decision" ? 120 : 80,
    roundness: node.kind === "process" ? { type: 3 } : null,
    backgroundColor:
      node.kind === "decision"
        ? "#fff3bf"
        : node.kind === "start" || node.kind === "end"
        ? "#d3f9d8"
        : "#e5dbff",
    fillStyle: "solid",
    strokeColor: "#495057",
    strokeWidth: 2,
    roughness: 1,
    label: { text: node.label, fontSize: 18 },
  }));

  for (const edge of graph.edges) {
    const from = positions.find((node) => node.id === edge.from);
    const to = positions.find((node) => node.id === edge.to);
    if (!from || !to) {
      throw new Error("Every connection must reference an existing step.");
    }
    const fromHeight = from.kind === "decision" ? 120 : 80;
    const toHeight = to.kind === "decision" ? 120 : 80;
    const x = offset.x + from.x + (direction === "down" ? 100 : 200);
    const y =
      offset.y + from.y + (direction === "down" ? fromHeight : fromHeight / 2);
    const endX = offset.x + to.x + (direction === "down" ? 100 : 0);
    const endY = offset.y + to.y + (direction === "down" ? 0 : toHeight / 2);
    skeletons.push({
      type: "arrow",
      x,
      y,
      points: [
        pointFrom<LocalPoint>(0, 0),
        pointFrom<LocalPoint>(endX - x, endY - y),
      ],
      start: { id: edge.from },
      end: { id: edge.to },
      endArrowhead: "arrow",
      strokeColor: "#6965db",
      strokeWidth: 2,
      roughness: 1,
      ...(edge.label ? { label: { text: edge.label, fontSize: 16 } } : {}),
    });
  }

  // Regenerate IDs on each insertion, including all binding references.
  return convertToExcalidrawElements(skeletons);
};
