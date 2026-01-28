"use client";

import { useState, useCallback, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import SearchBar from "@/components/SearchBar";
import ShareButton from "@/components/ShareButton";
import Filters from "@/components/Filters";
import ResultList from "@/components/ResultList";
import type { SearchResult, SearchError } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

type MobileTab = "map" | "results" | "filters";

const INITIAL_QUERIES = [
  "airports near london",
  "hospitals in paris",
  "power plants in texas",
  "train stations in tokyo",
  "towers in dubai",
  "stadiums in berlin",
  "museums in rome",
  "bridges in new york",
];

/** Custom hook to detect screen size breakpoints */
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<"mobile" | "desktop">("desktop");

  useEffect(() => {
    const checkBreakpoint = () => {
      if (window.innerWidth <= 1024) {
        setBreakpoint("mobile");
      } else {
        setBreakpoint("desktop");
      }
    };

    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  return breakpoint;
}

/** Sanitize and validate a query string */
function sanitizeQuery(query: string): string | null {
  const sanitized = query
    .trim()
    .slice(0, 500)
    .replace(/[\x00-\x1F\x7F]/g, "");
  return sanitized.length > 0 ? sanitized : null;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="app-loading">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search state
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [initialQuery, setInitialQuery] = useState<string>("");

  // Selection and filters
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOperator, setFilterOperator] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // UI state
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const breakpoint = useBreakpoint();

  // Refs for URL sync
  const isInitialMount = useRef(true);
  const lastUrlQuery = useRef<string | null>(null);

  // Update default tab based on breakpoint
  useEffect(() => {
    if (breakpoint === "mobile") {
      setMobileTab("map");
    }
  }, [breakpoint]);

  // Core search function
  const handleSearch = useCallback(
    async (query: string, updateUrl = true) => {
      setLoading(true);
      setError(null);
      setSelectedId(null);
      setFilterOperator(null);
      setFilterType(null);
      setCurrentQuery(query);

      if (updateUrl) {
        const params = new URLSearchParams();
        params.set("q", query);
        router.push(`?${params.toString()}`, { scroll: false });
      }

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError((data as SearchError).error);
          setSearchResult(null);
        } else {
          setSearchResult(data as SearchResult);
          setError(null);
        }
      } catch {
        setError("Network error. Please check your connection.");
        setSearchResult(null);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Handle URL query parameter on mount and browser navigation
  useEffect(() => {
    const urlQuery = searchParams.get("q");

    // Skip if URL hasn't changed (prevents unnecessary re-fetches)
    if (urlQuery === lastUrlQuery.current && !isInitialMount.current) {
      return;
    }
    lastUrlQuery.current = urlQuery;
    isInitialMount.current = false;

    if (urlQuery) {
      const sanitized = sanitizeQuery(urlQuery);
      if (sanitized) {
        setInitialQuery(sanitized);
        handleSearch(sanitized, false);
        return;
      }
    }

    // No valid query - load random default
    const randomQuery =
      INITIAL_QUERIES[Math.floor(Math.random() * INITIAL_QUERIES.length)];
    setInitialQuery(randomQuery);
    handleSearch(randomQuery, true);
  }, [searchParams, handleSearch]);

  // Selection handler
  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleRadiusSearch = useCallback(
    (near: string, radius: number, type: string | null) => {
      const query = type
        ? `type:${type} near:${near.replace(/\s+/g, "_")} radius:${radius}`
        : `near:${near.replace(/\s+/g, "_")} radius:${radius}`;
      handleSearch(query);
    },
    [handleSearch],
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg
              className="logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
              <path
                strokeLinecap="round"
                strokeWidth="2"
                d="M12 2v4m0 12v4M2 12h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m14.14 0l-2.83-2.83M6.34 6.34L3.51 3.51"
              />
            </svg>
            <span className="logo-text">Sightline</span>
          </div>

          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            initialQuery={initialQuery}
          />

          <div className="header-meta">
            <ShareButton query={currentQuery} disabled={loading} />
            <a
              href="https://github.com/ni5arga/sightline"
              target="_blank"
              rel="noopener noreferrer"
              className="header-link"
            >
              <svg
                className="header-link-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M12 .5A12 12 0 0 0 0 12.67c0 5.36 3.44 9.9 8.21 11.5.6.12.82-.27.82-.6v-2.2c-3.34.75-4.05-1.42-4.05-1.42-.55-1.43-1.34-1.81-1.34-1.81-1.09-.77.08-.75.08-.75 1.2.09 1.84 1.26 1.84 1.26 1.07 1.88 2.82 1.34 3.51 1.02.11-.8.42-1.34.77-1.65-2.67-.31-5.47-1.38-5.47-6.15 0-1.36.47-2.47 1.25-3.34-.13-.31-.54-1.57.12-3.25 0 0 1.01-.33 3.32 1.27a11.18 11.18 0 0 1 6.05 0c2.31-1.6 3.32-1.27 3.32-1.27.66 1.68.25 2.94.12 3.25.78.87 1.25 1.98 1.25 3.34 0 4.78-2.8 5.83-5.48 6.14.43.38.82 1.13.82 2.28v3.38c0 .34.22.74.83.61A12.03 12.03 0 0 0 24 12.67 12 12 0 0 0 12 .5Z"
                />
              </svg>
              <span className="header-link-text">
                Source Code & Documentation
              </span>
            </a>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <main className="app-main">
        <div
          className={`panel-filters ${mobileTab === "filters" ? "mobile-active" : ""}`}
        >
          <Filters
            searchResult={searchResult}
            selectedOperator={filterOperator}
            selectedType={filterType}
            onOperatorChange={setFilterOperator}
            onTypeChange={setFilterType}
            onRadiusSearch={handleRadiusSearch}
          />
        </div>

        <div
          className={`panel-results ${mobileTab === "results" ? "mobile-active" : ""}`}
        >
          <ResultList
            results={searchResult?.results || []}
            selectedId={selectedId}
            onSelect={handleSelect}
            filterOperator={filterOperator}
            filterType={filterType}
          />
        </div>

        <div
          className={`panel-map ${mobileTab === "map" ? "mobile-active" : ""}`}
        >
          <MapView
            results={searchResult?.results || []}
            bounds={searchResult?.bounds || null}
            selectedId={selectedId}
            onSelect={handleSelect}
            filterOperator={filterOperator}
            filterType={filterType}
          />
        </div>
      </main>

      <nav className="mobile-nav">
        <button
          className={`mobile-nav-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Map</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === "results" ? "active" : ""}`}
          onClick={() => setMobileTab("results")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>
            Results{searchResult ? ` (${searchResult.stats.total})` : ""}
          </span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === "filters" ? "active" : ""}`}
          onClick={() => setMobileTab("filters")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
        </button>
      </nav>
    </div>
  );
}
