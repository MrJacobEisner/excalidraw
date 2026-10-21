import { CODES } from "@excalidraw/common";
import {
  CaptureUpdateAction,
  newElementWith,
  reanchorBindingsToOutline,
  updateBindings,
} from "@excalidraw/element";

import type { ExcalidrawElement, NonDeleted } from "@excalidraw/element/types";

import { getSelectedElements } from "../scene";

import { register } from "./register";

type FlowchartNode = Extract<
  ExcalidrawElement,
  { type: "rectangle" | "diamond" | "ellipse" }
>;

const isFlowchartNode = (
  element: ExcalidrawElement,
): element is NonDeleted<FlowchartNode> =>
  !element.isDeleted &&
  !element.locked &&
  (element.type === "rectangle" ||
    element.type === "diamond" ||
    element.type === "ellipse");

const nextShape = {
  rectangle: "diamond",
  diamond: "ellipse",
  ellipse: "rectangle",
} as const;

const canCycle = (
  elements: Parameters<typeof getSelectedElements>[0],
  appState: Parameters<typeof getSelectedElements>[1],
) => getSelectedElements(elements, appState).some(isFlowchartNode);

export const actionCycleFlowchartShape = register({
  name: "cycleFlowchartShape",
  label: "labels.cycleFlowchartShape",
  keywords: ["process", "decision", "start", "end", "swap"],
  trackEvent: { category: "element" },
  predicate: canCycle,
  keyTest: (event, appState, elements) =>
    event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.code === CODES.Y &&
    canCycle(elements, appState),
  perform(elements, appState, _, app) {
    const selectedIds = new Set(
      getSelectedElements(elements, appState)
        .filter(isFlowchartNode)
        .map((element) => element.id),
    );
    if (!selectedIds.size) {
      return { captureUpdate: CaptureUpdateAction.NEVER };
    }

    // Keep IDs, geometry, styling and bound labels intact. Unlike the shape
    // picker, this quick action must not resize nodes or shrink their text.
    const nextElements = elements.map((element) =>
      selectedIds.has(element.id) && isFlowchartNode(element)
        ? newElementWith(element, { type: nextShape[element.type] })
        : element,
    );
    app.scene.replaceAllElements(nextElements);

    for (const element of nextElements) {
      if (selectedIds.has(element.id) && isFlowchartNode(element)) {
        reanchorBindingsToOutline(element, app.scene, appState.zoom);
        updateBindings(element, app.scene, appState);
      }
    }

    return {
      elements: app.scene.getElementsIncludingDeleted(),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
});
