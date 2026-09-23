import { ROUNDNESS } from "@excalidraw/common";

import { pointFrom, type LocalPoint } from "@excalidraw/math";

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

  it("tidies a branched graph into directional levels", () => {
    const makeNode = (x: number, y: number) =>
      newElement({
        type: "rectangle",
        x,
        y,
        width: 120,
        height: 80,
      }) as ExcalidrawFlowchartNodeElement;
    const source = makeNode(600, 500);
    const branchA = makeNode(100, 100);
    const branchB = makeNode(900, 0);
    const unrelated = makeNode(2000, 2000);
    const arrow = (end: ExcalidrawFlowchartNodeElement) =>
      ({
        ...newArrowElement({
          type: "arrow",
          x: source.x,
          y: source.y,
          points: [
            pointFrom<LocalPoint>(0, 0),
            pointFrom<LocalPoint>(200, 200),
          ],
        }),
        startBinding: {
          elementId: source.id,
          fixedPoint: [0.5, 0.5],
          mode: "orbit",
        },
        endBinding: {
          elementId: end.id,
          fixedPoint: [0.5, 0.5],
          mode: "orbit",
        },
      } as ExcalidrawArrowElement);
    const scene = new Scene(
      [source, branchA, branchB, unrelated, arrow(branchA), arrow(branchB)],
      { skipValidation: true },
    );

    const layout = getFlowchartLayout(
      [source, branchA, branchB],
      scene.getNonDeletedElementsMap(),
    );

    expect(layout.has(source.id)).toBe(true);
    expect(layout.has(branchA.id)).toBe(true);
    expect(layout.has(branchB.id)).toBe(true);
    expect(layout.has(unrelated.id)).toBe(false);
    expect(layout.get(branchA.id)!.y).toBe(layout.get(branchB.id)!.y);
    expect(
      Math.abs(layout.get(branchA.id)!.x - layout.get(branchB.id)!.x),
    ).toBeGreaterThanOrEqual(220);
  });

  it("assigns finite positions to cyclic graphs", () => {
    const nodes = [0, 1, 2].map(
      (index) =>
        newElement({
          type: "diamond",
          x: index * 400,
          y: index * 250,
          width: 120,
          height: 80,
        }) as ExcalidrawFlowchartNodeElement,
    );
    const arrows = nodes.map(
      (node, index) =>
        ({
          ...newArrowElement({
            type: "arrow",
            x: node.x,
            y: node.y,
            points: [
              pointFrom<LocalPoint>(0, 0),
              pointFrom<LocalPoint>(200, 200),
            ],
          }),
          startBinding: {
            elementId: node.id,
            fixedPoint: [0.5, 0.5],
            mode: "orbit",
          },
          endBinding: {
            elementId: nodes[(index + 1) % nodes.length].id,
            fixedPoint: [0.5, 0.5],
            mode: "orbit",
          },
        } as ExcalidrawArrowElement),
    );
    const scene = new Scene([...nodes, ...arrows], { skipValidation: true });

    const layout = getFlowchartLayout(nodes, scene.getNonDeletedElementsMap());

    expect(layout.size).toBe(nodes.length);
    for (const position of layout.values()) {
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
    }
  });
});
