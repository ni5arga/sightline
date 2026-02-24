import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Sightline/1.0 (+https://github.com/ni5arga/sightline)';

// Rate limiter: 1 request per second
let lastRequest = 0;
const MIN_INTERVAL = 1000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < MIN_INTERVAL) {
    const waitTime = MIN_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequest = Date.now();
}

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    await waitForRateLimit();
    
    const searchParams = request.nextUrl.searchParams;
    const endpoint = searchParams.get('endpoint') || 'search';
    
    searchParams.delete('endpoint');
    
    const nominatimUrl = `${NOMINATIM_BASE}/${endpoint}?${searchParams.toString()}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Nominatim request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Nominatim proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
