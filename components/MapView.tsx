"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Asset } from "@/lib/types";

interface MapViewProps {
  results: Asset[];
  bounds: [number, number, number, number] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterOperator: string | null;
  filterType: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Escape HTML to prevent XSS in popup content */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Base layer configuration interface */
interface LayerConfig {
  readonly url: string;
  readonly attribution: string;
  readonly name: string;
  readonly maxZoom: number;
  readonly label: string;
  readonly fallbackUrl?: string;
  readonly subdomains?: string;
}

/** Available map layer configurations */
const LAYERS: Readonly<Record<string, LayerConfig>> = Object.freeze({
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: "osm",
    label: "Street",
    maxZoom: 19,
    subdomains: "abc",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, Maxar, Earthstar Geographics',
    name: "satellite",
    label: "Satellite",
    maxZoom: 19,
    fallbackUrl:
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    name: "terrain",
    label: "Terrain",
    maxZoom: 17,
    subdomains: "abc",
    fallbackUrl:
      "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png",
  },
});

/** Default layer key */
const DEFAULT_LAYER_KEY = "osm" as const;

/** Storage key for persisting layer preference */
const LAYER_STORAGE_KEY = "sightline-map-layer" as const;

/** Transparent 1x1 PNG for failed tiles */
const TRANSPARENT_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** Number of tile errors before switching to fallback */
const TILE_ERROR_THRESHOLD = 5;

/**
 * Safely retrieves the stored layer preference from localStorage.
 * Returns null if unavailable, invalid, or in SSR context.
 */
function getStoredLayerPreference(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LAYER_STORAGE_KEY);
    // Validate that stored value is a valid layer key
    if (stored && stored in LAYERS) {
      return stored;
    }
    return null;
  } catch {
    // localStorage may throw in private browsing or when disabled
    return null;
  }
}

/**
 * Safely stores the layer preference to localStorage.
 * Silently fails if storage is unavailable.
 */
function setStoredLayerPreference(layerKey: string): void {
  if (typeof window === "undefined") return;
  // Only store valid layer keys
  if (!(layerKey in LAYERS)) return;
  try {
    localStorage.setItem(LAYER_STORAGE_KEY, layerKey);
  } catch {
    // Ignore storage errors (quota exceeded, private browsing, etc.)
  }
}

const DEFAULT_CENTER: L.LatLngExpression = [20, 0];
const DEFAULT_ZOOM = 2;
const SELECTED_ZOOM = 14;

const defaultIcon = L.divIcon({
  className: "marker-default",
  html: '<div class="marker-pin"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -6],
});

const selectedIcon = L.divIcon({
  className: "marker-selected",
  html: '<div class="marker-pin selected"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

export default function MapView({
  results,
  bounds,
  selectedId,
  onSelect,
  filterOperator,
  filterType,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const tileLayersRef = useRef<Map<string, L.TileLayer>>(new Map());
  const activeLayerRef = useRef<string>("osm");

  // Track the source of selection to differentiate marker clicks from external selections
  const selectionSourceRef = useRef<"marker" | "external" | null>(null);
  // Track previous selectedId to detect actual selection changes
  const prevSelectedIdRef = useRef<string | null>(null);
  // Track if we've already navigated to the selected marker (prevents re-flying on pan)
  const hasNavigatedToSelectionRef = useRef<boolean>(false);
  // Track if user is actively interacting with the map (prevents auto-navigation interruption)
  const userInteractingRef = useRef<boolean>(false);

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filterOperator) {
      filtered = filtered.filter((r) => r.operator === filterOperator);
    }

    if (filterType) {
      filtered = filtered.filter((r) => r.type === filterType);
    }

    return filtered;
  }, [results, filterOperator, filterType]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    // Helper to create tile layer with error handling and fallback
    const createTileLayer = (key: string, config: LayerConfig): L.TileLayer => {
      const layer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        subdomains: config.subdomains ?? "abc",
        errorTileUrl: TRANSPARENT_TILE,
        crossOrigin: "anonymous",
      });

      // Handle tile loading errors with fallback
      let errorCount = 0;
      let hasSwitchedToFallback = false;

      layer.on("tileerror", () => {
        errorCount++;
        // Switch to fallback URL after threshold, but only once
        if (
          errorCount >= TILE_ERROR_THRESHOLD &&
          config.fallbackUrl &&
          !hasSwitchedToFallback
        ) {
          hasSwitchedToFallback = true;
          layer.setUrl(config.fallbackUrl);
          // Reset error count for fallback monitoring
          errorCount = 0;
        }
      });

      // Reset error count on successful tile load
      layer.on("tileload", () => {
        errorCount = 0;
      });

      return layer;
    };

    // Create all tile layers
    const tileLayers = new Map<string, L.TileLayer>();
    const baseLayers: Record<string, L.TileLayer> = {};

    Object.entries(LAYERS).forEach(([key, config]) => {
      const layer = createTileLayer(key, config);
      tileLayers.set(key, layer);
      // Use label for layer control
      baseLayers[config.label] = layer;
    });

    tileLayersRef.current = tileLayers;

    // Determine which layer to show (from storage or default)
    const storedLayer = getStoredLayerPreference();
    const initialLayerKey =
      storedLayer && tileLayers.has(storedLayer)
        ? storedLayer
        : DEFAULT_LAYER_KEY;
    const initialLayer = tileLayers.get(initialLayerKey);

    if (initialLayer) {
      initialLayer.addTo(map);
      activeLayerRef.current = initialLayerKey;
    }

    // Create layer control with ARIA-friendly options
    const layerControl = L.control.layers(
      baseLayers,
      {},
      {
        position: "topleft",
        collapsed: true,
      },
    );

    layerControl.addTo(map);
    layerControlRef.current = layerControl;

    // Listen for layer changes to persist preference
    const handleBaseLayerChange = (e: L.LayersControlEvent) => {
      // Find the key for the selected layer by matching label
      for (const [key, config] of Object.entries(LAYERS)) {
        if (e.name === config.label) {
          activeLayerRef.current = key;
          setStoredLayerPreference(key);
          break;
        }
      }
    };

    map.on("baselayerchange", handleBaseLayerChange);

    map.zoomControl.setPosition("topright");

    // Track user interaction to prevent auto-navigation during pan/zoom
    const handleInteractionStart = () => {
      userInteractingRef.current = true;
    };
    const handleInteractionEnd = () => {
      // Small delay to allow for continuous interaction detection
      setTimeout(() => {
        userInteractingRef.current = false;
      }, 100);
    };

    // Close popup intelligently when marker leaves viewport after user interaction
    // This allows small pan adjustments while viewing popup, but closes it when
    // the user navigates far enough that the marker is no longer visible
    const handleMoveEnd = () => {
      handleInteractionEnd();

      // Check if there's an open popup and if its marker is still visible
      const openPopup = map
        .getPane("popupPane")
        ?.querySelector(".leaflet-popup");
      if (openPopup) {
        // Find the marker that has this popup open
        const currentMarkers = markersRef.current;
        for (const [, marker] of currentMarkers) {
          if (marker.isPopupOpen()) {
            const markerLatLng = marker.getLatLng();
            const bounds = map.getBounds();

            // Close popup if marker is outside the visible bounds
            if (!bounds.contains(markerLatLng)) {
              marker.closePopup();
            }
            break;
          }
        }
      }
    };

    map.on("dragstart", handleInteractionStart);
    map.on("zoomstart", handleInteractionStart);
    map.on("dragend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    mapRef.current = map;

    return () => {
      // Clean up all event listeners and layers properly
      map.off("baselayerchange", handleBaseLayerChange);
      map.off("dragstart", handleInteractionStart);
      map.off("zoomstart", handleInteractionStart);
      map.off("dragend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      tileLayersRef.current.forEach((layer) => {
        layer.off(); // Remove all layer event listeners
        layer.remove();
      });
      tileLayersRef.current.clear();
      map.remove();
      mapRef.current = null;
      layerControlRef.current = null;
    };
  }, []);

  const createPopupContent = useCallback((asset: Asset): string => {
    // Escape user-provided content to prevent XSS
    const safeName = escapeHtml(asset.name);
    const safeType = escapeHtml(asset.type);
    const safeOperator = asset.operator ? escapeHtml(asset.operator) : null;

    const tags = Object.entries(asset.tags)
      .slice(0, 5)
      .map(
        ([k, v]) =>
          `<tr><td class="popup-key">${escapeHtml(k)}</td><td class="popup-value">${escapeHtml(String(v))}</td></tr>`,
      )
      .join("");

    return `
      <div class="map-popup">
        <div class="popup-title">${safeName}</div>
        <div class="popup-type">${safeType}</div>
        ${safeOperator ? `<div class="popup-operator">${safeOperator}</div>` : ""}
        <div class="popup-coords">${asset.lat.toFixed(5)}, ${asset.lon.toFixed(5)}</div>
        ${tags ? `<table class="popup-tags">${tags}</table>` : ""}
        <a class="popup-osm-link" href="https://www.openstreetmap.org/${encodeURIComponent(asset.id)}" target="_blank" rel="noopener noreferrer">View on OSM</a>
      </div>
    `;
  }, []);

  // =============================================================================
  // EFFECT: Create and manage markers (independent of selection)
  // =============================================================================
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Capture current markers ref for cleanup (ESLint react-hooks/exhaustive-deps fix)
    const currentMarkers = markersRef.current;

    // Clear existing markers
    currentMarkers.forEach((marker) => {
      marker.off(); // Remove all event listeners
      marker.remove();
    });
    currentMarkers.clear();

    // Create new markers for filtered results
    filteredResults.forEach((asset) => {
      const marker = L.marker([asset.lat, asset.lon], {
        icon: defaultIcon,
      });

      marker.bindPopup(createPopupContent(asset), {
        maxWidth:
          typeof window !== "undefined" && window.innerWidth < 768
            ? Math.min(window.innerWidth - 60, 280)
            : 300,
        minWidth:
          typeof window !== "undefined" && window.innerWidth < 768
            ? Math.min(window.innerWidth - 60, 250)
            : 200,
        maxHeight:
          typeof window !== "undefined" && window.innerWidth < 768
            ? Math.floor(window.innerHeight * 0.5)
            : 400,
        className: "dark-popup",
        autoPan: true,
        autoPanPadding: [30, 80],
        // keepInView is disabled to allow free map navigation while a marker is selected
        // Users can pan anywhere without the map auto-snapping back to the popup
        keepInView: false,
      });

      // Handle marker click - mark selection source as "marker"
      marker.on("click", () => {
        selectionSourceRef.current = "marker";
        hasNavigatedToSelectionRef.current = true; // User clicked, so we're already at the marker
        onSelect(asset.id);
      });

      marker.addTo(map);
      currentMarkers.set(asset.id, marker);
    });

    // Fit bounds if we have results
    if (bounds && filteredResults.length > 0) {
      const latLngBounds = L.latLngBounds(
        [bounds[0], bounds[2]],
        [bounds[1], bounds[3]],
      );
      map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 12 });
    }

    // Cleanup function - uses captured currentMarkers variable
    return () => {
      currentMarkers.forEach((marker) => {
        marker.off();
      });
    };
  }, [filteredResults, bounds, onSelect, createPopupContent]);

  // =============================================================================
  // EFFECT: Handle selection changes (update icons and popups)
  // =============================================================================
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prevSelectedId = prevSelectedIdRef.current;
    const selectionSource = selectionSourceRef.current;
    const isNewSelection = prevSelectedId !== selectedId;

    // Reset navigation tracking when selection actually changes
    if (isNewSelection) {
      hasNavigatedToSelectionRef.current = false;
    }

    // Capture current markers ref for use in this effect
    const currentMarkers = markersRef.current;

    // Update icons for all markers
    currentMarkers.forEach((marker, id) => {
      marker.setIcon(id === selectedId ? selectedIcon : defaultIcon);
    });

    // Close previous popup if switching markers
    if (prevSelectedId && isNewSelection) {
      const prevMarker = currentMarkers.get(prevSelectedId);
      if (prevMarker?.isPopupOpen()) {
        prevMarker.closePopup();
      }
    }

    // Handle the newly selected marker
    if (selectedId && isNewSelection) {
      const selectedMarker = currentMarkers.get(selectedId);

      if (selectedMarker) {
        // If selection came from clicking the marker directly,
        // Leaflet already handles the popup - we just need icons updated (done above)
        if (selectionSource === "marker") {
          // Marker click already opened popup via Leaflet's default behavior
          // Mark as navigated and reset the source flag
          hasNavigatedToSelectionRef.current = true;
          selectionSourceRef.current = null;
        } else {
          // Selection came from external source (ResultList, URL, etc.)
          // Only navigate if we haven't already and user isn't currently interacting
          if (
            !hasNavigatedToSelectionRef.current &&
            !userInteractingRef.current
          ) {
            const latLng = selectedMarker.getLatLng();
            const currentZoom = map.getZoom();
            const currentBounds = map.getBounds();

            // Check if marker is already visible
            const isMarkerVisible = currentBounds.contains(latLng);
            const isZoomedInEnough = currentZoom >= SELECTED_ZOOM;

            if (isMarkerVisible && isZoomedInEnough) {
              // Marker is visible - just open popup, no navigation needed
              selectedMarker.openPopup();
              hasNavigatedToSelectionRef.current = true;
            } else {
              // Need to fly to marker
              const targetZoom = Math.max(currentZoom, SELECTED_ZOOM);

              // Calculate offset for popup visibility
              const containerSize = map.getSize();
              const offsetY = containerSize.y * 0.2;
              const targetPoint = map.project(latLng, targetZoom);
              const offsetPoint = L.point(
                targetPoint.x,
                targetPoint.y - offsetY,
              );
              const offsetLatLng = map.unproject(offsetPoint, targetZoom);

              // Mark as navigated before flying to prevent re-triggering
              hasNavigatedToSelectionRef.current = true;

              // Use flyTo for smooth animation
              map.flyTo(offsetLatLng, targetZoom, {
                animate: true,
                duration: 0.5,
              });

              // Open popup after animation ends
              const onMoveEnd = () => {
                selectedMarker.openPopup();
                map.off("moveend", onMoveEnd);
              };
              map.on("moveend", onMoveEnd);
            }
          }
        }
      }
    }

    // Update previous selection ref
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-inner" />
      {filteredResults.length === 0 && results.length > 0 && (
        <div className="map-overlay">
          <span>No results match current filters</span>
        </div>
      )}
    </div>
  );
}
