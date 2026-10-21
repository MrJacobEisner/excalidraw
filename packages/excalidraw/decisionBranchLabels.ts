import { invariant } from "@excalidraw/common";

import {
  computeBoundTextPosition,
  getBoundTextElementId,
  isArrowElement,
  isBoundToContainer,
  isInvisiblySmallElement,
  newTextElement,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  ElementsMap,
  NonDeleted,
} from "@excalidraw/element/types";
import type { Scene } from "@excalidraw/element";

import { t } from "./i18n";

import type { AppState } from "./types";

/**
 * Called only when arrows are created, never when an existing arrow is edited.
 * Return ordinary bound texts so callers can capture them with the new arrows.
 */
export const createDecisionBranchLabels = (
  newElements: readonly ExcalidrawElement[],
  scene: Scene,
  appState: AppState,
): NonDeleted<ExcalidrawTextElement>[] => {
  const elementsMap: ElementsMap = new Map(scene.getNonDeletedElementsMap());
  for (const element of newElements) {
    if (!element.isDeleted) {
      elementsMap.set(element.id, element as NonDeleted<ExcalidrawElement>);
    }
  }

  const newIds = new Set(newElements.map((element) => element.id));
  const outgoingCounts = new Map<string, number>();
  for (const element of elementsMap.values()) {
    if (
      isArrowElement(element) &&
      element.startBinding &&
      !newIds.has(element.id)
    ) {
      const sourceId = element.startBinding.elementId;
      outgoingCounts.set(sourceId, (outgoingCounts.get(sourceId) ?? 0) + 1);
    }
  }

  const labels: NonDeleted<ExcalidrawTextElement>[] = [];
  for (const arrow of newElements) {
    if (
      arrow.isDeleted ||
      !isArrowElement(arrow) ||
      !arrow.startBinding ||
      isInvisiblySmallElement(arrow)
    ) {
      continue;
    }
    const sourceId = arrow.startBinding.elementId;
    const source = elementsMap.get(sourceId);
    const outgoingCount = outgoingCounts.get(sourceId) ?? 0;
    outgoingCounts.set(sourceId, outgoingCount + 1);
    if (
      source?.type !== "diamond" ||
      outgoingCount >= 2 ||
      getBoundTextElementId(arrow)
    ) {
      continue;
    }

    const label = newTextElement({
      x: arrow.x,
      y: arrow.y,
      text: t(
        outgoingCount === 0
          ? "labels.decisionBranchYes"
          : "labels.decisionBranchNo",
      ),
      fontSize: appState.currentItemFontSize,
      fontFamily: appState.currentItemFontFamily,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: arrow.id,
      strokeColor: arrow.strokeColor,
      opacity: arrow.opacity,
      groupIds: arrow.groupIds,
      frameId: arrow.frameId,
    });
    invariant(isBoundToContainer(label), "Branch label must be bound to arrow");
    scene.mutateElement(arrow, {
      boundElements: [
        ...(arrow.boundElements ?? []),
        { id: label.id, type: "text" },
      ],
    });
    scene.mutateElement(
      label,
      computeBoundTextPosition(arrow, label, elementsMap),
    );
    labels.push(label);
  }
  return labels;
};
