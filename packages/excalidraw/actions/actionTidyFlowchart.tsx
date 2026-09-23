import {
  CaptureUpdateAction,
  getFlowchartLayout,
  isFlowchartNodeElement,
  updateBoundElements,
  updateFrameMembershipOfSelectedElements,
} from "@excalidraw/element";

import { IconButton } from "../components/IconButton";
import { TidyFlowchartIcon } from "../components/icons";

import { t } from "../i18n";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

const getSelectedFlowchartNodes = (
  appState: Readonly<Pick<AppState, "selectedElementIds">>,
  app: AppClassProperties,
) => app.scene.getSelectedElements(appState).filter(isFlowchartNodeElement);

const canTidyFlowchart = (
  appState: Readonly<Pick<AppState, "selectedElementIds">>,
  app: AppClassProperties,
) => {
  const selectedNodes = getSelectedFlowchartNodes(appState, app);
  if (selectedNodes.length < 2) {
    return false;
  }

  const selectedIds = new Set(selectedNodes.map(({ id }) => id));
  return [...app.scene.getNonDeletedElementsMap().values()].some(
    (element) =>
      "startBinding" in element &&
      "endBinding" in element &&
      !!element.startBinding &&
      !!element.endBinding &&
      selectedIds.has(element.startBinding.elementId) &&
      selectedIds.has(element.endBinding.elementId),
  );
};

export const actionTidyFlowchart = register({
  name: "tidyFlowchart",
  label: "labels.tidyFlowchart",
  icon: TidyFlowchartIcon,
  keywords: ["flowchart", "layout", "arrange", "auto layout"],
  trackEvent: { category: "element" },
  predicate: (elements, appState, appProps, app) =>
    canTidyFlowchart(appState, app),
  perform: (elements, appState, _, app) => {
    const selectedNodes = getSelectedFlowchartNodes(appState, app);
    const layout = getFlowchartLayout(
      selectedNodes,
      app.scene.getNonDeletedElementsMap(),
    );

    if (layout.size === 0) {
      return { appState, elements, captureUpdate: CaptureUpdateAction.NEVER };
    }

    for (const node of selectedNodes) {
      const position = layout.get(node.id);
      if (position) {
        app.scene.mutateElement(node, position);
      }
    }

    // Move all nodes first, then update every connected arrow against the
    // final node positions. This also handles arrows whose other endpoint is
    // outside the selection without changing that endpoint.
    for (const node of selectedNodes) {
      updateBoundElements(node, app.scene, {
        simultaneouslyUpdated: selectedNodes,
      });
    }

    const updatedElements = updateFrameMembershipOfSelectedElements(
      elements,
      appState,
      app,
    );

    return {
      appState,
      elements: updatedElements,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ appState, updateData, app }) => (
    <IconButton
      type="button"
      hidden={!canTidyFlowchart(appState, app)}
      onClick={() => updateData(null)}
      title={t("labels.tidyFlowchart")}
      aria-label={t("labels.tidyFlowchart")}
      icon={TidyFlowchartIcon}
    />
  ),
});
