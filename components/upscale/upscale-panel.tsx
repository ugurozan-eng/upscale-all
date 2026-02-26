"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "./upload-zone";
import { CategorySelector } from "./category-selector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UpscaleCategory, CATEGORY_LABELS } from "@/lib/router";

type JobStatus = "idle" | "processing" | "done" | "failed";

export function UpscalePanel({ initialCredits }: { initialCredits: number }) {
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<UpscaleCategory | null>(null);
  const [scale, setScale] = useState<2 | 4>(4);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits);

  const poll = useCallback((id: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/upscale/${id}`);
      const data = await res.json();
      if (data.status === "done") {
        clearInterval(interval);
        setOutputUrl(data.outputUrl);
        setStatus("done");
        setCredits((c) => c - 4);
      } else if (data.status === "failed") {
        clearInterval(interval);
        setError(data.errorMsg ?? "Processing failed. Credits refunded.");
        setStatus("failed");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpscale = async () => {
    if (!inputUrl || !category) return;
    setError(null);
    setStatus("processing");

    const res = await fetch("/api/upscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputUrl, category, scale }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setStatus("failed");
      return;
    }

    setJobId(data.jobId);
    poll(data.jobId);
  };

  const canUpscale = !!inputUrl && !!category && status === "idle" && credits >= 4;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-500">1. Upload Image</h2>
        <UploadZone onUpload={setInputUrl} disabled={status === "processing"} />
      </div>

      {inputUrl && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-500">2. Choose Type</h2>
          <CategorySelector value={category} onChange={setCategory} />
        </div>
      )}

      {category && inputUrl && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-500">3. Scale</h2>
          <div className="flex gap-2">
            {([2, 4] as const).map((s) => (
              <Button
                key={s}
                variant={scale === s ? "default" : "outline"}
                size="sm"
                onClick={() => setScale(s)}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">Processing with AI...</p>
          <Progress value={50} className="h-1 animate-pulse" />
        </div>
      )}

      {status === "done" && outputUrl && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500">Result</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={outputUrl} alt="Upscaled result" className="rounded-xl" />
          <a href={outputUrl} download>
            <Button className="w-full">Download</Button>
          </a>
          <Button variant="outline" className="w-full" onClick={() => {
            setStatus("idle"); setInputUrl(null); setCategory(null);
            setOutputUrl(null); setJobId(null);
          }}>
            Upscale Another
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {credits < 4 && status === "idle" && (
        <p className="text-sm text-amber-600">
          Not enough credits. <a href="/dashboard/billing" className="underline">Buy more</a>
        </p>
      )}

      <Button
        onClick={handleUpscale}
        disabled={!canUpscale}
        className="w-full"
        size="lg"
      >
        Upscale{category ? ` (${CATEGORY_LABELS[category]})` : ""} — 4 Credits
      </Button>
    </div>
  );
}
