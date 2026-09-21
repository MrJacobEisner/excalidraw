import React, { useCallback } from "react";

import { getLineHeight, VERTICAL_ALIGN } from "@excalidraw/common";
import {
  newArrowElement,
  newElement,
  newElementWith,
  newTextElement,
} from "@excalidraw/element";
import { pointFrom } from "@excalidraw/math";

import type { LocalPoint } from "@excalidraw/math";

import type {
  ExcalidrawElement,
  ExcalidrawLinearElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import { useApp } from "./App";

import "./FlowchartTemplates.scss";

type FlowchartTemplate = {
  id: "linear" | "decision";
  title: string;
  description: string;
  preview: React.ReactNode;
  create: () => readonly ExcalidrawElement[];
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;
const NODE_GAP = 112;
const NODE_FILL = "#eaf2ff";
const NODE_STROKE = "#4c75d8";
const DECISION_FILL = "#fff4d6";
const DECISION_STROKE = "#d99000";
const TEXT_COLOR = "#1f2937";

const createNode = (
  type: "rectangle" | "diamond",
  text: string,
  x: number,
  y: number,
  colors = { backgroundColor: NODE_FILL, strokeColor: NODE_STROKE },
) => {
  const node = newElement({
    type,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    backgroundColor: colors.backgroundColor,
    strokeColor: colors.strokeColor,
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 0,
    roundness: null,
  });
  const label = newTextElement({
    x: x + NODE_WIDTH / 2,
    y: y + NODE_HEIGHT / 2,
    text,
    containerId: node.id,
    textAlign: "center",
    verticalAlign: VERTICAL_ALIGN.MIDDLE,
    fontSize: 16,
    lineHeight: getLineHeight(1),
    strokeColor: TEXT_COLOR,
    roughness: 0,
  });

  return {
    node: newElementWith(node, {
      boundElements: [{ id: label.id, type: "text" }],
    }),
    label,
  };
};

const createArrow = (
  source: NonDeletedExcalidrawElement,
  target: NonDeletedExcalidrawElement,
  direction: "down" | "left" | "right",
  label?: string,
) => {
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterY = target.y + target.height / 2;
  const isVertical = direction === "down";
  const startX =
    direction === "down"
      ? source.x + source.width / 2
      : direction === "right"
      ? source.x + source.width
      : source.x;
  const startY = isVertical ? source.y + source.height : sourceCenterY;
  const endX =
    direction === "down"
      ? target.x + target.width / 2
      : direction === "right"
      ? target.x
      : target.x + target.width;
  const endY = isVertical ? target.y : targetCenterY;
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const points = [
    pointFrom<LocalPoint>(startX - x, startY - y),
    pointFrom<LocalPoint>(endX - x, endY - y),
  ];
  const arrow = newArrowElement({
    type: "arrow",
    x,
    y,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
    points,
    endArrowhead: "arrow",
    strokeColor: NODE_STROKE,
    strokeWidth: 2,
    roughness: 0,
  });

  const startBinding =
    direction === "down"
      ? {
          elementId: source.id,
          fixedPoint: [0.5, 1] as [number, number],
          mode: "orbit" as const,
        }
      : {
          elementId: source.id,
          fixedPoint: [direction === "right" ? 1 : 0, 0.5] as [number, number],
          mode: "orbit" as const,
        };
  const endBinding =
    direction === "down"
      ? {
          elementId: target.id,
          fixedPoint: [0.5, 0] as [number, number],
          mode: "orbit" as const,
        }
      : {
          elementId: target.id,
          fixedPoint: [direction === "right" ? 0 : 1, 0.5] as [number, number],
          mode: "orbit" as const,
        };
  const boundArrow = newElementWith(arrow, { startBinding, endBinding });
  const arrowLabel = label
    ? newTextElement({
        x: (startX + endX) / 2,
        y: (startY + endY) / 2 - 12,
        text: label,
        fontSize: 14,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: VERTICAL_ALIGN.MIDDLE,
        strokeColor: NODE_STROKE,
        roughness: 0,
      })
    : null;

  return { arrow: boundArrow, arrowLabel };
};

const addArrowToNode = (
  node: NonDeletedExcalidrawElement,
  arrow: ExcalidrawLinearElement,
) =>
  newElementWith(node, {
    boundElements: [
      ...(node.boundElements || []),
      { id: arrow.id, type: "arrow" },
    ],
  });

const createLinearTemplate = () => {
  const start = createNode("rectangle", "Start", 0, 0);
  const work = createNode(
    "rectangle",
    "Do the work",
    0,
    NODE_HEIGHT + NODE_GAP,
  );
  const done = createNode("rectangle", "Done", 0, (NODE_HEIGHT + NODE_GAP) * 2);
  const firstArrow = createArrow(start.node, work.node, "down");
  const secondArrow = createArrow(work.node, done.node, "down");

  return [
    addArrowToNode(start.node, firstArrow.arrow),
    start.label,
    addArrowToNode(work.node, secondArrow.arrow),
    work.label,
    done.node,
    done.label,
    firstArrow.arrow,
    secondArrow.arrow,
  ];
};

const createDecisionTemplate = () => {
  const decision = createNode("diamond", "Is it ready?", 0, 0, {
    backgroundColor: DECISION_FILL,
    strokeColor: DECISION_STROKE,
  });
  const yes = createNode(
    "rectangle",
    "Yes",
    -NODE_WIDTH - 96,
    NODE_HEIGHT + 120,
  );
  const no = createNode("rectangle", "No", NODE_WIDTH + 96, NODE_HEIGHT + 120);
  const yesArrow = createArrow(decision.node, yes.node, "left", "YES");
  const noArrow = createArrow(decision.node, no.node, "right", "NO");

  return [
    addArrowToNode(
      addArrowToNode(decision.node, yesArrow.arrow),
      noArrow.arrow,
    ),
    decision.label,
    addArrowToNode(yes.node, yesArrow.arrow),
    yes.label,
    addArrowToNode(no.node, noArrow.arrow),
    no.label,
    yesArrow.arrow,
    ...(yesArrow.arrowLabel ? [yesArrow.arrowLabel] : []),
    noArrow.arrow,
    ...(noArrow.arrowLabel ? [noArrow.arrowLabel] : []),
  ];
};

const Preview = ({ type }: { type: FlowchartTemplate["id"] }) =>
  type === "linear" ? (
    <div className="flowchart-template-preview" aria-hidden="true">
      <span className="flowchart-template-preview__node" />
      <span className="flowchart-template-preview__arrow" />
      <span className="flowchart-template-preview__node" />
      <span className="flowchart-template-preview__arrow" />
      <span className="flowchart-template-preview__node" />
    </div>
  ) : (
    <div
      className="flowchart-template-preview flowchart-template-preview--decision"
      aria-hidden="true"
    >
      <span className="flowchart-template-preview__diamond" />
      <span className="flowchart-template-preview__branch flowchart-template-preview__branch--left" />
      <span className="flowchart-template-preview__branch flowchart-template-preview__branch--right" />
      <span className="flowchart-template-preview__node" />
      <span className="flowchart-template-preview__node" />
    </div>
  );

const templates: readonly FlowchartTemplate[] = [
  {
    id: "linear",
    title: "Linear process",
    description: "Start → work → done",
    preview: <Preview type="linear" />,
    create: createLinearTemplate,
  },
  {
    id: "decision",
    title: "Yes / no decision",
    description: "Branch from a decision",
    preview: <Preview type="decision" />,
    create: createDecisionTemplate,
  },
];

export const FlowchartTemplates = () => {
  const app = useApp();
  const insertTemplate = useCallback(
    (template: FlowchartTemplate) => {
      app.onInsertElements(template.create());
      app.focusContainer();
    },
    [app],
  );

  return (
    <section
      className="flowchart-templates"
      aria-labelledby="flowchart-templates-title"
    >
      <div className="flowchart-templates__heading">
        <div>
          <h2 id="flowchart-templates-title">Flowchart starters</h2>
          <p>Insert editable nodes and arrows without replacing your canvas.</p>
        </div>
        <span className="flowchart-templates__badge">New</span>
      </div>
      <div className="flowchart-templates__grid">
        {templates.map((template) => (
          <button
            className="flowchart-template-card"
            key={template.id}
            type="button"
            onClick={() => insertTemplate(template)}
            aria-label={`Insert ${template.title} flowchart`}
          >
            {template.preview}
            <span className="flowchart-template-card__title">
              {template.title}
            </span>
            <span className="flowchart-template-card__description">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
