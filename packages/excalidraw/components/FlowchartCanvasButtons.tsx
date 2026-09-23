import { useState, type ReactElement } from "react";

import {
  isFlowchartNodeElement,
  type FlowchartNodeType,
  type LinkDirection,
} from "@excalidraw/element";

import type {
  ElementsMap,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { t } from "../i18n";

import { ElementCanvasButtons } from "./ElementCanvasButtons";
import { ElementCanvasButton } from "./MagicButton";
import { DiamondIcon, EllipseIcon, PlusIcon, RectangleIcon } from "./icons";

import "./FlowchartCanvasButtons.scss";

import type App from "./App";

const directions: {
  direction: LinkDirection;
  symbol: string;
  label:
    | "flowchartDirectionUp"
    | "flowchartDirectionRight"
    | "flowchartDirectionDown"
    | "flowchartDirectionLeft";
}[] = [
  { direction: "up", symbol: "↑", label: "flowchartDirectionUp" },
  { direction: "right", symbol: "→", label: "flowchartDirectionRight" },
  { direction: "down", symbol: "↓", label: "flowchartDirectionDown" },
  { direction: "left", symbol: "←", label: "flowchartDirectionLeft" },
];

const nodeTypes: {
  type: FlowchartNodeType;
  icon: ReactElement;
  label: "flowchartProcess" | "flowchartDecision" | "flowchartEnd";
}[] = [
  { type: "rectangle", icon: RectangleIcon, label: "flowchartProcess" },
  { type: "diamond", icon: DiamondIcon, label: "flowchartDecision" },
  { type: "ellipse", icon: EllipseIcon, label: "flowchartEnd" },
];

export const FlowchartCanvasButtons = ({
  app,
  element,
  elementsMap,
}: {
  app: App;
  element: NonDeletedExcalidrawElement;
  elementsMap: ElementsMap;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<LinkDirection>("down");

  if (!isFlowchartNodeElement(element)) {
    return null;
  }

  const addNode = (type: FlowchartNodeType) => {
    app.flowchart.addNode(element, direction, type);
    setIsOpen(false);
  };

  return (
    <ElementCanvasButtons element={element} elementsMap={elementsMap}>
      <ElementCanvasButton
        title={t("labels.flowchartAddNextStep")}
        icon={PlusIcon}
        checked={isOpen}
        onChange={() => setIsOpen((isOpen) => !isOpen)}
      />
      {isOpen && (
        <div
          className="excalidraw-flowchart-add-panel"
          role="dialog"
          aria-label={t("labels.flowchartAddNextStep")}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="excalidraw-flowchart-add-panel__title">
            {t("labels.flowchartDirection")}
          </div>
          <div className="excalidraw-flowchart-add-panel__directions">
            {directions.map(({ direction: nextDirection, symbol, label }) => (
              <button
                key={nextDirection}
                className="excalidraw-flowchart-add-panel__direction"
                type="button"
                aria-label={t(`labels.${label}`)}
                aria-pressed={direction === nextDirection}
                title={t(`labels.${label}`)}
                onClick={() => setDirection(nextDirection)}
              >
                {symbol}
              </button>
            ))}
          </div>
          <div className="excalidraw-flowchart-add-panel__title">
            {t("labels.flowchartNodeType")}
          </div>
          <div className="excalidraw-flowchart-add-panel__shapes">
            {nodeTypes.map(({ type, icon, label }) => (
              <button
                key={type}
                className="excalidraw-flowchart-add-panel__shape"
                type="button"
                data-testid={`flowchart-add-${type}`}
                onClick={() => addNode(type)}
              >
                <span className="excalidraw-flowchart-add-panel__shape-icon">
                  {icon}
                </span>
                {t(`labels.${label}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </ElementCanvasButtons>
  );
};
