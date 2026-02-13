import { Asset, ASSET_TYPE_MAP } from './types';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 30000;
const MAX_RESULTS = 1000;

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildTagFilter(osmTags: Record<string, string | string[]>): string {
  const filters: string[] = [];
  
  for (const [key, value] of Object.entries(osmTags)) {
    if (Array.isArray(value)) {
      const regex = value.join('|');
      filters.push(`["${key}"~"${regex}",i]`);
    } else {
      filters.push(`["${key}"="${value}"]`);
    }
  }
  
  return filters.join('');
}

export function buildOverpassQuery(
  assetType: string,
  bbox: [number, number, number, number],
  operator?: string | null,
  areaId?: number | null
): string {
  const typeConfig = ASSET_TYPE_MAP[assetType];
  if (!typeConfig) {
    throw new Error(`Unknown asset type: ${assetType}`);
  }

  const bboxStr = `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`;
  const tagFilter = buildTagFilter(typeConfig.osmTags);
  
  let operatorFilter = '';
  if (operator) {
    operatorFilter = `["operator"~"${operator}",i]`;
  }

  // Use area filter if available for precise geographic boundaries
  let locationFilter = '';
  if (areaId) {
    locationFilter = `(area:${areaId})`;
  } else {
    locationFilter = `(${bboxStr})`;
  }

  const query = `
[out:json][timeout:25][maxsize:50000000];
(
  node${tagFilter}${operatorFilter}${locationFilter};
  way${tagFilter}${operatorFilter}${locationFilter};
  relation${tagFilter}${operatorFilter}${locationFilter};
);
out center ${MAX_RESULTS};
`.trim();

  return query;
}

export function buildMultiTypeQuery(
  bbox: [number, number, number, number],
  operator: string,
  areaId?: number | null
): string {
  const bboxStr = `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`;
  
  // Use area filter if available for precise geographic boundaries
  let locationFilter = '';
  if (areaId) {
    locationFilter = `(area:${areaId})`;
  } else {
    locationFilter = `(${bboxStr})`;
  }
  
  const query = `
[out:json][timeout:25][maxsize:50000000];
(
  node["operator"~"${operator}",i]${locationFilter};
  way["operator"~"${operator}",i]${locationFilter};
  relation["operator"~"${operator}",i]${locationFilter};
);
out center ${MAX_RESULTS};
`.trim();

  return query;
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

export async function executeQuery(query: string): Promise<Asset[]> {
  const response = await fetchWithTimeout(OVERPASS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `data=${encodeURIComponent(query)}`
  }, TIMEOUT_MS);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by Overpass API. Please wait and try again.');
    }
    throw new Error(`Overpass API request failed: ${response.status}`);
  }

  const data: OverpassResponse = await response.json();
  
  return data.elements
    .filter(el => {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      return lat !== undefined && lon !== undefined;
    })
    .map(el => {
      const lat = el.lat ?? el.center!.lat;
      const lon = el.lon ?? el.center!.lon;
      const tags = el.tags || {};
      
      return {
        id: `${el.type}/${el.id}`,
        name: extractName(tags),
        type: extractType(tags),
        operator: tags.operator || null,
        lat,
        lon,
        tags: filterTags(tags)
      };
    });
}

function extractName(tags: Record<string, string>): string {
  return tags.name || 
         tags['name:en'] || 
         tags.ref || 
         tags.description ||
         tags.operator ||
         'Unnamed';
}

function extractType(tags: Record<string, string>): string {
  if (tags['tower:type']) return `tower:${tags['tower:type']}`;
  if (tags.building === 'data_centre') return 'data_center';
  if (tags.power === 'plant') return 'power_plant';
  if (tags.power === 'substation') return 'substation';
  if (tags.power === 'generator') {
    if (tags['generator:source']) return tags['generator:source'];
    return 'generator';
  }
  if (tags.aeroway === 'aerodrome') return 'airport';
  if (tags.aeroway === 'helipad') return 'helipad';
  if (tags.man_made === 'tower') return 'tower';
  if (tags.man_made === 'pipeline') return 'pipeline';
  if (tags.landuse === 'port') return 'port';
  if (tags.harbour) return 'harbour';
  if (tags.building === 'warehouse') return 'warehouse';
  if (tags.landuse === 'railway') return 'railyard';
  if (tags.landuse === 'military') return 'military';
  if (tags.landuse === 'industrial') return 'industrial';
  if (tags.amenity === 'prison') return 'prison';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'embassy') return 'embassy';
  if (tags.waterway === 'dam') return 'dam';
  if (tags.building === 'industrial') return 'factory';
  
  return 'infrastructure';
}

function filterTags(tags: Record<string, string>): Record<string, string> {
  const relevant = [
    'name', 'operator', 'power', 'voltage', 'capacity',
    'height', 'tower:type', 'building', 'aeroway', 'ref',
    'start_date', 'website', 'phone', 'description'
  ];
  
  const filtered: Record<string, string> = {};
  for (const key of relevant) {
    if (tags[key]) {
      filtered[key] = tags[key];
    }
  }
  return filtered;
}

export function calculateStats(assets: Asset[]): { 
  total: number; 
  operators: Record<string, number>; 
  types: Record<string, number> 
} {
  const operators: Record<string, number> = {};
  const types: Record<string, number> = {};

  for (const asset of assets) {
    const op = asset.operator || 'Unknown';
    operators[op] = (operators[op] || 0) + 1;
    
    types[asset.type] = (types[asset.type] || 0) + 1;
  }

  return {
    total: assets.length,
    operators,
    types
  };
}
