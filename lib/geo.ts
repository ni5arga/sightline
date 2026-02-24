import { GeoResult } from './types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Sightline/1.0 (+https://github.com/ni5arga/sightline)';
const NOMINATIM_API = '/api/nominatim'; // Client-side proxy
const TIMEOUT_MS = 10000;

// Detect if running on server or client
const isServer = typeof window === 'undefined';

// Server-side rate limiter for Nominatim (1 request per second)
let lastNominatimRequest = 0;
const NOMINATIM_MIN_INTERVAL = 1000; // 1 second between requests

async function waitForRateLimit(): Promise<void> {
  if (!isServer) return;
  
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  
  if (timeSinceLastRequest < NOMINATIM_MIN_INTERVAL) {
    const waitTime = NOMINATIM_MIN_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastNominatimRequest = Date.now();
}

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
    county?: string;
    state_district?: string;
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

  let url: string;
  let headers: Record<string, string>;

  if (isServer) {
    // Server-side: call Nominatim directly with proper User-Agent and rate limiting
    await waitForRateLimit();
    url = `${NOMINATIM_BASE}/search?${params}`;
    headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    };
  } else {
    // Client-side: use proxy to avoid CORS and User-Agent issues
    params.set('endpoint', 'search');
    url = `${NOMINATIM_API}?${params}`;
    headers = {
      'Accept': 'application/json'
    };
  }

  const response = await fetchWithTimeout(url, { headers }, TIMEOUT_MS);

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

export async function getPlaceSuggestions(query: string, limit: number = 5): Promise<Array<{ name: string; displayName: string }>> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    addressdetails: '1',
    limit: limit.toString()
  });

  let url: string;
  let headers: Record<string, string>;

  if (isServer) {
    // Server-side: call Nominatim directly with proper User-Agent and rate limiting
    await waitForRateLimit();
    url = `${NOMINATIM_BASE}/search?${params}`;
    headers = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    };
  } else {
    // Client-side: use proxy to avoid CORS and User-Agent issues
    params.set('endpoint', 'search');
    url = `${NOMINATIM_API}?${params}`;
    headers = {
      'Accept': 'application/json'
    };
  }

  try {
    const response = await fetchWithTimeout(url, { headers }, TIMEOUT_MS);

    if (!response.ok) {
      return [];
    }

    const data: NominatimResponse[] = await response.json();

    return data.map((item) => {
      // Extract the most meaningful place name components
      const addressParts = [];
      
      // Primary location (most specific)
      if (item.address?.city) {
        addressParts.push(item.address.city);
      } else if (item.address?.town) {
        addressParts.push(item.address.town);
      } else if (item.address?.village) {
        addressParts.push(item.address.village);
      } else if (item.address?.county) {
        addressParts.push(item.address.county);
      } else if (item.address?.state_district) {
        addressParts.push(item.address.state_district);
      }
      
      // Secondary location (region)
      if (item.address?.state && item.address.state !== addressParts[0]) {
        addressParts.push(item.address.state);
      }
      
      // Country (only if we have at least one other part)
      if (item.address?.country && addressParts.length > 0) {
        addressParts.push(item.address.country);
      }
      
      // Build the short name, with validation
      let shortName = addressParts.join(', ');
      
      // If the extracted name is too short or empty, use a cleaned version of display_name
      if (!shortName || shortName.length < 3) {
        // Take first 3 parts of display_name (usually city, state, country)
        const displayParts = item.display_name.split(',').map(p => p.trim()).filter(p => p.length > 0);
        shortName = displayParts.slice(0, 3).join(', ');
      }
      
      return {
        name: shortName,
        displayName: item.display_name
      };
    });
  } catch (error) {
    console.warn('Place suggestion fetch failed:', error);
    return [];
  }
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
