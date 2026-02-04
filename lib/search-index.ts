/**
 * Search index for autocomplete suggestions.
 *
 * Pre-computes lowercase keywords and first-letter indices at module load
 * to avoid repeated string operations during user input.
 */

export interface SearchableAsset {
  readonly keyword: string;
  readonly keywordLower: string;
  readonly label: string;
  readonly labelLower: string;
}

export interface Keyword {
  readonly keyword: string;
  readonly description: string;
}

const ASSET_TYPES_RAW: readonly { keyword: string; label: string }[] = [
  { keyword: "power plants", label: "Power Plants" },
  { keyword: "substations", label: "Substations" },
  { keyword: "solar farms", label: "Solar Farms" },
  { keyword: "wind farms", label: "Wind Farms" },
  { keyword: "nuclear plants", label: "Nuclear Plants" },
  { keyword: "hydroelectric plants", label: "Hydroelectric Plants" },
  { keyword: "coal plants", label: "Coal Power Plants" },
  { keyword: "gas power plants", label: "Gas Power Plants" },
  { keyword: "oil power plants", label: "Oil Power Plants" },
  { keyword: "geothermal plants", label: "Geothermal Plants" },
  { keyword: "biogas plants", label: "Biogas Plants" },
  { keyword: "biomass plants", label: "Biomass Plants" },
  { keyword: "tidal power", label: "Tidal Power Plants" },
  { keyword: "dams", label: "Dams" },
  { keyword: "transformers", label: "Transformers" },
  { keyword: "power lines", label: "Power Lines" },
  { keyword: "power poles", label: "Power Poles" },
  { keyword: "gasometers", label: "Gasometers" },
  { keyword: "telecom towers", label: "Telecom Towers" },
  { keyword: "data centers", label: "Data Centers" },
  { keyword: "antennas", label: "Antennas" },
  { keyword: "cell towers", label: "Cell Towers" },
  { keyword: "radio towers", label: "Radio Towers" },
  { keyword: "broadcast towers", label: "Broadcast Towers" },
  { keyword: "satellite dishes", label: "Satellite Dishes" },
  { keyword: "refineries", label: "Refineries" },
  { keyword: "pipelines", label: "Pipelines" },
  { keyword: "oil wells", label: "Oil Wells" },
  { keyword: "gas wells", label: "Gas Wells" },
  { keyword: "storage tanks", label: "Storage Tanks" },
  { keyword: "silos", label: "Silos" },
  { keyword: "quarries", label: "Quarries" },
  { keyword: "mines", label: "Mines" },
  { keyword: "landfills", label: "Landfills" },
  { keyword: "water towers", label: "Water Towers" },
  { keyword: "water treatment", label: "Water Treatment" },
  { keyword: "reservoirs", label: "Reservoirs" },
  { keyword: "pumping stations", label: "Pumping Stations" },
  { keyword: "airports", label: "Airports" },
  { keyword: "helipads", label: "Helipads" },
  { keyword: "runways", label: "Runways" },
  { keyword: "taxiways", label: "Taxiways" },
  { keyword: "hangars", label: "Hangars" },
  { keyword: "airport terminals", label: "Airport Terminals" },
  { keyword: "atc towers", label: "Air Traffic Control Towers" },
  { keyword: "ports", label: "Ports" },
  { keyword: "seaports", label: "Seaports" },
  { keyword: "harbours", label: "Harbours" },
  { keyword: "ferry terminals", label: "Ferry Terminals" },
  { keyword: "marinas", label: "Marinas" },
  { keyword: "shipyards", label: "Shipyards" },
  { keyword: "docks", label: "Docks" },
  { keyword: "lighthouses", label: "Lighthouses" },
  { keyword: "train stations", label: "Train Stations" },
  { keyword: "railway halts", label: "Railway Halts" },
  { keyword: "metro stations", label: "Metro Stations" },
  { keyword: "bus stations", label: "Bus Stations" },
  { keyword: "tram stops", label: "Tram Stops" },
  { keyword: "rail yards", label: "Rail Yards" },
  { keyword: "level crossings", label: "Level Crossings" },
  { keyword: "parking", label: "Parking" },
  { keyword: "toll booths", label: "Toll Booths" },
  { keyword: "weigh stations", label: "Weigh Stations" },
  { keyword: "rest areas", label: "Highway Rest Areas" },
  { keyword: "service areas", label: "Highway Service Areas" },
  { keyword: "bridges", label: "Bridges" },
  { keyword: "tunnels", label: "Tunnels" },
  { keyword: "cooling towers", label: "Cooling Towers" },
  { keyword: "chimneys", label: "Chimneys" },
  { keyword: "cranes", label: "Cranes" },
  { keyword: "warehouses", label: "Warehouses" },
  { keyword: "factories", label: "Factories" },
  { keyword: "industrial zones", label: "Industrial Zones" },
  { keyword: "breweries", label: "Breweries" },
  { keyword: "sawmills", label: "Sawmills" },
  { keyword: "recycling plants", label: "Recycling Plants" },
  { keyword: "military bases", label: "Military Bases" },
  { keyword: "naval bases", label: "Naval Bases" },
  { keyword: "barracks", label: "Barracks" },
  { keyword: "bunkers", label: "Bunkers" },
  { keyword: "radars", label: "Radars" },
  { keyword: "surveillance cameras", label: "Surveillance Cameras" },
  { keyword: "cctv", label: "CCTV Cameras" },
  { keyword: "security cameras", label: "Security Cameras" },
  { keyword: "checkpoints", label: "Checkpoints" },
  { keyword: "embassies", label: "Embassies" },
  { keyword: "courthouses", label: "Courthouses" },
  { keyword: "town halls", label: "Town Halls" },
  { keyword: "border control", label: "Border Control" },
  { keyword: "police stations", label: "Police Stations" },
  { keyword: "fire stations", label: "Fire Stations" },
  { keyword: "prisons", label: "Prisons" },
  { keyword: "ambulance stations", label: "Ambulance Stations" },
  { keyword: "rescue stations", label: "Rescue Stations" },
  { keyword: "coast guard", label: "Coast Guard Stations" },
  { keyword: "lifeguard stations", label: "Lifeguard Stations" },
  { keyword: "fire hydrants", label: "Fire Hydrants" },
  { keyword: "emergency phones", label: "Emergency Phones" },
  { keyword: "universities", label: "Universities" },
  { keyword: "schools", label: "Schools" },
  { keyword: "colleges", label: "Colleges" },
  { keyword: "libraries", label: "Libraries" },
  { keyword: "research institutes", label: "Research Institutes" },
  { keyword: "hospitals", label: "Hospitals" },
  { keyword: "clinics", label: "Clinics" },
  { keyword: "pharmacies", label: "Pharmacies" },
  { keyword: "nursing homes", label: "Nursing Homes" },
  { keyword: "museums", label: "Museums" },
  { keyword: "theatres", label: "Theatres" },
  { keyword: "cinemas", label: "Cinemas" },
  { keyword: "stadiums", label: "Stadiums" },
  { keyword: "sports centres", label: "Sports Centres" },
  { keyword: "swimming pools", label: "Swimming Pools" },
  { keyword: "golf courses", label: "Golf Courses" },
  { keyword: "hotels", label: "Hotels" },
  { keyword: "theme parks", label: "Theme Parks" },
  { keyword: "zoos", label: "Zoos" },
  { keyword: "aquariums", label: "Aquariums" },
  { keyword: "campsites", label: "Campsites" },
  { keyword: "churches", label: "Churches" },
  { keyword: "mosques", label: "Mosques" },
  { keyword: "temples", label: "Temples" },
  { keyword: "synagogues", label: "Synagogues" },
  { keyword: "cemeteries", label: "Cemeteries" },
  { keyword: "castles", label: "Castles" },
  { keyword: "forts", label: "Forts" },
  { keyword: "monuments", label: "Monuments" },
  { keyword: "ruins", label: "Ruins" },
  { keyword: "observatories", label: "Observatories" },
  { keyword: "farms", label: "Farms" },
  { keyword: "greenhouses", label: "Greenhouses" },
  { keyword: "vineyards", label: "Vineyards" },
  { keyword: "banks", label: "Banks" },
  { keyword: "post offices", label: "Post Offices" },
  { keyword: "fuel stations", label: "Fuel Stations" },
  { keyword: "charging stations", label: "EV Charging Stations" },
] as const;

const SEARCHABLE_ASSETS: readonly SearchableAsset[] = Object.freeze(
  ASSET_TYPES_RAW.map((asset) =>
    Object.freeze({
      keyword: asset.keyword,
      keywordLower: asset.keyword.toLowerCase(),
      label: asset.label,
      labelLower: asset.label.toLowerCase(),
    })
  )
);

const ASSETS_BY_LENGTH: readonly SearchableAsset[] = Object.freeze(
  [...SEARCHABLE_ASSETS].sort((a, b) => b.keyword.length - a.keyword.length)
);

const FIRST_LETTER_INDEX: ReadonlyMap<string, readonly SearchableAsset[]> =
  (() => {
    const index = new Map<string, SearchableAsset[]>();

    for (const asset of SEARCHABLE_ASSETS) {
      const keywordChar = asset.keywordLower[0];
      const labelChar = asset.labelLower[0];

      if (!index.has(keywordChar)) {
        index.set(keywordChar, []);
      }
      index.get(keywordChar)!.push(asset);

      if (labelChar !== keywordChar) {
        if (!index.has(labelChar)) {
          index.set(labelChar, []);
        }
        index.get(labelChar)!.push(asset);
      }
    }

    return index;
  })();

/**
 * Finds the longest asset type that matches the start of the query.
 */
export function findMatchedAssetType(
  lowerQuery: string
): SearchableAsset | null {
  if (!lowerQuery || typeof lowerQuery !== "string") {
    return null;
  }

  const trimmed = lowerQuery.trim();
  if (!trimmed) {
    return null;
  }

  for (const asset of ASSETS_BY_LENGTH) {
    if (
      trimmed === asset.keywordLower ||
      trimmed.startsWith(asset.keywordLower + " ")
    ) {
      return asset;
    }
  }

  return null;
}

/**
 * Finds assets matching a prefix query using the first-letter index.
 */
export function findMatchingAssets(
  lowerQuery: string,
  limit: number = 6
): SearchableAsset[] {
  if (!lowerQuery || typeof lowerQuery !== "string") {
    return [];
  }

  const trimmed = lowerQuery.trim();
  if (!trimmed) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));
  const firstChar = trimmed[0];
  const candidates = FIRST_LETTER_INDEX.get(firstChar);

  if (!candidates) {
    return [];
  }

  const results: SearchableAsset[] = [];

  for (const asset of candidates) {
    if (
      asset.keywordLower.startsWith(trimmed) ||
      asset.labelLower.startsWith(trimmed)
    ) {
      results.push(asset);
      if (results.length >= safeLimit) {
        break;
      }
    }
  }

  return results;
}

/**
 * Returns all searchable assets.
 */
export function getAllAssets(): SearchableAsset[] {
  return SEARCHABLE_ASSETS as SearchableAsset[];
}

export const EXAMPLE_QUERIES: string[] = [
  "airports near london",
  "hospitals in paris",
  "power plants in texas",
  "train stations in tokyo",
  "ambulance stations in berlin",
  "rest areas near highway",
];

const EXAMPLE_QUERIES_LOWER: string[] = EXAMPLE_QUERIES.map((q) =>
  q.toLowerCase()
);

/**
 * Finds example queries containing the search term.
 */
export function findMatchingExamples(
  lowerQuery: string,
  limit: number = 2
): string[] {
  if (!lowerQuery || typeof lowerQuery !== "string" || lowerQuery.length < 2) {
    return [];
  }

  const trimmed = lowerQuery.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, EXAMPLE_QUERIES.length));
  const results: string[] = [];

  for (let i = 0; i < EXAMPLE_QUERIES_LOWER.length; i++) {
    if (
      EXAMPLE_QUERIES_LOWER[i].includes(trimmed) &&
      EXAMPLE_QUERIES_LOWER[i] !== trimmed
    ) {
      results.push(EXAMPLE_QUERIES[i]);
      if (results.length >= safeLimit) {
        break;
      }
    }
  }

  return results;
}

/** Structured query syntax keywords (e.g., type:, region:) */
export const STRUCTURED_KEYWORDS: Keyword[] = [
  { keyword: "type:", description: "Filter by asset type" },
  { keyword: "region:", description: "Filter by region/state" },
  { keyword: "country:", description: "Filter by country" },
  { keyword: "near:", description: "Search near a location" },
  { keyword: "radius:", description: "Set search radius in km" },
  { keyword: "operator:", description: "Filter by operator" },
];

/** Natural language location prepositions */
export const LOCATION_KEYWORDS: Keyword[] = [
  { keyword: "near", description: "Search near a place" },
  { keyword: "in", description: "Search within a region" },
  { keyword: "within", description: "Set radius constraint" },
];
