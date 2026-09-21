import React, { useEffect, useState } from "react";

import {
  type FlowchartNodeType,
  type LinkDirection,
} from "@excalidraw/element";

import type {
  ElementsMap,
  ExcalidrawFlowchartNodeElement,
  NonDeleted,
} from "@excalidraw/element/types";

import { useI18n } from "../i18n";

import { useApp } from "./App";
import { ElementCanvasButtons } from "./ElementCanvasButtons";
import { ElementCanvasButton } from "./MagicButton";
import { ArrowRightIcon, DiamondIcon, RectangleIcon } from "./icons";

import "./FlowchartCanvasButtons.scss";

const directions: LinkDirection[] = ["up", "right", "down", "left"];

const DirectionIcon = ({ direction }: { direction: LinkDirection }) => (
  <span
    className={`excalidraw-flowchart-direction-icon excalidraw-flowchart-direction-icon--${direction}`}
  >
    {ArrowRightIcon}
  </span>
);

export const FlowchartCanvasButtons = ({
  element,
  elementsMap,
}: {
  element: NonDeleted<ExcalidrawFlowchartNodeElement>;
  elementsMap: ElementsMap;
}) => {
  const app = useApp();
  const { t } = useI18n();
  const [nodeType, setNodeType] = useState<FlowchartNodeType>(
    element.type === "diamond" ? "diamond" : "rectangle",
  );

  useEffect(() => {
    setNodeType(element.type === "diamond" ? "diamond" : "rectangle");
  }, [element.id, element.type]);

  return (
    <ElementCanvasButtons element={element} elementsMap={elementsMap}>
      <div
        className="excalidraw-flowchart-canvas-buttons__group"
        aria-label={t("labels.flowchartNodeType")}
      >
        <ElementCanvasButton
          title={t("labels.flowchartProcess")}
          icon={RectangleIcon}
          checked={nodeType === "rectangle"}
          onChange={() => setNodeType("rectangle")}
        />
        <ElementCanvasButton
          title={t("labels.flowchartDecision")}
          icon={DiamondIcon}
          checked={nodeType === "diamond"}
          onChange={() => setNodeType("diamond")}
        />
      </div>
      <div
        className="excalidraw-flowchart-canvas-buttons__group"
        aria-label={t("labels.flowchartAddNode")}
      >
        {directions.map((direction) => (
          <ElementCanvasButton
            key={direction}
            title={t(`labels.flowchartAddNode_${direction}` as const)}
            icon={<DirectionIcon direction={direction} />}
            checked={false}
            onChange={() => app.flowchart.addNode(element, direction, nodeType)}
          />
        ))}
      </div>
    </ElementCanvasButtons>
  );
};
