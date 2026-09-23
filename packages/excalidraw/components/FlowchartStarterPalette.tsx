import { duplicateElements } from "@excalidraw/element";
import clsx from "clsx";
import { memo, useRef } from "react";

import {
  FLOWCHART_STARTER_ITEMS,
  type FlowchartStarter,
} from "../data/flowchartStarters";
import { useLibraryCache, useLibraryItemSvg } from "../hooks/useLibraryItemSvg";

import { LibraryMenuSectionGrid } from "./LibraryMenuSection";

import "./FlowchartStarterPalette.scss";

import type { LibraryItems } from "../types";

const FlowchartStarterCard = memo(
  ({
    starter,
    onInsert,
  }: {
    starter: FlowchartStarter;
    onInsert: (starter: FlowchartStarter) => void;
  }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const { svgCache } = useLibraryCache();
    const svg = useLibraryItemSvg(
      starter.id,
      starter.elements,
      svgCache,
      previewRef,
    );

    return (
      <button
        className={clsx("flowchart-starter-card", {
          "flowchart-starter-card--loading": !svg,
        })}
        type="button"
        onClick={() => onInsert(starter)}
        data-testid={`flowchart-starter-${starter.name
          ?.toLowerCase()
          .replaceAll(" ", "-")}`}
      >
        <span className="flowchart-starter-card__preview" ref={previewRef} />
        <span className="flowchart-starter-card__name">{starter.name}</span>
        <span className="flowchart-starter-card__description">
          {starter.description}
        </span>
      </button>
    );
  },
);

export const FlowchartStarterPalette = memo(
  ({
    onInsertLibraryItems,
  }: {
    onInsertLibraryItems: (libraryItems: LibraryItems) => void;
  }) => {
    const onInsert = (starter: FlowchartStarter) => {
      const { duplicatedElements } = duplicateElements({
        type: "everything",
        elements: starter.elements,
        randomizeSeed: true,
        preserveFrameChildrenOrder: true,
      });
      onInsertLibraryItems([
        {
          ...starter,
          elements: duplicatedElements,
        },
      ]);
    };

    return (
      <section
        className="flowchart-starters"
        aria-labelledby="flowchart-starters-heading"
      >
        <div
          className="flowchart-starters__heading"
          id="flowchart-starters-heading"
        >
          Flowchart starters
        </div>
        <p className="flowchart-starters__hint">
          Start with editable nodes and connected arrows.
        </p>
        <LibraryMenuSectionGrid>
          {FLOWCHART_STARTER_ITEMS.map((starter) => (
            <FlowchartStarterCard
              key={starter.id}
              starter={starter}
              onInsert={onInsert}
            />
          ))}
        </LibraryMenuSectionGrid>
      </section>
    );
  },
);
