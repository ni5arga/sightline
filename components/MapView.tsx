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

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    map.zoomControl.setPosition("topright");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const createPopupContent = useCallback((asset: Asset): string => {
    const tags = Object.entries(asset.tags)
      .slice(0, 5)
      .map(
        ([k, v]) =>
          `<tr><td class="popup-key">${k}</td><td class="popup-value">${v}</td></tr>`,
      )
      .join("");

    return `
      <div class="map-popup">
        <div class="popup-title">${asset.name}</div>
        <div class="popup-type">${asset.type}</div>
        ${asset.operator ? `<div class="popup-operator">${asset.operator}</div>` : ""}
        <div class="popup-coords">${asset.lat.toFixed(5)}, ${asset.lon.toFixed(5)}</div>
        ${tags ? `<table class="popup-tags">${tags}</table>` : ""}
        <a class="popup-osm-link" href="https://www.openstreetmap.org/${asset.id}" target="_blank" rel="noopener">View on OSM</a>
      </div>
    `;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    filteredResults.forEach((asset) => {
      const marker = L.marker([asset.lat, asset.lon], {
        icon: asset.id === selectedId ? selectedIcon : defaultIcon,
      });

      marker.bindPopup(createPopupContent(asset), {
        maxWidth: typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(window.innerWidth - 60, 280) : 300,
        minWidth: typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(window.innerWidth - 60, 250) : 200,
        maxHeight: typeof window !== 'undefined' && window.innerWidth < 768 ? Math.floor(window.innerHeight * 0.5) : 400,
        className: "dark-popup",
        autoPan: true,
        autoPanPadding: [30, 80],
        keepInView: true,
      });

      marker.on("click", () => {
        onSelect(asset.id);
      });

      marker.addTo(map);
      markersRef.current.set(asset.id, marker);
    });

    if (bounds && filteredResults.length > 0) {
      const latLngBounds = L.latLngBounds(
        [bounds[0], bounds[2]],
        [bounds[1], bounds[3]],
      );
      map.fitBounds(latLngBounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [filteredResults, bounds, selectedId, onSelect, createPopupContent]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    markersRef.current.forEach((marker, id) => {
      marker.setIcon(id === selectedId ? selectedIcon : defaultIcon);
    });

    const selectedMarker = markersRef.current.get(selectedId);
    if (selectedMarker) {
      const latLng = selectedMarker.getLatLng();
      const targetZoom = Math.max(map.getZoom(), SELECTED_ZOOM);

      // Get container size to calculate offset
      const containerSize = map.getSize();

      // Offset the view so marker appears in lower third of screen
      // This leaves room for the popup above the marker
      const offsetY = containerSize.y * 0.25; // 25% of screen height

      // Convert the offset to lat/lng at the target zoom level
      const targetPoint = map.project(latLng, targetZoom);
      const offsetPoint = L.point(targetPoint.x, targetPoint.y - offsetY);
      const offsetLatLng = map.unproject(offsetPoint, targetZoom);

      map.setView(offsetLatLng, targetZoom, {
        animate: true,
        duration: 0.3,
      });
      selectedMarker.openPopup();
    }
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
