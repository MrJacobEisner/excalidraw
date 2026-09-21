import {
  CaptureUpdateAction,
  getBoundTextElement,
  getFlowchartLayout,
  isFlowchartNodeElement,
  updateBoundElements,
  type FlowchartLayoutDirection,
} from "@excalidraw/element";

import { IconButton } from "../components/IconButton";
import { ArrowIcon } from "../components/icons";

import { t } from "../i18n";

import { register } from "./register";

import type { AppClassProperties, AppState, UIAppState } from "../types";

type LayoutFormData = {
  direction: FlowchartLayoutDirection;
};

const getLayoutForSelection = (
  appState: Pick<AppState, "selectedElementIds">,
  app: AppClassProperties,
  direction: FlowchartLayoutDirection,
) =>
  getFlowchartLayout(
    app.scene.getSelectedElements(appState),
    app.scene.getNonDeletedElements(),
    direction,
  );

export const flowchartLayoutPredicate = (
  appState: UIAppState,
  app: AppClassProperties,
) =>
  getLayoutForSelection(appState, app, "down") !== null ||
  getLayoutForSelection(appState, app, "right") !== null;

export const actionTidyFlowchart = register<LayoutFormData>({
  name: "tidyFlowchart",
  label: "labels.tidyFlowchart",
  keywords: ["flowchart", "layout", "tidy", "arrange"],
  trackEvent: { category: "element" },
  predicate: (elements, appState, appProps, app) =>
    flowchartLayoutPredicate(appState, app),
  perform: (
    elements,
    appState,
    formData: LayoutFormData | null | undefined,
    app,
  ) => {
    const direction = formData?.direction || "down";
    const selectedNodes = app.scene
      .getSelectedElements(appState)
      .filter(isFlowchartNodeElement);
    const layout = getLayoutForSelection(appState, app, direction);

    if (!layout) {
      return false;
    }

    for (const node of selectedNodes) {
      const position = layout.get(node.id);
      if (!position) {
        continue;
      }

      const delta = {
        x: position.x - node.x,
        y: position.y - node.y,
      };
      app.scene.mutateElement(node, position);

      const boundText = getBoundTextElement(
        node,
        app.scene.getNonDeletedElementsMap(),
      );
      if (boundText) {
        app.scene.mutateElement(boundText, {
          x: boundText.x + delta.x,
          y: boundText.y + delta.y,
        });
      }

      // Re-route every bound arrow after each node move. This keeps bindings
      // and arrow labels intact, and does not recurse through cycles.
      updateBoundElements(node, app.scene);
    }

    const updatedElements = elements.map(
      (element) => app.scene.getElement(element.id) || element,
    );

    return {
      appState,
      elements: updatedElements,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
  PanelComponent: ({ appState, updateData, app }) => {
    if (!flowchartLayoutPredicate(appState, app)) {
      return null;
    }

    return (
      <>
        <IconButton
          type="button"
          icon={
            <span
              style={{ display: "inline-flex", transform: "rotate(90deg)" }}
            >
              {ArrowIcon}
            </span>
          }
          onClick={() => updateData({ direction: "down" })}
          title={t("labels.tidyFlowchartDown")}
          aria-label={t("labels.tidyFlowchartDown")}
        />
        <IconButton
          type="button"
          icon={ArrowIcon}
          onClick={() => updateData({ direction: "right" })}
          title={t("labels.tidyFlowchartRight")}
          aria-label={t("labels.tidyFlowchartRight")}
        />
      </>
    );
  },
});
