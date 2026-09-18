import { CaptureUpdateAction } from "@excalidraw/element";
import {
  isFlowchartNodeElement,
  newArrowElement,
  newElement,
} from "@excalidraw/element";

import { pointFrom } from "@excalidraw/math";

import type {
  ExcalidrawArrowElement,
  ExcalidrawFlowchartNodeElement,
} from "@excalidraw/element/types";

import { actionAutoLayoutFlowchart } from "../actions/actionAutoLayoutFlowchart";
import { createRedoAction, createUndoAction } from "../actions/actionHistory";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { render, unmountComponent } from "./test-utils";

const { h } = window;

const makeNode = (x: number, y: number): ExcalidrawFlowchartNodeElement => {
  const node = newElement({
    type: "rectangle",
    x,
    y,
    width: 120,
    height: 80,
  });
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

describe("auto-layout flowchart action", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  afterEach(() => {
    unmountComponent();
  });

  it("invokes through the action manager and creates one undoable history entry", () => {
    const upstream = makeNode(700, 500);
    const downstream = makeNode(100, 100);
    const arrow = makeArrow(upstream.id, downstream.id);
    const elements = [upstream, downstream, arrow];

    API.updateScene({
      elements,
      appState: {
        selectedElementIds: {
          [upstream.id]: true,
          [downstream.id]: true,
        },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });

    const undoCountBefore = h.history.undoStack.length;
    API.executeAction(actionAutoLayoutFlowchart);

    const updatedUpstream = h.elements.find(({ id }) => id === upstream.id)!;
    const updatedDownstream = h.elements.find(
      ({ id }) => id === downstream.id,
    )!;
    const updatedArrow = h.elements.find(
      ({ id }) => id === arrow.id,
    ) as ExcalidrawArrowElement;

    expect(updatedUpstream.y).toBeLessThan(updatedDownstream.y);
    expect(updatedUpstream.x).toBe(700);
    expect(updatedDownstream.x).toBe(700);
    expect(updatedArrow.startBinding?.elementId).toBe(upstream.id);
    expect(updatedArrow.endBinding?.elementId).toBe(downstream.id);
    expect(h.history.undoStack.length).toBe(undoCountBefore + 1);

    API.executeAction(createUndoAction(h.history));

    const undoneUpstream = h.elements.find(({ id }) => id === upstream.id)!;
    const undoneDownstream = h.elements.find(({ id }) => id === downstream.id)!;
    const undoneArrow = h.elements.find(
      ({ id }) => id === arrow.id,
    ) as ExcalidrawArrowElement;

    expect(undoneUpstream.x).toBe(700);
    expect(undoneUpstream.y).toBe(500);
    expect(undoneDownstream.x).toBe(100);
    expect(undoneDownstream.y).toBe(100);
    expect(undoneArrow.startBinding?.elementId).toBe(upstream.id);
    expect(undoneArrow.endBinding?.elementId).toBe(downstream.id);

    API.executeAction(createRedoAction(h.history));

    const redoneUpstream = h.elements.find(({ id }) => id === upstream.id)!;
    const redoneDownstream = h.elements.find(({ id }) => id === downstream.id)!;

    expect(redoneUpstream.x).toBe(700);
    expect(redoneUpstream.y).toBe(100);
    expect(redoneDownstream.x).toBe(700);
    expect(redoneDownstream.y).toBe(280);
  });
});
