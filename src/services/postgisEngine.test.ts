import { describe, expect, it } from 'vitest';
import {
  isPointInPolygon,
  NusantaraPostgisEngine,
} from '../../backend/postgisEngine';
import { CONCESSION_POLYGONS } from '../data/local_data/indonesia-osint-seed';

describe('NusantaraPostgisEngine & ST_Intersects spatial triggers', () => {
  it('accurately evaluates ST_Intersects point-in-polygon for KHG peatland boundaries', () => {
    const khgKalteng = CONCESSION_POLYGONS.find((c) => c.id === 'KHG-KALTENG-PLG')!;
    expect(isPointInPolygon([114.128, -2.426], khgKalteng.coordinates)).toBe(true);
    expect(isPointInPolygon([106.845, -6.208], khgKalteng.coordinates)).toBe(false);
  });

  it('auto-enriches a newly digitized QGIS/ArcGIS hotspot with intersecting KHG & Concession metadata', () => {
    const engine = new NusantaraPostgisEngine();
    const created = engine.insertHotspot({
      id: 'QGIS-DIGITIZED-001',
      coordinates: [101.75, 0.55], // Inside KHG-RIAU-KAMPAR
      frpMw: 96.4,
      brightnessK: 360.5,
      confidence: 99,
    });

    expect(created.inConcession).toBe(true);
    expect(created.concessionHolder).toBe('PT Rimba Gambut Lestari Group');
    expect(created.concessionType).toBe('HTI (Pulpwood)');
    expect(created.province).toBe('Riau');
    expect( richerCount(engine) ).toBeGreaterThan(12);
  });

  it('sanitizes 47-column BNPB sitrep updates and generates OGC GeoJSON FeatureCollections with objectid PKs', () => {
    const engine = new NusantaraPostgisEngine();
    const updated = engine.upsertBnpbRecord({
      shortProvince: 'Kalteng',
      totalHotspot: 48,
      fireSpot: 12,
      jarakPandangBandaraKm: '&lt; 5 km <b>Kabut</b>',
    });

    expect(updated).not.toBeNull();
    expect(updated?.totalHotspot).toBe(48);
    expect(updated?.fireSpot).toBe(12);
    expect(updated?.jarakPandangBandaraKm).toBe('< 5 km Kabut');

    const sitrepGeoJson = engine.getGeoJsonFeatureCollection('bnpb-sitrep') as {
      type: string;
      name: string;
      features: Array<{ id: number; properties: Record<string, unknown> }>;
    };
    expect(sitrepGeoJson.type).toBe('FeatureCollection');
    expect(sitrepGeoJson.name).toBe('bnpb.karhutla_sitrep_47col');
    expect(sitrepGeoJson.features).toHaveLength(6);
    expect(sitrepGeoJson.features[0].properties.objectid).toBe(1);
  });
});

function richerCount(engine: NusantaraPostgisEngine): number {
  const fc = engine.getGeoJsonFeatureCollection('hotspots') as {
    features: unknown[];
  };
  return fc.features.length;
}
