import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface LeafRemedy {
  name: string;
  dosage: string;
  why: string;
}

export interface LeafScanResult {
  plant_name: string;
  healthy: boolean;
  disease: string;
  severity: string;
  confidence: number;
  summary: string;
  symptoms: string[];
  treatment: string[];
  fertilizers: LeafRemedy[];
  vitamins: LeafRemedy[];
  prevention: string[];
}

const scanInput = z.object({
  imageDataUrl: z
    .string()
    .min(32)
    .max(8_000_000)
    .refine((v) => v.startsWith("data:image/"), { message: "Invalid image" }),
  plantHint: z.string().trim().max(80).optional(),
});

export const analyzeLeaf = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => scanInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI service is not configured");

    const prompt = `You are an expert agronomist and plant pathologist. Look at this plant leaf photo${
      data.plantHint ? ` (the farmer says the plant is: ${data.plantHint})` : ""
    } and diagnose it.

Reply with ONLY a JSON object, no markdown fences, using exactly these keys:
{
  "plant_name": string,
  "healthy": boolean,
  "disease": string,
  "severity": "none" | "mild" | "moderate" | "severe",
  "confidence": number,
  "summary": string,
  "symptoms": string[],
  "treatment": string[],
  "fertilizers": [{"name": string, "dosage": string, "why": string}],
  "vitamins": [{"name": string, "dosage": string, "why": string}],
  "prevention": string[]
}
Use simple language a farmer can follow. "fertilizers" must include NPK / organic options with dosage per plant or per acre. "vitamins" must list micronutrient or vitamin supplements (e.g. zinc, boron, magnesium, vitamin B complex bio-stimulants) the plant appears to need. confidence is 0-100. If the picture is not a plant leaf, set disease to "Not a plant leaf" and explain in summary.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Too many scans right now. Please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace credits.");
    if (!res.ok) throw new Error(`Leaf analysis failed (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Could not read the analysis result");

    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<LeafScanResult>;
    const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
    const remedies = (v: unknown): LeafRemedy[] =>
      Array.isArray(v)
        ? v.map((r) => ({
            name: String((r as LeafRemedy)?.name ?? ""),
            dosage: String((r as LeafRemedy)?.dosage ?? ""),
            why: String((r as LeafRemedy)?.why ?? ""),
          }))
        : [];

    const result: LeafScanResult = {
      plant_name: String(parsed.plant_name ?? "Unknown plant"),
      healthy: Boolean(parsed.healthy),
      disease: String(parsed.disease ?? "Unknown"),
      severity: String(parsed.severity ?? "unknown"),
      confidence: Number(parsed.confidence ?? 0),
      summary: String(parsed.summary ?? ""),
      symptoms: list(parsed.symptoms),
      treatment: list(parsed.treatment),
      fertilizers: remedies(parsed.fertilizers),
      vitamins: remedies(parsed.vitamins),
      prevention: list(parsed.prevention),
    };
    return result;
  });
