"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Asset } from "@/lib/types";

interface ResultListProps {
  results: Asset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterOperator: string | null;
  filterType: string | null;
}

export default function ResultList({
  results,
  selectedId,
  onSelect,
  filterOperator,
  filterType,
}: ResultListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filterOperator) {
      filtered = filtered.filter((r) => r.operator === filterOperator);
    }

    if (filterType) {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((asset) => {
        return (
          asset.name.toLowerCase().includes(query) ||
          asset.type.toLowerCase().includes(query) ||
          (asset.operator && asset.operator.toLowerCase().includes(query)) ||
          Object.values(asset.tags).some((value) =>
            String(value).toLowerCase().includes(query)
          )
        );
      });
    }

    return filtered;
  }, [results, filterOperator, filterType, searchQuery]);

  useEffect(() => {
    if (selectedRef.current && scrollAreaRef.current) {
      // Get the viewport element from ScrollArea
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      ) as HTMLElement;
      if (viewport) {
        const element = selectedRef.current;
        const containerRect = viewport.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        if (
          elementRect.top < containerRect.top ||
          elementRect.bottom > containerRect.bottom
        ) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
  }, [selectedId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(id);
      }

      if (e.key === "ArrowDown" && index < filteredResults.length - 1) {
        e.preventDefault();
        const nextId = filteredResults[index + 1].id;
        onSelect(nextId);
      }

      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        const prevId = filteredResults[index - 1].id;
        onSelect(prevId);
      }
    },
    [filteredResults, onSelect],
  );

  if (results.length === 0) {
    return (
      <div className="results-empty">
        <svg
          className="results-empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p>No results</p>
        <p className="results-empty-hint">
          Run a search to find infrastructure
        </p>
      </div>
    );
  }

  const displayCount = filteredResults.length;
  const totalCount = results.length;

  return (
    <div className="results-panel">
      <div className="results-header">
        <span className="results-count">
          {displayCount === totalCount
            ? `${displayCount.toLocaleString()} results`
            : `${displayCount.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>
      </div>

      <div style={{ padding: "0 12px 8px 12px" }}>
        <div style={{ position: "relative" }}>
          <svg
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              width: 14,
              height: 14,
              color: "#7d8590",
              pointerEvents: "none",
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 32px",
              fontSize: 13,
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 6,
              color: "#e6edf3",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#58a6ff";
              e.target.style.background = "#161b22";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#30363d";
              e.target.style.background = "#0d1117";
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                padding: 0,
                background: "none",
                border: "none",
                color: "#7d8590",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#e6edf3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#7d8590";
              }}
              title="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="results-list-scroll">
        <div className="results-list-content">
          {filteredResults.length === 0 && searchQuery ? (
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "#7d8590",
            }}>
              <svg
                style={{
                  width: 48,
                  height: 48,
                  margin: "0 auto 12px",
                  opacity: 0.5,
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 14, marginBottom: 4 }}>No matches found</p>
              <p style={{ fontSize: 13 }}>Try a different search term</p>
            </div>
          ) : (
            filteredResults.map((asset, index) => (
            <button
              key={asset.id}
              ref={selectedId === asset.id ? selectedRef : null}
              className={`result-item ${selectedId === asset.id ? "selected" : ""}`}
              onClick={() => onSelect(asset.id)}
              onKeyDown={(e) => handleKeyDown(e, asset.id, index)}
              tabIndex={0}
            >
              <div className="result-header">
                <span className="result-name">{asset.name}</span>
                <span className="result-type">{asset.type}</span>
              </div>

              {asset.operator && (
                <div className="result-operator">
                  <span className="label">Operator:</span>
                  <span className="value">{asset.operator}</span>
                </div>
              )}

              <div className="result-coords">
                <span className="coord">{asset.lat.toFixed(5)}</span>
                <span className="separator">,</span>
                <span className="coord">{asset.lon.toFixed(5)}</span>
              </div>

              {Object.keys(asset.tags).length > 0 && (
                <div className="result-tags">
                  {Object.entries(asset.tags)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <span key={key} className="tag">
                        <span className="tag-key">{key}:</span>
                        <span className="tag-value">{value}</span>
                      </span>
                    ))}
                </div>
              )}
            </button>
          ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
