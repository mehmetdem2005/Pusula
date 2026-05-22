/**
 * OSM/Overpass tool worker — Tier 3
 * docs/11-multi-agent-mimarisi.md §6
 */

export interface OsmPoi {
  type: 'metro_station' | 'school' | 'hospital' | 'park' | 'market';
  name: string;
  distance_m: number;
  lat: number;
  lon: number;
}

/**
 * Bir koordinatın çevresindeki POI'leri getir.
 * SLA: p95 < 2 s, availability 95% (3rd party dependency).
 */
export async function nearbyPois(
  _lat: number,
  _lon: number,
  _radiusM = 1000,
  _types: readonly OsmPoi['type'][] = ['metro_station', 'school', 'hospital', 'park'],
): Promise<OsmPoi[]> {
  // TODO: Overpass API call with proper query
  // Endpoint: https://overpass-api.de/api/interpreter
  return [];
}

export async function geocode(_address: string): Promise<{ lat: number; lon: number } | null> {
  // TODO: Nominatim API
  return null;
}
