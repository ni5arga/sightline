export interface ParsedQuery {
  type: string | null;
  operator: string | null;
  region: string | null;
  country: string | null;
  near: string | null;
  radius: number;
  raw: string;
}

export interface GeoResult {
  displayName: string;
  lat: number;
  lon: number;
  boundingBox: [number, number, number, number];
  type: string;
  importance: number;
  addressComponents: {
    country?: string;
    state?: string;
    city?: string;
  };
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  operator: string | null;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

export interface SearchResult {
  results: Asset[];
  stats: {
    total: number;
    operators: Record<string, number>;
    types: Record<string, number>;
  };
  bounds: [number, number, number, number] | null;
  query: ParsedQuery;
}

export interface SearchError {
  error: string;
  code: string;
}

export const ASSET_TYPE_MAP: Record<string, { osmTags: Record<string, string | string[]>; label: string }> = {
  telecom: {
    osmTags: { 'man_made': 'tower', 'tower:type': ['communication', 'telecommunications'] },
    label: 'Telecom Tower'
  },
  tower: {
    osmTags: { 'man_made': 'tower', 'tower:type': ['communication', 'telecommunications'] },
    label: 'Telecom Tower'
  },
  data_center: {
    osmTags: { 'building': 'data_centre' },
    label: 'Data Center'
  },
  datacenter: {
    osmTags: { 'building': 'data_centre' },
    label: 'Data Center'
  },
  power_plant: {
    osmTags: { 'power': 'plant' },
    label: 'Power Plant'
  },
  powerplant: {
    osmTags: { 'power': 'plant' },
    label: 'Power Plant'
  },
  substation: {
    osmTags: { 'power': 'substation' },
    label: 'Substation'
  },
  port: {
    osmTags: { 'landuse': 'port' },
    label: 'Port'
  },
  harbour: {
    osmTags: { 'harbour': 'yes' },
    label: 'Harbour'
  },
  warehouse: {
    osmTags: { 'building': 'warehouse' },
    label: 'Warehouse'
  },
  airport: {
    osmTags: { 'aeroway': 'aerodrome' },
    label: 'Airport'
  },
  helipad: {
    osmTags: { 'aeroway': 'helipad' },
    label: 'Helipad'
  },
  railyard: {
    osmTags: { 'landuse': 'railway' },
    label: 'Rail Yard'
  },
  rail_yard: {
    osmTags: { 'landuse': 'railway' },
    label: 'Rail Yard'
  },
  refinery: {
    osmTags: { 'man_made': 'petroleum_well' },
    label: 'Refinery'
  },
  pipeline: {
    osmTags: { 'man_made': 'pipeline' },
    label: 'Pipeline'
  },
  solar: {
    osmTags: { 'power': 'generator', 'generator:source': 'solar' },
    label: 'Solar Farm'
  },
  wind: {
    osmTags: { 'power': 'generator', 'generator:source': 'wind' },
    label: 'Wind Farm'
  },
  nuclear: {
    osmTags: { 'power': 'generator', 'generator:source': 'nuclear' },
    label: 'Nuclear Plant'
  },
  dam: {
    osmTags: { 'waterway': 'dam' },
    label: 'Dam'
  },
  military: {
    osmTags: { 'landuse': 'military' },
    label: 'Military Installation'
  },
  prison: {
    osmTags: { 'amenity': 'prison' },
    label: 'Prison'
  },
  hospital: {
    osmTags: { 'amenity': 'hospital' },
    label: 'Hospital'
  },
  embassy: {
    osmTags: { 'amenity': 'embassy' },
    label: 'Embassy'
  },
  factory: {
    osmTags: { 'building': 'industrial' },
    label: 'Factory'
  },
  industrial: {
    osmTags: { 'landuse': 'industrial' },
    label: 'Industrial Zone'
  },
  school: {
    osmTags: { 'amenity': 'school' },
    label: 'School'
  },
  university: {
    osmTags: { 'amenity': 'university' },
    label: 'University'
  },
  college: {
    osmTags: { 'amenity': 'college' },
    label: 'College'
  },
  stadium: {
    osmTags: { 'leisure': 'stadium' },
    label: 'Stadium'
  },
  fire_station: {
    osmTags: { 'amenity': 'fire_station' },
    label: 'Fire Station'
  },
  police: {
    osmTags: { 'amenity': 'police' },
    label: 'Police Station'
  },
  courthouse: {
    osmTags: { 'amenity': 'courthouse' },
    label: 'Courthouse'
  },
  bank: {
    osmTags: { 'amenity': 'bank' },
    label: 'Bank'
  },
  atm: {
    osmTags: { 'amenity': 'atm' },
    label: 'ATM'
  },
  fuel: {
    osmTags: { 'amenity': 'fuel' },
    label: 'Fuel Station'
  },
  gas_station: {
    osmTags: { 'amenity': 'fuel' },
    label: 'Gas Station'
  },
  petrol: {
    osmTags: { 'amenity': 'fuel' },
    label: 'Petrol Station'
  },
  charging_station: {
    osmTags: { 'amenity': 'charging_station' },
    label: 'EV Charging Station'
  },
  water_tower: {
    osmTags: { 'man_made': 'water_tower' },
    label: 'Water Tower'
  },
  water_treatment: {
    osmTags: { 'man_made': 'water_works' },
    label: 'Water Treatment Plant'
  },
  wastewater: {
    osmTags: { 'man_made': 'wastewater_plant' },
    label: 'Wastewater Plant'
  },
  sewage: {
    osmTags: { 'man_made': 'wastewater_plant' },
    label: 'Sewage Plant'
  },
  landfill: {
    osmTags: { 'landuse': 'landfill' },
    label: 'Landfill'
  },
  quarry: {
    osmTags: { 'landuse': 'quarry' },
    label: 'Quarry'
  },
  mine: {
    osmTags: { 'landuse': 'quarry' },
    label: 'Mine'
  },
  oil_well: {
    osmTags: { 'man_made': 'petroleum_well' },
    label: 'Oil Well'
  },
  gas_well: {
    osmTags: { 'man_made': 'petroleum_well' },
    label: 'Gas Well'
  },
  storage_tank: {
    osmTags: { 'man_made': 'storage_tank' },
    label: 'Storage Tank'
  },
  silo: {
    osmTags: { 'man_made': 'silo' },
    label: 'Silo'
  },
  chimney: {
    osmTags: { 'man_made': 'chimney' },
    label: 'Chimney'
  },
  cooling_tower: {
    osmTags: { 'man_made': 'cooling_tower' },
    label: 'Cooling Tower'
  },
  lighthouse: {
    osmTags: { 'man_made': 'lighthouse' },
    label: 'Lighthouse'
  },
  radar: {
    osmTags: { 'man_made': 'surveillance' },
    label: 'Radar'
  },
  antenna: {
    osmTags: { 'man_made': 'antenna' },
    label: 'Antenna'
  },
  mast: {
    osmTags: { 'man_made': 'mast' },
    label: 'Mast'
  },
  bridge: {
    osmTags: { 'man_made': 'bridge' },
    label: 'Bridge'
  },
  tunnel: {
    osmTags: { 'tunnel': 'yes' },
    label: 'Tunnel'
  },
  ferry_terminal: {
    osmTags: { 'amenity': 'ferry_terminal' },
    label: 'Ferry Terminal'
  },
  bus_station: {
    osmTags: { 'amenity': 'bus_station' },
    label: 'Bus Station'
  },
  train_station: {
    osmTags: { 'railway': 'station' },
    label: 'Train Station'
  },
  metro: {
    osmTags: { 'railway': 'subway_entrance' },
    label: 'Metro Station'
  },
  parking: {
    osmTags: { 'amenity': 'parking' },
    label: 'Parking'
  },
  cemetery: {
    osmTags: { 'landuse': 'cemetery' },
    label: 'Cemetery'
  },
  place_of_worship: {
    osmTags: { 'amenity': 'place_of_worship' },
    label: 'Place of Worship'
  },
  mosque: {
    osmTags: { 'amenity': 'place_of_worship', 'religion': 'muslim' },
    label: 'Mosque'
  },
  church: {
    osmTags: { 'amenity': 'place_of_worship', 'religion': 'christian' },
    label: 'Church'
  },
  temple: {
    osmTags: { 'amenity': 'place_of_worship', 'religion': 'hindu' },
    label: 'Temple'
  },
  synagogue: {
    osmTags: { 'amenity': 'place_of_worship', 'religion': 'jewish' },
    label: 'Synagogue'
  },
  library: {
    osmTags: { 'amenity': 'library' },
    label: 'Library'
  },
  museum: {
    osmTags: { 'tourism': 'museum' },
    label: 'Museum'
  },
  theatre: {
    osmTags: { 'amenity': 'theatre' },
    label: 'Theatre'
  },
  cinema: {
    osmTags: { 'amenity': 'cinema' },
    label: 'Cinema'
  },
  hotel: {
    osmTags: { 'tourism': 'hotel' },
    label: 'Hotel'
  },
  pharmacy: {
    osmTags: { 'amenity': 'pharmacy' },
    label: 'Pharmacy'
  },
  clinic: {
    osmTags: { 'amenity': 'clinic' },
    label: 'Clinic'
  },
  dentist: {
    osmTags: { 'amenity': 'dentist' },
    label: 'Dentist'
  },
  veterinary: {
    osmTags: { 'amenity': 'veterinary' },
    label: 'Veterinary'
  },
  post_office: {
    osmTags: { 'amenity': 'post_office' },
    label: 'Post Office'
  },
  recycling: {
    osmTags: { 'amenity': 'recycling' },
    label: 'Recycling Center'
  },
  observatory: {
    osmTags: { 'man_made': 'observatory' },
    label: 'Observatory'
  },
  crane: {
    osmTags: { 'man_made': 'crane' },
    label: 'Crane'
  },
  windmill: {
    osmTags: { 'man_made': 'windmill' },
    label: 'Windmill'
  },
  watermill: {
    osmTags: { 'man_made': 'watermill' },
    label: 'Watermill'
  },
  works: {
    osmTags: { 'man_made': 'works' },
    label: 'Works'
  },
  gasometer: {
    osmTags: { 'man_made': 'gasometer' },
    label: 'Gasometer'
  },
  bunker: {
    osmTags: { 'military': 'bunker' },
    label: 'Bunker'
  },
  barracks: {
    osmTags: { 'military': 'barracks' },
    label: 'Barracks'
  },
  airfield: {
    osmTags: { 'military': 'airfield' },
    label: 'Military Airfield'
  },
  naval_base: {
    osmTags: { 'military': 'naval_base' },
    label: 'Naval Base'
  },
  nuclear_site: {
    osmTags: { 'military': 'nuclear_explosion_site' },
    label: 'Nuclear Site'
  },
  range: {
    osmTags: { 'military': 'range' },
    label: 'Military Range'
  },
  checkpoint: {
    osmTags: { 'military': 'checkpoint' },
    label: 'Checkpoint'
  },
  border_control: {
    osmTags: { 'barrier': 'border_control' },
    label: 'Border Control'
  }
};

export const OPERATOR_ALIASES: Record<string, string[]> = {
  'airtel': ['bharti airtel', 'airtel india', 'airtel telecom'],
  'jio': ['reliance jio', 'jio infocomm'],
  'vodafone': ['vodafone idea', 'vi', 'vodafone india'],
  'bsnl': ['bharat sanchar nigam'],
  'google': ['google llc', 'google inc'],
  'amazon': ['amazon web services', 'aws'],
  'microsoft': ['microsoft azure', 'azure'],
  'meta': ['facebook', 'meta platforms'],
  'apple': ['apple inc'],
  'at&t': ['att', 'at and t'],
  'verizon': ['verizon wireless'],
  't-mobile': ['tmobile', 't mobile'],
  'vodacom': ['vodacom group'],
  'mtn': ['mtn group'],
  'orange': ['orange telecom'],
  'telefonica': ['movistar'],
  'china mobile': ['cmcc'],
  'china unicom': [],
  'china telecom': [],
  'ntpc': ['national thermal power corporation'],
  'adani': ['adani power', 'adani green'],
  'tata': ['tata power', 'tata steel'],
  'reliance': ['reliance industries', 'ril']
};
