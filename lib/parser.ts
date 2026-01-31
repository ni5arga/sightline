import { ParsedQuery, ASSET_TYPE_MAP, OPERATOR_ALIASES } from './types';

const STRUCTURED_PATTERN = /^(?:type:|operator:|region:|country:|near:|radius:)/i;

const TYPE_PATTERNS = [
  { pattern: /\b(?:telecom|communication)\s*(?:tower|mast)s?\b/i, type: 'telecom' },
  { pattern: /\btowers?\b/i, type: 'telecom' },
  { pattern: /\bdata\s*cent(?:er|re)s?\b/i, type: 'data_center' },
  { pattern: /\bpower\s*(?:plant|station)s?\b/i, type: 'power_plant' },
  { pattern: /\bsubstations?\b/i, type: 'substation' },
  { pattern: /\bports?\b/i, type: 'port' },
  { pattern: /\bharbou?rs?\b/i, type: 'harbour' },
  { pattern: /\bwarehouses?\b/i, type: 'warehouse' },
  { pattern: /\bairports?\b/i, type: 'airport' },
  { pattern: /\bhelipads?\b/i, type: 'helipad' },
  { pattern: /\brail(?:way)?\s*yards?\b/i, type: 'railyard' },
  { pattern: /\brefiner(?:y|ies)\b/i, type: 'refinery' },
  { pattern: /\bpipelines?\b/i, type: 'pipeline' },
  { pattern: /\bsolar\s*(?:farm|plant|panel)s?\b/i, type: 'solar' },
  { pattern: /\bwind\s*(?:farm|turbine)s?\b/i, type: 'wind' },
  { pattern: /\bnuclear\s*(?:plant|reactor)s?\b/i, type: 'nuclear' },
  { pattern: /\bdams?\b/i, type: 'dam' },
  // Energy & Power - Additional types
  { pattern: /\bgeothermal\s*(?:plant|power|energy)?\b/i, type: 'geothermal' },
  { pattern: /\bbiogas\s*(?:plant|facility)?\b/i, type: 'biogas' },
  { pattern: /\bbiomass\s*(?:plant|power|facility)?\b/i, type: 'biomass' },
  { pattern: /\btidal\s*(?:power|plant|energy)?\b/i, type: 'tidal' },
  { pattern: /\bgas\s*(?:power\s*)?(?:plant|station)s?\b/i, type: 'gas_power' },
  { pattern: /\boil\s*(?:power\s*)?(?:plant|station)s?\b/i, type: 'oil_power' },
  { pattern: /\bcoal\s*(?:power\s*)?(?:plant|station)s?\b/i, type: 'coal' },
  { pattern: /\bhydro(?:electric)?\s*(?:plant|power|dam)?\b/i, type: 'hydroelectric' },
  { pattern: /\bpower\s*lines?\b/i, type: 'power_line' },
  { pattern: /\b(?:electricity|electric|power)\s*poles?\b/i, type: 'power_pole' },
  { pattern: /\btransformers?\b/i, type: 'transformer' },
  { pattern: /\bmilitary\s*(?:base|installation|facility)?\b/i, type: 'military' },
  { pattern: /\bprisons?\b/i, type: 'prison' },
  { pattern: /\bhospitals?\b/i, type: 'hospital' },
  { pattern: /\bembass(?:y|ies)\b/i, type: 'embassy' },
  { pattern: /\bfactor(?:y|ies)\b/i, type: 'factory' },
  { pattern: /\bindustrial\s*(?:zone|area|park)s?\b/i, type: 'industrial' },
  { pattern: /\bschools?\b/i, type: 'school' },
  { pattern: /\buniversit(?:y|ies)\b/i, type: 'university' },
  { pattern: /\bcolleges?\b/i, type: 'college' },
  { pattern: /\bstadiums?\b/i, type: 'stadium' },
  { pattern: /\bfire\s*stations?\b/i, type: 'fire_station' },
  { pattern: /\bpolice\s*(?:station)?s?\b/i, type: 'police' },
  { pattern: /\bcourthouse?s?\b/i, type: 'courthouse' },
  { pattern: /\bbanks?\b/i, type: 'bank' },
  { pattern: /\batms?\b/i, type: 'atm' },
  { pattern: /\b(?:fuel|gas|petrol)\s*stations?\b/i, type: 'fuel' },
  { pattern: /\b(?:ev\s*)?charging\s*stations?\b/i, type: 'charging_station' },
  { pattern: /\bwater\s*towers?\b/i, type: 'water_tower' },
  { pattern: /\bwater\s*(?:treatment|works)\b/i, type: 'water_treatment' },
  { pattern: /\b(?:wastewater|sewage)\s*(?:plant|treatment)?\b/i, type: 'wastewater' },
  { pattern: /\blandfills?\b/i, type: 'landfill' },
  { pattern: /\b(?:quarr(?:y|ies)|mines?)\b/i, type: 'quarry' },
  { pattern: /\boil\s*wells?\b/i, type: 'oil_well' },
  { pattern: /\bgas\s*wells?\b/i, type: 'gas_well' },
  { pattern: /\bstorage\s*tanks?\b/i, type: 'storage_tank' },
  { pattern: /\bsilos?\b/i, type: 'silo' },
  { pattern: /\bchimne(?:y|ys)\b/i, type: 'chimney' },
  { pattern: /\bcooling\s*towers?\b/i, type: 'cooling_tower' },
  { pattern: /\blighthouses?\b/i, type: 'lighthouse' },
  { pattern: /\bradars?\b/i, type: 'radar' },
  { pattern: /\bantennas?\b/i, type: 'antenna' },
  { pattern: /\bmasts?\b/i, type: 'mast' },
  { pattern: /\bbridges?\b/i, type: 'bridge' },
  { pattern: /\btunnels?\b/i, type: 'tunnel' },
  { pattern: /\bferr(?:y|ies)\s*terminals?\b/i, type: 'ferry_terminal' },
  { pattern: /\bbus\s*stations?\b/i, type: 'bus_station' },
  { pattern: /\b(?:train|railway)\s*stations?\b/i, type: 'train_station' },
  { pattern: /\bmetro\s*(?:station)?s?\b/i, type: 'metro' },
  { pattern: /\bsubway\s*(?:station)?s?\b/i, type: 'metro' },
  { pattern: /\bparking\b/i, type: 'parking' },
  { pattern: /\bcemetar(?:y|ies)\b/i, type: 'cemetery' },
  { pattern: /\bmosques?\b/i, type: 'mosque' },
  { pattern: /\bchurche?s?\b/i, type: 'church' },
  { pattern: /\btemples?\b/i, type: 'temple' },
  { pattern: /\bsynagogues?\b/i, type: 'synagogue' },
  { pattern: /\blibrari?(?:y|es)\b/i, type: 'library' },
  { pattern: /\bmuseums?\b/i, type: 'museum' },
  { pattern: /\btheat(?:er|re)s?\b/i, type: 'theatre' },
  { pattern: /\bcinemas?\b/i, type: 'cinema' },
  { pattern: /\bhotels?\b/i, type: 'hotel' },
  { pattern: /\bpharmaci?(?:y|es)\b/i, type: 'pharmacy' },
  { pattern: /\bclinics?\b/i, type: 'clinic' },
  { pattern: /\bdentists?\b/i, type: 'dentist' },
  { pattern: /\bvets?\b/i, type: 'veterinary' },
  { pattern: /\bveterinar(?:y|ies)\b/i, type: 'veterinary' },
  { pattern: /\bpost\s*offic(?:e|es)\b/i, type: 'post_office' },
  { pattern: /\brecycling\s*(?:cent(?:er|re))?s?\b/i, type: 'recycling' },
  { pattern: /\bobservator(?:y|ies)\b/i, type: 'observatory' },
  { pattern: /\bcranes?\b/i, type: 'crane' },
  { pattern: /\bwindmills?\b/i, type: 'windmill' },
  { pattern: /\bwatermills?\b/i, type: 'watermill' },
  { pattern: /\bgasometers?\b/i, type: 'gasometer' },
  { pattern: /\bbunkers?\b/i, type: 'bunker' },
  { pattern: /\bbarracks\b/i, type: 'barracks' },
  { pattern: /\bairfields?\b/i, type: 'airfield' },
  { pattern: /\bnaval\s*bases?\b/i, type: 'naval_base' },
  { pattern: /\b(?:firing|shooting)\s*ranges?\b/i, type: 'range' },
  { pattern: /\bcheckpoints?\b/i, type: 'checkpoint' },
  { pattern: /\bborder\s*(?:control|crossing)s?\b/i, type: 'border_control' },
  // Emergency Services
  { pattern: /\bambulance\s*(?:station|depot|base)s?\b/i, type: 'ambulance_station' },
  { pattern: /\brescue\s*(?:station|team|base)s?\b/i, type: 'rescue_station' },
  { pattern: /\blifeguard\s*(?:station|tower|post)s?\b/i, type: 'lifeguard' },
  { pattern: /\bfire\s*hydrants?\b/i, type: 'fire_hydrant' },
  { pattern: /\b(?:emergency|sos)\s*(?:phone|call\s*box)s?\b/i, type: 'emergency_phone' },
  { pattern: /\bcoast\s*guards?\s*(?:station|base)?\b/i, type: 'coast_guard' },
  // Transportation - Aviation
  { pattern: /\btaxiways?\b/i, type: 'taxiway' },
  { pattern: /\brunways?\b/i, type: 'runway' },
  { pattern: /\b(?:airport|airline)?\s*terminals?\b/i, type: 'terminal' },
  { pattern: /\bhangars?\b/i, type: 'hangar' },
  { pattern: /\b(?:atc|air\s*traffic\s*control)\s*(?:tower)?s?\b/i, type: 'atc_tower' },
  // Transportation - Maritime
  { pattern: /\bdocks?\b/i, type: 'dock' },
  { pattern: /\bmarinas?\b/i, type: 'marina' },
  { pattern: /\bshipyards?\b/i, type: 'shipyard' },
  { pattern: /\bseaports?\b/i, type: 'seaport' },
  // Transportation - Rail & Road
  { pattern: /\btram\s*(?:stop|station)s?\b/i, type: 'tram_stop' },
  { pattern: /\b(?:railway|train)\s*halts?\b/i, type: 'halt' },
  { pattern: /\blevel\s*crossings?\b/i, type: 'level_crossing' },
  { pattern: /\b(?:railroad|railway)\s*crossings?\b/i, type: 'level_crossing' },
  { pattern: /\btoll\s*(?:booth|plaza|station)s?\b/i, type: 'toll_booth' },
  { pattern: /\bweigh\s*(?:station|bridge)s?\b/i, type: 'weigh_station' },
  { pattern: /\brest\s*(?:area|stop)s?\b/i, type: 'rest_area' },
  { pattern: /\bservice\s*(?:area|station|plaza)s?\b/i, type: 'service_area' }
];

const NEAR_PATTERN = /\bnear\s+(.+?)(?:\s+(?:in|within|radius)|$)/i;
const IN_PATTERN = /\bin\s+(.+?)(?:\s+(?:near|within)|$)/i;
const RADIUS_PATTERN = /(?:within|radius)\s*[:=]?\s*(\d+)\s*(?:km|kilometers?|kilometres?)?/i;

function isStructuredQuery(query: string): boolean {
  return STRUCTURED_PATTERN.test(query);
}

function parseStructured(query: string): ParsedQuery {
  const result: ParsedQuery = {
    type: null,
    operator: null,
    region: null,
    country: null,
    near: null,
    radius: 50,
    raw: query
  };

  const typeMatch = query.match(/type:([^\s]+)/i);
  if (typeMatch) {
    const typeKey = typeMatch[1].toLowerCase();
    if (ASSET_TYPE_MAP[typeKey]) {
      result.type = typeKey;
    }
  }

  const operatorMatch = query.match(/operator:([^\s]+)/i);
  if (operatorMatch) {
    result.operator = operatorMatch[1].toLowerCase().replace(/_/g, ' ');
  }

  const regionMatch = query.match(/region:([^\s]+)/i);
  if (regionMatch) {
    result.region = regionMatch[1].replace(/_/g, ' ');
  }

  const countryMatch = query.match(/country:([^\s]+)/i);
  if (countryMatch) {
    result.country = countryMatch[1].replace(/_/g, ' ');
  }

  const nearMatch = query.match(/near:([^\s]+)/i);
  if (nearMatch) {
    result.near = nearMatch[1].replace(/_/g, ' ');
  }

  const radiusMatch = query.match(/radius:(\d+)/i);
  if (radiusMatch) {
    result.radius = Math.min(parseInt(radiusMatch[1], 10), 500);
  }

  return result;
}

function extractOperator(query: string): string | null {
  const normalized = query.toLowerCase();
  
  for (const [canonical, aliases] of Object.entries(OPERATOR_ALIASES)) {
    if (normalized.includes(canonical)) {
      return canonical;
    }
    for (const alias of aliases) {
      if (normalized.includes(alias)) {
        return canonical;
      }
    }
  }
  
  return null;
}

function extractType(query: string): string | null {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(query)) {
      return type;
    }
  }
  return null;
}

function extractLocation(query: string): { region: string | null; near: string | null } {
  let cleanedQuery = query;
  
  for (const { pattern } of TYPE_PATTERNS) {
    cleanedQuery = cleanedQuery.replace(pattern, '');
  }
  
  for (const [canonical, aliases] of Object.entries(OPERATOR_ALIASES)) {
    cleanedQuery = cleanedQuery.replace(new RegExp(canonical, 'gi'), '');
    for (const alias of aliases) {
      cleanedQuery = cleanedQuery.replace(new RegExp(alias, 'gi'), '');
    }
  }
  
  const nearMatch = query.match(NEAR_PATTERN);
  if (nearMatch) {
    return { region: null, near: nearMatch[1].trim() };
  }
  
  const inMatch = cleanedQuery.match(IN_PATTERN);
  if (inMatch) {
    return { region: inMatch[1].trim(), near: null };
  }
  
  cleanedQuery = cleanedQuery
    .replace(/\b(the|a|an|all|show|find|search|get|list)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanedQuery.length > 2 && cleanedQuery.length < 100) {
    return { region: cleanedQuery, near: null };
  }
  
  return { region: null, near: null };
}

function parseNatural(query: string): ParsedQuery {
  const result: ParsedQuery = {
    type: null,
    operator: null,
    region: null,
    country: null,
    near: null,
    radius: 50,
    raw: query
  };

  result.type = extractType(query);
  result.operator = extractOperator(query);
  
  const location = extractLocation(query);
  result.region = location.region;
  result.near = location.near;
  
  const radiusMatch = query.match(RADIUS_PATTERN);
  if (radiusMatch) {
    result.radius = Math.min(parseInt(radiusMatch[1], 10), 500);
  }

  return result;
}

export function parseQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  
  if (!trimmed) {
    return {
      type: null,
      operator: null,
      region: null,
      country: null,
      near: null,
      radius: 50,
      raw: ''
    };
  }

  if (isStructuredQuery(trimmed)) {
    return parseStructured(trimmed);
  }

  return parseNatural(trimmed);
}

export function validateQuery(parsed: ParsedQuery): { valid: boolean; error?: string } {
  if (!parsed.type && !parsed.operator) {
    return {
      valid: false,
      error: 'Query must specify an asset type or operator. Examples: "telecom towers in karnataka" or "type:data_center operator:google"'
    };
  }

  if (!parsed.region && !parsed.near && !parsed.country) {
    return {
      valid: false,
      error: 'Query must specify a geographic scope. Examples: "in mumbai", "near delhi", or "region:karnataka"'
    };
  }

  return { valid: true };
}
