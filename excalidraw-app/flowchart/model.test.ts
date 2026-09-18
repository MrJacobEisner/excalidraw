import { describe, expect, it } from "vitest";

import { FLOW_TEMPLATES, layoutFlowGraph, parseFlowText } from "./model";

describe("parseFlowText", () => {
  it("preserves hyphenated source and target labels", () => {
    expect(
      parseFlowText("Pre-check -> Done").nodes.map((node) => node.label),
    ).toEqual(["Pre-check", "Done"]);
    const graph = parseFlowText("Start -> Pre-check -> Done");
    expect(graph.nodes.map((node) => node.label)).toEqual([
      "Start",
      "Pre-check",
      "Done",
    ]);
    expect(graph.edges.every((edge) => !edge.label)).toBe(true);
    expect(
      parseFlowText("Pre-check -Follow-up-> Sign-off").edges[0].label,
    ).toBe("Follow-up");
  });
  it("parses chains and infers kinds", () => {
    const graph = parseFlowText("Start -> Review -> Approved? -> Done");
    expect(graph.nodes.map(({ label, kind }) => [label, kind])).toEqual([
      ["Start", "start"],
      ["Review", "process"],
      ["Approved?", "decision"],
      ["Done", "end"],
    ]);
    expect(graph.edges).toHaveLength(3);
  });

  it("parses labelled branches and reuses trimmed labels", () => {
    const graph = parseFlowText(
      "Start -> Approved?\nApproved? -Yes-> Ship\n-No-> Revise -> Approved?",
    );
    const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
    expect(
      graph.edges.map((edge) => [
        labels.get(edge.from),
        labels.get(edge.to),
        edge.label,
      ]),
    ).toEqual([
      ["Start", "Approved?", undefined],
      ["Approved?", "Ship", "Yes"],
      ["Approved?", "Revise", "No"],
      ["Revise", "Approved?", undefined],
    ]);
    expect(
      graph.nodes.filter((node) => node.label === "Approved?"),
    ).toHaveLength(1);
  });

  it("rejects empty and malformed input actionably", () => {
    expect(() => parseFlowText(" \n ")).toThrow(/empty.*Start/);
    expect(() => parseFlowText("Start ->")).toThrow(/Line 1.*expected a node/i);
    expect(() => parseFlowText("-Yes-> End")).toThrow(/Line 1.*no source/i);
    expect(() => parseFlowText("Start -Yes End")).toThrow(/Line 1.*malformed/i);
  });

  it("enforces limits", () => {
    expect(() => parseFlowText("A".repeat(61))).toThrow(/60 characters/);
    expect(() =>
      parseFlowText(
        Array.from({ length: 41 }, (_, index) => `N${index}`).join(" -> "),
      ),
    ).toThrow(/maximum of 40 nodes/);
    expect(() =>
      parseFlowText(Array.from({ length: 81 }, () => "A -> B").join("\n")),
    ).toThrow(/maximum of 80 edges/);
  });
});

describe("layoutFlowGraph", () => {
  const noOverlap = (layout: ReturnType<typeof layoutFlowGraph>) =>
    expect(new Set(layout.map(({ x, y }) => `${x}:${y}`)).size).toBe(
      layout.length,
    );

  it("deterministically lays out branches and rejoins both ways", () => {
    const graph = parseFlowText(
      "Start -> Choice?\nChoice? -Yes-> Left -> Join -> End\n-No-> Right -> Join",
    );
    const down = layoutFlowGraph(graph, "down");
    const right = layoutFlowGraph(graph, "right");
    expect(layoutFlowGraph(graph, "down")).toEqual(down);
    noOverlap(down);
    noOverlap(right);
    down.concat(right).forEach(({ x, y }) => {
      expect(x % 280).toBe(0);
      expect(y % 180).toBe(0);
    });
  });

  it("is cycle-safe", () => {
    const graph = parseFlowText(
      "Start -> Work -> Retry?\nRetry? -Yes-> Work\n-No-> End",
    );
    const layout = layoutFlowGraph(graph, "down");
    expect(layout).toHaveLength(graph.nodes.length);
    noOverlap(layout);
  });
});

describe("FLOW_TEMPLATES", () => {
  it("contains usable approval, onboarding, and incident templates", () => {
    expect(FLOW_TEMPLATES.map(({ id }) => id)).toEqual([
      "approval",
      "onboarding",
      "incident",
    ]);
    FLOW_TEMPLATES.forEach(({ title, description, graph }) => {
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
      expect(graph.nodes.length).toBeGreaterThan(1);
      expect(graph.edges.length).toBeGreaterThan(0);
    });
  });
});
