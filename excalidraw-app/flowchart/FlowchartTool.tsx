import { useState } from "react";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { FlowchartLab } from "./FlowchartLab";
import { createFlowchartElements } from "./elements";

export const FlowchartTool = ({
  excalidrawAPI,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          aria-label="Open flowchart lab"
          onClick={() => setIsOpen(true)}
          style={{
            position: "absolute",
            top: 16,
            left: 64,
            zIndex: 5,
            pointerEvents: "var(--ui-pointerEvents)",
            border: "1px solid var(--color-primary-light)",
            borderRadius: 10,
            padding: "10px 16px",
            background: "var(--island-bg-color)",
            color: "var(--color-primary)",
            boxShadow: "0 2px 8px #0000000d",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          Flowcharts
        </button>
      )}
      {isOpen && (
        <FlowchartLab
          onClose={() => setIsOpen(false)}
          onInsert={(graph, direction) => {
            const existing = excalidrawAPI.getSceneElementsIncludingDeleted();
            const visible = existing.filter((element) => !element.isDeleted);
            const state = excalidrawAPI.getAppState();
            const offset = {
              x: visible.length
                ? Math.max(
                    ...visible.map((element) => element.x + element.width),
                  ) + 120
                : -state.scrollX + 400 / state.zoom.value,
              y: visible.length
                ? Math.min(...visible.map((element) => element.y))
                : -state.scrollY + 140 / state.zoom.value,
            };
            const elements = createFlowchartElements(graph, direction, offset);
            excalidrawAPI.updateScene({
              elements: [...existing, ...elements],
              appState: {
                selectedElementIds: Object.fromEntries(
                  elements.map((element) => [element.id, true]),
                ),
              },
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
            excalidrawAPI.setViewport({
              target: elements,
              fit: "scale-down",
              offsets:
                state.width < 700
                  ? { top: 80, right: 24, bottom: 80, left: 24 }
                  : { ui: true },
              animation: false,
            });
          }}
        />
      )}
    </>
  );
};
