import { useEffect, useRef, useState } from "react";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { useUIAppState } from "../../context/ui-appState";
import type { BinaryFiles } from "../../types";
import { t } from "../../i18n";
import { useApp } from "../App";
import { ArrowRightIcon } from "../icons";

import { TTDDialogOutput } from "./TTDDialogOutput";
import { TTDDialogSubmitShortcut } from "./TTDDialogSubmitShortcut";
import {
  convertMermaidToExcalidraw,
  insertToEditor,
  resetPreview,
} from "./common";
import type { MermaidToExcalidrawLibProps } from "./types";

export const FLOWCHART_TEMPLATES = [
  {
    id: "simple-process",
    title: "Simple process",
    description: "Map a linear process from start to finish.",
    definition: `flowchart TD
  A([Start]) --> B[Gather requirements]
  B --> C[Build solution]
  C --> D([Done])`,
  },
  {
    id: "decision-branch",
    title: "Decision branch",
    description: "Show a decision with clear yes and no paths.",
    definition: `flowchart TD
  A([Start]) --> B{Ready to ship?}
  B -->|Yes| C([Launch])
  B -->|No| D[Collect feedback]
  D --> B`,
  },
  {
    id: "approval-loop",
    title: "Approval loop",
    description: "Capture review, revision, and approval in one loop.",
    definition: `flowchart TD
  A[Draft proposal] --> B[Peer review]
  B --> C{Approved?}
  C -->|Yes| D([Publish])
  C -->|Changes| E[Revise proposal]
  E --> B`,
  },
] as const;

const FlowchartTemplates = ({
  mermaidToExcalidrawLib,
  isActive,
}: {
  mermaidToExcalidrawLib: MermaidToExcalidrawLibProps;
  isActive: boolean;
}) => {
  const app = useApp();
  const { theme } = useUIAppState();
  const [selectedId, setSelectedId] = useState<
    typeof FLOWCHART_TEMPLATES[number]["id"]
  >(FLOWCHART_TEMPLATES[0].id);
  const [error, setError] = useState<Error | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const data = useRef<{
    elements: readonly NonDeletedExcalidrawElement[];
    files: BinaryFiles | null;
  }>({ elements: [], files: null });
  const selectedTemplate =
    FLOWCHART_TEMPLATES.find(({ id }) => id === selectedId) ||
    FLOWCHART_TEMPLATES[0];

  useEffect(() => {
    if (!isActive || !mermaidToExcalidrawLib.loaded) {
      return;
    }

    void convertMermaidToExcalidraw({
      canvasRef,
      data,
      mermaidToExcalidrawLib,
      setError,
      mermaidDefinition: selectedTemplate.definition,
      theme,
    });
  }, [isActive, mermaidToExcalidrawLib, selectedTemplate.definition, theme]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    return () => resetPreview({ canvasRef, setError });
  }, [isActive]);

  const insertTemplate = () => {
    insertToEditor({
      app,
      data,
      text: selectedTemplate.definition,
    });
  };

  return (
    <div className="ttd-template-browser">
      <div className="ttd-template-browser__intro">
        <div>
          <h2>{t("flowchartTemplates.title")}</h2>
          <p>{t("flowchartTemplates.description")}</p>
        </div>
        <span className="ttd-template-browser__hint">
          {t("flowchartTemplates.hint")}
        </span>
      </div>
      <div className="ttd-template-browser__body">
        <div className="ttd-template-browser__cards" role="list">
          {FLOWCHART_TEMPLATES.map((template) => (
            <button
              aria-pressed={template.id === selectedTemplate.id}
              className={`ttd-template-card${
                template.id === selectedTemplate.id
                  ? " ttd-template-card--selected"
                  : ""
              }`}
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              type="button"
            >
              <span className="ttd-template-card__title">{template.title}</span>
              <span className="ttd-template-card__description">
                {template.description}
              </span>
              <span className="ttd-template-card__flow" aria-hidden="true">
                {template.id === "simple-process"
                  ? "Start  →  Build  →  Done"
                  : template.id === "decision-branch"
                  ? "Ready?  →  Yes / No"
                  : "Review  →  Revise  →  Approve"}
              </span>
            </button>
          ))}
        </div>
        <div className="ttd-template-browser__preview">
          <div className="ttd-template-browser__preview-label">
            {t("flowchartTemplates.preview")}
          </div>
          <TTDDialogOutput
            canvasRef={canvasRef}
            loaded={mermaidToExcalidrawLib.loaded}
            error={error}
            sourceText={selectedTemplate.definition}
          />
          <div className="ttd-dialog-panel-button-container">
            <button
              className="excalidraw-button ttd-dialog-panel-button"
              onClick={insertTemplate}
              type="button"
            >
              <div>
                {t("flowchartTemplates.insert")}
                <span>{ArrowRightIcon}</span>
              </div>
            </button>
            <TTDDialogSubmitShortcut />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowchartTemplates;
