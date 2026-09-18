import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { createUndoAction } from "@excalidraw/excalidraw/actions/actionHistory";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";
import { render } from "@excalidraw/excalidraw/tests/test-utils";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { FlowchartTool } from "./FlowchartTool";

const TestEditor = () => {
  const [api, setAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  return (
    <Excalidraw onExcalidrawAPI={setAPI}>
      {api && <FlowchartTool excalidrawAPI={api} />}
    </Excalidraw>
  );
};

describe("Flowchart scene integration", () => {
  it("appends separate charts and undoes the last insertion in one step", async () => {
    await render(<TestEditor />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open flowchart lab" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    const firstIds = window.h.elements
      .filter((element) => !element.isDeleted)
      .map((element) => element.id);
    expect(firstIds.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    const secondIds = window.h.elements
      .filter((element) => !element.isDeleted)
      .map((element) => element.id);
    expect(secondIds.length).toBeGreaterThan(firstIds.length);
    expect(secondIds).toEqual(expect.arrayContaining(firstIds));
    fireEvent.click(screen.getByRole("tab", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: /Insert flowchart/ }));
    expect(
      window.h.elements.filter((element) => !element.isDeleted).length,
    ).toBeGreaterThan(secondIds.length);
    fireEvent.click(
      screen.getByRole("button", { name: "Close flowchart lab" }),
    );
    API.executeAction(createUndoAction(window.h.history));
    expect(
      window.h.elements
        .filter((element) => !element.isDeleted)
        .map((element) => element.id),
    ).toEqual(secondIds);
    API.executeAction(createUndoAction(window.h.history));
    expect(
      window.h.elements
        .filter((element) => !element.isDeleted)
        .map((element) => element.id),
    ).toEqual(firstIds);
  });
});
