/**
 * Fetch all schools in El Salvador from the Overpass API.
 * Results are cached at module level — only one network request per session.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

let _cache = null;
let _promise = null;

export async function fetchAllSchoolsElSalvador() {
  if (_cache) return _cache;
  if (_promise) return _promise;

  const query = `
[out:json][timeout:30];
area["ISO3166-1"="SV"]->.sv;
(
  node["amenity"="school"]["name"](area.sv);
  way["amenity"="school"]["name"](area.sv);
);
out center;`;

  _promise = fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
    .then((r) => r.json())
    .then((data) => {
      _cache = (data.elements || [])
        .map((el) => ({
          osmId: `osm_${el.id}`,
          name: el.tags?.name || 'Colegio',
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
          address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:city']]
            .filter(Boolean).join(', '),
          phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
          website: el.tags?.website || el.tags?.['contact:website'] || '',
          isPrivate: el.tags?.['school:type'] === 'private' || el.tags?.operator_type === 'private',
        }))
        .filter((s) => s.lat && s.lng);
      _promise = null;
      return _cache;
    })
    .catch(() => {
      _promise = null;
      return [];
    });

  return _promise;
}

export function osmSchoolsToGeoJSON(schools) {
  return {
    type: 'FeatureCollection',
    features: schools.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        osmId: s.osmId,
        name: s.name,
        address: s.address || '',
        phone: s.phone || '',
        website: s.website || '',
        isPrivate: s.isPrivate,
      },
    })),
  };
}
