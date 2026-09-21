import { getFlowchartLayout } from "../flowchartLayout";
import { newArrowElement, newElement } from "../newElement";

const node = (x: number, y: number) =>
  newElement({
    type: "rectangle",
    x,
    y,
    width: 120,
    height: 60,
  });

const arrow = (from: ReturnType<typeof node>, to: ReturnType<typeof node>) => ({
  ...newArrowElement({
    type: "arrow",
    x: from.x,
    y: from.y,
    points: [],
  }),
  startBinding: {
    elementId: from.id,
    fixedPoint: [0.5, 0.5] as [number, number],
    mode: "orbit" as const,
  },
  endBinding: {
    elementId: to.id,
    fixedPoint: [0.5, 0.5] as [number, number],
    mode: "orbit" as const,
  },
});

describe("getFlowchartLayout", () => {
  it("lays out branching graphs in deterministic top-to-bottom layers", () => {
    const start = node(600, 0);
    const left = node(0, 500);
    const right = node(300, 200);
    const end = node(900, 100);
    const edges = [
      arrow(start, left),
      arrow(start, right),
      arrow(left, end),
      arrow(right, end),
    ];
    const layout = getFlowchartLayout(
      [start, left, right, end],
      [start, left, right, end, ...edges],
      "down",
    );

    expect(layout).not.toBeNull();
    expect(layout!.get(start.id)!.y).toBeLessThan(layout!.get(left.id)!.y);
    expect(layout!.get(left.id)!.y).toBe(layout!.get(right.id)!.y);
    expect(layout!.get(right.id)!.y).toBeLessThan(layout!.get(end.id)!.y);
    expect(layout!.get(left.id)!.x).toBeLessThan(layout!.get(right.id)!.x);
  });

  it("breaks cycles for layout without rejecting the graph", () => {
    const first = node(400, 0);
    const second = node(0, 250);
    const third = node(800, 100);
    const edges = [
      arrow(first, second),
      arrow(second, third),
      arrow(third, first),
    ];
    const layout = getFlowchartLayout(
      [first, second, third],
      [first, second, third, ...edges],
      "right",
    );

    expect(layout).not.toBeNull();
    expect(new Set([...layout!.values()].map(({ x }) => x)).size).toBe(3);
  });

  it("rejects a selection containing disconnected nodes", () => {
    const first = node(0, 0);
    const second = node(300, 0);
    const third = node(1000, 0);

    expect(
      getFlowchartLayout(
        [first, second, third],
        [first, second, third, arrow(first, second)],
        "down",
      ),
    ).toBeNull();
  });
});
