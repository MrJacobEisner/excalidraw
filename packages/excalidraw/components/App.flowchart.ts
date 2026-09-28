import { isArrowKey, KEYS } from "@excalidraw/common";

import {
  makeNextSelectedElementIds,
  CaptureUpdateAction,
  FlowChartCreator,
  FlowChartNavigator,
  getSelectedElements,
  isFlowchartNodeElement,
  type LinkDirection,
} from "@excalidraw/element";

import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import type React from "react";
import type App from "./App";
import type { PendingExcalidrawElements } from "../types";

type FlowchartOperation =
  | { type: "none" }
  | { type: "canceled" }
  | { type: "creating"; pending: PendingExcalidrawElements }
  | { type: "navigating"; nodeId: ExcalidrawElement["id"] | null }
  | { type: "committed"; nodes: PendingExcalidrawElements }
  | { type: "navigationEnded" };

/**
 * Captures the App state management for the flowchart functionality.
 */
export class AppFlowchart {
  private creator = new FlowChartCreator();
  private navigator = new FlowChartNavigator();
  /**
   * When active, bare arrow keys create a single connected node from the
   * selected node, commit it immediately, and move selection to the new
   * node — letting the user chain nodes by tapping arrows without holding
   * any modifier. Activated after a normal Ctrl/Cmd+arrow creation commits;
   * Escape or any non-arrow key exits.
   */
  private quickMode = false;

  constructor(private app: App) {}

  get pendingNodes() {
    return this.creator.pendingNodes;
  }

  get isCreatingChart() {
    return this.creator.isCreatingChart;
  }

  get isQuickMode() {
    return this.quickMode;
  }

  /** ends any in-progress flowchart creation/navigation session */
  clear = () => {
    this.creator.clear();
    this.navigator.clear();
    this.quickMode = false;
  };

  handleKeyEvent = (event: React.KeyboardEvent | KeyboardEvent): boolean => {
    // Quick mode intercepts bare arrow keys to create one connected node
    // at a time, committing immediately and keeping selection on the new
    // node so the user can chain without holding any modifier.
    if (this.quickMode && event.type === "keydown") {
      return this.handleQuickModeKeydown(event);
    }

    const operation = this.resolveKeyboardEventToOperation(event);

    switch (operation.type) {
      case "none":
        return false;
      case "canceled":
        this.app.triggerRender(true);
        return true;
      case "creating":
        event.preventDefault();
        if (operation.pending.length) {
          this.app.revealIfHidden(operation.pending);
        }
        return true;
      case "navigating": {
        event.preventDefault();
        const node =
          operation.nodeId &&
          this.app.scene.getNonDeletedElementsMap().get(operation.nodeId);
        if (node) {
          this.selectAndReveal(node);
        }
        return true;
      }
      case "committed": {
        if (operation.nodes.length) {
          this.app.insertNewElements(operation.nodes);
        }

        // Select the last created node (furthest from the original parent)
        // so the user can continue chaining from the edge of the cluster.
        const lastNode = [...operation.nodes]
          .reverse()
          .find((node) => isFlowchartNodeElement(node));
        if (lastNode) {
          this.selectAndReveal(lastNode);
        }

        // Activate quick mode so the user can keep adding connected nodes
        // with bare arrow keys.
        this.quickMode = true;
        this.app.cursorHints.show("Arrow keys to add · Esc to exit");

        this.captureUpdate();
        return true;
      }
      case "navigationEnded":
        this.captureUpdate();
        return true;
    }
  };

  private handleQuickModeKeydown(
    event: React.KeyboardEvent | KeyboardEvent,
  ): boolean {
    if (event.key === KEYS.ESCAPE) {
      this.quickMode = false;
      this.app.triggerRender(true);
      return true;
    }

    // Any non-arrow key (or arrow with a modifier) exits quick mode and
    // lets the event propagate to other handlers.
    if (
      !isArrowKey(event.key) ||
      event[KEYS.CTRL_OR_CMD] ||
      event.altKey ||
      event.shiftKey
    ) {
      this.quickMode = false;
      return false;
    }

    const selectedElements = getSelectedElements(
      this.app.scene.getNonDeletedElementsMap(),
      this.app.state,
    );

    if (
      selectedElements.length !== 1 ||
      !isFlowchartNodeElement(selectedElements[0])
    ) {
      this.quickMode = false;
      return false;
    }

    event.preventDefault();

    this.creator.createNodes(
      selectedElements[0],
      this.app.state,
      AppFlowchart.getLinkDirectionFromKey(event.key),
      this.app.scene,
    );

    const nodes = this.creator.pendingNodes ?? [];
    this.creator.clear();

    if (nodes.length) {
      this.app.insertNewElements(nodes);
    }

    // Select the newly created node so the user can continue chaining.
    const newNode = nodes.find((node) => isFlowchartNodeElement(node));
    if (newNode) {
      this.selectAndReveal(newNode);
    }

    this.captureUpdate();
    return true;
  }

  private resolveKeyboardEventToOperation(
    event: React.KeyboardEvent | KeyboardEvent,
  ): FlowchartOperation {
    const { creator, navigator, app } = this;

    if (event.type === "keydown") {
      if (event.key === KEYS.ESCAPE && creator.isCreatingChart) {
        creator.clear();
        return { type: "canceled" };
      }

      if (!isArrowKey(event.key)) {
        return { type: "none" };
      }

      if (event[KEYS.CTRL_OR_CMD] && !event.shiftKey) {
        const selectedElements = getSelectedElements(
          app.scene.getNonDeletedElementsMap(),
          app.state,
        );

        if (
          selectedElements.length === 1 &&
          isFlowchartNodeElement(selectedElements[0])
        ) {
          creator.createNodes(
            selectedElements[0],
            app.state,
            AppFlowchart.getLinkDirectionFromKey(event.key),
            app.scene,
          );
        }

        return { type: "creating", pending: creator.pendingNodes ?? [] };
      }

      if (event.altKey) {
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const selectedElements = getSelectedElements(elementsMap, app.state);

        if (selectedElements.length === 1) {
          return {
            type: "navigating",
            nodeId: navigator.exploreByDirection(
              selectedElements[0],
              elementsMap,
              AppFlowchart.getLinkDirectionFromKey(event.key),
            ),
          };
        }
      }

      return { type: "none" };
    }

    // keyup: releasing a modifier finalizes the workflow it was driving;
    // both can finalize on the same event
    const navigationEnded = !event.altKey && navigator.isExploring;
    if (navigationEnded) {
      navigator.clear();
    }

    if (!event[KEYS.CTRL_OR_CMD] && creator.isCreatingChart) {
      const nodes = creator.pendingNodes ?? [];
      creator.clear();
      return { type: "committed", nodes };
    }

    return navigationEnded ? { type: "navigationEnded" } : { type: "none" };
  }

  private selectAndReveal(node: NonDeletedExcalidrawElement) {
    this.app.setState((prevState) => ({
      selectedElementIds: makeNextSelectedElementIds(
        { [node.id]: true },
        prevState,
      ),
    }));
    this.app.revealIfHidden([node]);
  }

  private captureUpdate() {
    this.app.syncActionResult({
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }

  private static getLinkDirectionFromKey(key: string): LinkDirection {
    switch (key) {
      case KEYS.ARROW_UP:
        return "up";
      case KEYS.ARROW_DOWN:
        return "down";
      case KEYS.ARROW_RIGHT:
        return "right";
      case KEYS.ARROW_LEFT:
        return "left";
      default:
        return "right";
    }
  }
}
