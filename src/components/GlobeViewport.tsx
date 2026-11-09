import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import {
  CONCESSION_POLYGONS,
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
  WIND_ISPU_STATIONS,
} from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import { filterHotspots } from '../utils/formatters';
import type {
  BasemapStyle,
  BudgetPackage,
  ConcessionPolygon,
  HotspotFeature,
  WindIspuStation,
} from '../types/watch';

function getBasemapStyleSpec(style: BasemapStyle): string | maplibregl.StyleSpecification {
  if (style === 'dark-glass') {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  if (style === 'terrain') {
    return 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  }
  // Keyless Esri World Imagery Satellite raster style
  return {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export function GlobeViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  const basemap = useWatchStore((s) => s.basemap);
  const isGlobeProjection = useWatchStore((s) => s.isGlobeProjection);
  const activeLayers = useWatchStore((s) => s.activeLayers);
  const selectedHotspotId = useWatchStore((s) => s.selectedHotspotId);
  const selectedBudgetId = useWatchStore((s) => s.selectedBudgetId);
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const cameraTarget = useWatchStore((s) => s.cameraTarget);
  const selectHotspot = useWatchStore((s) => s.selectHotspot);
  const selectBudget = useWatchStore((s) => s.selectBudget);

  const visibleHotspots = useMemo(
    () =>
      filterHotspots(
        INDONESIAN_HOTSPOTS,
        selectedProvinceFilter,
        timelineDayOffset,
        cumulativeTimeline
      ),
    [selectedProvinceFilter, timelineDayOffset, cumulativeTimeline]
  );

  const visibleConcessions = useMemo(
    () =>
      CONCESSION_POLYGONS.filter(
        (c) => selectedProvinceFilter === 'ALL' || c.province === selectedProvinceFilter
      ),
    [selectedProvinceFilter]
  );

  const visibleBudgets = useMemo(
    () =>
      SIRUP_BUDGET_PACKAGES.filter(
        (b) => selectedProvinceFilter === 'ALL' || b.province === selectedProvinceFilter
      ),
    [selectedProvinceFilter]
  );

  const visibleStations = useMemo(
    () =>
      WIND_ISPU_STATIONS.filter(
        (w) => selectedProvinceFilter === 'ALL' || w.province === selectedProvinceFilter
      ),
    [selectedProvinceFilter]
  );

  // Initialize MapLibre GL & Deck.gl Overlay
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getBasemapStyleSpec(basemap),
      center: [cameraTarget.longitude, cameraTarget.latitude],
      zoom: cameraTarget.zoom,
      pitch: cameraTarget.pitch,
      bearing: cameraTarget.bearing,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const deckOverlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
    });

    map.addControl(deckOverlay as unknown as maplibregl.IControl);

    map.on('style.load', () => {
      try {
        map.setProjection({ type: isGlobeProjection ? 'globe' : 'mercator' });
      } catch {
        // Fallback if globe projection is unsupported in headless test env
      }
    });

    mapRef.current = map;
    overlayRef.current = deckOverlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Sync Basemap changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(getBasemapStyleSpec(basemap));
  }, [basemap]);

  // Sync Globe / Mercator projection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyProj = () => {
      try {
        map.setProjection({ type: isGlobeProjection ? 'globe' : 'mercator' });
      } catch {
        // Ignore if style is still loading
      }
    };
    if (map.isStyleLoaded()) {
      applyProj();
    } else {
      map.once('style.load', applyProj);
    }
  }, [isGlobeProjection, basemap]);

  // Sync Camera Flights (Respecting prefers-reduced-motion)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || cameraTarget.transitionToken === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      map.jumpTo({
        center: [cameraTarget.longitude, cameraTarget.latitude],
        zoom: cameraTarget.zoom,
        pitch: cameraTarget.pitch,
        bearing: cameraTarget.bearing,
      });
    } else {
      map.flyTo({
        center: [cameraTarget.longitude, cameraTarget.latitude],
        zoom: cameraTarget.zoom,
        pitch: cameraTarget.pitch,
        bearing: cameraTarget.bearing,
        duration: 1350,
        essential: true,
      });
    }
  }, [cameraTarget]);

  // Update Deck.gl Layers
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const layers = [];

    if (activeLayers.concessions) {
      layers.push(
        new PolygonLayer<ConcessionPolygon>({
          id: 'concessions-layer',
          data: visibleConcessions,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          lineWidthMinPixels: 1.5,
          getPolygon: (d) => d.coordinates,
          getFillColor: (d) =>
            d.type.includes('Gambut')
              ? [16, 185, 129, 42]
              : d.type.includes('Sawit')
                ? [245, 158, 11, 38]
                : [56, 189, 248, 38],
          getLineColor: (d) =>
            d.type.includes('Gambut')
              ? [52, 211, 153, 175]
              : d.type.includes('Sawit')
                ? [251, 191, 36, 175]
                : [56, 189, 248, 175],
        })
      );
    }

    if (activeLayers.budgets) {
      layers.push(
        new ArcLayer<BudgetPackage>({
          id: 'budget-arcs-layer',
          data: visibleBudgets,
          pickable: true,
          getWidth: (d) => (d.sirupId === selectedBudgetId ? 4.5 : 2.5),
          getSourcePosition: (d) => d.coordinates,
          getTargetPosition: (d) => d.targetHotspotClusterCoords,
          getSourceColor: (d) =>
            d.anomalyLevel === 'Disproportionate'
              ? [255, 69, 58, 235]
              : d.anomalyLevel === 'Elevated'
                ? [255, 159, 10, 220]
                : [48, 209, 88, 210],
          getTargetColor: [255, 214, 10, 230],
          onClick: (info) => {
            if (info.object) selectBudget(info.object.sirupId);
          },
        })
      );
    }

    if (activeLayers['wind-ispu']) {
      layers.push(
        new ScatterplotLayer<WindIspuStation>({
          id: 'ispu-stations-layer',
          data: visibleStations,
          pickable: true,
          radiusScale: 1,
          radiusMinPixels: 6,
          radiusMaxPixels: 16,
          getPosition: (d) => d.coordinates,
          getRadius: 14000,
          getFillColor: (d) =>
            d.ispu >= 200 ? [191, 90, 242, 180] : [10, 132, 255, 165],
          getLineColor: [255, 255, 255, 200],
          stroked: true,
          lineWidthMinPixels: 1.5,
        }),
        new TextLayer<WindIspuStation>({
          id: 'ispu-labels-layer',
          data: visibleStations,
          pickable: false,
          getPosition: (d) => d.coordinates,
          getText: (d) => `ISPU ${d.ispu} · ${d.windSpeedKmh}km/j`,
          getSize: 11,
          getColor: [245, 245, 247, 220],
          getPixelOffset: [0, -18],
          fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
          fontWeight: 600,
        })
      );
    }

    if (activeLayers.hotspots) {
      layers.push(
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-glow-layer',
          data: visibleHotspots,
          pickable: false,
          radiusMinPixels: 12,
          radiusMaxPixels: 42,
          getPosition: (d) => d.coordinates,
          getRadius: (d) =>
            (d.id === selectedHotspotId ? 1.55 : 1.0) * Math.max(18000, d.frpMw * 360),
          getFillColor: (d) =>
            d.id === selectedHotspotId
              ? [255, 69, 58, 95]
              : d.persistenceHours >= 60
                ? [255, 69, 58, 65]
                : [255, 159, 10, 55],
          updateTriggers: {
            getRadius: [selectedHotspotId],
            getFillColor: [selectedHotspotId],
          },
        }),
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-core-layer',
          data: visibleHotspots,
          pickable: true,
          radiusMinPixels: 5,
          radiusMaxPixels: 18,
          stroked: true,
          lineWidthMinPixels: 1.5,
          getPosition: (d) => d.coordinates,
          getRadius: (d) => Math.max(8000, d.frpMw * 140),
          getFillColor: (d) =>
            d.persistenceHours >= 60 ? [255, 59, 48, 245] : [255, 159, 10, 240],
          getLineColor: (d) =>
            d.id === selectedHotspotId ? [255, 255, 255, 255] : [255, 255, 255, 160],
          onClick: (info) => {
            if (info.object) selectHotspot(info.object.id);
          },
          updateTriggers: {
            getLineColor: [selectedHotspotId],
          },
        })
      );
    }

    overlay.setProps({ layers });
  }, [
    activeLayers,
    visibleHotspots,
    visibleConcessions,
    visibleBudgets,
    visibleStations,
    selectedHotspotId,
    selectedBudgetId,
    selectHotspot,
    selectBudget,
  ]);

  return (
    <div className="relative inset-0 w-screen h-screen overflow-hidden bg-[#070709]">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Peta Spasial Interaktif Karhutla Indonesia"
      />
      {/* Subtle Apple-style vignette to frame floating translucent chrome */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 58%, rgba(5, 5, 8, 0.55) 100%)',
        }}
      />
    </div>
  );
}
