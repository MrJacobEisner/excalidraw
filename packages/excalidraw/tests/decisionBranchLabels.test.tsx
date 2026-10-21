import { KEYS } from "@excalidraw/common";
import {
  isArrowElement,
  isNonDeletedElement,
  isTextElement,
} from "@excalidraw/element";

import { Excalidraw } from "../index";
import { createDecisionBranchLabels } from "../decisionBranchLabels";

import { API } from "./helpers/api";
import { Keyboard, Pointer, UI } from "./helpers/ui";
import { getTextEditor, updateTextEditor } from "./queries/dom";
import { render } from "./test-utils";

const { h } = window;
const mouse = new Pointer("mouse");
const labels = () =>
  h.elements.filter(isTextElement).filter(isNonDeletedElement);
const arrows = () =>
  h.elements.filter(isArrowElement).filter(isNonDeletedElement);

beforeEach(async () => {
  localStorage.clear();
  mouse.reset();
  await render(<Excalidraw handleKeyboardGlobally={true} />);
});

const addDecision = () => {
  const diamond = API.createElement({
    type: "diamond",
    x: 100,
    y: 100,
    width: 100,
    height: 100,
  });
  API.setElements([diamond]);
  API.setSelectedElements([diamond]);
  return diamond;
};

describe("decision branch labels", () => {
  it("labels only the first two outgoing shortcut arrows, in creation order", () => {
    const diamond = addDecision();
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress(KEYS.ARROW_RIGHT);
      Keyboard.keyPress(KEYS.ARROW_RIGHT);
      Keyboard.keyPress(KEYS.ARROW_RIGHT);
    });
    Keyboard.keyUp(KEYS.CTRL_OR_CMD);

    expect(arrows()).toHaveLength(3);
    expect(labels().map((label) => label.text)).toEqual(["Yes", "No"]);
    for (const [index, label] of labels().entries()) {
      expect(label.containerId).toBe(arrows()[index].id);
      expect(arrows()[index].boundElements).toContainEqual({
        id: label.id,
        type: "text",
      });
      expect(arrows()[index].startBinding?.elementId).toBe(diamond.id);
    }
    expect(arrows()[2].boundElements).toBeNull();
  });

  it("creates and undoes a drawn arrow and its label together", () => {
    addDecision();
    UI.clickTool("arrow");
    mouse.downAt(200, 150);
    mouse.moveTo(400, 150);
    mouse.up();

    expect(arrows()).toHaveLength(1);
    expect(labels().map((label) => label.text)).toEqual(["Yes"]);
    const arrowId = arrows()[0].id;
    const labelId = labels()[0].id;

    Keyboard.undo();
    expect(arrows()).toHaveLength(0);
    expect(labels()).toHaveLength(0);
    Keyboard.redo();
    expect(arrows()[0].id).toBe(arrowId);
    expect(labels()[0].id).toBe(labelId);
    expect(labels()[0].containerId).toBe(arrowId);
  });

  it("keeps labels editable and counts earlier branches after deleting a label", async () => {
    const diamond = addDecision();
    UI.clickTool("arrow");
    mouse.downAt(200, 150);
    mouse.moveTo(400, 150);
    mouse.up();
    const arrow = arrows()[0];
    mouse.doubleClickOn(labels()[0]);
    let editor = await getTextEditor();
    updateTextEditor(editor, "Approved");
    Keyboard.exitTextEditor(editor);
    expect(labels()[0].text).toBe("Approved");
    expect(labels()[0].containerId).toBe(arrow.id);

    mouse.doubleClickOn(labels()[0]);
    editor = await getTextEditor();
    updateTextEditor(editor, "");
    Keyboard.exitTextEditor(editor);
    expect(labels()).toHaveLength(0);
    expect(arrows()).toHaveLength(1);

    API.setSelectedElements([diamond]);
    Keyboard.withModifierKeys({ ctrl: true }, () => {
      Keyboard.keyPress(KEYS.ARROW_DOWN);
    });
    Keyboard.keyUp(KEYS.CTRL_OR_CMD);
    expect(labels().map((label) => label.text)).toEqual(["No"]);
    expect(arrow.boundElements).toEqual([]);
  });

  it("does not overwrite an existing arrow label", () => {
    const diamond = addDecision();
    const arrow = API.createElement({
      type: "arrow",
      x: 200,
      y: 150,
      width: 200,
      height: 0,
      startBinding: {
        elementId: diamond.id,
        mode: "orbit",
        fixedPoint: [1, 0.5],
      },
      boundElements: [{ id: "custom-label", type: "text" }],
    });
    API.setElements([diamond, arrow]);
    expect(createDecisionBranchLabels([arrow], h.app.scene, h.state)).toEqual(
      [],
    );
    expect(arrow.boundElements).toEqual([{ id: "custom-label", type: "text" }]);
  });

  it("does not label branches from rectangles or incoming arrows", () => {
    const diamond = addDecision();
    const rectangle = API.createElement({
      type: "rectangle",
      x: 400,
      y: 100,
      width: 100,
      height: 100,
    });
    API.setElements([diamond, rectangle]);
    UI.clickTool("arrow");
    mouse.downAt(400, 150);
    mouse.moveTo(200, 150);
    mouse.up();
    expect(arrows()[0].endBinding?.elementId).toBe(diamond.id);
    expect(labels()).toHaveLength(0);
  });
});
