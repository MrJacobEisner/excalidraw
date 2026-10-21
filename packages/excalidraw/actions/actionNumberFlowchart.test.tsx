import { CaptureUpdateAction, getBoundTextElement } from "@excalidraw/element";

import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import { API } from "../tests/helpers/api";
import { Keyboard } from "../tests/helpers/ui";
import { render } from "../tests/test-utils";

import {
  actionNumberFlowchart,
  orderFlowchartNodes,
} from "./actionNumberFlowchart";

const { h } = window;

const arrow = (from: string, to: string) =>
  API.createElement({
    type: "arrow",
    startBinding: {
      elementId: from,
      fixedPoint: [0.5, 1],
      mode: "orbit",
    },
    endBinding: {
      elementId: to,
      fixedPoint: [0.5, 0],
      mode: "orbit",
    },
  });

describe("auto-number flowchart steps", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally={true} />);
  });

  it("uses position order without arrows, independent of stacking order", () => {
    const bottom = API.createElement({ type: "rectangle", y: 300 });
    const right = API.createElement({ type: "rectangle", x: 200, y: 0 });
    const left = API.createElement({ type: "rectangle", x: 0, y: 0 });
    expect(orderFlowchartNodes([bottom, right, left], [])).toEqual([
      left,
      right,
      bottom,
    ]);
  });

  it("uses breadth-first topological order and position to break ties", () => {
    const start = API.createElement({ type: "rectangle", y: 500 });
    const left = API.createElement({ type: "rectangle", x: 0, y: 200 });
    const right = API.createElement({ type: "rectangle", x: 200, y: 200 });
    const end = API.createElement({ type: "rectangle", y: 0 });
    const nodes = [end, right, left, start];
    const edges = [
      arrow(start.id, right.id),
      arrow(start.id, left.id),
      arrow(left.id, end.id),
      arrow(right.id, end.id),
      arrow(start.id, left.id), // parallel arrows don't duplicate steps
    ];
    expect(orderFlowchartNodes(nodes, edges)).toEqual([
      start,
      left,
      right,
      end,
    ]);
  });

  it("handles cycles deterministically and ignores edges outside selection", () => {
    const a = API.createElement({ type: "rectangle", y: 0 });
    const b = API.createElement({ type: "rectangle", y: 200 });
    const outside = API.createElement({ type: "rectangle" });
    expect(
      orderFlowchartNodes(
        [b, a],
        [arrow(a.id, b.id), arrow(b.id, a.id), arrow(outside.id, a.id)],
      ),
    ).toEqual([a, b]);
  });

  it("respects a reversed arrowhead", () => {
    const a = API.createElement({ type: "rectangle", y: 0 });
    const b = API.createElement({ type: "rectangle", y: 200 });
    const edge = {
      ...arrow(a.id, b.id),
      startArrowhead: "arrow" as const,
      endArrowhead: null,
    };
    expect(orderFlowchartNodes([a, b], [edge])).toEqual([b, a]);
  });

  const setSelection = (elements: NonDeletedExcalidrawElement[]) => {
    API.updateScene({
      elements,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    API.setSelectedElements(
      elements.filter((element) => element.type === "rectangle"),
    );
  };
  const labelFor = (node: ExcalidrawElement) =>
    getBoundTextElement(
      API.getElement(node),
      h.app.scene.getNonDeletedElementsMap(),
    );

  it("replaces numeric prefixes, preserves label styling, and reruns cleanly", () => {
    const [a, aLabel] = API.createTextContainer({
      label: { text: "9. Start" },
    });
    const [b, bLabel] = API.createTextContainer({
      label: { text: "3) Finish" },
    });
    h.app.scene.mutateElement(b, { y: 300 });
    setSelection([b, bLabel, a, aLabel]);
    const originalFont = labelFor(a)!.fontFamily;
    API.executeAction(actionNumberFlowchart);
    expect(labelFor(a)!.originalText).toBe("1. Start");
    expect(labelFor(b)!.originalText).toBe("2. Finish");
    expect(labelFor(a)!.fontFamily).toBe(originalFont);
    API.executeAction(actionNumberFlowchart);
    expect(labelFor(a)!.originalText).toBe("1. Start");
    expect(labelFor(b)!.originalText).toBe("2. Finish");
  });

  it("creates bound labels for connected empty shapes and undoes in one step", () => {
    const a = API.createElement({ type: "rectangle", y: 200 });
    const b = API.createElement({ type: "rectangle", y: 0 });
    setSelection([a, b, arrow(a.id, b.id)]);
    const originalCount = h.elements.length;
    API.executeAction(actionNumberFlowchart);
    expect(labelFor(a)!.originalText).toBe("1. ");
    expect(labelFor(b)!.originalText).toBe("2. ");
    expect(labelFor(a)!.containerId).toBe(a.id);
    expect(h.elements.length).toBe(originalCount + 2);
    Keyboard.undo();
    expect(labelFor(a)).toBeNull();
    expect(labelFor(b)).toBeNull();
    expect(h.elements.filter((element) => !element.isDeleted).length).toBe(
      originalCount,
    );
    Keyboard.redo();
    expect(labelFor(a)!.originalText).toBe("1. ");
    expect(labelFor(b)!.originalText).toBe("2. ");
  });

  it("is available for labeled or connected selections, not empty/unrelated ones", () => {
    const a = API.createElement({ type: "rectangle" });
    const b = API.createElement({ type: "rectangle", y: 200 });
    const available = () =>
      actionNumberFlowchart.predicate(h.elements, h.state, h.app.props, h.app);
    setSelection([a, b]);
    expect(available()).toBe(false);
    setSelection([a, b, arrow(a.id, b.id)]);
    expect(available()).toBe(true);
    API.setSelectedElements([a]);
    expect(available()).toBe(false);
    const [c, cText] = API.createTextContainer();
    const [d, dText] = API.createTextContainer();
    setSelection([c, cText, d, dText]);
    expect(available()).toBe(true);
  });
});
