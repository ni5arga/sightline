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
    osmTags: { 'man_made': 'radar' },
    label: 'Radar'
  },
  surveillance_camera: {
    osmTags: { 'man_made': 'surveillance', 'surveillance:type': 'camera' },
    label: 'Surveillance Camera'
  },
  cctv: {
    osmTags: { 'man_made': 'surveillance', 'surveillance:type': 'camera' },
    label: 'Surveillance Camera'
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
  },
  // Additional infrastructure types
  hydroelectric: {
    osmTags: { 'power': 'generator', 'generator:source': 'hydro' },
    label: 'Hydroelectric Plant'
  },
  geothermal: {
    osmTags: { 'power': 'generator', 'generator:source': 'geothermal' },
    label: 'Geothermal Plant'
  },
  biogas: {
    osmTags: { 'power': 'generator', 'generator:source': 'biogas' },
    label: 'Biogas Plant'
  },
  biomass: {
    osmTags: { 'power': 'generator', 'generator:source': 'biomass' },
    label: 'Biomass Plant'
  },
  tidal: {
    osmTags: { 'power': 'generator', 'generator:source': 'tidal' },
    label: 'Tidal Power Plant'
  },
  coal: {
    osmTags: { 'power': 'generator', 'generator:source': 'coal' },
    label: 'Coal Power Plant'
  },
  gas_power: {
    osmTags: { 'power': 'generator', 'generator:source': 'gas' },
    label: 'Gas Power Plant'
  },
  oil_power: {
    osmTags: { 'power': 'generator', 'generator:source': 'oil' },
    label: 'Oil Power Plant'
  },
  transformer: {
    osmTags: { 'power': 'transformer' },
    label: 'Transformer'
  },
  power_line: {
    osmTags: { 'power': 'line' },
    label: 'Power Line'
  },
  power_pole: {
    osmTags: { 'power': 'pole' },
    label: 'Power Pole'
  },
  // Transportation additions
  runway: {
    osmTags: { 'aeroway': 'runway' },
    label: 'Runway'
  },
  taxiway: {
    osmTags: { 'aeroway': 'taxiway' },
    label: 'Taxiway'
  },
  terminal: {
    osmTags: { 'aeroway': 'terminal' },
    label: 'Airport Terminal'
  },
  hangar: {
    osmTags: { 'aeroway': 'hangar' },
    label: 'Hangar'
  },
  seaport: {
    osmTags: { 'industrial': 'port' },
    label: 'Seaport'
  },
  marina: {
    osmTags: { 'leisure': 'marina' },
    label: 'Marina'
  },
  shipyard: {
    osmTags: { 'industrial': 'shipyard' },
    label: 'Shipyard'
  },
  dock: {
    osmTags: { 'waterway': 'dock' },
    label: 'Dock'
  },
  tram_stop: {
    osmTags: { 'railway': 'tram_stop' },
    label: 'Tram Stop'
  },
  halt: {
    osmTags: { 'railway': 'halt' },
    label: 'Railway Halt'
  },
  level_crossing: {
    osmTags: { 'railway': 'level_crossing' },
    label: 'Level Crossing'
  },
  toll_booth: {
    osmTags: { 'barrier': 'toll_booth' },
    label: 'Toll Booth'
  },
  weigh_station: {
    osmTags: { 'amenity': 'weighbridge' },
    label: 'Weigh Station'
  },
  // Communication
  cell_tower: {
    osmTags: { 'communication:mobile_phone': 'yes' },
    label: 'Cell Tower'
  },
  radio_tower: {
    osmTags: { 'man_made': 'tower', 'tower:type': 'communication' },
    label: 'Radio Tower'
  },
  broadcast_tower: {
    osmTags: { 'man_made': 'tower', 'tower:type': 'broadcast' },
    label: 'Broadcast Tower'
  },
  satellite_dish: {
    osmTags: { 'man_made': 'satellite_dish' },
    label: 'Satellite Dish'
  },
  telephone_exchange: {
    osmTags: { 'telecom': 'exchange' },
    label: 'Telephone Exchange'
  },
  // Emergency Services
  ambulance_station: {
    osmTags: { 'emergency': 'ambulance_station' },
    label: 'Ambulance Station'
  },
  emergency_phone: {
    osmTags: { 'emergency': 'phone' },
    label: 'Emergency Phone'
  },
  fire_hydrant: {
    osmTags: { 'emergency': 'fire_hydrant' },
    label: 'Fire Hydrant'
  },
  lifeguard: {
    osmTags: { 'emergency': 'lifeguard' },
    label: 'Lifeguard Station'
  },
  rescue_station: {
    osmTags: { 'emergency': 'rescue_station' },
    label: 'Rescue Station'
  },
  coast_guard: {
    osmTags: { 'emergency': 'coast_guard' },
    label: 'Coast Guard'
  },
  // Government & Administrative
  townhall: {
    osmTags: { 'amenity': 'townhall' },
    label: 'Town Hall'
  },
  government: {
    osmTags: { 'office': 'government' },
    label: 'Government Office'
  },
  customs: {
    osmTags: { 'office': 'customs' },
    label: 'Customs Office'
  },
  tax_office: {
    osmTags: { 'office': 'tax' },
    label: 'Tax Office'
  },
  // Education additions
  kindergarten: {
    osmTags: { 'amenity': 'kindergarten' },
    label: 'Kindergarten'
  },
  driving_school: {
    osmTags: { 'amenity': 'driving_school' },
    label: 'Driving School'
  },
  research: {
    osmTags: { 'amenity': 'research_institute' },
    label: 'Research Institute'
  },
  // Industrial additions
  brewery: {
    osmTags: { 'craft': 'brewery' },
    label: 'Brewery'
  },
  distillery: {
    osmTags: { 'craft': 'distillery' },
    label: 'Distillery'
  },
  sawmill: {
    osmTags: { 'craft': 'sawmill' },
    label: 'Sawmill'
  },
  slaughterhouse: {
    osmTags: { 'industrial': 'slaughterhouse' },
    label: 'Slaughterhouse'
  },
  scrap_yard: {
    osmTags: { 'industrial': 'scrap_yard' },
    label: 'Scrap Yard'
  },
  depot: {
    osmTags: { 'industrial': 'depot' },
    label: 'Depot'
  },
  recycling_plant: {
    osmTags: { 'industrial': 'recycling' },
    label: 'Recycling Plant'
  },
  // Leisure & Sports
  sports_centre: {
    osmTags: { 'leisure': 'sports_centre' },
    label: 'Sports Centre'
  },
  swimming_pool: {
    osmTags: { 'leisure': 'swimming_pool' },
    label: 'Swimming Pool'
  },
  golf_course: {
    osmTags: { 'leisure': 'golf_course' },
    label: 'Golf Course'
  },
  racetrack: {
    osmTags: { 'leisure': 'track' },
    label: 'Racetrack'
  },
  ice_rink: {
    osmTags: { 'leisure': 'ice_rink' },
    label: 'Ice Rink'
  },
  // Tourism
  campsite: {
    osmTags: { 'tourism': 'camp_site' },
    label: 'Campsite'
  },
  caravan_site: {
    osmTags: { 'tourism': 'caravan_site' },
    label: 'Caravan Site'
  },
  theme_park: {
    osmTags: { 'tourism': 'theme_park' },
    label: 'Theme Park'
  },
  zoo: {
    osmTags: { 'tourism': 'zoo' },
    label: 'Zoo'
  },
  aquarium: {
    osmTags: { 'tourism': 'aquarium' },
    label: 'Aquarium'
  },
  viewpoint: {
    osmTags: { 'tourism': 'viewpoint' },
    label: 'Viewpoint'
  },
  attraction: {
    osmTags: { 'tourism': 'attraction' },
    label: 'Tourist Attraction'
  },
  // Healthcare additions
  nursing_home: {
    osmTags: { 'amenity': 'nursing_home' },
    label: 'Nursing Home'
  },
  hospice: {
    osmTags: { 'amenity': 'hospice' },
    label: 'Hospice'
  },
  blood_bank: {
    osmTags: { 'healthcare': 'blood_bank' },
    label: 'Blood Bank'
  },
  // Agriculture
  farm: {
    osmTags: { 'landuse': 'farmland' },
    label: 'Farm'
  },
  greenhouse: {
    osmTags: { 'building': 'greenhouse' },
    label: 'Greenhouse'
  },
  orchard: {
    osmTags: { 'landuse': 'orchard' },
    label: 'Orchard'
  },
  vineyard: {
    osmTags: { 'landuse': 'vineyard' },
    label: 'Vineyard'
  },
  // Other notable structures
  monument: {
    osmTags: { 'historic': 'monument' },
    label: 'Monument'
  },
  memorial: {
    osmTags: { 'historic': 'memorial' },
    label: 'Memorial'
  },
  castle: {
    osmTags: { 'historic': 'castle' },
    label: 'Castle'
  },
  fort: {
    osmTags: { 'historic': 'fort' },
    label: 'Fort'
  },
  ruins: {
    osmTags: { 'historic': 'ruins' },
    label: 'Ruins'
  },
  archaeological_site: {
    osmTags: { 'historic': 'archaeological_site' },
    label: 'Archaeological Site'
  },
  clock_tower: {
    osmTags: { 'man_made': 'tower', 'tower:type': 'clock' },
    label: 'Clock Tower'
  },
  bell_tower: {
    osmTags: { 'man_made': 'tower', 'tower:type': 'bell_tower' },
    label: 'Bell Tower'
  },
  water_well: {
    osmTags: { 'man_made': 'water_well' },
    label: 'Water Well'
  },
  reservoir: {
    osmTags: { 'landuse': 'reservoir' },
    label: 'Reservoir'
  },
  pumping_station: {
    osmTags: { 'man_made': 'pumping_station' },
    label: 'Pumping Station'
  },
  sewage_plant: {
    osmTags: { 'man_made': 'wastewater_plant' },
    label: 'Sewage Plant'
  },
  // Transportation - Highway facilities
  rest_area: {
    osmTags: { 'highway': 'rest_area' },
    label: 'Rest Area'
  },
  service_area: {
    osmTags: { 'highway': 'services' },
    label: 'Service Area'
  },
  // Aviation - Control
  atc_tower: {
    osmTags: { 'aeroway': 'control_tower' },
    label: 'ATC Tower'
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
