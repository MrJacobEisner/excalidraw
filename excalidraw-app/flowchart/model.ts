export type FlowNode = {
  id: string;
  label: string;
  kind: "start" | "process" | "decision" | "end";
};
export type FlowEdge = { from: string; to: string; label?: string };
export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] };

const MAX_NODES = 40;
const MAX_EDGES = 80;
const nodeKind = (label: string): FlowNode["kind"] => {
  const value = label.toLowerCase();
  return value === "start"
    ? "start"
    : value === "end" || value === "done"
    ? "end"
    : label.endsWith("?")
    ? "decision"
    : "process";
};

/**
 * Parses chains (`A -> B`) and labelled links (`A -Yes-> B`). A line that
 * starts with a labelled link continues from the preceding line's first node.
 */
export const parseFlowText = (source: string): FlowGraph => {
  if (!source.trim()) {
    throw new Error(
      "Flowchart input is empty. Add a flow such as “Start -> Review -> Done”.",
    );
  }
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const byLabel = new Map<string, FlowNode>();
  let continuation: FlowNode | undefined;

  const getNode = (raw: string, line: number) => {
    const label = raw.trim();
    if (!label) {
      throw new Error(`Line ${line}: expected a node name.`);
    }
    if (label.length > 60) {
      throw new Error(
        `Line ${line}: keep node labels to 60 characters or fewer.`,
      );
    }
    const known = byLabel.get(label);
    if (known) {
      return known;
    }
    if (nodes.length >= MAX_NODES) {
      throw new Error(
        `Flowchart exceeds the maximum of ${MAX_NODES} nodes. Remove or combine some steps.`,
      );
    }
    const node: FlowNode = {
      id: `node-${nodes.length + 1}`,
      label,
      kind: nodeKind(label),
    };
    nodes.push(node);
    byLabel.set(label, node);
    return node;
  };

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const text = rawLine.trim();
    if (!text) {
      return;
    }
    const line = index + 1;
    // Labelled connectors start at a whitespace boundary, never within a
    // hyphenated node name such as "Pre-check".
    const separators = [...text.matchAll(/(?<!\S)-([^>\r\n]+)->|->/g)];
    if (!separators.length) {
      if (text.includes("->") || /(^|\s)-[^>]*$/.test(text)) {
        throw new Error(
          `Line ${line}: malformed connection. Use “A -> B” or “A -label-> B”.`,
        );
      }
      continuation = getNode(text, line);
      return;
    }

    const first = separators[0];
    const firstAt = first.index ?? 0;
    let current: FlowNode;
    let anchor: FlowNode;
    if (firstAt === 0) {
      if (!first[1]) {
        throw new Error(
          `Line ${line}: a connection cannot start with “->”; add a source node.`,
        );
      }
      if (!continuation) {
        throw new Error(
          `Line ${line}: labelled continuation has no source node on the preceding line.`,
        );
      }
      current = anchor = continuation;
    } else {
      current = anchor = getNode(text.slice(0, firstAt), line);
    }

    separators.forEach((separator, separatorIndex) => {
      const at = separator.index ?? 0;
      const target = text
        .slice(
          at + separator[0].length,
          separators[separatorIndex + 1]?.index ?? text.length,
        )
        .trim();
      if (!target) {
        throw new Error(
          `Line ${line}: expected a node after “${separator[0]}”.`,
        );
      }
      const edgeLabel = separator[1]?.trim();
      if (separator[1] !== undefined && !edgeLabel) {
        throw new Error(
          `Line ${line}: labelled connection must include a label.`,
        );
      }
      if (edges.length >= MAX_EDGES) {
        throw new Error(
          `Flowchart exceeds the maximum of ${MAX_EDGES} edges. Remove some connections.`,
        );
      }
      const next = getNode(target, line);
      edges.push({
        from: current.id,
        to: next.id,
        ...(edgeLabel ? { label: edgeLabel } : {}),
      });
      current = next;
    });
    continuation = anchor;
  });
  return { nodes, edges };
};

export const FLOW_TEMPLATES: Array<{
  id: string;
  title: string;
  description: string;
  graph: FlowGraph;
}> = [
  {
    id: "approval",
    title: "Approval process",
    description: "Submit, review, approve, or revise a request.",
    graph: parseFlowText(
      "Start -> Submit request -> Approved?\nApproved? -Yes-> Complete\n-No-> Revise -> Submit request",
    ),
  },
  {
    id: "onboarding",
    title: "Team onboarding",
    description: "Guide a new teammate from account setup to a first task.",
    graph: parseFlowText(
      "Start -> Create account -> Orientation -> First task -> Done",
    ),
  },
  {
    id: "incident",
    title: "Incident response",
    description: "Triage, escalate, investigate, and resolve an incident.",
    graph: parseFlowText(
      "Start -> Detect incident -> Critical?\nCritical? -Yes-> Escalate -> Resolve -> End\n-No-> Investigate -> Resolve",
    ),
  },
];

export const layoutFlowGraph = (
  graph: FlowGraph,
  direction: "down" | "right",
): Array<FlowNode & { x: number; y: number }> => {
  const nodeIndex = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const adjacent = graph.nodes.map(() => [] as number[]);
  graph.edges.forEach((edge) => {
    const from = nodeIndex.get(edge.from);
    const to = nodeIndex.get(edge.to);
    if (from === undefined || to === undefined) {
      throw new Error(
        `Cannot layout edge “${edge.from}” -> “${edge.to}”: node not found.`,
      );
    }
    adjacent[from].push(to);
  });

  // Tarjan components turn cycles into single vertices before DAG ranking.
  let nextIndex = 0;
  const indices = graph.nodes.map(() => -1);
  const low = graph.nodes.map(() => -1);
  const stack: number[] = [];
  const stacked = graph.nodes.map(() => false);
  const componentOf = graph.nodes.map(() => -1);
  const components: number[][] = [];
  const visit = (node: number) => {
    indices[node] = low[node] = nextIndex++;
    stack.push(node);
    stacked[node] = true;
    adjacent[node].forEach((target) => {
      if (indices[target] < 0) {
        visit(target);
        low[node] = Math.min(low[node], low[target]);
      } else if (stacked[target]) {
        low[node] = Math.min(low[node], indices[target]);
      }
    });
    if (indices[node] === low[node]) {
      const component: number[] = [];
      let member = -1;
      do {
        member = stack.pop()!;
        stacked[member] = false;
        componentOf[member] = components.length;
        component.push(member);
      } while (member !== node);
      components.push(component);
    }
  };
  graph.nodes.forEach((_, index) => indices[index] < 0 && visit(index));

  const outgoing = components.map(() => new Set<number>());
  const indegree = components.map(() => 0);
  adjacent.forEach((targets, from) =>
    targets.forEach((to) => {
      const a = componentOf[from];
      const b = componentOf[to];
      if (a !== b && !outgoing[a].has(b)) {
        outgoing[a].add(b);
        indegree[b]++;
      }
    }),
  );
  const rank = components.map(() => 0);
  const queue = components
    .map((_, index) => index)
    .filter((index) => !indegree[index])
    .sort((a, b) => a - b);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    [...outgoing[current]]
      .sort((a, b) => a - b)
      .forEach((target) => {
        rank[target] = Math.max(rank[target], rank[current] + 1);
        if (--indegree[target] === 0) {
          queue.push(target);
        }
      });
  }

  const rankSlots = new Map<number, number>();
  return graph.nodes.map((node, index) => {
    const nodeRank = rank[componentOf[index]];
    const slot = rankSlots.get(nodeRank) ?? 0;
    rankSlots.set(nodeRank, slot + 1);
    return {
      ...node,
      x: direction === "down" ? slot * 280 : nodeRank * 280,
      y: direction === "down" ? nodeRank * 180 : slot * 180,
    };
  });
};
