import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Analysis = {
  severity: "Advisory" | "Warning" | "Critical";
  coordinates: string;
  resolution: string;
  sensor: string;
  situationSummary: string;
  terrainDetails: { landscapeType: string; visibilityConditions: string; infrastructureImpact: string };
  detectedAnomalies: string[];
  recommendedActions: string[];
};

const SYSTEM = `You are a geospatial intelligence analyst. Analyze the satellite image and respond with ONLY a JSON object (no markdown) of this exact shape:
{"severity":"Advisory"|"Warning"|"Critical","coordinates":"e.g. 37.7749° N, 122.4194° W (best estimate)","resolution":"e.g. 0.5m/px High-Res Optical","sensor":"e.g. Sentinel-2 MSI / Thermal SWIR","situationSummary":"2-3 sentences","terrainDetails":{"landscapeType":"","visibilityConditions":"","infrastructureImpact":""},"detectedAnomalies":["2-4 items"],"recommendedActions":["3-5 items"]}`;

const str = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v : d);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : []);

export const analyzeImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ image: z.string().startsWith("data:image/"), hint: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; analysis: Analysis } | { ok: false; error: string }> => {
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { ok: false, error: "AI is not configured." };
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: SYSTEM,
        maxRetries: 0,
        messages: [{ role: "user", content: [
          { type: "text", text: `Analyze this satellite image.${data.hint ? ` Context: ${data.hint}` : ""}` },
          { type: "image", image: new URL(data.image) },
        ] }],
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
      });
      const text = await result.text;
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { ok: false, error: "Geospatial processing failed. Please ensure file is a valid image format." };
      const j = JSON.parse(match[0]);
      const t = j.terrainDetails ?? {};
      return { ok: true, analysis: {
        severity: ["Advisory", "Warning", "Critical"].includes(j.severity) ? j.severity : "Advisory",
        coordinates: str(j.coordinates, "Unknown"), resolution: str(j.resolution, "Unknown"), sensor: str(j.sensor, "Unknown"),
        situationSummary: str(j.situationSummary, ""),
        terrainDetails: { landscapeType: str(t.landscapeType, "—"), visibilityConditions: str(t.visibilityConditions, "—"), infrastructureImpact: str(t.infrastructureImpact, "—") },
        detectedAnomalies: list(j.detectedAnomalies), recommendedActions: list(j.recommendedActions),
      } };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.lastError?.statusCode;
      if (status === 429) return { ok: false, error: "Rate limited — please try again shortly." };
      if (status === 402) return { ok: false, error: "AI credits exhausted. Add credits in Settings → Plans & credits." };
      console.error(e);
      return { ok: false, error: "Geospatial processing failed. Please ensure file is a valid image format." };
    }
  });
