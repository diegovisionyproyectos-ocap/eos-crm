import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { companiesToGeoJSON, buildHeatmapGeoJSON, buildRouteGeoJSON, getBounds, getMapStyle } from '../../utils/mapHelpers';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../utils/constants';
import useCRMStore from '../../store/useCRMStore';
import useAppStore from '../../store/useAppStore';

// Inject pulse animation once
if (typeof document !== 'undefined' && !document.getElementById('eos-marker-style')) {
  const style = document.createElement('style');
  style.id = 'eos-marker-style';
  style.textContent = `
    @keyframes eos-ring {
      0%   { transform: scale(1);   opacity: 0.8; }
      70%  { transform: scale(2.4); opacity: 0;   }
      100% { transform: scale(2.4); opacity: 0;   }
    }
    @keyframes eos-bounce {
      0%, 100% { transform: translateY(0);  }
      50%       { transform: translateY(-6px); }
    }
    .eos-pin-ring {
      position: absolute; inset: -8px;
      border-radius: 50%;
      border: 3px solid #6366f1;
      animation: eos-ring 1.6s ease-out infinite;
    }
    .eos-pin-body {
      position: relative;
      width: 36px; height: 36px;
      animation: eos-bounce 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

/**
 * MapView — MapLibre GL JS integration
 * Renders school markers with clustering, status colors, heatmap, and visit routes.
 */
export default function MapView({ onCompanyClick, showControls = true }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const selectedMarkerRef = useRef(null);

  const { companies, opportunities, activities } = useCRMStore();
  const { mapMode, locationPickMode, setPickedLocation, selectedMapCompanyId } = useAppStore();

  // ── Initialize map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      attributionControl: true,
    });

    const m = map.current;

    // Controls
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }), 'top-right');
    m.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    m.on('load', () => {
      setupSources(m);
      setupLayers(m);
      setupInteractions(m);
    });

    return () => {
      if (popupRef.current) popupRef.current.remove();
      m.remove();
      map.current = null;
    };
  }, []);

  // ── Setup GeoJSON sources ────────────────────────────────────────────────────
  const setupSources = (m) => {
    // Clustered school markers
    m.addSource('schools', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 60,
    });

    // Visit routes
    m.addSource('routes', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    // Heatmap
    m.addSource('heatmap', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  };

  // ── Setup layers ─────────────────────────────────────────────────────────────
  const setupLayers = (m) => {
    // --- Heatmap layer ---
    m.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap',
      layout: { visibility: 'none' },
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 12, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(99,102,241,0)',
          0.2, 'rgba(99,102,241,0.4)',
          0.4, 'rgba(139,92,246,0.6)',
          0.6, 'rgba(245,158,11,0.8)',
          0.8, 'rgba(249,115,22,0.9)',
          1, 'rgba(239,68,68,1)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 20, 12, 60],
        'heatmap-opacity': 0.75,
      },
    });

    // --- Route lines ---
    m.addLayer({
      id: 'routes-layer',
      type: 'line',
      source: 'routes',
      layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#6366f1',
        'line-width': 2.5,
        'line-dasharray': [3, 2],
        'line-opacity': 0.7,
      },
    });

    // --- Cluster circles ---
    m.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'schools',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          '#6366f1', 5, '#8b5cf6', 10, '#a855f7',
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          22, 5, 28, 10, 34,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });

    // --- Cluster count labels ---
    m.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'schools',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['Open Sans Bold'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // --- Individual school circles ---
    m.addLayer({
      id: 'schools-point',
      type: 'circle',
      source: 'schools',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'stageColor'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 7, 14, 13],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });

    // --- School label ---
    m.addLayer({
      id: 'schools-label',
      type: 'symbol',
      source: 'schools',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans SemiBold'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-max-width': 12,
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
      minzoom: 10,
    });
  };

  // ── Setup map interactions ───────────────────────────────────────────────────
  const setupInteractions = (m) => {
    // Cluster click → zoom in
    m.on('click', 'clusters', (e) => {
      const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0].properties.cluster_id;
      m.getSource('schools').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        m.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 1 });
      });
    });

    // School click → popup
    m.on('click', 'schools-point', (e) => {
      const feature = e.features[0];
      const { name, city, status, student_count, opportunityValue, id } = feature.properties;
      const coords = feature.geometry.coordinates.slice();

      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: true,
        maxWidth: '280px',
        className: 'eos-popup',
      })
        .setLngLat(coords)
        .setHTML(buildPopupHTML({ name, city, status, student_count, opportunityValue }))
        .addTo(m);

      // Notify parent
      if (onCompanyClick) onCompanyClick(id);
    });

    // Map click in location-pick mode
    m.on('click', (e) => {
      if (!locationPickMode) return;
      setPickedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    // Cursor changes
    m.on('mouseenter', 'schools-point', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'schools-point', () => { m.getCanvas().style.cursor = locationPickMode ? 'crosshair' : ''; });
    m.on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer'; });
    m.on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = ''; });
  };

  // ── Update location-pick cursor ──────────────────────────────────────────────
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    map.current.getCanvas().style.cursor = locationPickMode ? 'crosshair' : '';
  }, [locationPickMode]);

  // ── Update data when companies/opportunities change ──────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m?.isStyleLoaded()) return;

    const schoolsSource = m.getSource('schools');
    const heatmapSource = m.getSource('heatmap');
    const routesSource = m.getSource('routes');
    if (!schoolsSource) return;

    schoolsSource.setData(companiesToGeoJSON(companies, opportunities));
    heatmapSource?.setData(buildHeatmapGeoJSON(companies));
    routesSource?.setData(buildRouteGeoJSON(activities));
  }, [companies, opportunities, activities]);

  // ── Toggle layers based on mapMode ───────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m?.isStyleLoaded()) return;

    const show = (id, visible) => {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    };

    const isMarkers = mapMode === 'markers';
    const isHeatmap = mapMode === 'heatmap';
    const isRoutes = mapMode === 'routes';

    show('clusters', isMarkers);
    show('cluster-count', isMarkers);
    show('schools-point', isMarkers || isRoutes);
    show('schools-label', isMarkers);
    show('heatmap-layer', isHeatmap);
    show('routes-layer', isRoutes);
  }, [mapMode]);

  // ── Fly to selected company + animated pin + 3D pitch ───────────────────────
  useEffect(() => {
    // Remove previous marker
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (!selectedMapCompanyId || !map.current) {
      // Reset camera when deselected
      if (map.current) map.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      return;
    }

    const company = companies.find((c) => c.id === selectedMapCompanyId);
    if (!company?.lat || !company?.lng) return;

    // Build animated HTML marker
    const el = document.createElement('div');
    el.style.cssText = 'position:relative;width:36px;height:36px;cursor:pointer';
    el.innerHTML = `
      <div class="eos-pin-body">
        <div class="eos-pin-ring"></div>
        <svg viewBox="0 0 36 44" width="36" height="44" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="eos-shadow" x="-30%" y="-20%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#6366f1" flood-opacity="0.5"/>
            </filter>
          </defs>
          <path d="M18 0C8.06 0 0 8.06 0 18c0 12 18 26 18 26S36 30 36 18C36 8.06 27.94 0 18 0z"
                fill="#6366f1" filter="url(#eos-shadow)"/>
          <circle cx="18" cy="18" r="8" fill="white" opacity="0.95"/>
          <circle cx="18" cy="18" r="4" fill="#6366f1"/>
        </svg>
      </div>
    `;

    selectedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([company.lng, company.lat])
      .addTo(map.current);

    // Fly with 3D tilt
    map.current.flyTo({
      center: [company.lng, company.lat],
      zoom: 15,
      pitch: 50,
      bearing: -15,
      speed: 1.2,
      essential: true,
    });
  }, [selectedMapCompanyId, companies]);

  // ── Fit map to all schools ───────────────────────────────────────────────────
  const fitAll = useCallback(() => {
    const m = map.current;
    if (!m) return;
    const coords = companies.filter((c) => c.lat && c.lng).map((c) => [c.lng, c.lat]);
    if (coords.length === 0) return;
    if (coords.length === 1) {
      m.flyTo({ center: coords[0], zoom: 12 });
      return;
    }
    const bounds = getBounds(coords);
    if (bounds) {
      m.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 });
    }
  }, [companies]);

  // Expose fitAll to parent via imperative ref
  useEffect(() => {
    if (companies.length > 0) {
      const timeout = setTimeout(fitAll, 500);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="map-container w-full h-full" />
      {locationPickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none animate-pulse">
          Haz clic en el mapa para seleccionar la ubicación
        </div>
      )}
    </div>
  );
}

// ── Popup HTML builder ───────────────────────────────────────────────────────
function buildPopupHTML({ name, city, status, student_count, opportunityValue }) {
  const statusLabels = {
    active: { label: 'Cliente activo', color: '#22c55e' },
    prospect: { label: 'Prospecto', color: '#6366f1' },
    lost: { label: 'Perdido', color: '#ef4444' },
    inactive: { label: 'Inactivo', color: '#94a3b8' },
  };
  const s = statusLabels[status] || statusLabels.prospect;
  const value = opportunityValue
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(opportunityValue)
    : null;

  return `
    <div style="font-family:Inter,sans-serif;padding:14px;min-width:220px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0"></div>
        <strong style="font-size:13px;color:#0f172a;line-height:1.3">${name}</strong>
      </div>
      <div style="font-size:12px;color:#64748b;display:flex;flex-direction:column;gap:4px">
        ${city ? `<span>📍 ${city}</span>` : ''}
        ${student_count ? `<span>👨‍🎓 ${Number(student_count).toLocaleString('es-CO')} estudiantes</span>` : ''}
        ${value ? `<span>💰 ${value} en pipeline</span>` : ''}
        <span style="color:${s.color};font-weight:600;margin-top:2px">${s.label}</span>
      </div>
    </div>
  `;
}
