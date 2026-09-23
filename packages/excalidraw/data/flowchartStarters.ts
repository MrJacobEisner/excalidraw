import { ROUNDNESS, randomId } from "@excalidraw/common";
import { pointFrom } from "@excalidraw/math";
import {
  newArrowElement,
  newElement,
  newElementWith,
  newTextElement,
} from "@excalidraw/element";

import type {
  ExcalidrawGenericElement,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";

import type { LibraryItem } from "../types";

type FlowchartNodeType = ExcalidrawGenericElement["type"];

export type FlowchartStarter = LibraryItem & {
  description: string;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;
const STROKE_COLOR = "#1864ab";
const TEXT_COLOR = "#1e1e1e";
const ARROW_COLOR = "#4263eb";

const makeNode = (
  type: FlowchartNodeType,
  x: number,
  y: number,
  label: string,
  backgroundColor: string,
  width = NODE_WIDTH,
  height = NODE_HEIGHT,
) => {
  const node = newElement({
    type,
    x,
    y,
    width,
    height,
    roundness: { type: ROUNDNESS.PROPORTIONAL_RADIUS },
    backgroundColor,
    strokeColor: STROKE_COLOR,
    strokeWidth: 2,
    roughness: 1,
  });
  const text = newTextElement({
    x: x + width / 2,
    y: y + height / 2,
    text: label,
    fontSize: 20,
    strokeColor: TEXT_COLOR,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: node.id,
  });

  return {
    node: newElementWith(node, {
      boundElements: [{ type: "text", id: text.id }],
    }) as NonDeletedExcalidrawElement,
    text,
  };
};

const makeArrow = (
  start: NonDeletedExcalidrawElement,
  end: NonDeletedExcalidrawElement,
  points: readonly [number, number][],
  startFixedPoint: [number, number],
  endFixedPoint: [number, number],
) => {
  const [x, y] = points[0];
  const arrow = newArrowElement({
    type: "arrow",
    x,
    y,
    points: points.map(([pointX, pointY]) => pointFrom(pointX - x, pointY - y)),
    startArrowhead: null,
    endArrowhead: "triangle",
    strokeColor: ARROW_COLOR,
    strokeWidth: 2,
    roughness: 1,
    elbowed: true,
  });

  return newElementWith(arrow, {
    startBinding: {
      elementId: start.id,
      fixedPoint: startFixedPoint,
      mode: "orbit",
    },
    endBinding: {
      elementId: end.id,
      fixedPoint: endFixedPoint,
      mode: "orbit",
    },
  }) as NonDeletedExcalidrawElement;
};

const withArrowBindings = (
  nodes: readonly NonDeletedExcalidrawElement[],
  arrows: readonly NonDeletedExcalidrawElement[],
) => {
  const arrowsByNode = new Map<string, { id: string; type: "arrow" }[]>();
  for (const arrow of arrows) {
    if (arrow.type !== "arrow") {
      continue;
    }
    for (const elementId of [
      arrow.startBinding?.elementId,
      arrow.endBinding?.elementId,
    ]) {
      if (!elementId) {
        continue;
      }
      const bindings = arrowsByNode.get(elementId) || [];
      bindings.push({ type: "arrow", id: arrow.id });
      arrowsByNode.set(elementId, bindings);
    }
  }

  return nodes.map((element) =>
    arrowsByNode.has(element.id)
      ? (newElementWith(element, {
          boundElements: [
            ...(element.boundElements || []),
            ...arrowsByNode.get(element.id)!,
          ],
        }) as NonDeletedExcalidrawElement)
      : element,
  );
};

const createLinearProcess = (): readonly NonDeletedExcalidrawElement[] => {
  const start = makeNode("ellipse", 120, 40, "Start", "#d3f9d8");
  const process = makeNode("rectangle", 120, 190, "Do the work", "#d0ebff");
  const finish = makeNode("ellipse", 120, 340, "Finish", "#d3f9d8");
  const nodes = [
    start.node,
    start.text,
    process.node,
    process.text,
    finish.node,
    finish.text,
  ];
  const arrows = [
    makeArrow(
      start.node,
      process.node,
      [
        [230, 112],
        [230, 190],
      ],
      [0.5, 1],
      [0.5, 0],
    ),
    makeArrow(
      process.node,
      finish.node,
      [
        [230, 262],
        [230, 340],
      ],
      [0.5, 1],
      [0.5, 0],
    ),
  ];
  return [...withArrowBindings(nodes, arrows), ...arrows];
};

const createDecisionBranch = (): readonly NonDeletedExcalidrawElement[] => {
  const start = makeNode("ellipse", 250, 40, "Start", "#d3f9d8");
  const decision = makeNode("diamond", 190, 190, "Ready?", "#fff3bf", 340, 150);
  const yes = makeNode("rectangle", 30, 440, "Ship it", "#d3f9d8");
  const no = makeNode("rectangle", 440, 440, "Revise", "#ffe3e3");
  const nodes = [
    start.node,
    start.text,
    decision.node,
    decision.text,
    yes.node,
    yes.text,
    no.node,
    no.text,
  ];
  const arrows = [
    makeArrow(
      start.node,
      decision.node,
      [
        [360, 112],
        [360, 190],
      ],
      [0.5, 1],
      [0.5, 0],
    ),
    makeArrow(
      decision.node,
      yes.node,
      [
        [275, 340],
        [275, 390],
        [140, 390],
        [140, 440],
      ],
      [0.25, 1],
      [0.5, 0],
    ),
    makeArrow(
      decision.node,
      no.node,
      [
        [445, 340],
        [445, 390],
        [550, 390],
        [550, 440],
      ],
      [0.75, 1],
      [0.5, 0],
    ),
  ];
  return [...withArrowBindings(nodes, arrows), ...arrows];
};

const createLoop = (): readonly NonDeletedExcalidrawElement[] => {
  const begin = makeNode("rectangle", 70, 60, "Begin", "#d0ebff");
  const check = makeNode(
    "diamond",
    70,
    220,
    "More to do?",
    "#fff3bf",
    220,
    140,
  );
  const update = makeNode("rectangle", 390, 254, "Update", "#e5dbff");
  const nodes = [
    begin.node,
    begin.text,
    check.node,
    check.text,
    update.node,
    update.text,
  ];
  const arrows = [
    makeArrow(
      begin.node,
      check.node,
      [
        [180, 132],
        [180, 220],
      ],
      [0.5, 1],
      [0.5, 0],
    ),
    makeArrow(
      check.node,
      update.node,
      [
        [290, 290],
        [390, 290],
      ],
      [1, 0.5],
      [0, 0.5],
    ),
    makeArrow(
      update.node,
      check.node,
      [
        [500, 326],
        [500, 410],
        [20, 410],
        [20, 290],
        [70, 290],
      ],
      [1, 0.5],
      [0, 0.5],
    ),
  ];
  return [...withArrowBindings(nodes, arrows), ...arrows];
};

const createStarter = (
  name: string,
  description: string,
  createElements: () => readonly NonDeletedExcalidrawElement[],
): FlowchartStarter => ({
  id: randomId(),
  status: "published",
  created: 0,
  name,
  description,
  elements: createElements(),
});

export const FLOWCHART_STARTER_ITEMS: readonly FlowchartStarter[] = [
  createStarter(
    "Linear process",
    "A clear start-to-finish sequence",
    createLinearProcess,
  ),
  createStarter(
    "Decision branch",
    "A yes/no path with two outcomes",
    createDecisionBranch,
  ),
  createStarter(
    "Repeat loop",
    "A check-and-update loop you can adapt",
    createLoop,
  ),
];
