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
  { pattern: /\bmilitary\s*(?:base|installation|facility)?\b/i, type: 'military' },
  { pattern: /\bprisons?\b/i, type: 'prison' },
  { pattern: /\bhospitals?\b/i, type: 'hospital' },
  { pattern: /\bembass(?:y|ies)\b/i, type: 'embassy' },
  { pattern: /\bfactor(?:y|ies)\b/i, type: 'factory' },
  { pattern: /\bindustrial\s*(?:zone|area|park)s?\b/i, type: 'industrial' }
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
