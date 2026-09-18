import { KEYS } from "@excalidraw/common";
import {
  CaptureUpdateAction,
  getFlowchartLayout,
  getNonDeletedElements,
  isArrowElement,
  isFlowchartNodeElement,
  updateBoundElements,
} from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import { IconButton } from "../components/IconButton";
import { AutoLayoutIcon } from "../components/icons";
import { t } from "../i18n";
import { isSomeElementSelected } from "../scene";
import { getShortcutKey } from "../shortcut";

import { register } from "./register";

import type { AppClassProperties, AppState, UIAppState } from "../types";

const getSelectedFlowchartGraph = (
  appState: Pick<AppState, "selectedElementIds">,
  app: AppClassProperties,
) => {
  const selectedElements = app.scene.getSelectedElements(appState);
  const selectedNodes = selectedElements.filter(isFlowchartNodeElement);
  const selectedNodeIds = new Set(selectedNodes.map(({ id }) => id));
  const arrows = app.scene
    .getNonDeletedElements()
    .filter(isArrowElement)
    .filter(
      (element) =>
        !!element.startBinding &&
        !!element.endBinding &&
        selectedNodeIds.has(element.startBinding.elementId) &&
        selectedNodeIds.has(element.endBinding.elementId),
    );

  return { selectedNodes, arrows };
};

const autoLayoutFlowchartPredicate = (
  appState: UIAppState,
  app: AppClassProperties,
) => {
  const { selectedNodes, arrows } = getSelectedFlowchartGraph(appState, app);
  return selectedNodes.length > 1 && arrows.length > 0;
};

export const actionAutoLayoutFlowchart = register({
  name: "autoLayoutFlowchart",
  label: "labels.autoLayoutFlowchart",
  icon: AutoLayoutIcon,
  keywords: ["flowchart", "layout", "tidy", "arrange"],
  trackEvent: { category: "element" },
  predicate: (_elements, appState, _appProps, app) =>
    autoLayoutFlowchartPredicate(appState, app),
  perform: (elements, appState, _formData, app) => {
    const { selectedNodes, arrows } = getSelectedFlowchartGraph(appState, app);
    if (selectedNodes.length < 2 || arrows.length === 0) {
      return false;
    }

    const layout = getFlowchartLayout(selectedNodes, arrows);
    const updatedNodes = selectedNodes.map((node) => {
      const position = layout.get(node.id);
      return position ? app.scene.mutateElement(node, position) : node;
    });
    const changedElements = new Map(
      updatedNodes.map((element) => [element.id, element]),
    );

    // Move all nodes first, then recalculate every connected arrow against the
    // complete set of new node positions. This keeps labels and bindings intact
    // and lets one action become one undo step.
    updatedNodes.forEach((node) => {
      updateBoundElements(node, app.scene, {
        simultaneouslyUpdated: updatedNodes,
        changedElements,
      });
    });

    const currentElements = app.scene.getElementsMapIncludingDeleted();
    return {
      appState,
      elements: elements.map(
        (element) => currentElements.get(element.id) || element,
      ) as readonly ExcalidrawElement[],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === KEYS.L,
  PanelComponent: ({ elements, appState, updateData, app }) => (
    <IconButton
      hidden={!autoLayoutFlowchartPredicate(appState, app)}
      type="button"
      icon={AutoLayoutIcon}
      onClick={() => updateData(null)}
      title={`${t("labels.autoLayoutFlowchart")} — ${getShortcutKey(
        "CtrlOrCmd+Shift+L",
      )}`}
      aria-label={t("labels.autoLayoutFlowchart")}
      visible={isSomeElementSelected(getNonDeletedElements(elements), appState)}
    />
  ),
});
