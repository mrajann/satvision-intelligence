import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BrainCircuit,
  Check,
  ChevronDown,
  Crosshair,
  FileImage,
  Layers3,
  LocateFixed,
  Minus,
  Move,
  Plus,
  Radio,
  Satellite,
  ScanLine,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { analyzeImage, type Analysis } from "@/lib/analyze.functions";

const FAIL = "Geospatial processing failed. Please ensure file is a valid image format.";
async function toDataUrl(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
function toIncident(base: Incident, a: Analysis): Incident {
  return { ...base, severity: a.severity, coordinates: a.coordinates, resolution: a.resolution, sensor: a.sensor,
    summary: a.situationSummary, anomalies: a.detectedAnomalies, insights: a.recommendedActions,
    terrain: [{ label: "Landscape type", value: a.terrainDetails.landscapeType }, { label: "Visibility", value: a.terrainDetails.visibilityConditions }, { label: "Infrastructure impact", value: a.terrainDetails.infrastructureImpact }] };
}

import wildfireImage from "@/assets/california-wildfire.jpg";
import suezImage from "@/assets/suez-congestion.jpg";
import floodImage from "@/assets/urban-flood.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatVision — Satellite Image Intelligence" },
      { name: "description", content: "Analyze satellite imagery and review AI-assisted geographic incident briefings." },
      { property: "og:title", content: "SatVision — Satellite Image Intelligence" },
      { property: "og:description", content: "Analyze satellite imagery and review AI-assisted geographic incident briefings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SatVisionDashboard,
});

type Incident = {
  id: string;
  name: string;
  area: string;
  image: string;
  coordinates: string;
  resolution: string;
  sensor: string;
  severity: "Advisory" | "Warning" | "Critical";
  confidence: number;
  summary: string;
  reason: string;
  terrain: { label: string; value: string }[];
  insights: string[];
  anomalies?: string[];
};

const incidents: Incident[] = [
  {
    id: "wildfire",
    name: "California Wildfire Anomaly",
    area: "Sierra National Forest, CA",
    image: wildfireImage,
    coordinates: "37.2846° N, 119.6428° W",
    resolution: "10 m/px",
    sensor: "Sentinel-2 / MSI",
    severity: "Critical",
    confidence: 94,
    summary: "A rapidly expanding thermal anomaly is visible across the western ridgeline, with a dense smoke plume moving southwest over forested terrain.",
    reason: "High-confidence heat signatures overlap dry, continuous canopy and steep terrain. The active perimeter has expanded beyond the prior observation boundary.",
    terrain: [
      { label: "Land cover", value: "Dense conifer canopy" },
      { label: "Canopy density", value: "78% — very high" },
      { label: "Mean slope", value: "24.6° — steep" },
      { label: "Nearest settlement", value: "8.4 km southwest" },
    ],
    insights: [
      "Prioritize the southwestern fire perimeter for ground verification.",
      "Stage aerial suppression outside the projected smoke corridor.",
      "Notify communities within a 12 km radius of the active front.",
      "Request a follow-up thermal pass within the next 3 hours.",
    ],
  },
  {
    id: "suez",
    name: "Suez Canal Vessel Congestion",
    area: "Port Said, Egypt",
    image: suezImage,
    coordinates: "31.1894° N, 32.3280° E",
    resolution: "0.5 m/px",
    sensor: "WorldView-3 / VNIR",
    severity: "Warning",
    confidence: 89,
    summary: "Elevated vessel density is detected at the northern canal approach, with multiple anchored cargo vessels occupying primary transit lanes.",
    reason: "Observed queue length is significantly above the 30-day baseline, increasing collision and commercial delay risk.",
    terrain: [
      { label: "Environment", value: "Coastal canal corridor" },
      { label: "Detected vessels", value: "43 large vessels" },
      { label: "Channel width", value: "205 m average" },
      { label: "Port proximity", value: "2.1 km north" },
    ],
    insights: [
      "Coordinate staggered entry windows for northbound traffic.",
      "Keep emergency towing assets near the central queue.",
      "Inspect the eastern anchorage for drifting vessels.",
      "Reassess queue movement after the next scheduled transit window.",
    ],
  },
  {
    id: "flood",
    name: "Urban Flood Inundation Zone",
    area: "River District, Metro Sector 7",
    image: floodImage,
    coordinates: "29.7521° N, 95.3487° W",
    resolution: "1.2 m/px",
    sensor: "PlanetScope / PSB.SD",
    severity: "Critical",
    confidence: 92,
    summary: "Floodwater has breached the riverbank and spread into low-lying residential and commercial blocks on both sides of the channel.",
    reason: "Water classification indicates deep inundation across several transport links, with additional expansion likely downstream.",
    terrain: [
      { label: "Land cover", value: "Dense urban fabric" },
      { label: "Inundated area", value: "14.8 km²" },
      { label: "Road exposure", value: "31.4 km affected" },
      { label: "Critical facilities", value: "4 in risk zone" },
    ],
    insights: [
      "Close the two eastern river crossings to non-emergency traffic.",
      "Route evacuation north along elevated arterial roads.",
      "Deploy rescue teams near the isolated residential blocks.",
      "Monitor the downstream levee segment for further overtopping.",
    ],
  },
];

function SatVisionDashboard() {
  const [incidentIndex, setIncidentIndex] = useState(0);
  const [tab, setTab] = useState<"overview" | "terrain" | "insights">("overview");
  const [processed, setProcessed] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState<{ name: string; url: string } | null>(null);
  const dragOrigin = useRef({ x: 0, y: 0 });
  const fileInput = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);
  const base = incidents[incidentIndex];
  const incident = base && result ? toIncident(base, result) : base;
  const custom = uploaded && !result;

  useEffect(() => {
    return () => {
      if (uploaded) URL.revokeObjectURL(uploaded.url);
    };
  }, [uploaded]);

  if (!incident) return null;

  const chooseIncident = (index: number) => {
    setLoading(true);
    setTimeout(() => {
      setIncidentIndex(index);
      setUploaded(null);
      setResult(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setLoading(false);
    }, 650);
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(tiff?|png|jpe?g)$/i.test(file.name)) { toast.error(FAIL); return; }
    setResult(null);
    setUploaded({ name: file.name, url: URL.createObjectURL(file) });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const analyze = async () => {
    if (!base) return;
    setScanning(true);
    try {
      let dataUrl: string;
      try { dataUrl = await toDataUrl(uploaded?.url ?? base.image); } catch { throw new Error(FAIL); }
      const res = await analyzeImage({ data: { image: dataUrl, hint: uploaded ? undefined : base.name } });
      if (!res.ok) throw new Error(res.error);
      setResult(res.analysis);
      setTab("overview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : FAIL);
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary"><Satellite className="size-5" /></div>
            <div><h1 className="font-display text-lg font-semibold leading-none">SatVision</h1><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Satellite Image Intelligence</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-success" /></span>Analysis systems online</div>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Active observation</p><h2 className="mt-1 font-display text-2xl font-semibold">{uploaded ? uploaded.name : incident.name}</h2></div>
          <div className="relative w-full xl:w-[390px]">
            <label htmlFor="incident" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Regional sample incidents</label>
            <select id="incident" value={incidentIndex} onChange={(event) => chooseIncident(Number(event.target.value))} className="h-10 w-full appearance-none rounded-md border border-border bg-card px-3 pr-9 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
              {incidents.map((item, index) => <option key={item.id} value={index}>{item.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
          <div className="min-w-0 space-y-4">
            <section className="rounded-md border border-border bg-card">
              <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <Metadata icon={<LocateFixed />} label="Coordinates" value={custom ? "Metadata pending" : incident.coordinates} loading={loading} />
                <Metadata icon={<ScanLine />} label="Spatial resolution" value={custom ? "Reading source" : incident.resolution} loading={loading} />
                <Metadata icon={<Radio />} label="Satellite sensor" value={custom ? "Custom upload" : incident.sensor} loading={loading} />
              </div>
            </section>

            <section className="overflow-hidden rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium"><Crosshair className="size-4 text-primary" /> Multispectral viewport</div>
                <div className="flex rounded-md border border-border bg-background p-0.5" aria-label="Image mode">
                  {([false, true] as const).map((value) => <button key={String(value)} onClick={() => setProcessed(value)} className={`rounded-[4px] px-3 py-1.5 text-[11px] font-semibold transition ${processed === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{value ? "Anomaly" : "Raw"}</button>)}
                </div>
              </div>
              <div
                className={`viewer relative aspect-[16/10] min-h-[360px] overflow-hidden bg-muted ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
                onPointerDown={(event) => { setDragging(true); dragOrigin.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
                onPointerMove={(event) => dragging && setOffset({ x: event.clientX - dragOrigin.current.x, y: event.clientY - dragOrigin.current.y })}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
              >
                {loading ? <Skeleton className="absolute inset-0" /> : <img src={uploaded?.url ?? incident.image} alt={uploaded ? `Uploaded geographic image ${uploaded.name}` : `Satellite view of ${incident.name}`} width={1536} height={1024} draggable={false} className="h-full w-full select-none object-cover transition-transform duration-200" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} />}
                {processed && !loading && !uploaded && <AnomalyOverlay type={incident.id} />}
                {scanning && <div className="pointer-events-none absolute inset-0 overflow-hidden bg-success/10"><div className="absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full [animation-duration:2.5s]" style={{ background: "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--success) 45%, transparent) 40deg, transparent 60deg)" }} /><div className="absolute inset-0 animate-pulse border-2 border-success/60" /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-panel/90 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-success">Scanning region…</div></div>}
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded bg-panel/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur"><span className="size-1.5 animate-pulse rounded-full bg-alert" /> Live analysis layer</div>
                <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-md border border-border bg-panel/95 shadow-xl backdrop-blur">
                  <ControlButton label="Zoom in" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}><Plus /></ControlButton>
                  <ControlButton label="Zoom out" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}><Minus /></ControlButton>
                  <ControlButton label="Reset view" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}><Crosshair /></ControlButton>
                </div>
                <div className="absolute bottom-4 left-4 rounded bg-panel/90 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground backdrop-blur">ZOOM {Math.round(zoom * 100)}% &nbsp;•&nbsp; <Move className="inline size-3" /> DRAG TO PAN</div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <button onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }} className="group flex min-h-24 items-center gap-4 rounded-md border border-dashed border-border bg-background/50 px-4 text-left transition hover:border-primary/70 hover:bg-primary/5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><UploadCloud className="size-5" /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold">{uploaded ? uploaded.name : "Drop satellite imagery here"}</span><span className="mt-1 block text-xs text-muted-foreground">PNG, JPG or GeoTIFF • Maximum 50 MB</span></span>
                </button>
                <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff" className="hidden" onChange={(event) => acceptFile(event.target.files?.[0])} />
                <button onClick={analyze} disabled={loading || scanning} className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">{scanning ? <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> : <BrainCircuit className="size-4" />}{scanning ? "Processing Multispectral Bands..." : "Analyze Geographic Region"}</button>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-md border border-border bg-card p-5">
              {loading ? <div className="space-y-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-20 w-full" /><Skeleton className="h-2 w-full" /></div> : <>
                <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Threat assessment</p><h3 className="mt-1 font-display text-lg font-semibold">Detection severity</h3></div><SeverityBadge severity={incident.severity} /></div>
                <div className="mt-5 flex items-end justify-between"><span className="text-sm text-muted-foreground">Model confidence</span><span className="font-mono text-xl font-semibold text-foreground">{incident.confidence}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${incident.confidence}%` }} /></div>
              </>}
            </section>

            <section className="min-h-[470px] rounded-md border border-border bg-card">
              <div className="border-b border-border px-5 py-4"><div className="flex items-center gap-2"><Layers3 className="size-4 text-primary" /><h3 className="font-display font-semibold">AI Geographic Briefing</h3></div><p className="mt-1 text-xs text-muted-foreground">Machine-assisted interpretation • Review recommended</p></div>
              <div className="grid grid-cols-3 border-b border-border px-2 pt-2" role="tablist">
                {[{ id: "overview", label: "Situation" }, { id: "terrain", label: "Terrain" }, { id: "insights", label: "Actions" }].map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id as typeof tab)} className={`border-b-2 px-2 py-3 text-[11px] font-semibold transition ${tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
              <div className="p-5">
                {loading ? <BriefingSkeleton /> : tab === "overview" ? <Overview incident={incident} /> : tab === "terrain" ? <Terrain incident={incident} /> : <Insights incident={incident} />}
              </div>
            </section>
          </aside>
        </div>
      </section>
      <Toaster theme="dark" position="top-right" />
    </main>
  );
}

function Metadata({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: string; loading: boolean }) {
  return <div className="flex min-h-[74px] items-center gap-3 px-4 py-3"><span className="text-primary [&>svg]:size-4">{icon}</span><div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>{loading ? <Skeleton className="mt-2 h-3 w-4/5" /> : <p className="mt-1 truncate font-mono text-xs font-semibold">{value}</p>}</div></div>;
}

function Skeleton({ className }: { className: string }) { return <div className={`animate-pulse bg-skeleton ${className}`} />; }

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={label} aria-label={label} onClick={(event) => { event.stopPropagation(); onClick(); }} className="grid size-10 place-items-center border-b border-border text-foreground transition last:border-0 hover:bg-accent hover:text-primary [&>svg]:size-4">{children}</button>;
}

function SeverityBadge({ severity }: { severity: Incident["severity"] }) {
  const tone = severity === "Critical" ? "border-alert/40 bg-alert/10 text-alert" : severity === "Warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-advisory/40 bg-advisory/10 text-advisory";
  return <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${tone}`}><AlertTriangle className="size-3" />{severity}</span>;
}

function AnomalyOverlay({ type }: { type: string }) {
  if (type === "suez") return <><div className="absolute left-[39%] top-[15%] h-[65%] w-[15%] rounded-full border-2 border-warning bg-warning/10 shadow-[0_0_35px_var(--warning-glow)]" /><div className="absolute left-[44%] top-[44%] size-3 animate-ping rounded-full bg-warning" /></>;
  if (type === "flood") return <><div className="absolute inset-x-[13%] top-[19%] h-[45%] rotate-3 rounded-[45%] border-2 border-primary bg-primary/15 shadow-[0_0_35px_var(--primary-glow)]" /><div className="absolute left-[55%] top-[54%] size-3 animate-ping rounded-full bg-primary" /></>;
  return <><div className="absolute right-[16%] top-[16%] h-[37%] w-[35%] rotate-6 rounded-[48%] border-2 border-alert bg-alert/15 shadow-[0_0_40px_var(--alert-glow)]" /><div className="absolute right-[32%] top-[34%] size-3 animate-ping rounded-full bg-alert" /></>;
}

function Overview({ incident }: { incident: Incident }) {
  return <div className="space-y-5"><div><p className="section-label">Detected event</p><p className="mt-2 text-sm leading-6 text-foreground">{incident.summary}</p></div><div className="border-l-2 border-alert bg-alert/5 px-4 py-3"><p className="section-label text-alert">Severity reasoning</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{incident.reason}</p></div>{incident.anomalies?.length ? <div><p className="section-label">Detected anomalies</p><ul className="mt-2 space-y-2">{incident.anomalies.map((a) => <li key={a} className="flex gap-2 text-xs leading-5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-alert" />{a}</li>)}</ul></div> : null}<div className="grid grid-cols-2 gap-3"><Metric label="Analysis window" value="Last 6 hrs" /><Metric label="Change detected" value="+18.4%" /></div></div>;
}

function Terrain({ incident }: { incident: Incident }) {
  return <div><p className="section-label">Landscape classification</p><div className="mt-3 divide-y divide-border">{incident.terrain.map((row) => <div key={row.label} className="flex items-center justify-between gap-4 py-3"><span className="text-xs text-muted-foreground">{row.label}</span><span className="text-right text-xs font-semibold">{row.value}</span></div>)}</div><div className="mt-5 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground"><LocateFixed className="size-4 shrink-0 text-primary" />Topographic and infrastructure layers are co-registered.</div></div>;
}

function Insights({ incident }: { incident: Incident }) {
  return <div><p className="section-label">Recommended response</p><ul className="mt-3 space-y-3">{incident.insights.map((insight, index) => <li key={insight} className="flex gap-3 rounded-md border border-border bg-background/40 p-3"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-success/10 text-success"><Check className="size-3" /></span><div><span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Priority {index + 1}</span><span className="mt-1 block text-xs leading-5">{insight}</span></div></li>)}</ul></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-background/40 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-semibold">{value}</p></div>; }

function BriefingSkeleton() { return <div className="space-y-4"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-20 w-full" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div></div>; }
