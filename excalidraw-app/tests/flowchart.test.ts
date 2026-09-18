import { describe, expect, it } from "vitest";
import { convertToExcalidrawElements } from "@excalidraw/element";

import {
  getFlowchartConnectorEndpoints,
  getFlowchartTemplate,
  graphToSkeleton,
  parseFlowchartOutline,
} from "../components/flowchart";

describe("flowchart outline", () => {
  it("parses branches and connector labels", () => {
    const graph = parseFlowchartOutline(
      "Review\n  [yes] Approve\n    Publish\n  [no] Revise",
    );
    expect(graph.nodes.map((node) => node.text)).toEqual([
      "Review",
      "Approve",
      "Publish",
      "Revise",
    ]);
    expect(graph.edges).toMatchObject([
      { from: "node-0", to: "node-1", label: "yes" },
      { from: "node-1", to: "node-2" },
      { from: "node-0", to: "node-3", label: "no" },
    ]);
  });

  it("validates indentation", () => {
    expect(() => parseFlowchartOutline("Start\n   Invalid")).toThrow(
      "groups of two spaces",
    );
    expect(() => parseFlowchartOutline("Start\n    Skipped")).toThrow(
      "cannot skip a level",
    );
    expect(() => parseFlowchartOutline("\n  Indented")).toThrow(
      "Line 2: the first step",
    );
  });

  it("builds sequential and branching starter graphs", () => {
    expect(getFlowchartTemplate("sequential").edges).toHaveLength(2);
    expect(getFlowchartTemplate("branching").edges).toHaveLength(3);
  });

  it("creates shapes and bound arrows with an offset", () => {
    const skeleton = graphToSkeleton(
      getFlowchartTemplate("sequential"),
      { x: 500, y: 100 },
      "test",
    );
    expect(skeleton[0]).toMatchObject({ id: "test-node-0", x: 500, y: 100 });
    expect(skeleton[3]).toMatchObject({
      type: "arrow",
      start: { id: "test-node-0" },
      end: { id: "test-node-1" },
    });
    const elements = convertToExcalidrawElements(skeleton, {
      regenerateIds: false,
    });
    const arrow = elements.find((element) => element.type === "arrow");
    expect(arrow).toMatchObject({
      startBinding: { elementId: "test-node-0" },
      endBinding: { elementId: "test-node-1" },
    });
  });

  it("places vertical, horizontal, and diagonal connectors outside nodes", () => {
    const skeleton = graphToSkeleton(
      getFlowchartTemplate("branching"),
      { x: 500, y: 100 },
      "test",
    );
    const arrows = skeleton.filter((element) => element.type === "arrow");
    const centers = new Set(["590,138", "590,290", "850,138", "850,290"]);

    expect(arrows).toHaveLength(3);
    arrows.forEach((arrow) => {
      const start = `${arrow.x},${arrow.y}`;
      const end = `${arrow.x! + arrow.width!},${arrow.y! + arrow.height!}`;
      expect(centers.has(start)).toBe(false);
      expect(centers.has(end)).toBe(false);
    });

    expect(arrows[0]).toMatchObject({ x: 590, y: 182 });
    expect(arrows[1].x).toBeGreaterThan(590);
    expect(arrows[1].y).toBeLessThan(290);
    expect(arrows[2]).toMatchObject({ x: 686, y: 290 });
  });

  it.each(["rectangle", "ellipse", "diamond"] as const)(
    "clips guided-style connectors to a %s perimeter",
    (type) => {
      const endpoints = getFlowchartConnectorEndpoints(
        { type, x: 10, y: 20, width: 180, height: 76 },
        { type: "rectangle", x: 270, y: 120, width: 180, height: 76 },
      );

      expect(endpoints.start).not.toEqual({ x: 100, y: 58 });
      expect(endpoints.end).not.toEqual({ x: 360, y: 158 });
      expect(endpoints.start.x).toBeGreaterThan(100);
      expect(endpoints.end.x).toBeLessThan(360);
    },
  );
});
