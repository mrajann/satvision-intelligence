import "leaflet/dist/leaflet.css";

import L, { type LatLngExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polygon, Popup, ScaleControl, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";

export type MapIncident = {
  id: string;
  name: string;
  severity: "Advisory" | "Warning" | "Critical";
  position: [number, number];
};

type SatelliteMapProps = {
  incidents: MapIncident[];
  activeId: string;
  onSelect: (id: string) => void;
};

const markerTone: Record<MapIncident["severity"], string> = {
  Critical: "var(--alert)",
  Warning: "var(--warning)",
  Advisory: "var(--advisory)",
};

function FlyToIncident({ incident }: { incident: MapIncident | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (incident) map.flyTo(incident.position, 10, { duration: 1.4 });
  }, [incident, map]);

  return null;
}

function footprint([lat, lng]: [number, number]): LatLngExpression[] {
  const vertical = 0.055;
  const horizontal = 0.075;
  return [
    [lat - vertical, lng - horizontal],
    [lat - vertical, lng + horizontal],
    [lat + vertical, lng + horizontal],
    [lat + vertical, lng - horizontal],
  ];
}

function markerIcon(incident: MapIncident, active: boolean) {
  const color = markerTone[incident.severity];
  return L.divIcon({
    className: "satvision-marker-shell",
    html: `<span class="satvision-marker${active ? " is-active" : ""}" style="--marker-color:${color}"><span></span></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function SatelliteMap({ incidents, activeId, onSelect }: SatelliteMapProps) {
  const active = incidents.find((incident) => incident.id === activeId) ?? incidents[0];
  const center = active?.position ?? [20, 10];
  const icons = useMemo(
    () => new Map(incidents.map((incident) => [incident.id, markerIcon(incident, incident.id === activeId)])),
    [activeId, incidents],
  );

  return (
    <div className="satvision-map relative h-full w-full" aria-label="Global incident map">
      <MapContainer center={center} zoom={active ? 10 : 3} minZoom={2} maxZoom={18} zoomControl={false} className="h-full w-full">
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" imperial={false} />
        <FlyToIncident incident={active} />
        {incidents.map((incident) => {
          const activeIncident = incident.id === activeId;
          const color = markerTone[incident.severity];
          return (
            <Polygon
              key={`${incident.id}-footprint`}
              positions={footprint(incident.position)}
              pathOptions={{ color, fillColor: color, fillOpacity: activeIncident ? 0.18 : 0.08, opacity: activeIncident ? 0.9 : 0.5, weight: activeIncident ? 2 : 1 }}
              eventHandlers={{ click: () => onSelect(incident.id) }}
            />
          );
        })}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={incident.position}
            icon={icons.get(incident.id)}
            eventHandlers={{ click: () => onSelect(incident.id) }}
          >
            <Popup className="satvision-popup" minWidth={220}>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Incident observation</p>
                  <p className="mt-1 font-display text-sm font-semibold text-foreground">{incident.name}</p>
                </div>
                <span className={`inline-flex rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${incident.severity === "Critical" ? "border-alert/40 bg-alert/10 text-alert" : incident.severity === "Warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-advisory/40 bg-advisory/10 text-advisory"}`}>{incident.severity}</span>
                <Button size="sm" className="w-full" onClick={() => onSelect(incident.id)}>View AI Analysis</Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded border border-primary/20 bg-panel/90 px-2.5 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-primary backdrop-blur">
        Global incident network
      </div>
    </div>
  );
}