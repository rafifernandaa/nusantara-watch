import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { Camera, ExternalLink } from 'lucide-react';
import {
  CONCESSION_POLYGONS,
  SIRUP_BUDGET_PACKAGES,
  WIND_ISPU_STATIONS,
} from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import { filterHotspots } from '../utils/formatters';
import { getFieldDocsForHotspot } from '../utils/gdriveEvidence';
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
  if (style === 'light-glass') {
    return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
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

interface HoveredHotspotState {
  hotspot: HotspotFeature;
  x: number;
  y: number;
}

export function GlobeViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const hoverClearTimerRef = useRef<number | null>(null);

  const [hoveredInfo, setHoveredInfo] = useState<HoveredHotspotState | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  const basemap = useWatchStore((s) => s.basemap);
  const isGlobeProjection = useWatchStore((s) => s.isGlobeProjection);
  const activeLayers = useWatchStore((s) => s.activeLayers);
  const selectedHotspotId = useWatchStore((s) => s.selectedHotspotId);
  const selectedBudgetId = useWatchStore((s) => s.selectedBudgetId);
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const cameraTarget = useWatchStore((s) => s.cameraTarget);
  const hotspots = useWatchStore((s) => s.hotspots);
  const customFieldDocs = useWatchStore((s) => s.customFieldDocs);
  const selectHotspot = useWatchStore((s) => s.selectHotspot);
  const selectBudget = useWatchStore((s) => s.selectBudget);
  const setActiveEvidenceModalDoc = useWatchStore((s) => s.setActiveEvidenceModalDoc);

  const visibleHotspots = useMemo(
    () =>
      filterHotspots(
        hotspots,
        selectedProvinceFilter,
        timelineDayOffset,
        cumulativeTimeline
      ),
    [hotspots, selectedProvinceFilter, timelineDayOffset, cumulativeTimeline]
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
      if (hoverClearTimerRef.current !== null) {
        window.clearTimeout(hoverClearTimerRef.current);
      }
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

  const hoveredHotspotId = hoveredInfo?.hotspot.id ?? null;

  // Update Deck.gl Layers
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const isLightBasemap = basemap === 'light-glass' || basemap === 'terrain';
    const fillAlpha = isLightBasemap ? 16 : 22;
    const layers = [];

    // 1. Organic Hydrological KHG & Concession Contours
    if (activeLayers.concessions) {
      layers.push(
        new PolygonLayer<ConcessionPolygon>({
          id: 'concessions-layer',
          data: visibleConcessions,
          pickable: true,
          stroked: true,
          filled: true,
          extruded: false,
          lineWidthMinPixels: 1.1,
          getPolygon: (d) => d.coordinates,
          getFillColor: (d) =>
            d.type.includes('Gambut')
              ? [16, 145, 105, fillAlpha]
              : d.type.includes('Sawit')
                ? [217, 119, 6, fillAlpha]
                : [14, 116, 144, fillAlpha],
          getLineColor: (d) =>
            d.type.includes('Gambut')
              ? [16, 145, 105, 135]
              : d.type.includes('Sawit')
                ? [217, 119, 6, 130]
                : [14, 116, 144, 130],
        })
      );
    }

    // 2. SiRUP Civic Budget Allocation Arcs
    if (activeLayers.budgets) {
      layers.push(
        new ArcLayer<BudgetPackage>({
          id: 'budget-arcs-layer',
          data: visibleBudgets,
          pickable: true,
          getWidth: (d) => (d.sirupId === selectedBudgetId ? 3.5 : 2.0),
          getSourcePosition: (d) => d.coordinates,
          getTargetPosition: (d) => d.targetHotspotClusterCoords,
          getSourceColor: (d) =>
            d.anomalyLevel === 'Disproportionate'
              ? [255, 90, 54, 215]
              : d.anomalyLevel === 'Elevated'
                ? [235, 155, 25, 200]
                : [48, 209, 88, 195],
          getTargetColor: [255, 196, 64, 215],
          onClick: (info) => {
            if (info.object) selectBudget(info.object.sirupId);
          },
        })
      );
    }

    // 3. Quiet Technical BMKG ISPU Air Quality & Wind Crosshair Rings
    if (activeLayers['wind-ispu']) {
      layers.push(
        new ScatterplotLayer<WindIspuStation>({
          id: 'ispu-stations-layer',
          data: visibleStations,
          pickable: true,
          radiusMinPixels: 4.5,
          radiusMaxPixels: 6,
          getPosition: (d) => d.coordinates,
          getRadius: 7000,
          getFillColor: isLightBasemap ? [245, 247, 250, 230] : [17, 20, 28, 230],
          getLineColor: (d) =>
            d.ispu >= 200 ? [255, 90, 54, 215] : [56, 142, 245, 200],
          stroked: true,
          lineWidthMinPixels: 1.5,
        }),
        new TextLayer<WindIspuStation>({
          id: 'ispu-labels-layer',
          data: visibleStations,
          pickable: false,
          getPosition: (d) => d.coordinates,
          getText: (d) => `ISPU ${d.ispu} · ${d.windSpeedKmh} km/j`,
          getSize: 10,
          getColor: isLightBasemap ? [75, 85, 101, 220] : [163, 169, 184, 220],
          getPixelOffset: [0, -14],
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 500,
        })
      );
    }

    // 4. Concentric Multi-Ring Thermal Yield Contours + Pinpoint Core + Priority Callouts
    if (activeLayers.hotspots) {
      const priorityCalloutHotspots = visibleHotspots.filter(
        (d) =>
          d.frpMw >= 85 ||
          d.id === selectedHotspotId ||
          d.id === hoveredHotspotId
      );

      layers.push(
        // Outer halo: peatland depth & spread envelope
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-outer-yield-layer',
          data: visibleHotspots,
          pickable: false,
          radiusMinPixels: 18,
          radiusMaxPixels: 56,
          stroked: true,
          lineWidthMinPixels: 0.8,
          getPosition: (d) => d.coordinates,
          getRadius: (d) =>
            (d.id === selectedHotspotId ? 1.35 : 1.0) *
            Math.max(24000, d.frpMw * 360 + d.peatDepthMeters * 2800),
          getFillColor: (d) =>
            d.id === selectedHotspotId ? [255, 90, 54, 26] : [255, 90, 54, 18],
          getLineColor: (d) =>
            d.id === selectedHotspotId ? [255, 90, 54, 125] : [255, 90, 54, 78],
          updateTriggers: {
            getRadius: [selectedHotspotId],
            getFillColor: [selectedHotspotId],
            getLineColor: [selectedHotspotId],
          },
        }),
        // Middle ring: persistence hours & thermal footprint
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-mid-persistence-layer',
          data: visibleHotspots,
          pickable: false,
          radiusMinPixels: 11,
          radiusMaxPixels: 34,
          stroked: true,
          lineWidthMinPixels: 1.0,
          getPosition: (d) => d.coordinates,
          getRadius: (d) =>
            (d.id === selectedHotspotId ? 1.25 : 1.0) *
            Math.max(14500, d.frpMw * 210 + d.persistenceHours * 110),
          getFillColor: [255, 90, 54, 38],
          getLineColor: [255, 90, 54, 135],
          updateTriggers: {
            getRadius: [selectedHotspotId],
          },
        }),
        // Inner FRP core ring: primary hover & click target
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-inner-frp-layer',
          data: visibleHotspots,
          pickable: true,
          radiusMinPixels: 6,
          radiusMaxPixels: 18,
          stroked: true,
          lineWidthMinPixels: 1.25,
          getPosition: (d) => d.coordinates,
          getRadius: (d) => Math.max(8000, d.frpMw * 115),
          getFillColor: (d) =>
            d.persistenceHours >= 60 ? [255, 72, 42, 88] : [255, 118, 56, 78],
          getLineColor: (d) =>
            d.id === selectedHotspotId || d.id === hoveredHotspotId
              ? [255, 90, 54, 255]
              : [255, 72, 42, 220],
          onHover: (info) => {
            if (hoverClearTimerRef.current !== null) {
              window.clearTimeout(hoverClearTimerRef.current);
              hoverClearTimerRef.current = null;
            }
            if (info.object) {
              setHoveredInfo({
                hotspot: info.object as HotspotFeature,
                x: info.x,
                y: info.y,
              });
            } else {
              hoverClearTimerRef.current = window.setTimeout(() => {
                setHoveredInfo(null);
              }, 160);
            }
          },
          onClick: (info) => {
            if (info.object) selectHotspot((info.object as HotspotFeature).id);
          },
          updateTriggers: {
            getLineColor: [selectedHotspotId, hoveredHotspotId],
          },
        }),
        // High-contrast pinpoint epicenter dot
        new ScatterplotLayer<HotspotFeature>({
          id: 'hotspots-pinpoint-core-layer',
          data: visibleHotspots,
          pickable: false,
          radiusMinPixels: 2.5,
          radiusMaxPixels: 4.5,
          stroked: true,
          lineWidthMinPixels: 1,
          getPosition: (d) => d.coordinates,
          getRadius: 2400,
          getFillColor: isLightBasemap ? [17, 20, 28, 255] : [255, 248, 245, 255],
          getLineColor: isLightBasemap ? [255, 255, 255, 230] : [255, 90, 54, 255],
          updateTriggers: {
            getFillColor: [isLightBasemap],
            getLineColor: [isLightBasemap],
          },
        }),
        // Technical Ink Callout Flags only on priority / hovered / selected epicenters
        new TextLayer<HotspotFeature>({
          id: 'hotspots-callout-labels-layer',
          data: priorityCalloutHotspots,
          pickable: false,
          background: true,
          getPosition: (d) => d.coordinates,
          getText: (d) => {
            const docs = getFieldDocsForHotspot(d, customFieldDocs);
            return `${d.kabupaten.split(' (')[0]} · ${d.frpMw.toFixed(0)} MW${
              docs.length > 0 ? ' · Foto' : ''
            }`;
          },
          getSize: 10,
          getColor: [245, 247, 250, 255],
          getBackgroundColor: [17, 20, 28, 238],
          backgroundPadding: [6, 3, 6, 3],
          getPixelOffset: [0, -26],
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontWeight: 500,
        })
      );
    }

    overlay.setProps({ layers });
  }, [
    activeLayers,
    basemap,
    visibleHotspots,
    visibleConcessions,
    visibleBudgets,
    visibleStations,
    selectedHotspotId,
    selectedBudgetId,
    hoveredHotspotId,
    customFieldDocs,
    selectHotspot,
    selectBudget,
  ]);

  const activeTooltip = hoveredInfo || isTooltipHovered ? hoveredInfo : null;
  const activeTooltipDocs = activeTooltip
    ? getFieldDocsForHotspot(activeTooltip.hotspot, customFieldDocs)
    : [];
  const primaryTooltipDoc = activeTooltipDocs[0] ?? null;

  return (
    <div
      className="relative inset-0 w-screen h-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Peta Spasial Interaktif Karhutla Indonesia"
      />

      {/* Bottom-Left Nested Concentric FRP Yield Scale Legend (25 / 75 / 150 MW) */}
      <div
        aria-label="Legenda Skala Radiasi Termal FRP"
        className="pointer-events-auto fixed left-4 bottom-24 z-20 hidden sm:flex items-center gap-3 rounded-xl px-3.5 py-2.5 border border-[var(--border-hairline)] bg-[var(--surface-card)]/90"
        style={{
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          boxShadow: 'var(--panel-shadow)',
        }}
      >
        <svg
          width="52"
          height="52"
          viewBox="0 0 56 56"
          aria-hidden="true"
          className="shrink-0"
        >
          {/* 150 MW outer ring */}
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="rgba(255, 90, 54, 0.08)"
            stroke="rgba(255, 90, 54, 0.48)"
            strokeWidth="0.9"
          />
          {/* 75 MW mid ring */}
          <circle
            cx="28"
            cy="35"
            r="17"
            fill="rgba(255, 90, 54, 0.14)"
            stroke="rgba(255, 90, 54, 0.68)"
            strokeWidth="0.9"
          />
          {/* 25 MW inner ring */}
          <circle
            cx="28"
            cy="42"
            r="10"
            fill="rgba(255, 90, 54, 0.28)"
            stroke="rgba(255, 90, 54, 0.92)"
            strokeWidth="1"
          />
          <circle cx="28" cy="42" r="2.2" fill="var(--text-primary)" />
        </svg>

        <div className="space-y-1">
          <div className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
            Radiasi termal (MW)
          </div>
          <div className="font-mono-tabular flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
            <span>25</span>
            <span>·</span>
            <span>75</span>
            <span>·</span>
            <span>150 MW</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            <span className="inline-block h-2 w-3 rounded-[2px] border border-[#109169]/70 bg-[#109169]/15" />
            <span>Kontur KHG &amp; Konsesi</span>
          </div>
        </div>
      </div>

      {/* Floating Map Hover Evidence Tooltip Card */}
      {activeTooltip && (
        <div
          onMouseEnter={() => {
            if (hoverClearTimerRef.current !== null) {
              window.clearTimeout(hoverClearTimerRef.current);
              hoverClearTimerRef.current = null;
            }
            setIsTooltipHovered(true);
          }}
          onMouseLeave={() => {
            setIsTooltipHovered(false);
            setHoveredInfo(null);
          }}
          className="fixed z-30 w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-3 text-xs"
          style={{
            left: Math.min(
              typeof window !== 'undefined' ? window.innerWidth - 304 : activeTooltip.x + 16,
              Math.max(16, activeTooltip.x + 16)
            ),
            top: Math.min(
              typeof window !== 'undefined' ? window.innerHeight - 250 : activeTooltip.y - 12,
              Math.max(76, activeTooltip.y - 16)
            ),
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.28)',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              <span className="font-medium text-[var(--text-primary)] truncate">
                {activeTooltip.hotspot.kabupaten}
              </span>
            </div>
            <span className="font-mono-tabular rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)] shrink-0">
              {activeTooltip.hotspot.frpMw} MW
            </span>
          </div>

          {primaryTooltipDoc && (
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                setActiveEvidenceModalDoc(primaryTooltipDoc);
              }}
              className="group relative w-full overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-deepest)] mb-2 text-left"
            >
              <img
                src={primaryTooltipDoc.thumbnailDataUri}
                alt={primaryTooltipDoc.title}
                className="w-full h-28 object-cover block"
              />
              <div className="px-2 py-1.5 flex items-center justify-between gap-2 bg-[var(--surface-raised)]/90">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-primary)] truncate">
                  <Camera className="h-3 w-3 text-[var(--accent)] shrink-0" />
                  <span className="truncate">{primaryTooltipDoc.title}</span>
                </span>
                <ExternalLink className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
              </div>
            </button>
          )}

          <div className="font-mono-tabular flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{activeTooltip.hotspot.satellite}</span>
            <span>{activeTooltip.hotspot.persistenceHours} jam aktif</span>
          </div>

          {primaryTooltipDoc && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2 leading-snug">
              {primaryTooltipDoc.team} · Klik foto untuk Lightbox &amp; Google Drive
            </p>
          )}
        </div>
      )}

      {/* Subtle Apple-style vignette to frame floating translucent chrome */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'var(--vignette-gradient)',
        }}
      />
    </div>
  );
}
