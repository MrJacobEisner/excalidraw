import { useEffect, useMemo, useRef, useState } from "react";

import { FLOW_TEMPLATES, parseFlowText } from "./model";

import "./FlowchartLab.scss";

import type { FlowGraph, FlowNode } from "./model";

type FlowchartLabProps = {
  onInsert: (graph: FlowGraph, direction: "down" | "right") => void;
  onClose: () => void;
};

type Approach = "build" | "templates" | "text";
type Direction = "down" | "right";

const APPROACHES: {
  id: Approach;
  label: string;
  detail: string;
}[] = [
  {
    id: "build",
    label: "Build",
    detail: "Best for a quick, tidy sequence you can shape as you go.",
  },
  {
    id: "templates",
    label: "Templates",
    detail: "A useful head start for familiar team workflows.",
  },
  {
    id: "text",
    label: "Text",
    detail: "Fastest for branching flows when you already know the path.",
  },
];

const INITIAL_STEPS: FlowNode[] = [
  { id: "step-1", label: "Request received", kind: "start" },
  { id: "step-2", label: "Review request", kind: "process" },
  { id: "step-3", label: "Approved?", kind: "decision" },
  { id: "step-4", label: "Complete request", kind: "end" },
];

const TEXT_EXAMPLE = `Start -> Review -> Approved?
Approved? -Yes-> Done
Approved? -No-> Revise`;

const createLinearGraph = (steps: FlowNode[]): FlowGraph => ({
  nodes: steps.map((step) => ({ ...step, label: step.label.trim() })),
  edges: steps.slice(1).map((step, index) => ({
    from: steps[index].id,
    to: step.id,
  })),
});

const TemplateIllustration = ({ templateId }: { templateId: string }) => {
  const isIncident = templateId.toLowerCase().includes("incident");
  const isOnboarding = templateId.toLowerCase().includes("onboard");

  return (
    <svg
      className="flowchart-lab__template-illustration"
      viewBox="0 0 82 48"
      aria-hidden="true"
    >
      <path className="flowchart-lab__svg-line" d="M23 24h13M46 24h13" />
      <path
        className="flowchart-lab__svg-line"
        d={isIncident ? "M41 29v10h18" : "M41 29v10H23"}
      />
      <rect
        className="flowchart-lab__svg-node"
        x="5"
        y="16"
        width="18"
        height="16"
        rx="8"
      />
      {isOnboarding ? (
        <rect
          className="flowchart-lab__svg-node flowchart-lab__svg-node--accent"
          x="35"
          y="16"
          width="12"
          height="16"
          rx="2"
        />
      ) : (
        <path
          className="flowchart-lab__svg-node flowchart-lab__svg-node--accent"
          d="m41 15 9 9-9 9-9-9Z"
        />
      )}
      <rect
        className="flowchart-lab__svg-node"
        x="59"
        y="16"
        width="18"
        height="16"
        rx={isIncident ? "2" : "8"}
      />
      <rect
        className="flowchart-lab__svg-node"
        x={isIncident ? "58" : "14"}
        y="37"
        width="18"
        height="8"
        rx="4"
      />
    </svg>
  );
};

export const FlowchartLab = ({ onInsert, onClose }: FlowchartLabProps) => {
  const panelRef = useRef<HTMLElement>(null);
  const nextStepId = useRef(INITIAL_STEPS.length + 1);
  const [approach, setApproach] = useState<Approach>("build");
  const [steps, setSteps] = useState<FlowNode[]>(INITIAL_STEPS);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    FLOW_TEMPLATES[0]?.id ?? "",
  );
  const [source, setSource] = useState(TEXT_EXAMPLE);
  const [direction, setDirection] = useState<Direction>("down");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const ownerDocument = panelRef.current?.ownerDocument;
    if (!ownerDocument) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      ownerDocument.removeEventListener("keydown", handleKeyDown, {
        capture: true,
      });
  }, [onClose]);

  const buildError = steps.some((step) => !step.label.trim())
    ? "Give every step a label before inserting."
    : "";
  const buildGraph = useMemo(() => createLinearGraph(steps), [steps]);
  const selectedTemplate =
    FLOW_TEMPLATES.find((template) => template.id === selectedTemplateId) ??
    null;
  const parsedText = useMemo(() => {
    try {
      return { graph: parseFlowText(source), error: "" };
    } catch (error) {
      return {
        graph: null,
        error:
          error instanceof Error
            ? error.message
            : "This flow could not be parsed. Check the syntax and try again.",
      };
    }
  }, [source]);

  const activeGraph =
    approach === "build"
      ? buildGraph
      : approach === "templates"
      ? selectedTemplate?.graph ?? null
      : parsedText.graph;
  const activeError =
    approach === "build"
      ? buildError
      : approach === "templates" && !selectedTemplate
      ? "Choose a template to continue."
      : approach === "text"
      ? parsedText.error
      : "";

  const markChanged = () => setSuccess("");

  const updateStep = (id: string, patch: Partial<FlowNode>) => {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    );
    markChanged();
  };

  const removeStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
    markChanged();
  };

  const addStep = () => {
    const id = `step-${nextStepId.current++}`;
    setSteps((current) => [
      ...current,
      { id, label: "New step", kind: "process" },
    ]);
    markChanged();
  };

  const insertFlowchart = () => {
    if (!activeGraph || activeError) {
      return;
    }
    onInsert(activeGraph, direction);
    setSuccess(
      `Inserted ${activeGraph.nodes.length} nodes without replacing your scene.`,
    );
  };

  const activeDetail =
    APPROACHES.find((item) => item.id === approach)?.detail ?? "";
  const nodeCount = activeGraph?.nodes.length ?? 0;
  const edgeCount = activeGraph?.edges.length ?? 0;

  return (
    <aside
      className="flowchart-lab"
      ref={panelRef}
      aria-label="Flowchart lab"
      data-viewport-ui="side"
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          event.stopPropagation();
        }
      }}
    >
      <header className="flowchart-lab__header">
        <div>
          <h2>Flowchart lab</h2>
          <p>3 ways to find your flow</p>
        </div>
        <button
          type="button"
          className="flowchart-lab__close"
          aria-label="Close flowchart lab"
          title="Close"
          onClick={onClose}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>

      <div className="flowchart-lab__tabs" role="tablist" aria-label="Approach">
        {APPROACHES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`flowchart-tab-${item.id}`}
            aria-selected={approach === item.id}
            aria-controls={`flowchart-panel-${item.id}`}
            onClick={() => {
              setApproach(item.id);
              markChanged();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flowchart-lab__body">
        <p className="flowchart-lab__approach-detail">{activeDetail}</p>

        {approach === "build" && (
          <section
            role="tabpanel"
            id="flowchart-panel-build"
            aria-labelledby="flowchart-tab-build"
            className="flowchart-lab__steps"
          >
            <div className="flowchart-lab__section-label">
              <span>Steps</span>
              <span>In order</span>
            </div>
            <ol>
              {steps.map((step, index) => (
                <li key={step.id} className="flowchart-lab__step">
                  <span className="flowchart-lab__step-number">
                    {index + 1}
                  </span>
                  <div className="flowchart-lab__step-fields">
                    <label>
                      <span className="flowchart-lab__sr-only">
                        Step {index + 1} label
                      </span>
                      <input
                        maxLength={60}
                        value={step.label}
                        aria-invalid={!step.label.trim()}
                        onChange={(event) =>
                          updateStep(step.id, { label: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="flowchart-lab__sr-only">
                        Step {index + 1} shape
                      </span>
                      <select
                        value={step.kind}
                        onChange={(event) =>
                          updateStep(step.id, {
                            kind: event.target.value as FlowNode["kind"],
                          })
                        }
                      >
                        <option value="start">Start</option>
                        <option value="process">Process</option>
                        <option value="decision">Decision</option>
                        <option value="end">End</option>
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="flowchart-lab__remove"
                    aria-label={`Remove step ${index + 1}: ${step.label}`}
                    title="Remove step"
                    disabled={steps.length === 1}
                    onClick={() => removeStep(step.id)}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3.5 8h9" />
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="flowchart-lab__add"
              onClick={addStep}
              disabled={steps.length >= 40}
            >
              <span aria-hidden="true">＋</span> Add step
            </button>
            {buildError && (
              <p className="flowchart-lab__error" role="alert">
                {buildError}
              </p>
            )}
          </section>
        )}

        {approach === "templates" && (
          <section
            role="tabpanel"
            id="flowchart-panel-templates"
            aria-labelledby="flowchart-tab-templates"
            className="flowchart-lab__templates"
          >
            {FLOW_TEMPLATES.map((template) => (
              <button
                type="button"
                key={template.id}
                className="flowchart-lab__template"
                aria-pressed={selectedTemplateId === template.id}
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  markChanged();
                }}
              >
                <TemplateIllustration templateId={template.id} />
                <span className="flowchart-lab__template-copy">
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                </span>
                <span className="flowchart-lab__template-check" aria-hidden>
                  ✓
                </span>
              </button>
            ))}
          </section>
        )}

        {approach === "text" && (
          <section
            role="tabpanel"
            id="flowchart-panel-text"
            aria-labelledby="flowchart-tab-text"
            className="flowchart-lab__text"
          >
            <label htmlFor="flowchart-source">Describe the connections</label>
            <textarea
              id="flowchart-source"
              value={source}
              rows={7}
              spellCheck={false}
              aria-invalid={Boolean(parsedText.error)}
              aria-describedby="flowchart-syntax flowchart-text-status"
              onKeyDown={(event) => event.stopPropagation()}
              onChange={(event) => {
                setSource(event.target.value);
                markChanged();
              }}
            />
            <p id="flowchart-syntax" className="flowchart-lab__syntax">
              Use <code>A -Label-&gt; B</code> for a named branch, or{" "}
              <code>A -&gt; B</code> for a direct connection. A trailing{" "}
              <code>?</code> creates a decision.
            </p>
            <div id="flowchart-text-status" aria-live="polite">
              {parsedText.error ? (
                <p className="flowchart-lab__error" role="alert">
                  {parsedText.error}
                </p>
              ) : (
                <p className="flowchart-lab__valid">
                  <span aria-hidden="true">✓</span> Syntax looks good
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      <footer className="flowchart-lab__footer">
        <fieldset className="flowchart-lab__direction">
          <legend>Layout direction</legend>
          <div>
            <button
              type="button"
              aria-pressed={direction === "down"}
              onClick={() => {
                setDirection("down");
                markChanged();
              }}
            >
              <span aria-hidden="true">↓</span> Vertical
            </button>
            <button
              type="button"
              aria-pressed={direction === "right"}
              onClick={() => {
                setDirection("right");
                markChanged();
              }}
            >
              <span aria-hidden="true">→</span> Horizontal
            </button>
          </div>
        </fieldset>
        <div className="flowchart-lab__summary" aria-live="polite">
          {nodeCount} {nodeCount === 1 ? "node" : "nodes"} · {edgeCount}{" "}
          {edgeCount === 1 ? "connection" : "connections"}
        </div>
        <button
          type="button"
          className="flowchart-lab__insert"
          disabled={!activeGraph || Boolean(activeError)}
          onClick={insertFlowchart}
        >
          Insert flowchart
          <span aria-hidden="true">→</span>
        </button>
        {success && (
          <p className="flowchart-lab__success" role="status">
            <span aria-hidden="true">✓</span> {success}
          </p>
        )}
      </footer>
    </aside>
  );
};
