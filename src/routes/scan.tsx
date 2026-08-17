import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Activity, Leaf, Pill, ScanLine, ShieldPlus, Sprout, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { analyzeLeaf, type LeafScanResult } from "@/lib/leaf-scan.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "AI Leaf Scanner — Detect Plant Disease & Nutrient Needs" },
      {
        name: "description",
        content:
          "Upload a photo of a plant leaf to detect disease, severity, treatment steps and the fertilizers and vitamins your crop needs.",
      },
      { property: "og:title", content: "AI Leaf Scanner — KrishiSetu" },
      {
        property: "og:description",
        content: "Photograph a leaf and get an instant plant disease and nutrition report.",
      },
    ],
  }),
  component: ScanPage,
});

const severityTone: Record<string, string> = {
  none: "bg-secondary text-secondary-foreground",
  mild: "bg-accent/25 text-accent-foreground",
  moderate: "bg-accent/50 text-accent-foreground",
  severe: "bg-destructive text-destructive-foreground",
};

function ScanPage() {
  const { user } = useAuth();
  const analyze = useServerFn(analyzeLeaf);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [plantHint, setPlantHint] = useState("");
  const [result, setResult] = useState<LeafScanResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("Please choose a leaf photo first");
      return analyze({ data: { imageDataUrl: preview, plantHint: plantHint.trim() || undefined } });
    },
    onSuccess: async (data) => {
      setResult(data);
      if (user) {
        await supabase.from("leaf_scans").insert({
          user_id: user.id,
          plant_name: data.plant_name,
          disease: data.disease,
          severity: data.severity,
          confidence: data.confidence,
          summary: data.summary,
          treatment: data.treatment.join("\n"),
          fertilizers: data.fertilizers.map((f) => `${f.name} — ${f.dosage}`).join("\n"),
          vitamins: data.vitamins.map((v) => `${v.name} — ${v.dosage}`).join("\n"),
          prevention: data.prevention.join("\n"),
        });
      }
    },
    onError: (err: Error) => toast.error(err.message || "Scan failed"),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setResult(null);
      setPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        <ScanLine className="size-3.5" /> AI Plant Doctor
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Scan a plant leaf</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Take a clear, close-up photo of the affected leaf in daylight. You'll get the likely disease,
        how serious it is, treatment steps, fertilizer dosage and the vitamins the plant needs.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="card-surface p-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-primary"
          >
            {preview ? (
              <img src={preview} alt="Selected leaf" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <Upload className="size-6" />
                Tap to upload or capture a leaf
              </span>
            )}
          </button>

          <div className="mt-4">
            <Label htmlFor="plant">Plant name (optional)</Label>
            <Input
              id="plant"
              value={plantHint}
              maxLength={80}
              placeholder="e.g. Tomato, Wheat, Chilli"
              onChange={(e) => setPlantHint(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <Button
            className="mt-4 w-full"
            disabled={!preview || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Analysing leaf…" : "Diagnose plant"}
          </Button>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              Sign in to keep a history of your scans.
            </p>
          )}
        </div>

        <div>
          {!result && !mutation.isPending && (
            <div className="card-surface flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Your plant health report will appear here.
            </div>
          )}
          {mutation.isPending && (
            <div className="card-surface flex h-full min-h-64 items-center justify-center p-8 text-sm text-muted-foreground">
              Reading the leaf and checking for disease…
            </div>
          )}
          {result && (
            <div className="space-y-5">
              <div className="card-surface p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={severityTone[result.severity] ?? "bg-secondary text-secondary-foreground"}>
                    {result.healthy ? "Healthy" : `${result.severity} severity`}
                  </Badge>
                  <Badge variant="outline">{Math.round(result.confidence)}% confidence</Badge>
                </div>
                <h2 className="mt-3 text-2xl font-semibold">{result.disease}</h2>
                <p className="text-sm text-muted-foreground">Plant: {result.plant_name}</p>
                <p className="mt-3 text-sm">{result.summary}</p>
              </div>

              <ReportList icon={Activity} title="Symptoms spotted" items={result.symptoms} />
              <ReportList icon={Leaf} title="Treatment plan" items={result.treatment} ordered />
              <RemedyList icon={Sprout} title="Fertilizers to apply" items={result.fertilizers} />
              <RemedyList icon={Pill} title="Vitamins & micronutrients" items={result.vitamins} />
              <ReportList icon={ShieldPlus} title="Prevention for next season" items={result.prevention} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportList({
  icon: Icon,
  title,
  items,
  ordered,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div className="card-surface p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={item} className="flex gap-3">
            <span className="text-primary">{ordered ? `${i + 1}.` : "•"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RemedyList({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: { name: string; dosage: string; why: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="card-surface p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.name} className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-medium">{item.name}</p>
            <p className="mt-1 text-xs font-medium text-primary">{item.dosage}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
