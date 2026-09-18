import { CaptureUpdateAction } from "@excalidraw/element";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { fireEvent, render } from "./test-utils";

const { h } = window;

describe("flowchart quick-connect controls", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
  });

  it("adds a connected node from an accessible directional control", () => {
    const startNode = API.createElement({
      type: "rectangle",
      x: 100,
      y: 100,
    });

    API.updateScene({
      elements: [startNode],
      appState: { selectedElementIds: { [startNode.id]: true } },
      captureUpdate: CaptureUpdateAction.NEVER,
    });

    const addBelow = h.app.ownerDocument.querySelector<HTMLButtonElement>(
      '[aria-label="Add node below"]',
    );
    expect(addBelow).not.toBeNull();

    fireEvent.click(addBelow!);

    expect(h.elements).toHaveLength(3);
    const addedNode = h.elements.find(
      (element) => element.id !== startNode.id && element.type === "rectangle",
    );
    const bindingArrow = h.elements.find((element) => element.type === "arrow");
    expect(addedNode).toMatchObject({
      x: startNode.x,
      y: startNode.y + startNode.height + 100,
    });
    expect(bindingArrow).toMatchObject({
      startBinding: { elementId: startNode.id },
      endBinding: { elementId: addedNode?.id },
    });
    expect(h.state.selectedElementIds).toEqual({ [addedNode!.id]: true });

    Keyboard.undo();
    expect(h.elements.filter((element) => !element.isDeleted)).toHaveLength(1);
  });
});
