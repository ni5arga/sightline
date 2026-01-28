"use client";

import { useMemo, useState } from "react";
import type { SearchResult } from "@/lib/types";

interface FiltersProps {
  searchResult: SearchResult | null;
  selectedOperator: string | null;
  selectedType: string | null;
  onOperatorChange: (operator: string | null) => void;
  onTypeChange: (type: string | null) => void;
  onRadiusSearch?: (near: string, radius: number, type: string | null) => void;
}

export default function Filters({
  searchResult,
  selectedOperator,
  selectedType,
  onOperatorChange,
  onTypeChange,
  onRadiusSearch,
}: FiltersProps) {
  const [editRadius, setEditRadius] = useState<number | null>(null);

  const sortedOperators = useMemo(() => {
    if (!searchResult?.stats.operators) return [];
    return Object.entries(searchResult.stats.operators)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [searchResult]);

  const sortedTypes = useMemo(() => {
    if (!searchResult?.stats.types) return [];
    return Object.entries(searchResult.stats.types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [searchResult]);

  if (!searchResult) {
    return (
      <aside className="filters-panel">
        <div className="filters-empty">
          <svg
            className="filters-empty-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <p>Run a search to see filters</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="filters-panel">
      <div className="filters-section">
        <div className="filters-header">
          <span className="filters-title">Results</span>
          <span className="filters-count">
            {searchResult.stats.total.toLocaleString()}
          </span>
        </div>
      </div>

      {sortedTypes.length > 0 && (
        <div className="filters-section">
          <div className="filters-header">
            <span className="filters-title">Asset Type</span>
          </div>
          <div className="filters-list">
            {sortedTypes.map(([type, count]) => (
              <button
                key={type}
                className={`filter-item ${selectedType === type ? "active" : ""}`}
                onClick={() =>
                  onTypeChange(selectedType === type ? null : type)
                }
              >
                <span className="filter-name">{type}</span>
                <span className="filter-count">{count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {sortedOperators.length > 0 && (
        <div className="filters-section">
          <div className="filters-header">
            <span className="filters-title">Operator</span>
          </div>
          <div className="filters-list">
            {sortedOperators.map(([operator, count]) => (
              <button
                key={operator}
                className={`filter-item ${selectedOperator === operator ? "active" : ""}`}
                onClick={() =>
                  onOperatorChange(
                    selectedOperator === operator ? null : operator,
                  )
                }
              >
                <span className="filter-name">{operator}</span>
                <span className="filter-count">{count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {searchResult.query && (
        <div className="filters-section">
          <div className="filters-header">
            <span className="filters-title">Query</span>
          </div>
          <div className="query-debug">
            {searchResult.query.type && (
              <div className="query-param">
                <span className="param-key">type</span>
                <span className="param-value">{searchResult.query.type}</span>
              </div>
            )}
            {searchResult.query.operator && (
              <div className="query-param">
                <span className="param-key">operator</span>
                <span className="param-value">
                  {searchResult.query.operator}
                </span>
              </div>
            )}
            {searchResult.query.region && (
              <div className="query-param">
                <span className="param-key">region</span>
                <span className="param-value">{searchResult.query.region}</span>
              </div>
            )}
            {searchResult.query.near && (
              <div className="query-param">
                <span className="param-key">near</span>
                <span className="param-value">{searchResult.query.near}</span>
              </div>
            )}
            {searchResult.query.near && (
              <div className="query-param radius-param">
                <span className="param-key">radius</span>
                <div className="radius-input-wrapper">
                  <input
                    type="number"
                    className="radius-input"
                    value={editRadius ?? searchResult.query.radius}
                    onChange={(e) =>
                      setEditRadius(
                        Math.max(
                          1,
                          Math.min(500, parseInt(e.target.value) || 50),
                        ),
                      )
                    }
                    min={1}
                    max={500}
                  />
                  <span className="radius-unit">km</span>
                  {editRadius !== null &&
                    editRadius !== searchResult.query.radius &&
                    onRadiusSearch && (
                      <button
                        className="radius-apply"
                        onClick={() => {
                          onRadiusSearch(
                            searchResult.query.near!,
                            editRadius,
                            searchResult.query.type,
                          );
                          setEditRadius(null);
                        }}
                      >
                        Apply
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
