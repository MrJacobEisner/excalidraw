import {
  getCommonBounds,
  isNonDeletedElement,
  newElementWith,
} from "@excalidraw/element";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";
import { useMemo, useState } from "react";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type {
  ExcalidrawBindableElement,
  ExcalidrawElement,
} from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  getFlowchartConnectorEndpoints,
  getFlowchartTemplate,
  graphToSkeleton,
  parseFlowchartOutline,
  type FlowchartTemplate,
} from "./flowchart";

type StudioTab = "templates" | "guided" | "outline";
type Direction = "right" | "down" | "left" | "up";

const bindableTypes = new Set(["rectangle", "ellipse", "diamond"]);

const nextPrefix = (elements: readonly ExcalidrawElement[]) => {
  const ids = new Set(elements.map((element) => element.id));
  let suffix = 1;
  while (
    ids.has(`flow-${suffix}-node-0`) ||
    ids.has(`flow-${suffix}-connected`)
  ) {
    suffix++;
  }
  return `flow-${suffix}`;
};

const getInsertOrigin = (elements: readonly ExcalidrawElement[]) => {
  const visible = elements.filter(isNonDeletedElement);
  if (!visible.length) {
    return { x: 80, y: 80 };
  }
  const [, minY, maxX] = getCommonBounds(visible);
  return {
    x: maxX + 180,
    y: minY,
  };
};

export const FlowchartStudio = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  const appState = useUIAppState();
  const [tab, setTab] = useState<StudioTab>("templates");
  const [direction, setDirection] = useState<Direction>("right");
  const [stepName, setStepName] = useState("Next step");
  const [connectorLabel, setConnectorLabel] = useState("");
  const [outline, setOutline] = useState(
    "Idea\n  [yes] Plan\n    Build\n  [no] Research",
  );
  const [message, setMessage] = useState("");

  const selectedShape = useMemo(() => {
    const ids = Object.keys(appState.selectedElementIds).filter(
      (id) => appState.selectedElementIds[id],
    );
    if (ids.length !== 1) {
      return null;
    }
    const element = excalidrawAPI
      .getSceneElements()
      .find((candidate) => candidate.id === ids[0]);
    return element && bindableTypes.has(element.type)
      ? (element as ExcalidrawBindableElement)
      : null;
  }, [appState.selectedElementIds, excalidrawAPI]);

  const insertSkeleton = (skeleton: ExcalidrawElementSkeleton[]) => {
    const current = excalidrawAPI.getSceneElementsIncludingDeleted();
    const inserted = convertToExcalidrawElements(skeleton, {
      regenerateIds: false,
    });
    excalidrawAPI.updateScene({
      elements: [...current, ...inserted],
      appState: {
        selectedElementIds: Object.fromEntries(
          inserted
            .filter((element) => bindableTypes.has(element.type))
            .map((element) => [element.id, true]),
        ),
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    excalidrawAPI.setViewport({
      target: inserted,
      fit: "scale-down",
      animation: true,
    });
    setMessage(
      `Added ${inserted.filter((el) => el.type !== "text").length} elements.`,
    );
  };

  const addTemplate = (template: FlowchartTemplate) => {
    const current = excalidrawAPI.getSceneElementsIncludingDeleted();
    insertSkeleton(
      graphToSkeleton(
        getFlowchartTemplate(template),
        getInsertOrigin(current),
        nextPrefix(current),
      ),
    );
  };

  const addConnectedStep = () => {
    const latestAppState = excalidrawAPI.getAppState();
    const selectedIds = Object.keys(latestAppState.selectedElementIds).filter(
      (id) => latestAppState.selectedElementIds[id],
    );
    const freshSelected =
      selectedIds.length === 1
        ? excalidrawAPI
            .getSceneElements()
            .find((element) => element.id === selectedIds[0])
        : null;
    const source =
      freshSelected && bindableTypes.has(freshSelected.type)
        ? (freshSelected as ExcalidrawBindableElement)
        : null;
    if (!source || !stepName.trim()) {
      setMessage(
        source
          ? "Enter a name for the new step."
          : "Select one rectangle, ellipse, or diamond on the canvas first.",
      );
      return;
    }
    const current = excalidrawAPI.getSceneElementsIncludingDeleted();
    const prefix = nextPrefix(current);
    const [sourceMinX, sourceMinY, sourceMaxX, sourceMaxY] = getCommonBounds([
      source,
    ]);
    const sourceCenterX = (sourceMinX + sourceMaxX) / 2;
    const sourceCenterY = (sourceMinY + sourceMaxY) / 2;
    const positions: Record<Direction, [number, number]> = {
      right: [sourceMaxX + 80, sourceCenterY - 38],
      down: [sourceCenterX - 90, sourceMaxY + 80],
      left: [sourceMinX - 260, sourceCenterY - 38],
      up: [sourceCenterX - 90, sourceMinY - 156],
    };
    const nodeId = `${prefix}-connected`;
    const arrowId = `${prefix}-connector`;
    const [newX, newY] = positions[direction];
    const { start, end } = getFlowchartConnectorEndpoints(
      {
        type: source.type as "rectangle" | "ellipse" | "diamond",
        x: source.x,
        y: source.y,
        width: source.width,
        height: source.height,
        angle: source.angle,
      },
      {
        type: "rectangle",
        x: newX,
        y: newY,
        width: 180,
        height: 76,
      },
    );
    const newShape: ExcalidrawElementSkeleton = {
      type: "rectangle",
      id: nodeId,
      x: newX,
      y: newY,
      width: 180,
      height: 76,
      backgroundColor: "#e5dbff",
      fillStyle: "solid",
      label: { text: stepName.trim(), fontSize: 18 },
    };
    // Include a lightweight copy of the selected shape so the converter's
    // binding pass can create a properly bound native arrow. We keep only its
    // updated binding metadata and preserve every other original property.
    const converted = convertToExcalidrawElements(
      [
        source as ExcalidrawElementSkeleton,
        newShape,
        {
          type: "arrow",
          id: arrowId,
          x: start.x,
          y: start.y,
          width: end.x - start.x || 0.01,
          height: end.y - start.y || 0.01,
          start: { id: source.id },
          end: { id: nodeId },
          ...(connectorLabel.trim()
            ? { label: { text: connectorLabel.trim(), fontSize: 16 } }
            : {}),
        },
      ],
      { regenerateIds: false },
    );
    const convertedSelected = converted.find(
      (element) => element.id === source.id,
    );
    const updatedSelected = convertedSelected
      ? newElementWith(source, {
          boundElements: [
            ...(source.boundElements ?? []),
            ...(convertedSelected.boundElements ?? []),
          ].filter(
            (binding, index, bindings) =>
              bindings.findIndex(
                (candidate) =>
                  candidate.id === binding.id &&
                  candidate.type === binding.type,
              ) === index,
          ),
        })
      : source;
    const additions = converted.filter((element) => element.id !== source.id);
    excalidrawAPI.updateScene({
      elements: current
        .map((element) =>
          element.id === source.id ? updatedSelected : element,
        )
        .concat(additions),
      appState: { selectedElementIds: { [nodeId]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    excalidrawAPI.setViewport({
      target: additions,
      fit: "scale-down",
      animation: true,
    });
    setMessage("Added a connected, editable step.");
  };

  const addOutline = () => {
    try {
      const current = excalidrawAPI.getSceneElementsIncludingDeleted();
      insertSkeleton(
        graphToSkeleton(
          parseFlowchartOutline(outline),
          getInsertOrigin(current),
          nextPrefix(current),
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid outline.");
    }
  };

  return (
    <div className="flowchart-studio">
      <header>
        <h2>Flowchart Studio</h2>
        <p>Create native shapes and connectors without clearing your canvas.</p>
      </header>
      <nav
        className="flowchart-studio__tabs"
        aria-label="Flowchart creation approach"
      >
        {(["templates", "guided", "outline"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setMessage("");
            }}
          >
            {value === "templates"
              ? "Templates"
              : value === "guided"
              ? "Add step"
              : "Text outline"}
          </button>
        ))}
      </nav>

      {tab === "templates" && (
        <section aria-label="Starter templates">
          <h3>Starter templates</h3>
          <p>Insert a complete chart to the right of your existing work.</p>
          <button
            className="flowchart-studio__card"
            type="button"
            onClick={() => addTemplate("sequential")}
          >
            <strong>Sequential process</strong>
            <span>Start → collect information → complete</span>
          </button>
          <button
            className="flowchart-studio__card"
            type="button"
            onClick={() => addTemplate("branching")}
          >
            <strong>Branching decision</strong>
            <span>Review with labeled Yes and No outcomes</span>
          </button>
        </section>
      )}

      {tab === "guided" && (
        <section aria-label="Add a connected step">
          <h3>Add a connected step</h3>
          <p
            className={
              selectedShape
                ? "flowchart-studio__selection is-ready"
                : "flowchart-studio__selection"
            }
          >
            {selectedShape
              ? `Connected from selected ${selectedShape.type}`
              : "Select one shape on the canvas"}
          </p>
          <label>
            Step name
            <input
              value={stepName}
              onChange={(event) => setStepName(event.target.value)}
            />
          </label>
          <label>
            Direction
            <select
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as Direction)
              }
            >
              <option value="right">Right</option>
              <option value="down">Down</option>
              <option value="left">Left</option>
              <option value="up">Up</option>
            </select>
          </label>
          <label>
            Connector label <span>(optional)</span>
            <input
              value={connectorLabel}
              onChange={(event) => setConnectorLabel(event.target.value)}
              placeholder="e.g. Yes"
            />
          </label>
          <button
            className="flowchart-studio__primary"
            type="button"
            onClick={addConnectedStep}
          >
            Add connected step
          </button>
        </section>
      )}

      {tab === "outline" && (
        <section aria-label="Text outline to diagram">
          <h3>Text outline → diagram</h3>
          <p>
            One step per line. Use two spaces for a branch and{" "}
            <code>[label]</code> before a step to label its connector.
          </p>
          <label>
            Outline
            <textarea
              rows={9}
              value={outline}
              onChange={(event) => setOutline(event.target.value)}
              spellCheck
            />
          </label>
          <button
            className="flowchart-studio__primary"
            type="button"
            onClick={addOutline}
          >
            Create diagram
          </button>
        </section>
      )}
      <div
        className="flowchart-studio__message"
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
};
