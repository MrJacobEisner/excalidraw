import { isArrowElement, isFlowchartNodeElement } from "./typeChecks";

import type { ExcalidrawElement, NonDeletedExcalidrawElement } from "./types";

export type FlowchartLayoutDirection = "down" | "right";

export type FlowchartLayout = ReadonlyMap<
  ExcalidrawElement["id"],
  { x: number; y: number }
>;

type Node = NonDeletedExcalidrawElement & {
  width: number;
  height: number;
};

type Edge = {
  from: ExcalidrawElement["id"];
  to: ExcalidrawElement["id"];
};

const LAYER_GAP = 100;
const NODE_GAP = 80;

const compareNodes = (
  a: Node,
  b: Node,
  direction: FlowchartLayoutDirection,
) => {
  const aCross = direction === "down" ? a.x + a.width / 2 : a.y + a.height / 2;
  const bCross = direction === "down" ? b.x + b.width / 2 : b.y + b.height / 2;

  return aCross - bCross || a.id.localeCompare(b.id);
};

/**
 * Computes a small, deterministic layered layout for the selected flowchart
 * nodes. Arrows are read from the scene rather than the selection so a user
 * can select the nodes alone. The function returns null unless every selected
 * flowchart node belongs to the same connected component.
 */
export const getFlowchartLayout = (
  selectedElements: readonly NonDeletedExcalidrawElement[],
  sceneElements: readonly NonDeletedExcalidrawElement[],
  direction: FlowchartLayoutDirection,
): FlowchartLayout | null => {
  const nodes = selectedElements.filter(isFlowchartNodeElement) as Node[];
  if (nodes.length < 2) {
    return null;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: Edge[] = [];

  for (const element of sceneElements) {
    if (
      !isArrowElement(element) ||
      !element.startBinding ||
      !element.endBinding
    ) {
      continue;
    }

    const from = element.startBinding.elementId;
    const to = element.endBinding.elementId;
    if (nodeIds.has(from) && nodeIds.has(to)) {
      edges.push({ from, to });
    }
  }

  if (edges.length === 0) {
    return null;
  }

  const undirected = new Map<string, Set<string>>(
    nodes.map((node) => [node.id, new Set()]),
  );
  for (const edge of edges) {
    if (edge.from === edge.to) {
      continue;
    }
    undirected.get(edge.from)?.add(edge.to);
    undirected.get(edge.to)?.add(edge.from);
  }

  const connected = new Set<string>();
  const queue = [nodes[0].id];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (connected.has(nodeId)) {
      continue;
    }
    connected.add(nodeId);
    for (const neighbor of undirected.get(nodeId) || []) {
      if (!connected.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  if (connected.size !== nodes.length) {
    return null;
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>(
    nodes.map((node) => [node.id, []]),
  );
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));

  for (const edge of edges) {
    if (edge.from === edge.to) {
      continue;
    }
    outgoing.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
  }

  // Kahn's algorithm gives readable levels for DAGs. If a cycle has no
  // zero-indegree node, start a new deterministic traversal at the leftmost
  // remaining node. This breaks only the layout dependency; bindings remain
  // untouched.
  const layers = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const processed = new Set<string>();
  const ready: string[] = [];

  const sortIds = (ids: string[]) =>
    ids.sort((a, b) =>
      compareNodes(nodesById.get(a)!, nodesById.get(b)!, direction),
    );

  while (processed.size < nodes.length) {
    ready.push(
      ...sortIds(
        nodes
          .map((node) => node.id)
          .filter(
            (nodeId) => !processed.has(nodeId) && indegree.get(nodeId) === 0,
          ),
      ),
    );

    if (ready.length === 0) {
      const next = nodes
        .map((node) => node.id)
        .filter((nodeId) => !processed.has(nodeId))
        .sort((a, b) =>
          compareNodes(nodesById.get(a)!, nodesById.get(b)!, direction),
        )[0];
      ready.push(next);
      indegree.set(next, 0);
    }

    while (ready.length > 0) {
      const current = ready.shift()!;
      if (processed.has(current)) {
        continue;
      }
      processed.add(current);

      for (const target of outgoing.get(current) || []) {
        if (processed.has(target)) {
          continue;
        }
        layers.set(
          target,
          Math.max(layers.get(target) || 0, (layers.get(current) || 0) + 1),
        );
        indegree.set(target, (indegree.get(target) || 0) - 1);
        if (indegree.get(target) === 0) {
          ready.push(target);
        }
      }
      sortIds(ready);
    }
  }

  const layersToNodes = new Map<number, Node[]>();
  for (const node of nodes) {
    const layer = layers.get(node.id) || 0;
    const layerNodes = layersToNodes.get(layer) || [];
    layerNodes.push(node);
    layersToNodes.set(layer, layerNodes);
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  const crossCenter =
    direction === "down" ? (minX + maxX) / 2 : (minY + maxY) / 2;
  const positions = new Map<string, { x: number; y: number }>();
  let primary = direction === "down" ? minY : minX;

  for (const layer of [...layersToNodes.keys()].sort((a, b) => a - b)) {
    const layerNodes = layersToNodes.get(layer)!;
    layerNodes.sort((a, b) => compareNodes(a, b, direction));

    const primarySize = Math.max(
      ...layerNodes.map((node) =>
        direction === "down" ? node.height : node.width,
      ),
    );
    const crossSize =
      layerNodes.reduce(
        (size, node) =>
          size + (direction === "down" ? node.width : node.height),
        0,
      ) +
      NODE_GAP * Math.max(0, layerNodes.length - 1);
    let cross = crossCenter - crossSize / 2;

    for (const node of layerNodes) {
      positions.set(
        node.id,
        direction === "down"
          ? { x: cross, y: primary }
          : { x: primary, y: cross },
      );
      cross += (direction === "down" ? node.width : node.height) + NODE_GAP;
    }

    primary += primarySize + LAYER_GAP;
  }

  return positions;
};
