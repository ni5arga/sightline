"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading: boolean;
  initialQuery?: string;
}

interface Suggestion {
  text: string;
  type: "asset" | "keyword" | "example";
  description?: string;
}

const EXAMPLE_QUERIES = [
  "airports near london",
  "hospitals in paris",
  "power plants in texas",
  "train stations in tokyo",
];

// Asset types for autocomplete
const ASSET_TYPES: { keyword: string; label: string }[] = [
  // Energy & Power
  { keyword: "power plants", label: "Power Plants" },
  { keyword: "substations", label: "Substations" },
  { keyword: "solar farms", label: "Solar Farms" },
  { keyword: "wind farms", label: "Wind Farms" },
  { keyword: "nuclear plants", label: "Nuclear Plants" },
  { keyword: "hydroelectric plants", label: "Hydroelectric Plants" },
  { keyword: "coal plants", label: "Coal Power Plants" },
  { keyword: "dams", label: "Dams" },
  { keyword: "transformers", label: "Transformers" },
  // Telecommunications
  { keyword: "telecom towers", label: "Telecom Towers" },
  { keyword: "data centers", label: "Data Centers" },
  { keyword: "antennas", label: "Antennas" },
  { keyword: "cell towers", label: "Cell Towers" },
  { keyword: "radio towers", label: "Radio Towers" },
  { keyword: "broadcast towers", label: "Broadcast Towers" },
  { keyword: "satellite dishes", label: "Satellite Dishes" },
  // Oil, Gas & Mining
  { keyword: "refineries", label: "Refineries" },
  { keyword: "pipelines", label: "Pipelines" },
  { keyword: "oil wells", label: "Oil Wells" },
  { keyword: "gas wells", label: "Gas Wells" },
  { keyword: "storage tanks", label: "Storage Tanks" },
  { keyword: "silos", label: "Silos" },
  { keyword: "quarries", label: "Quarries" },
  { keyword: "mines", label: "Mines" },
  { keyword: "landfills", label: "Landfills" },
  // Water & Utilities
  { keyword: "water towers", label: "Water Towers" },
  { keyword: "water treatment", label: "Water Treatment" },
  { keyword: "reservoirs", label: "Reservoirs" },
  { keyword: "pumping stations", label: "Pumping Stations" },
  // Aviation
  { keyword: "airports", label: "Airports" },
  { keyword: "helipads", label: "Helipads" },
  { keyword: "runways", label: "Runways" },
  { keyword: "hangars", label: "Hangars" },
  // Maritime
  { keyword: "ports", label: "Ports" },
  { keyword: "harbours", label: "Harbours" },
  { keyword: "ferry terminals", label: "Ferry Terminals" },
  { keyword: "marinas", label: "Marinas" },
  { keyword: "shipyards", label: "Shipyards" },
  { keyword: "lighthouses", label: "Lighthouses" },
  // Rail & Transit
  { keyword: "train stations", label: "Train Stations" },
  { keyword: "metro stations", label: "Metro Stations" },
  { keyword: "bus stations", label: "Bus Stations" },
  { keyword: "tram stops", label: "Tram Stops" },
  { keyword: "parking", label: "Parking" },
  { keyword: "toll booths", label: "Toll Booths" },
  // Structures
  { keyword: "bridges", label: "Bridges" },
  { keyword: "tunnels", label: "Tunnels" },
  { keyword: "cooling towers", label: "Cooling Towers" },
  { keyword: "chimneys", label: "Chimneys" },
  { keyword: "cranes", label: "Cranes" },
  // Industrial & Commercial
  { keyword: "warehouses", label: "Warehouses" },
  { keyword: "factories", label: "Factories" },
  { keyword: "industrial zones", label: "Industrial Zones" },
  { keyword: "breweries", label: "Breweries" },
  { keyword: "sawmills", label: "Sawmills" },
  { keyword: "recycling plants", label: "Recycling Plants" },
  // Military & Defense
  { keyword: "military bases", label: "Military Bases" },
  { keyword: "naval bases", label: "Naval Bases" },
  { keyword: "barracks", label: "Barracks" },
  { keyword: "bunkers", label: "Bunkers" },
  { keyword: "radars", label: "Radars" },
  { keyword: "checkpoints", label: "Checkpoints" },
  // Government & Public Safety
  { keyword: "embassies", label: "Embassies" },
  { keyword: "courthouses", label: "Courthouses" },
  { keyword: "town halls", label: "Town Halls" },
  { keyword: "border control", label: "Border Control" },
  { keyword: "police stations", label: "Police Stations" },
  { keyword: "fire stations", label: "Fire Stations" },
  { keyword: "prisons", label: "Prisons" },
  { keyword: "coast guard", label: "Coast Guard Stations" },
  // Education & Research
  { keyword: "universities", label: "Universities" },
  { keyword: "schools", label: "Schools" },
  { keyword: "colleges", label: "Colleges" },
  { keyword: "libraries", label: "Libraries" },
  { keyword: "research institutes", label: "Research Institutes" },
  // Healthcare
  { keyword: "hospitals", label: "Hospitals" },
  { keyword: "clinics", label: "Clinics" },
  { keyword: "pharmacies", label: "Pharmacies" },
  { keyword: "nursing homes", label: "Nursing Homes" },
  // Culture & Entertainment
  { keyword: "museums", label: "Museums" },
  { keyword: "theatres", label: "Theatres" },
  { keyword: "cinemas", label: "Cinemas" },
  { keyword: "stadiums", label: "Stadiums" },
  { keyword: "sports centres", label: "Sports Centres" },
  { keyword: "swimming pools", label: "Swimming Pools" },
  { keyword: "golf courses", label: "Golf Courses" },
  // Tourism & Leisure
  { keyword: "hotels", label: "Hotels" },
  { keyword: "theme parks", label: "Theme Parks" },
  { keyword: "zoos", label: "Zoos" },
  { keyword: "aquariums", label: "Aquariums" },
  { keyword: "campsites", label: "Campsites" },
  // Religious
  { keyword: "churches", label: "Churches" },
  { keyword: "mosques", label: "Mosques" },
  { keyword: "temples", label: "Temples" },
  { keyword: "synagogues", label: "Synagogues" },
  { keyword: "cemeteries", label: "Cemeteries" },
  // Historic
  { keyword: "castles", label: "Castles" },
  { keyword: "forts", label: "Forts" },
  { keyword: "monuments", label: "Monuments" },
  { keyword: "ruins", label: "Ruins" },
  { keyword: "observatories", label: "Observatories" },
  // Agriculture
  { keyword: "farms", label: "Farms" },
  { keyword: "greenhouses", label: "Greenhouses" },
  { keyword: "vineyards", label: "Vineyards" },
  // Services
  { keyword: "banks", label: "Banks" },
  { keyword: "post offices", label: "Post Offices" },
  { keyword: "fuel stations", label: "Fuel Stations" },
  { keyword: "charging stations", label: "EV Charging Stations" },
];

// Structured query keywords
const STRUCTURED_KEYWORDS = [
  { keyword: "type:", description: "Filter by asset type" },
  { keyword: "region:", description: "Filter by region/state" },
  { keyword: "country:", description: "Filter by country" },
  { keyword: "near:", description: "Search near a location" },
  { keyword: "radius:", description: "Set search radius in km" },
  { keyword: "operator:", description: "Filter by operator" },
];

// Common location prepositions
const LOCATION_KEYWORDS = [
  { keyword: "near", description: "Search near a place" },
  { keyword: "in", description: "Search within a region" },
  { keyword: "within", description: "Set radius constraint" },
];

export default function SearchBar({
  onSearch,
  loading,
  initialQuery = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const prevInitialQueryRef = useRef(initialQuery);
  const hasUserInteracted = useRef(false);

  // Sync query state when initialQuery prop changes (using ref to avoid cascading renders)
  useEffect(() => {
    if (initialQuery && initialQuery !== prevInitialQueryRef.current) {
      prevInitialQueryRef.current = initialQuery;
      hasUserInteracted.current = false;
      queueMicrotask(() => setQuery(initialQuery));
    } else if (initialQuery && !query && !hasUserInteracted.current) {
      queueMicrotask(() => setQuery(initialQuery));
    }
  }, [initialQuery, query]);

  // Generate suggestions based on current query
  const suggestions = useMemo((): Suggestion[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    const results: Suggestion[] = [];

    // Check if user is typing a structured query
    const lastColonIndex = query.lastIndexOf(":");
    const isTypingStructured =
      lastColonIndex !== -1 && !query.slice(lastColonIndex).includes(" ");

    // Find the longest matching asset type (to handle multi-word types like "border control")
    // Sort by keyword length descending to match longest first
    const sortedAssetTypes = [...ASSET_TYPES].sort(
      (a, b) => b.keyword.length - a.keyword.length,
    );

    const matchedAssetType = sortedAssetTypes.find((asset) => {
      const assetKeyword = asset.keyword.toLowerCase();
      return (
        lowerQuery === assetKeyword || lowerQuery.startsWith(assetKeyword + " ")
      );
    });

    // If we have a complete asset type, suggest location keywords
    if (matchedAssetType) {
      const afterAsset = lowerQuery
        .slice(matchedAssetType.keyword.length)
        .trim();

      // If nothing after asset type, suggest location keywords
      if (!afterAsset) {
        LOCATION_KEYWORDS.forEach((kw) => {
          results.push({
            text: matchedAssetType.keyword + " " + kw.keyword + " ",
            type: "keyword",
            description: kw.description,
          });
        });
      } else {
        // User is typing after asset type - suggest matching location keywords
        const matchingLocKeywords = LOCATION_KEYWORDS.filter((kw) =>
          kw.keyword.startsWith(afterAsset),
        );

        matchingLocKeywords.forEach((kw) => {
          results.push({
            text: matchedAssetType.keyword + " " + kw.keyword + " ",
            type: "keyword",
            description: kw.description,
          });
        });
      }

      // Return early - don't suggest more asset types when we already have one
      if (results.length > 0) {
        return results.slice(0, 8);
      }
    }

    // No complete asset type yet - suggest matching asset types
    const matchingAssets = ASSET_TYPES.filter(
      (asset) =>
        asset.keyword.toLowerCase().startsWith(lowerQuery) ||
        asset.label.toLowerCase().startsWith(lowerQuery),
    ).slice(0, 6);

    matchingAssets.forEach((asset) => {
      results.push({
        text: asset.keyword,
        type: "asset",
        description: asset.label,
      });
    });

    // Suggest structured keywords if query starts with them or is short
    if (query.length < 15 || isTypingStructured) {
      const words = query.split(/\s+/);
      const lastWord = words[words.length - 1].toLowerCase();

      const matchingKeywords = STRUCTURED_KEYWORDS.filter(
        (kw) => kw.keyword.startsWith(lastWord) && lastWord.length > 0,
      );

      matchingKeywords.forEach((kw) => {
        const prefix =
          words.length > 1 ? words.slice(0, -1).join(" ") + " " : "";
        results.push({
          text: prefix + kw.keyword,
          type: "keyword",
          description: kw.description,
        });
      });
    }

    // Add matching example queries
    if (query.length >= 2) {
      const matchingExamples = EXAMPLE_QUERIES.filter(
        (ex) =>
          ex.toLowerCase().includes(lowerQuery) &&
          ex.toLowerCase() !== lowerQuery,
      ).slice(0, 2);

      matchingExamples.forEach((ex) => {
        results.push({
          text: ex,
          type: "example",
          description: "Example query",
        });
      });
    }

    // Remove duplicates and limit results
    const uniqueResults = results.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.text === item.text),
    );

    return uniqueResults.slice(0, 8);
  }, [query]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && !loading) {
        onSearch(query.trim());
        setShowExamples(false);
        setShowSuggestions(false);
      }
    },
    [query, loading, onSearch],
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      setQuery(example);
      setShowExamples(false);
      setShowSuggestions(false);
      onSearch(example);
    },
    [onSearch],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      setQuery(suggestion.text);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();

      // If it's a complete example, submit immediately
      if (suggestion.type === "example") {
        onSearch(suggestion.text);
      }
    },
    [onSearch],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      hasUserInteracted.current = true;
      setQuery(value);
      setShowSuggestions(value.trim().length > 0);
      setShowExamples(false);
      setSelectedIndex(-1);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;
        case "Tab":
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSuggestionClick(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSuggestionClick],
  );

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[
        selectedIndex + 1
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowExamples(false);
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowExamples(false);
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="search-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => !query && setShowExamples(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search infrastructure..."
            className="search-input"
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <div className="search-spinner" />}
        </div>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="search-suggestions">
          <div className="suggestions-header">Suggestions</div>
          <ScrollArea className="suggestions-scroll-area">
            <div className="suggestions-list">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`suggestion-item ${selectedIndex === idx ? "selected" : ""}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span
                    className={`suggestion-icon suggestion-icon-${suggestion.type}`}
                  >
                    {suggestion.type === "asset" && (
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" />
                        <path d="M8 4a.75.75 0 01.75.75v2.5h2.5a.75.75 0 010 1.5h-2.5v2.5a.75.75 0 01-1.5 0v-2.5h-2.5a.75.75 0 010-1.5h2.5v-2.5A.75.75 0 018 4z" />
                      </svg>
                    )}
                    {suggestion.type === "keyword" && (
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M11.5 7a4.499 4.499 0 11-8.998 0 4.499 4.499 0 018.998 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
                        />
                      </svg>
                    )}
                    {suggestion.type === "example" && (
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
                      </svg>
                    )}
                  </span>
                  <span className="suggestion-text">{suggestion.text}</span>
                  {suggestion.description && (
                    <span className="suggestion-description">
                      {suggestion.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {showExamples && !query && (
        <div className="search-examples">
          <div className="examples-header">Examples</div>
          {EXAMPLE_QUERIES.map((example, idx) => (
            <button
              key={idx}
              type="button"
              className="example-item"
              onClick={() => handleExampleClick(example)}
            >
              <code>{example}</code>
            </button>
          ))}
          <div className="examples-footer">
            <span>
              Structured: <code>type:airport region:bavaria</code>
            </span>
            <span>
              Natural: <code>wind farms near copenhagen</code>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
