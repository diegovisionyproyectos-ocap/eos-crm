import { COMPANY_STATUS, MAP_STATUS_COLORS } from './constants';

/**
 * Convert companies array to GeoJSON FeatureCollection for MapLibre
 * @param {Array} companies
 * @param {Array} opportunities - to determine pipeline stage per company
 */
export function companiesToGeoJSON(companies = [], opportunities = []) {
  const latestStageByCompany = getLatestStageByCompany(opportunities);

  const features = companies
    .filter((c) => c.lat && c.lng)
    .map((c) => {
      const stage = latestStageByCompany[c.id];
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          name: c.name,
          city: c.city,
          status: c.status,
          student_count: c.student_count,
          address: c.address,
          stage: stage?.stage || null,
          stageColor: getMarkerColor(c.status, stage?.stage),
          opportunityValue: stage?.value || 0,
        },
      };
    });

  return { type: 'FeatureCollection', features };
}

/**
 * Get the most advanced (non-lost) opportunity stage per company
 */
function getLatestStageByCompany(opportunities = []) {
  const stageOrder = [
    'lead', 'contacto', 'demo_agendada', 'demo_realizada',
    'propuesta', 'negociacion', 'ganado', 'perdido',
  ];
  const result = {};

  opportunities.forEach((opp) => {
    const current = result[opp.company_id];
    const currentIdx = current ? stageOrder.indexOf(current.stage) : -1;
    const newIdx = stageOrder.indexOf(opp.stage);
    if (newIdx > currentIdx) {
      result[opp.company_id] = opp;
    }
  });

  return result;
}

/**
 * Determine marker color based on company status and pipeline stage
 */
export function getMarkerColor(status, stage) {
  if (status === 'active' || stage === 'ganado') return MAP_STATUS_COLORS.active;
  if (stage === 'negociacion' || stage === 'propuesta') return MAP_STATUS_COLORS.negociacion;
  if (status === 'lost' || stage === 'perdido') return MAP_STATUS_COLORS.lost;
  if (status === 'inactive') return MAP_STATUS_COLORS.inactive;
  return MAP_STATUS_COLORS.prospect;
}

/**
 * Build visit route GeoJSON LineStrings grouped by company
 * @param {Array} activities - activities with lat/lng
 */
export function buildRouteGeoJSON(activities = []) {
  const byCompany = {};
  activities
    .filter((a) => a.lat && a.lng)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((a) => {
      const key = a.company_id || 'unknown';
      if (!byCompany[key]) byCompany[key] = [];
      byCompany[key].push([a.lng, a.lat]);
    });

  const features = Object.entries(byCompany)
    .filter(([, coords]) => coords.length >= 2)
    .map(([companyId, coords]) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { company_id: companyId },
    }));

  return { type: 'FeatureCollection', features };
}

/**
 * Build heatmap GeoJSON from companies weighted by student_count
 */
export function buildHeatmapGeoJSON(companies = []) {
  const features = companies
    .filter((c) => c.lat && c.lng)
    .map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: {
        weight: Math.log10((c.student_count || 100) + 1),
      },
    }));

  return { type: 'FeatureCollection', features };
}

/**
 * Calculate bounding box for a list of coords [lng, lat]
 */
export function getBounds(coords) {
  if (!coords.length) return null;
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

/**
 * Convert OSM schools (from Overpass API) to GeoJSON for the background layer.
 * @param {Array} osmSchools - elements returned by Overpass (nodes + ways with center)
 */
export function osmSchoolsToGeoJSON(osmSchools = []) {
  const features = osmSchools
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        osmId: s.id,
        name: s.tags?.name || s.tags?.['name:es'] || 'Escuela sin nombre',
      },
    }));
  return { type: 'FeatureCollection', features };
}

/**
 * Base MapLibre style using OpenStreetMap tiles
 * Professional look using CartoDB Positron-style via OSM
 */
export function getMapStyle() {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster',
        source: 'osm',
        paint: { 'raster-opacity': 0.9 },
      },
    ],
  };
}
