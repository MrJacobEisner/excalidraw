import { TEXT_ALIGN, VERTICAL_ALIGN, arrayToMap } from "@excalidraw/common";
import {
  CaptureUpdateAction,
  getBoundTextElement,
  isArrowElement,
  newTextElement,
  redrawTextBoundingBox,
  syncMovedIndices,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  ExcalidrawGenericElement,
  ExcalidrawTextElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { register } from "./register";

import type { AppClassProperties, AppState } from "../types";

type FlowchartNode = Exclude<ExcalidrawGenericElement, { type: "selection" }>;

const getSelectedNodes = (
  appState: Readonly<AppState>,
  app: AppClassProperties,
) =>
  app.scene
    .getSelectedElements(appState)
    .filter(
      (element): element is NonDeleted<FlowchartNode> =>
        !element.locked &&
        (element.type === "rectangle" ||
          element.type === "diamond" ||
          element.type === "ellipse"),
    );

const byPosition = (a: ExcalidrawElement, b: ExcalidrawElement) =>
  a.y - b.y || a.x - b.x || a.id.localeCompare(b.id);

/** Only edges between selected nodes participate; arrows need not be selected. */
const getEdges = (
  nodes: readonly ExcalidrawGenericElement[],
  elements: readonly ExcalidrawElement[],
) => {
  const ids = new Set(nodes.map((node) => node.id));
  const edges = new Map<string, Set<string>>(
    nodes.map((node) => [node.id, new Set<string>()]),
  );
  for (const element of elements) {
    if (!element.isDeleted && isArrowElement(element)) {
      let from = element.startBinding?.elementId;
      let to = element.endBinding?.elementId;
      if (element.startArrowhead && !element.endArrowhead) {
        [from, to] = [to, from];
      }
      if (from && to && from !== to && ids.has(from) && ids.has(to)) {
        edges.get(from)!.add(to);
      }
    }
  }
  return edges;
};

export const orderFlowchartNodes = <T extends ExcalidrawGenericElement>(
  nodes: readonly T[],
  elements: readonly ExcalidrawElement[],
) => {
  const edges = getEdges(nodes, elements);
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  for (const targets of edges.values()) {
    for (const target of targets) {
      incoming.set(target, incoming.get(target)! + 1);
    }
  }

  const remaining = new Map(nodes.map((node) => [node.id, node]));
  let frontier = nodes.filter((node) => incoming.get(node.id) === 0);
  const ordered: T[] = [];
  while (remaining.size) {
    // Break cycles deterministically, then continue following their arrows.
    if (!frontier.length) {
      frontier = [[...remaining.values()].sort(byPosition)[0]];
    }
    const next = new Set<string>();
    for (const node of frontier.sort(byPosition)) {
      remaining.delete(node.id);
      ordered.push(node);
      for (const target of edges.get(node.id)!) {
        incoming.set(target, incoming.get(target)! - 1);
        if (remaining.has(target) && incoming.get(target) === 0) {
          next.add(target);
        }
      }
    }
    frontier = [...next].map((id) => remaining.get(id)!);
  }
  return ordered;
};

export const actionNumberFlowchart = register({
  name: "numberFlowchartSteps",
  label: "labels.numberFlowchartSteps",
  keywords: ["number", "flowchart", "steps", "renumber"],
  trackEvent: { category: "element" },
  predicate: (elements, appState, _, app) => {
    const nodes = getSelectedNodes(appState, app);
    const elementsMap = app.scene.getNonDeletedElementsMap();
    return (
      nodes.length >= 2 &&
      (nodes.filter((node) => getBoundTextElement(node, elementsMap)).length >=
        2 ||
        [...getEdges(nodes, elements).values()].some((edges) => edges.size))
    );
  },
  perform: (elements, appState, _, app) => {
    const nodes = orderFlowchartNodes(
      getSelectedNodes(appState, app),
      elements,
    );
    if (nodes.length < 2) {
      return false;
    }
    const elementsMap = app.scene.getNonDeletedElementsMap();
    const nextElements: ExcalidrawElement[] = [...elements];
    const added: ExcalidrawElement[] = [];
    nodes.forEach((node, index) => {
      let label: ExcalidrawTextElement | null = getBoundTextElement(
        node,
        elementsMap,
      );
      const content = (label?.originalText ?? "").replace(/^\s*\d+[.)]\s*/, "");
      const text = `${index + 1}. ${content}`;
      if (label) {
        app.scene.mutateElement(label, { text, originalText: text });
      } else {
        label = newTextElement({
          x: node.x + node.width / 2,
          y: node.y + node.height / 2,
          text,
          fontSize: appState.currentItemFontSize,
          fontFamily: appState.currentItemFontFamily,
          strokeColor: node.strokeColor,
          textAlign: TEXT_ALIGN.CENTER,
          verticalAlign: VERTICAL_ALIGN.MIDDLE,
          containerId: node.id,
          frameId: node.frameId,
          groupIds: node.groupIds,
          angle: node.angle,
          renderEnvironment: app.renderEnvironment,
        });
        app.scene.mutateElement(node, {
          boundElements: [
            ...(node.boundElements ?? []),
            { type: "text", id: label.id },
          ],
        });
        nextElements.splice(nextElements.indexOf(node) + 1, 0, label);
        added.push(label);
      }
      redrawTextBoundingBox(label, node, app.scene, app.renderEnvironment);
    });
    syncMovedIndices(nextElements, arrayToMap(added));
    return {
      elements: nextElements,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    };
  },
});
