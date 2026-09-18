import type { ExcalidrawElementSkeleton } from "@excalidraw/element";

export type FlowchartNode = {
  id: string;
  text: string;
  x: number;
  y: number;
};

export type FlowchartEdge = {
  from: string;
  to: string;
  label?: string;
};

export type FlowchartGraph = {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

export type FlowchartTemplate = "sequential" | "branching";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 76;
const COLUMN_GAP = 80;
const ROW_GAP = 76;
const CONNECTOR_GAP = 6;

export type FlowchartShapeGeometry = {
  type: "rectangle" | "ellipse" | "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
};

type Point = { x: number; y: number };

const pointOutsideShapeToward = (
  shape: FlowchartShapeGeometry,
  toward: Point,
): Point => {
  const center = {
    x: shape.x + shape.width / 2,
    y: shape.y + shape.height / 2,
  };
  const angle = shape.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const globalDx = toward.x - center.x;
  const globalDy = toward.y - center.y;
  const localDx = globalDx * cos + globalDy * sin;
  const localDy = -globalDx * sin + globalDy * cos;
  const halfWidth = Math.abs(shape.width) / 2;
  const halfHeight = Math.abs(shape.height) / 2;

  let scale: number;
  if (shape.type === "ellipse") {
    scale =
      1 /
      Math.sqrt(
        (localDx * localDx) / (halfWidth * halfWidth) +
          (localDy * localDy) / (halfHeight * halfHeight),
      );
  } else if (shape.type === "diamond") {
    scale =
      1 / (Math.abs(localDx) / halfWidth + Math.abs(localDy) / halfHeight);
  } else {
    scale =
      1 /
      Math.max(Math.abs(localDx) / halfWidth, Math.abs(localDy) / halfHeight);
  }

  const distance = Math.hypot(globalDx, globalDy);
  const gapScale = distance ? CONNECTOR_GAP / distance : 0;
  return {
    x: center.x + globalDx * (scale + gapScale),
    y: center.y + globalDy * (scale + gapScale),
  };
};

export const getFlowchartConnectorEndpoints = (
  from: FlowchartShapeGeometry,
  to: FlowchartShapeGeometry,
) => {
  const fromCenter = {
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  };
  const toCenter = {
    x: to.x + to.width / 2,
    y: to.y + to.height / 2,
  };

  return {
    start: pointOutsideShapeToward(from, toCenter),
    end: pointOutsideShapeToward(to, fromCenter),
  };
};

const layoutTree = (
  entries: { text: string; depth: number; edgeLabel?: string }[],
): FlowchartGraph => {
  const nodes: FlowchartNode[] = [];
  const edges: FlowchartEdge[] = [];
  const parents: string[] = [];
  const rowByDepth: number[] = [];

  entries.forEach((entry, index) => {
    const id = `node-${index}`;
    const row = rowByDepth[entry.depth] ?? 0;
    rowByDepth[entry.depth] = row + 1;
    nodes.push({
      id,
      text: entry.text,
      x: entry.depth * (NODE_WIDTH + COLUMN_GAP),
      y: row * (NODE_HEIGHT + ROW_GAP),
    });

    if (entry.depth > 0) {
      edges.push({
        from: parents[entry.depth - 1],
        to: id,
        label: entry.edgeLabel,
      });
    } else if (index > 0) {
      edges.push({ from: nodes[index - 1].id, to: id });
    }
    parents[entry.depth] = id;
    parents.length = entry.depth + 1;
  });

  return { nodes, edges };
};

export const parseFlowchartOutline = (outline: string): FlowchartGraph => {
  const lines = outline.split(/\r?\n/);
  const entries: { text: string; depth: number; edgeLabel?: string }[] = [];
  let previousDepth = 0;

  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      return;
    }
    if (line.includes("\t")) {
      throw new Error(`Line ${lineIndex + 1}: use spaces instead of tabs.`);
    }
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (indent % 2 !== 0) {
      throw new Error(
        `Line ${lineIndex + 1}: indentation must use groups of two spaces.`,
      );
    }
    const depth = indent / 2;
    if (!entries.length && depth !== 0) {
      throw new Error(
        `Line ${lineIndex + 1}: the first step cannot be indented.`,
      );
    }
    if (depth > previousDepth + 1) {
      throw new Error(
        `Line ${lineIndex + 1}: indentation cannot skip a level.`,
      );
    }

    const content = line.trim();
    const labelMatch = content.match(/^\[([^\]]+)\]\s+(.+)$/);
    const text = labelMatch ? labelMatch[2].trim() : content;
    if (!text) {
      throw new Error(`Line ${lineIndex + 1}: add a step name.`);
    }
    entries.push({
      text,
      depth,
      edgeLabel: labelMatch?.[1].trim(),
    });
    previousDepth = depth;
  });

  if (!entries.length) {
    throw new Error("Add at least one step.");
  }
  if (entries.length > 40) {
    throw new Error("Outlines are limited to 40 steps.");
  }
  return layoutTree(entries);
};

export const getFlowchartTemplate = (
  template: FlowchartTemplate,
): FlowchartGraph =>
  template === "sequential"
    ? layoutTree([
        { text: "Start", depth: 0 },
        { text: "Collect information", depth: 0 },
        { text: "Complete", depth: 0 },
      ])
    : layoutTree([
        { text: "Request received", depth: 0 },
        { text: "Review request", depth: 0 },
        { text: "Approved", depth: 1, edgeLabel: "Yes" },
        { text: "Revise request", depth: 1, edgeLabel: "No" },
      ]);

export const graphToSkeleton = (
  graph: FlowchartGraph,
  origin: { x: number; y: number },
  idPrefix: string,
): ExcalidrawElementSkeleton[] => {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const shapes: ExcalidrawElementSkeleton[] = graph.nodes.map(
    (node, index) => ({
      type: index === 0 ? "ellipse" : "rectangle",
      id: `${idPrefix}-${node.id}`,
      x: origin.x + node.x,
      y: origin.y + node.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      backgroundColor: index === 0 ? "#dbe4ff" : "#e5dbff",
      fillStyle: "solid",
      label: { text: node.text, fontSize: 18 },
    }),
  );
  const arrows: ExcalidrawElementSkeleton[] = graph.edges.map((edge, index) => {
    const from = nodeById.get(edge.from)!;
    const to = nodeById.get(edge.to)!;
    const { start, end } = getFlowchartConnectorEndpoints(
      {
        type: graph.nodes.indexOf(from) === 0 ? "ellipse" : "rectangle",
        x: origin.x + from.x,
        y: origin.y + from.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      {
        type: graph.nodes.indexOf(to) === 0 ? "ellipse" : "rectangle",
        x: origin.x + to.x,
        y: origin.y + to.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    );
    return {
      type: "arrow",
      id: `${idPrefix}-edge-${index}`,
      x: start.x,
      y: start.y,
      // A zero constructor dimension is interpreted as "use the default".
      // Keep vertical/horizontal arrows effectively straight without triggering
      // that fallback.
      width: end.x - start.x || 0.01,
      height: end.y - start.y || 0.01,
      start: { id: `${idPrefix}-${edge.from}` },
      end: { id: `${idPrefix}-${edge.to}` },
      ...(edge.label ? { label: { text: edge.label, fontSize: 16 } } : {}),
    };
  });
  return [...shapes, ...arrows];
};
