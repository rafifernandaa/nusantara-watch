# ADR-004: Automated One-Way Google Sheets to PostgreSQL/PostGIS & Live SSE Sync

## Status
Accepted

## Date
2026-11-16

## Context
Daily 47-column Karhutla operational data (*Posko Sitrep*) is maintained manually by posko field staff in an owned Google Spreadsheet (`Data Karhutla`), while spatial boundaries and hotspots are managed in **PostgreSQL 16 + PostGIS 3.4** via **QGIS Desktop** and **ArcGIS Pro**. Previously, office analysts had to manually transfer updates from the Google Spreadsheet to the dashboard.

We need updates in the Google Spreadsheet and edits in QGIS/ArcGIS to synchronize automatically into PostgreSQL/PostGIS and stream live to **Nusantara Watch** without forcing posko staff off Google Sheets and without requiring complex Google Cloud Service Account OAuth credentials in local Docker/intranet environments.

## Decision
Implement a dual-mode, one-way ingestion pipeline (`Google Sheets → PostgreSQL/PostGIS → SSE → Nusantara Watch`):
1. **Zero-Auth Background Polling & Content Hash-Diffing (`backend/googleSheetsSync.ts` & `backend/postgisEngine.ts`)**:
   - Accept any owned Google Sheet URL or spreadsheet ID configured with *"Anyone with the link can view"* via `.env` (`GOOGLE_SHEET_ID`) or the UI bridge card (`POST /api/bnpb/gsheets/config`).
   - Poll `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=<SheetName>` on a configurable interval (default 20s, 15–60s).
   - Compute an FNV-1a content hash (`computeContentHash`) so unchanged polls are no-ops, preventing redundant database writes or SSE broadcasts. When rows change, parse RFC-4180 CSV rows, sanitize text (`sanitizePlainText`) and numbers (`parseSafeNumber`), upsert matching provinces in `bnpb.karhutla_sitrep_47col`, and broadcast a `gis_change` SSE event.
2. **Optional Instant Google Apps Script `onEdit` Webhook (`POST /api/bnpb/webhook/gsheets`)**:
   - Expose a secret-verified webhook endpoint (`GOOGLE_SHEET_WEBHOOK_SECRET` via header or payload) and generate a ready-to-paste Apps Script `onEdit(e)` snippet for sub-second push synchronization whenever the backend is reachable on a public or tunneled URL.
3. **Strict Unidirectional Source-of-Truth**:
   - Google Sheets remains the sole operational sitrep entry surface for posko staff; PostgreSQL/PostGIS stores and fuses both spreadsheet sitreps and QGIS/ArcGIS spatial edits, pushing unified updates to the frontend via `/api/events`.

## Alternatives Considered

### Google Sheets API v4 with GCP Service Account JSON Keys
- **Pros**: Official authenticated API for private sheets.
- **Cons**: Requires GCP project setup, IAM service account creation, key rotation, and sharing sheets with service emails; unnecessary friction when local Docker/intranet deployments can read link-shared sheets via `gviz/tq?tqx=out:csv`.
- **Rejected**: Zero-auth link-shared CSV polling works out-of-the-box on `localhost` while Apps Script covers instant push.

### Two-Way Sync (PostgreSQL Writes Back to Google Sheets)
- **Pros**: Allows editing 47-column numbers from both sides.
- **Cons**: High risk of race conditions, overwrite conflicts, and formula corruption in staff spreadsheets.
- **Rejected**: Explicitly out of scope; one-way flow (`Google Sheets → PostgreSQL → App`) eliminates conflict ambiguity.

## Consequences
- Posko staff continue working in Google Sheets with zero workflow disruption.
- Office analysts stop manually copying numbers; both spreadsheet updates and QGIS/ArcGIS spatial edits converge in PostgreSQL/PostGIS and stream automatically to Nusantara Watch.
- All parsed sheet values undergo XSS and numeric sanitization (`VULN-BNPB-02` & `VULN-BNPB-05` mitigations) before updating backend state or CSV exports.
