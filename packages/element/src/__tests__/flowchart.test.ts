import { ROUNDNESS } from "@excalidraw/common";
import { pointFrom } from "@excalidraw/math";

import type { AppState } from "@excalidraw/excalidraw/types";

import { Scene } from "../Scene";
import { addNewNodes, getFlowchartLayout } from "../flowchart";
import {
  newArrowElement,
  newElement,
  newStickyNoteElement,
} from "../newElement";
import { isFlowchartNodeElement, isStickyNoteElement } from "../typeChecks";

import type {
  ExcalidrawArrowElement,
  ExcalidrawFlowchartNodeElement,
} from "../types";

const makeNode = (
  type: "rectangle" | "ellipse" | "diamond",
  x: number,
  y: number,
  width: number,
  height: number,
): ExcalidrawFlowchartNodeElement => {
  const node = newElement({ type, x, y, width, height });
  if (!isFlowchartNodeElement(node)) {
    throw new Error("expected a flowchart node");
  }
  return node;
};

const makeArrow = (startId: string, endId: string): ExcalidrawArrowElement => {
  const arrow = newArrowElement({
    type: "arrow",
    x: 0,
    y: 0,
    points: [pointFrom(0, 0), pointFrom(1, 1)],
  });
  Object.assign(arrow, {
    startBinding: { elementId: startId, focus: 0, gap: 0 },
    endBinding: { elementId: endId, focus: 0, gap: 0 },
  });
  return arrow as ExcalidrawArrowElement;
};

describe("flowchart", () => {
  it("creates connected sticky notes", () => {
    const sticky = newStickyNoteElement({
      type: "stickynote",
      x: 100,
      y: 100,
      width: 240,
      height: 260,
      baseHeight: 220,
      roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
      roughness: 2,
      backgroundColor: "#ffec99",
      strokeColor: "#1e1e1e",
      strokeWidth: 2,
    });
    const scene = new Scene([sticky], { skipValidation: true });
    const {
      nodes: [nextNode, bindingArrow],
    } = addNewNodes(
      sticky,
      {
        currentItemEndArrowhead: "arrow",
      } as AppState,
      "right",
      scene,
      1,
    );

    expect(isFlowchartNodeElement(sticky)).toBe(true);
    expect(isFlowchartNodeElement(nextNode)).toBe(true);
    expect(isStickyNoteElement(nextNode)).toBe(true);
    expect(nextNode).toMatchObject({
      type: "stickynote",
      x: sticky.x + sticky.width + 100,
      y: sticky.y,
      width: sticky.width,
      height: sticky.height,
      baseHeight: sticky.baseHeight,
      roundness: sticky.roundness,
      roughness: sticky.roughness,
      backgroundColor: sticky.backgroundColor,
      strokeColor: sticky.strokeColor,
      strokeWidth: sticky.strokeWidth,
    });
    expect(bindingArrow).toMatchObject({
      type: "arrow",
      startBinding: { elementId: sticky.id },
      endBinding: { elementId: nextNode.id },
    });
  });

  it("lays out chains top-to-bottom with branching lanes", () => {
    const root = makeNode("rectangle", 400, 50, 100, 60);
    const left = makeNode("rectangle", 100, 400, 100, 60);
    const right = makeNode("rectangle", 700, 400, 100, 60);
    const arrows = [makeArrow(root.id, left.id), makeArrow(root.id, right.id)];

    const layout = getFlowchartLayout([root, left, right], arrows);

    expect(layout.get(root.id)).toEqual({ x: 400, y: 50 });
    expect(layout.get(left.id)!.y).toBe(210);
    expect(layout.get(right.id)!.y).toBe(210);
    expect(layout.get(left.id)!.x).toBeLessThan(layout.get(right.id)!.x);
    expect(layout.get(right.id)!.x - layout.get(left.id)!.x).toBe(200);
  });

  it("terminates deterministically for cycles and disconnected nodes", () => {
    const first = makeNode("diamond", 100, 100, 80, 80);
    const second = makeNode("ellipse", 400, 100, 120, 60);
    const isolated = makeNode("rectangle", 900, 900, 100, 40);
    const arrows = [
      makeArrow(first.id, second.id),
      makeArrow(second.id, first.id),
    ];

    const firstLayout = getFlowchartLayout([first, second, isolated], arrows);
    const secondLayout = getFlowchartLayout([first, second, isolated], arrows);

    expect(firstLayout).toEqual(secondLayout);
    expect(firstLayout.size).toBe(3);
    expect(firstLayout.get(isolated.id)!.y).toBe(100);
  });
});
