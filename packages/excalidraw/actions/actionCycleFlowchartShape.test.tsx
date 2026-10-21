import { fireEvent, queryByTestId } from "@testing-library/react";

import { distanceToElement, getBindingGap } from "@excalidraw/element";
import { pointFrom, type GlobalPoint } from "@excalidraw/math";

import type {
  ExcalidrawArrowElement,
  ExcalidrawBindableElement,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";
import { API } from "../tests/helpers/api";
import { Keyboard, Pointer, UI } from "../tests/helpers/ui";
import { render } from "../tests/test-utils";

import { actionCycleFlowchartShape } from "./actionCycleFlowchartShape";

const { h } = window;

describe("quick flowchart shape swap", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
  });

  it("cycles mixed nodes independently and preserves geometry and styling", () => {
    const nodes = (["rectangle", "diamond", "ellipse"] as const).map(
      (type, index) =>
        API.createElement({
          type,
          x: index * 300 + 20,
          y: 40,
          width: 200,
          height: 120,
          strokeColor: "#e03131",
          backgroundColor: "#ffec99",
          fillStyle: "solid",
          strokeWidth: 4,
          opacity: 60,
        }),
    );
    const line = API.createElement({ type: "line" });
    const unselected = API.createElement({ type: "rectangle" });
    const locked = API.createElement({ type: "rectangle", locked: true });
    API.setElements([...nodes, line, unselected, locked]);
    API.setSelectedElements([...nodes, line, locked]);

    API.executeAction(actionCycleFlowchartShape);

    expect(h.elements.map((element) => element.type)).toEqual([
      "diamond",
      "ellipse",
      "rectangle",
      "line",
      "rectangle",
      "rectangle",
    ]);
    nodes.forEach((node, index) => {
      const { type, version, versionNonce, updated, ...preserved } = node;
      expect(h.elements[index]).toMatchObject(preserved);
    });

    API.executeAction(actionCycleFlowchartShape);
    API.executeAction(actionCycleFlowchartShape);
    expect(h.elements.slice(0, 3).map((element) => element.type)).toEqual(
      nodes.map((element) => element.type),
    );
  });

  it("preserves bound text, font styling, selection and container IDs", () => {
    const [container, text] = API.createTextContainer();
    API.setElements([container, text]);
    API.setSelectedElements([container]);

    API.executeAction(actionCycleFlowchartShape);

    expect(h.elements[0]).toMatchObject({
      type: "diamond",
      id: container.id,
      x: container.x,
      y: container.y,
      width: container.width,
      height: container.height,
      boundElements: container.boundElements,
    });
    expect(h.elements[1]).toEqual(text);
    expect(h.state.selectedElementIds[container.id]).toBe(true);
  });

  it("supports Shift+Y and the selection context menu", () => {
    const node = API.createElement({
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
    API.setElements([node]);
    API.setSelectedElements([node]);

    fireEvent.keyDown(document, { key: "Y", code: "KeyY", shiftKey: true });
    expect(h.elements[0].type).toBe("diamond");

    new Pointer("mouse").rightClickAt(200, 200);
    const item = queryByTestId(UI.queryContextMenu()!, "cycleFlowchartShape");
    expect(item).not.toBeNull();
    fireEvent.click(item!.querySelector("button")!);
    expect(h.elements[0].type).toBe("ellipse");
  });

  it("does not consume shortcuts without eligible nodes or extra modifiers", () => {
    expect(
      actionCycleFlowchartShape.keyTest!(
        new KeyboardEvent("keydown", { code: "KeyY", shiftKey: true }),
        h.state,
        h.elements,
      ),
    ).toBe(false);
    const node = API.createElement({ type: "rectangle" });
    API.setElements([node]);
    API.setSelectedElements([node]);
    Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
      Keyboard.keyPress("y");
    });
    expect(h.elements[0].type).toBe("rectangle");
  });

  for (const elbowed of [false, true]) {
    it.each(["rectangle", "diamond", "ellipse"] as const)(
      `reattaches bound arrows to the new outline (%s, elbowed=${elbowed})`,
      (type) => {
        const node = API.createElement({
          type,
          x: 0,
          y: 0,
          width: 200,
          height: 200,
        });
        const arrow = API.createElement({
          type: "arrow",
          elbowed,
          x: 400,
          y: 50,
          width: 200,
          height: 0,
          points: [pointFrom(0, 0), pointFrom(-200, 0)],
          endBinding: {
            elementId: node.id,
            fixedPoint: [1, 0.25],
            mode: "orbit",
          },
          startBinding: null,
        });
        API.setElements([
          { ...node, boundElements: [{ id: arrow.id, type: "arrow" }] },
          arrow,
        ]);
        API.setSelectedElements([node]);

        API.executeAction(actionCycleFlowchartShape);

        const converted = h.elements[0] as ExcalidrawBindableElement;
        const after = h.elements[1] as ExcalidrawArrowElement;
        const end = after.points[after.points.length - 1];
        expect(after.endBinding?.elementId).toBe(node.id);
        expect(
          distanceToElement(
            converted,
            h.app.scene.getNonDeletedElementsMap(),
            pointFrom<GlobalPoint>(after.x + end[0], after.y + end[1]),
          ),
        ).toBeLessThanOrEqual(getBindingGap(converted) + 1);
      },
    );
  }
});
