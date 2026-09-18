import { describe, expect, it } from "vitest";

import { FLOWCHART_TEMPLATES } from "./FlowchartTemplates";

describe("flowchart templates", () => {
  it("provides distinct editable Mermaid starters", () => {
    expect(FLOWCHART_TEMPLATES).toHaveLength(3);
    expect(new Set(FLOWCHART_TEMPLATES.map(({ id }) => id)).size).toBe(3);

    for (const template of FLOWCHART_TEMPLATES) {
      expect(template.definition).toMatch(/^flowchart TD/);
      expect(template.definition).toContain("-->");
      expect(template.title).not.toBe("");
      expect(template.description).not.toBe("");
    }
  });

  it("includes a process, a decision, and a review loop", () => {
    expect(FLOWCHART_TEMPLATES.map(({ id }) => id)).toEqual([
      "simple-process",
      "decision-branch",
      "approval-loop",
    ]);
    expect(FLOWCHART_TEMPLATES[1].definition).toContain("Ready to ship?");
    expect(FLOWCHART_TEMPLATES[2].definition).toContain("Approved?");
  });
});
