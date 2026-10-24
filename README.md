# SatVision

SatVision is a satellite image intelligence dashboard for analyzing geospatial imagery with AI vision inference. It puts an interactive imagery workspace on one screen: a left-hand visualization column that switches between a high-resolution canvas viewer and a live geospatial map, and a right-hand briefing column that carries the AI's findings. Users either drop in their own imagery or start from one of three pre-loaded sample incidents, then run an analysis that sends the active image to a multimodal vision model and returns a structured geographic briefing — severity, coordinates, resolution, sensor, situation summary, terrain details, detected anomalies, and recommended actions — with the top-bar metadata, severity badge, map position, and briefing tabs all updating from the same result.

## Features

### Sample incidents

Three pre-loaded regional incidents are available as one-click presets, each with its own severity level:

| Incident | Severity |
| --- | --- |
| California Wildfire Anomaly | Critical |
| Suez Canal Vessel Congestion | Warning |
| Urban Flood Inundation Zone | Advisory |

Severity is expressed on a three-level scale — **Advisory**, **Warning**, **Critical** — and drives marker color, badge color, and briefing tone throughout the app.

### Custom image upload

The bottom panel of the left column is a drag-and-drop upload zone. Drop a file or click to browse, then press **Analyze Geographic Region** to run the uploaded image through the same AI analysis pipeline as the samples. The active file name and size limit are shown in the zone.

### High-resolution canvas viewer

The canvas view renders the active image with:

- Zoom in / zoom out controls and drag-to-pan, plus a reset to return to the default framing
- A toggle between the **raw** image and the **processed** anomaly overlay, which highlights detected regions on top of the imagery

### AI vision analysis

Pressing **Analyze Geographic Region** sends the active image to a multimodal vision model through the Lovable AI gateway. While the request is in flight, the canvas plays a radar-sweep scanning animation over a pulsing region outline, and the button shows a spinner with the label **Processing Multispectral Bands...**.

The model is instructed to return a structured JSON briefing of this shape:

```json
{
  "severity": "Advisory | Warning | Critical",
  "coordinates": "e.g., 37.7749° N, 122.4194° W",
  "resolution": "e.g., 0.5m/px High-Res Optical",
  "sensor": "e.g., Sentinel-2 MSI / Thermal SWIR",
  "situationSummary": "2-3 sentence explanation of the visible event/anomaly",
  "terrainDetails": {
    "landscapeType": "",
    "visibilityConditions": "",
    "infrastructureImpact": ""
  },
  "detectedAnomalies": [],
  "recommendedActions": []
}
```

On a successful response the scanning animation stops and the returned values are rendered across the dashboard. On an unreadable or unsupported file, a clean alert toast reads **"Geospatial processing failed. Please ensure file is a valid image format."**

### Interactive geospatial map

The left column also hosts a 2D map built with Leaflet and react-leaflet:

- CartoDB Dark Matter tiles, matched to the dashboard's dark slate theme
- A color-coded marker for every incident — red for Critical, orange for Warning, yellow for Advisory
- A translucent scan-footprint polygon drawn around each incident point to simulate a satellite tile coverage area
- A marker popup showing the incident title, its risk-level badge, and a **View AI Analysis** button
- Smooth fly-to navigation that recenters the map on the selected incident
- Two-way state sync: selecting a preset or clicking a marker, footprint, or popup updates the top-bar metadata, the severity badge, and the briefing panel, and analyzed custom imagery is plotted as its own marker and footprint

### AI briefing panel

The right column carries the analysis result across three tabs:

1. **Situation Overview** — the event summary and the anomalies detected in the imagery
2. **Terrain & Geography** — landscape classification, visibility conditions, and infrastructure impact as a key-value grid
3. **Actionable Insights** — prioritized recommendations for responders

### Dynamic metadata and severity signaling

The top bar shows coordinates, spatial resolution, and satellite sensor for the active incident, and is rewritten from the AI response after each analysis. The severity badge recolors with the assessed level: yellow for Advisory, orange for Warning, red for Critical.

### Layout and loading states

The dashboard is a responsive two-column layout (60% visualization / 40% briefing) that stacks on narrow viewports, uses a dark-mode geospatial theme with high-contrast cyan and emerald accents, shows skeleton loading states on every card while data resolves, and surfaces invalid-file and processing failures through toasts rather than blocking the workspace.

## Known limitations

- **GeoTIFF uploads are not supported in-browser.** The upload zone accepts PNG and JPG for analysis; GeoTIFF files cannot be decoded by the browser canvas pipeline and will fail.
- **Sample metadata is placeholder data.** The coordinates, resolution, and sensor values shown for the pre-loaded incidents are illustrative, not live satellite feeds.
- **AI analyses consume workspace AI credits.** Every run of **Analyze Geographic Region** is a billable model request.

## Tech stack

- [TanStack Start](https://tanstack.com/start) — file-based routing, SSR, and server functions
- React 19 with TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [shadcn/ui](https://ui.shadcn.com) component primitives
- [Leaflet](https://leafletjs.com) and [react-leaflet](https://react-leaflet.org) for the geospatial map
- [Lovable AI](https://docs.lovable.dev/features/ai) for multimodal vision inference

## Getting started

Node.js 18 or newer is recommended.

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

AI analysis requires a Lovable AI key available to the server environment. Without it, analysis requests return an "AI is not configured" error and the rest of the dashboard remains usable.

## License

This project is private and proprietary. All rights reserved. No part of this codebase may be copied, modified, distributed, or used in production without explicit written permission from the project owner.
