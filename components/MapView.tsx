"use client";

/**
 * MapView Component
 *
 * Interactive map display with marker clustering optimized for large datasets (10K+ markers).
 * Uses Leaflet with leaflet.markercluster for performance. Features adaptive configuration
 * based on dataset size, lazy popup rendering, and graceful degradation for tile failures.
 */

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
// Blue dot icon for non-clustered mode
const blueDotIcon = L.divIcon({
  className: "marker-bluedot",
  html: '<div style="background:#2196f3;border-radius:50%;width:12px;height:12px;border:2px solid #111;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Asset } from "@/lib/types";

interface MapViewProps {
  results: Asset[];
  bounds: [number, number, number, number] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterOperator: string | null;
  filterType: string | null;
}

/** Escapes HTML entities to prevent XSS in dynamically generated popup content. */
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

/**
 * Adaptive clustering thresholds.
 * Performance settings scale based on marker count to balance responsiveness with visual quality.
 */
const CLUSTER_THRESHOLDS = {
  SMALL: 100,
  MEDIUM: 1000,
  LARGE: 10000,
  MASSIVE: 50000,
} as const;

interface ClusterConfig {
  readonly chunkInterval: number;
  readonly chunkDelay: number;
  readonly maxClusterRadius: number;
  readonly disableClusteringAtZoom: number;
  readonly animate: boolean;
  readonly animateAddingMarkers: boolean;
  readonly spiderfyDistanceMultiplier: number;
}

const CLUSTER_CONFIGS: Readonly<Record<string, ClusterConfig>> = Object.freeze({
  small: {
    chunkInterval: 100,
    chunkDelay: 25,
    maxClusterRadius: 40,
    disableClusteringAtZoom: 17,
    animate: true,
    animateAddingMarkers: true,
    spiderfyDistanceMultiplier: 1.5,
  },
  medium: {
    chunkInterval: 150,
    chunkDelay: 50,
    maxClusterRadius: 50,
    disableClusteringAtZoom: 18,
    animate: true,
    animateAddingMarkers: false,
    spiderfyDistanceMultiplier: 1.2,
  },
  large: {
    chunkInterval: 200,
    chunkDelay: 75,
    maxClusterRadius: 60,
    disableClusteringAtZoom: 19,
    animate: true,
    animateAddingMarkers: false,
    spiderfyDistanceMultiplier: 1,
  },
  massive: {
    chunkInterval: 300,
    chunkDelay: 100,
    maxClusterRadius: 80,
    disableClusteringAtZoom: 19,
    animate: false,
    animateAddingMarkers: false,
    spiderfyDistanceMultiplier: 0.8,
  },
});

/** Returns optimized cluster settings based on dataset size for best performance/UX balance. */
function getClusterConfig(markerCount: number): ClusterConfig {
  if (markerCount < CLUSTER_THRESHOLDS.SMALL) {
    return CLUSTER_CONFIGS.small;
  } else if (markerCount < CLUSTER_THRESHOLDS.MEDIUM) {
    return CLUSTER_CONFIGS.medium;
  } else if (markerCount < CLUSTER_THRESHOLDS.LARGE) {
    return CLUSTER_CONFIGS.large;
  }
  return CLUSTER_CONFIGS.massive;
}

/** Validates geographic coordinates to prevent invalid markers from corrupting the map state. */
function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/** Formats large numbers for cluster display (e.g., 1.2K, 15K, 1.5M) to improve readability. */
function formatClusterCount(count: number): string {
  if (count < 1000) {
    return String(count);
  } else if (count < 10000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else if (count < 1000000) {
    return `${Math.round(count / 1000)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
}

type ClusterSize = "small" | "medium" | "large" | "xlarge";

function getClusterSize(count: number): ClusterSize {
  if (count < 10) return "small";
  if (count < 100) return "medium";
  if (count < 1000) return "large";
  return "xlarge";
}

const CLUSTER_DIMENSIONS: Readonly<Record<ClusterSize, number>> = Object.freeze(
  {
    small: 30,
    medium: 40,
    large: 50,
    xlarge: 60,
  },
);

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
  // Cluster toggle state
  const [showClusters, setShowClusters] = useState(true);
  const prevShowClustersRef = useRef<boolean>(true);

  // Core map instance and marker storage
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tile layer management
  const layerControlRef = useRef<L.Control.Layers | null>(null);
  const tileLayersRef = useRef<Map<string, L.TileLayer>>(new Map());
  const activeLayerRef = useRef<string>("osm");

  // Lifecycle tracking
  const isMapMountedRef = useRef<boolean>(true);

  // Selection state tracking to differentiate user clicks from programmatic selection
  const selectionSourceRef = useRef<"marker" | "external" | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const hasNavigatedToSelectionRef = useRef<boolean>(false);
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

  // Map initialization effect - runs once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Reset mounted flag for re-mount scenarios (React Strict Mode, hot reload)
    isMapMountedRef.current = true;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    const createTileLayer = (key: string, config: LayerConfig): L.TileLayer => {
      const layer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        subdomains: config.subdomains ?? "abc",
        errorTileUrl: TRANSPARENT_TILE,
        crossOrigin: "anonymous",
      });

      // Automatic fallback: switch to backup tile server after repeated failures
      let errorCount = 0;
      let hasSwitchedToFallback = false;

      layer.on("tileerror", () => {
        errorCount++;
        if (
          errorCount >= TILE_ERROR_THRESHOLD &&
          config.fallbackUrl &&
          !hasSwitchedToFallback
        ) {
          hasSwitchedToFallback = true;
          layer.setUrl(config.fallbackUrl);
          errorCount = 0;
        }
      });

      layer.on("tileload", () => {
        errorCount = 0;
      });

      return layer;
    };

    const tileLayers = new Map<string, L.TileLayer>();
    const baseLayers: Record<string, L.TileLayer> = {};

    Object.entries(LAYERS).forEach(([key, config]) => {
      const layer = createTileLayer(key, config);
      tileLayers.set(key, layer);
      baseLayers[config.label] = layer;
    });

    tileLayersRef.current = tileLayers;

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

    const handleBaseLayerChange = (e: L.LayersControlEvent) => {
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

    const handleInteractionStart = () => {
      userInteractingRef.current = true;
    };
    const handleInteractionEnd = () => {
      setTimeout(() => {
        userInteractingRef.current = false;
      }, 100);
    };

    const handleMoveEnd = () => {
      handleInteractionEnd();

      // Auto-close popups when their marker scrolls out of view
      const openPopup = map
        .getPane("popupPane")
        ?.querySelector(".leaflet-popup");
      if (openPopup) {
        const currentMarkers = markersRef.current;
        for (const [, marker] of currentMarkers) {
          if (marker.isPopupOpen()) {
            const markerLatLng = marker.getLatLng();
            const bounds = map.getBounds();
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
      isMapMountedRef.current = false;
      map.off("baselayerchange", handleBaseLayerChange);
      map.off("dragstart", handleInteractionStart);
      map.off("zoomstart", handleInteractionStart);
      map.off("dragend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      tileLayersRef.current.forEach((layer) => {
        layer.off();
        layer.remove();
      });
      tileLayersRef.current.clear();
      if (markerClusterRef.current) {
        markerClusterRef.current.clearLayers();
        markerClusterRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      layerControlRef.current = null;
    };
  }, []);

  /** Generates popup HTML content with XSS-safe escaping. */
  const createPopupContent = useCallback((asset: Asset): string => {
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

  // Marker rendering effect - clusters or blue dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;

    // Clean up existing cluster group
    if (markerClusterRef.current) {
      try {
        markerClusterRef.current.clearLayers();
        if (map.hasLayer(markerClusterRef.current)) {
          map.removeLayer(markerClusterRef.current);
        }
      } catch {}
      markerClusterRef.current = null;
    }

    currentMarkers.forEach((marker) => {
      try {
        marker.off();
        if (map.hasLayer(marker)) map.removeLayer(marker);
      } catch {}
    });
    currentMarkers.clear();

    const validResults = filteredResults.filter((asset) =>
      isValidCoordinate(asset.lat, asset.lon),
    );

    if (validResults.length === 0) {
      return;
    }

    if (showClusters) {
      const config = getClusterConfig(validResults.length);
      const markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: config.chunkInterval,
        chunkDelay: config.chunkDelay,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        spiderfyDistanceMultiplier: config.spiderfyDistanceMultiplier,
        disableClusteringAtZoom: config.disableClusteringAtZoom,
        maxClusterRadius: config.maxClusterRadius,
        animate: config.animate,
        animateAddingMarkers: config.animateAddingMarkers,
        removeOutsideVisibleBounds: true,
        spiderLegPolylineOptions: {
          weight: 1.5,
          color: "#30363d",
          opacity: 0.6,
        },
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = getClusterSize(count);
          const dimensions = CLUSTER_DIMENSIONS[size];
          const formattedCount = formatClusterCount(count);
          return L.divIcon({
            html: `<div class=\"cluster-icon\" role=\"img\" aria-label=\"${count} markers in this cluster\"><span>${formattedCount}</span></div>`,
            className: `marker-cluster marker-cluster-${size}`,
            iconSize: L.point(dimensions, dimensions),
          });
        },
      });
      markerClusterRef.current = markerCluster;
      const markersToAdd: L.Marker[] = [];
      for (const asset of validResults) {
        try {
          const marker = L.marker([asset.lat, asset.lon], {
            icon: defaultIcon,
            keyboard: true,
          });
          marker.bindPopup(() => createPopupContent(asset), {
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
            keepInView: false,
          });
          marker.on("click", () => {
            if (!isMapMountedRef.current) return;
            selectionSourceRef.current = "marker";
            hasNavigatedToSelectionRef.current = true;
            onSelect(asset.id);
          });
          markersToAdd.push(marker);
          currentMarkers.set(asset.id, marker);
        } catch {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Failed to create marker for asset: ${asset.id}`);
          }
        }
      }
      if (markersToAdd.length > 0) {
        try {
          markerCluster.addLayers(markersToAdd);
        } catch {
          markersToAdd.forEach((marker) => {
            try {
              markerCluster.addLayer(marker);
            } catch {}
          });
        }
      }
      if (markerCluster && isMapMountedRef.current) {
        map.addLayer(markerCluster);
      }
    } else {
      // Show blue dots for all points, no clustering
      for (const asset of validResults) {
        try {
          const marker = L.marker([asset.lat, asset.lon], {
            icon: blueDotIcon,
            keyboard: true,
          });
          marker.bindPopup(() => createPopupContent(asset), {
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
            keepInView: false,
          });
          marker.on("click", () => {
            if (!isMapMountedRef.current) return;
            selectionSourceRef.current = "marker";
            hasNavigatedToSelectionRef.current = true;
            onSelect(asset.id);
          });
          marker.addTo(map);
          currentMarkers.set(asset.id, marker);
        } catch {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Failed to create marker for asset: ${asset.id}`);
          }
        }
      }
    }

    // Auto-fit bounds to results when markers are updated, but not when just toggling clusters
    const isJustTogglingClusters = prevShowClustersRef.current !== showClusters && filteredResults.length === validResults.length;
    prevShowClustersRef.current = showClusters;

    if (bounds && validResults.length > 0 && !isJustTogglingClusters) {
      try {
        const latLngBounds = L.latLngBounds(
          [bounds[0], bounds[2]],
          [bounds[1], bounds[3]],
        );
        if (latLngBounds.isValid()) {
          map.fitBounds(latLngBounds, {
            padding: [50, 50],
            maxZoom: 12,
            animate: validResults.length < CLUSTER_THRESHOLDS.LARGE,
          });
        }
      } catch {}
    }

    return () => {
      currentMarkers.forEach((marker) => {
        try {
          marker.off();
          if (map.hasLayer(marker)) map.removeLayer(marker);
        } catch {}
      });
      if (markerClusterRef.current) {
        try {
          markerClusterRef.current.clearLayers();
          if (map.hasLayer(markerClusterRef.current)) {
            map.removeLayer(markerClusterRef.current);
          }
        } catch {}
      }
    };
  }, [filteredResults, bounds, onSelect, createPopupContent, showClusters]);

  // Selection handling effect - updates marker icons and manages popup/navigation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapMountedRef.current) return;

    const prevSelectedId = prevSelectedIdRef.current;
    const selectionSource = selectionSourceRef.current;
    const isNewSelection = prevSelectedId !== selectedId;

    if (isNewSelection) {
      hasNavigatedToSelectionRef.current = false;
    }

    const currentMarkers = markersRef.current;

    currentMarkers.forEach((marker, id) => {
      try {
        marker.setIcon(id === selectedId ? selectedIcon : defaultIcon);
      } catch {}
    });

    if (prevSelectedId && isNewSelection) {
      const prevMarker = currentMarkers.get(prevSelectedId);
      if (prevMarker?.isPopupOpen()) {
        prevMarker.closePopup();
      }
    }

    if (selectedId && isNewSelection) {
      const selectedMarker = currentMarkers.get(selectedId);

      if (selectedMarker) {
        if (selectionSource === "marker") {
          // Marker was clicked directly - Leaflet handles popup, just track state
          hasNavigatedToSelectionRef.current = true;
          selectionSourceRef.current = null;
        } else {
          // External selection (ResultList, URL) - navigate to marker if needed
          if (
            !hasNavigatedToSelectionRef.current &&
            !userInteractingRef.current
          ) {
            const latLng = selectedMarker.getLatLng();
            const currentZoom = map.getZoom();
            const currentBounds = map.getBounds();
            const isMarkerVisible = currentBounds.contains(latLng);
            const isZoomedInEnough = currentZoom >= SELECTED_ZOOM;

            if (isMarkerVisible && isZoomedInEnough) {
              selectedMarker.openPopup();
              hasNavigatedToSelectionRef.current = true;
            } else {
              const targetZoom = Math.max(currentZoom, SELECTED_ZOOM);
              const containerSize = map.getSize();
              const offsetY = containerSize.y * 0.2;
              const targetPoint = map.project(latLng, targetZoom);
              const offsetPoint = L.point(
                targetPoint.x,
                targetPoint.y - offsetY,
              );
              const offsetLatLng = map.unproject(offsetPoint, targetZoom);

              hasNavigatedToSelectionRef.current = true;

              map.flyTo(offsetLatLng, targetZoom, {
                animate: true,
                duration: 0.5,
              });

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

    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  return (
    <div className="map-container">
      {/* Cluster toggle below the layer selector (topleft) */}
      <div
        style={{
          position: "absolute",
          zIndex: 401,
          left: 12,
          top: 62,
          minWidth: 0,
          background: "#0e0e0e",
          borderRadius: 4,
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.08)",
          border: "1px solid #bbb",
          padding: "3px 8px 3px 6px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        <input
          id="cluster-toggle"
          type="checkbox"
          checked={showClusters}
          onChange={e => setShowClusters(e.target.checked)}
          style={{
            accentColor: '#2196f3',
            width: 15,
            height: 15,
            marginRight: 5,
            cursor: 'pointer',
            verticalAlign: 'middle',
          }}
        />
        <label htmlFor="cluster-toggle" style={{ cursor: 'pointer', userSelect: 'none', color: '#ffffff', letterSpacing: 0, padding: 0, margin: 0 }}>
          <span style={{ verticalAlign: 'middle' }}>Cluster Markers</span>
        </label>
      </div>
      <div ref={containerRef} className="map-inner" />
      {filteredResults.length === 0 && results.length > 0 && (
        <div className="map-overlay">
          <span>No results match current filters</span>
        </div>
      )}
    </div>
  );
}
