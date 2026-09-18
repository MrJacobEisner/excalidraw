import { expect, vi } from "vitest";

import { Excalidraw } from "../index";

import { mockMermaidToExcalidraw } from "./helpers/mocks";
import { fireEvent, render, screen, waitFor } from "./test-utils";

vi.mock("@codemirror/view", () => ({}));
vi.mock("@codemirror/state", () => ({}));
vi.mock("@codemirror/language", () => ({}));
vi.mock("@lezer/highlight", () => ({}));

mockMermaidToExcalidraw({
  mockRef: true,
  parseMermaidToExcalidraw: async () => ({
    elements: [
      {
        id: "Start",
        type: "rectangle",
        groupIds: [],
        x: 0,
        y: 0,
        width: 100,
        height: 44,
        strokeWidth: 2,
        label: {
          groupIds: [],
          text: "Start",
          fontSize: 20,
        },
        link: null,
      },
    ],
  }),
});

describe("flowchart templates dialog", () => {
  it("renders the starter cards and switches the active template", async () => {
    await render(
      <Excalidraw
        initialData={{
          appState: {
            openDialog: { name: "ttd", tab: "templates" },
          },
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("Start with a flowchart template")).toBeVisible(),
    );
    expect(screen.getByText("Simple process")).toBeVisible();
    expect(screen.getByText("Decision branch")).toBeVisible();
    expect(screen.getByText("Approval loop")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Insert template/ }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Decision branch/ }));
    expect(
      screen.getByRole("button", { name: /Decision branch/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
