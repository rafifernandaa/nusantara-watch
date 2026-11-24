import http from 'node:http';
import { handlePostgisApiRequest, postgisEngine } from './postgisEngine';

const PORT = Number(process.env.API_PORT || 3000);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const handled = await handlePostgisApiRequest(req, res);
  if (!handled) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        service: 'Nusantara Watch PostGIS + QGIS/ArcGIS Gateway',
        endpoints: [
          'GET  /api/health',
          'GET  /api/bootstrap',
          'GET  /api/bnpb/karhutla-2026',
          'POST /api/bnpb/sync',
          'POST /api/spatial/hotspots',
          'GET  /api/geojson/bnpb-sitrep',
          'GET  /api/geojson/hotspots',
          'GET  /api/geojson/concessions',
          'GET  /api/geojson/sirup-arcs',
          'GET  /api/geojson/bmkg-stations',
          'GET  /api/events (SSE)',
        ],
      })
    );
  }
});

server.listen(PORT, async () => {
  const health = await postgisEngine.getHealthStatus();
  console.log(
    `[Nusantara Watch PostGIS Gateway] Listening on http://localhost:${PORT} (mode: ${health.engine})`
  );
  console.log(
    `[QGIS / ArcGIS Pro URI] ${health.qgisConnectionUri}`
  );
});
