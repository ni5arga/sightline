import { GeoResult } from './types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Sightline/1.0';
const TIMEOUT_MS = 10000;

interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
  importance: number;
  type: string;
  class: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function geocode(query: string, countryCode?: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5'
  });

  if (countryCode) {
    params.set('countrycodes', countryCode);
  }

  const url = `${NOMINATIM_BASE}/search?${params}`;

  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  }, TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`);
  }

  const data: NominatimResponse[] = await response.json();

  return data.map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    boundingBox: [
      parseFloat(item.boundingbox[0]),
      parseFloat(item.boundingbox[1]),
      parseFloat(item.boundingbox[2]),
      parseFloat(item.boundingbox[3])
    ] as [number, number, number, number],
    type: item.type,
    importance: item.importance,
    osmType: item.osm_type,
    osmId: item.osm_id,
    addressComponents: {
      country: item.address?.country,
      state: item.address?.state,
      city: item.address?.city || item.address?.town || item.address?.village
    }
  }));
}

export async function resolveLocation(
  query: string,
  preferredCountry?: string
): Promise<GeoResult | null> {
  const results = await geocode(query, preferredCountry);
  
  if (results.length === 0) {
    return null;
  }

  const adminTypes = ['administrative', 'state', 'city', 'town', 'village', 'county', 'district'];
  
  const adminResult = results.find(r => 
    adminTypes.includes(r.type) || r.importance > 0.5
  );

  if (adminResult) {
    return adminResult;
  }

  return results.sort((a, b) => b.importance - a.importance)[0];
}

export function calculateBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): [number, number, number, number] {
  const latDelta = radiusKm / 111.0;
  const lonDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));

  return [
    lat - latDelta,
    lat + latDelta,
    lon - lonDelta,
    lon + lonDelta
  ];
}

export function expandBoundingBox(
  bbox: [number, number, number, number],
  factor: number = 1.1
): [number, number, number, number] {
  const latCenter = (bbox[0] + bbox[1]) / 2;
  const lonCenter = (bbox[2] + bbox[3]) / 2;
  const latHalf = (bbox[1] - bbox[0]) / 2 * factor;
  const lonHalf = (bbox[3] - bbox[2]) / 2 * factor;

  return [
    latCenter - latHalf,
    latCenter + latHalf,
    lonCenter - lonHalf,
    lonCenter + lonHalf
  ];
}

export function bboxToString(bbox: [number, number, number, number]): string {
  return `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`;
}

export function isBoundingBoxTooLarge(): boolean {
  return false;
}

/**
 * Convert OSM ID to Overpass area ID
 * For relations: area_id = osm_id + 3600000000
 * For ways: area_id = osm_id + 2400000000
 * For administrative boundaries, we primarily use relations
 */
export function osmIdToAreaId(osmType: string, osmId: number): number | null {
  if (osmType === 'relation') {
    return osmId + 3600000000;
  } else if (osmType === 'way') {
    return osmId + 2400000000;
  }
  // Nodes cannot be converted to areas
  return null;
}
