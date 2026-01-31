"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SearchableAsset, Keyword } from "@/lib/search-index";
import {
  findMatchedAssetType,
  findMatchingAssets,
  findMatchingExamples,
  EXAMPLE_QUERIES,
  STRUCTURED_KEYWORDS,
  LOCATION_KEYWORDS,
} from "@/lib/search-index";

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

/**
 * SearchBar with autocomplete suggestions for infrastructure queries.
 * Supports natural language ("airports near london") and structured syntax ("type:airport region:bavaria").
 */
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

  useEffect(() => {
    if (initialQuery && initialQuery !== prevInitialQueryRef.current) {
      prevInitialQueryRef.current = initialQuery;
      hasUserInteracted.current = false;
      queueMicrotask(() => setQuery(initialQuery));
    } else if (initialQuery && !query && !hasUserInteracted.current) {
      queueMicrotask(() => setQuery(initialQuery));
    }
  }, [initialQuery, query]);

  const suggestions = useMemo((): Suggestion[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    const results: Suggestion[] = [];

    const lastColonIndex = query.lastIndexOf(":");
    const isTypingStructured =
      lastColonIndex !== -1 && !query.slice(lastColonIndex).includes(" ");

    const matchedAssetType = findMatchedAssetType(lowerQuery);

    if (matchedAssetType) {
      const afterAsset = lowerQuery
        .slice(matchedAssetType.keywordLower.length)
        .trim();

      if (!afterAsset) {
        LOCATION_KEYWORDS.forEach((kw: Keyword) => {
          results.push({
            text: matchedAssetType.keyword + " " + kw.keyword + " ",
            type: "keyword",
            description: kw.description,
          });
        });
      } else {
        const matchingLocKeywords = LOCATION_KEYWORDS.filter((kw: Keyword) =>
          kw.keyword.startsWith(afterAsset),
        );

        matchingLocKeywords.forEach((kw: Keyword) => {
          results.push({
            text: matchedAssetType.keyword + " " + kw.keyword + " ",
            type: "keyword",
            description: kw.description,
          });
        });
      }

      if (results.length > 0) {
        return results.slice(0, 8);
      }
    }

    const matchingAssets = findMatchingAssets(lowerQuery, 6);

    matchingAssets.forEach((asset: SearchableAsset) => {
      results.push({
        text: asset.keyword,
        type: "asset",
        description: asset.label,
      });
    });

    if (query.length < 15 || isTypingStructured) {
      const words = query.split(/\s+/);
      const lastWord = words[words.length - 1].toLowerCase();

      const matchingKeywords = STRUCTURED_KEYWORDS.filter(
        (kw: Keyword) => kw.keyword.startsWith(lastWord) && lastWord.length > 0,
      );

      matchingKeywords.forEach((kw: Keyword) => {
        const prefix =
          words.length > 1 ? words.slice(0, -1).join(" ") + " " : "";
        results.push({
          text: prefix + kw.keyword,
          type: "keyword",
          description: kw.description,
        });
      });
    }

    const matchingExamples = findMatchingExamples(lowerQuery, 2);

    matchingExamples.forEach((ex: string) => {
      results.push({
        text: ex,
        type: "example",
        description: "Example query",
      });
    });

    const seen = new Set<string>();
    const uniqueResults = results.filter((item) => {
      if (seen.has(item.text)) return false;
      seen.add(item.text);
      return true;
    });

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
      if (e.key === "Tab" && !e.shiftKey) {
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          const idx = selectedIndex >= 0 ? selectedIndex : 0;
          handleSuggestionClick(suggestions[idx]);
          return;
        }
      }

      if (e.key === "Tab" && e.shiftKey) {
        setShowSuggestions(false);
        setShowExamples(false);
        return;
      }

      if (e.key === "Escape") {
        if (showSuggestions || showExamples) {
          e.preventDefault();
          setShowSuggestions(false);
          setShowExamples(false);
          setSelectedIndex(-1);
        } else if (query) {
          e.preventDefault();
          setQuery("");
        }
        return;
      }

      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        return;
      }

      if (e.key === "Backspace" && (e.ctrlKey || e.metaKey)) {
        return;
      }

      if (!showSuggestions || suggestions.length === 0) {
        if (e.key === "ArrowDown" && query.trim()) {
          e.preventDefault();
          setShowSuggestions(true);
          setSelectedIndex(0);
        }
        return;
      }

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
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSuggestionClick(suggestions[selectedIndex]);
          }
          break;
        case "Home":
          if (e.altKey) {
            e.preventDefault();
            setSelectedIndex(0);
          }
          break;
        case "End":
          if (e.altKey) {
            e.preventDefault();
            setSelectedIndex(suggestions.length - 1);
          }
          break;
      }
    },
    [
      showSuggestions,
      showExamples,
      suggestions,
      selectedIndex,
      handleSuggestionClick,
      query,
    ],
  );

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
          <button
            type="submit"
            className="search-button"
            disabled={loading || !query.trim()}
            title="Search"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </button>
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
          {EXAMPLE_QUERIES.map((example: string, idx: number) => (
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
