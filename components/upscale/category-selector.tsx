"use client";

import { UpscaleCategory, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/router";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  value: UpscaleCategory | null;
  onChange: (category: UpscaleCategory) => void;
}

const CATEGORIES: UpscaleCategory[] = [
  "portrait", "clarity", "product", "anime", "restoration",
];

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
            value === cat
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
              : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
          )}
        >
          <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
          <span className="text-xs font-medium leading-tight">{CATEGORY_LABELS[cat]}</span>
        </button>
      ))}
    </div>
  );
}
