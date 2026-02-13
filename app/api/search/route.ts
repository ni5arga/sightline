import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, validateQuery } from '@/lib/parser';
import { resolveLocation, calculateBoundingBox, osmIdToAreaId } from '@/lib/geo';
import { buildOverpassQuery, buildMultiTypeQuery, executeQuery, calculateStats } from '@/lib/overpass';
import { getCachedSearchResult, cacheSearchResult, getCachedGeoResult, cacheGeoResult } from '@/lib/cache';
import type { SearchResult, SearchError, GeoResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest): Promise<NextResponse<SearchResult | SearchError>> {
  try {
    const body = await request.json();
    const query = body.query;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required', code: 'MISSING_QUERY' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long', code: 'QUERY_TOO_LONG' },
        { status: 400 }
      );
    }

    const parsed = parseQuery(query);
    const validation = validateQuery(parsed);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error!, code: 'INVALID_QUERY' },
        { status: 400 }
      );
    }

    const cacheKey = {
      type: parsed.type,
      operator: parsed.operator,
      region: parsed.region,
      country: parsed.country,
      near: parsed.near,
      radius: parsed.radius
    };

    const cached = getCachedSearchResult<SearchResult>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const locationQuery = parsed.near || parsed.region || parsed.country;
    if (!locationQuery) {
      return NextResponse.json(
        { error: 'Geographic scope is required', code: 'MISSING_LOCATION' },
        { status: 400 }
      );
    }

    let geoResult: GeoResult | null = getCachedGeoResult<GeoResult>(locationQuery);
    
    if (!geoResult) {
      geoResult = await resolveLocation(locationQuery);
      
      if (!geoResult) {
        return NextResponse.json(
          { error: `Could not resolve location: ${locationQuery}`, code: 'LOCATION_NOT_FOUND' },
          { status: 400 }
        );
      }
      
      cacheGeoResult(locationQuery, geoResult);
    }

    let bbox: [number, number, number, number];
    
    if (parsed.near) {
      bbox = calculateBoundingBox(geoResult.lat, geoResult.lon, parsed.radius);
    } else {
      bbox = geoResult.boundingBox;
    }

    // Convert OSM ID to Overpass area ID for precise geographic filtering
    // Only use area filter if we have OSM type and ID (from region/country searches)
    // Don't use for 'near' searches as they use radius-based bounding boxes
    let areaId: number | null = null;
    if (!parsed.near && geoResult.osmType && geoResult.osmId) {
      areaId = osmIdToAreaId(geoResult.osmType, geoResult.osmId);
    }

    let overpassQuery: string;
    
    if (parsed.type) {
      overpassQuery = buildOverpassQuery(parsed.type, bbox, parsed.operator, areaId);
    } else if (parsed.operator) {
      overpassQuery = buildMultiTypeQuery(bbox, parsed.operator, areaId);
    } else {
      return NextResponse.json(
        { error: 'Either asset type or operator must be specified', code: 'INSUFFICIENT_FILTERS' },
        { status: 400 }
      );
    }

    const assets = await executeQuery(overpassQuery);
    const stats = calculateStats(assets);

    const result: SearchResult = {
      results: assets,
      stats,
      bounds: bbox,
      query: parsed
    };

    cacheSearchResult(cacheKey, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Search error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limited')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again in a moment.', code: 'RATE_LIMITED' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('aborted') || error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timed out. Try a smaller search area.', code: 'TIMEOUT' },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<SearchError>> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' },
    { status: 405 }
  );
}
