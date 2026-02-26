"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onUpload: (url: string) => void;
  disabled?: boolean;
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please use JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <label
        className={cn(
          "flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
          dragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-[200px] rounded-lg object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <span className="text-4xl">📁</span>
            <span className="text-sm font-medium">
              {uploading ? "Uploading..." : "Drop image here or click to browse"}
            </span>
            <span className="text-xs">JPG, PNG, WEBP · Max 10MB</span>
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={disabled || uploading}
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
