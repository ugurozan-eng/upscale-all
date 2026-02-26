import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { CATEGORY_LABELS, CATEGORY_ICONS, UpscaleCategory } from "@/lib/router";
import { Badge } from "@/components/ui/badge";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const jobs = await db.upscaleJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      {jobs.length === 0 && (
        <p className="text-zinc-500">No upscale jobs yet.</p>
      )}
      <div className="grid gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            {job.outputUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.outputUrl}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span>{CATEGORY_ICONS[job.category as UpscaleCategory]}</span>
                <span className="text-sm font-medium">
                  {CATEGORY_LABELS[job.category as UpscaleCategory]}
                </span>
                <Badge
                  variant={
                    job.status === "done"
                      ? "default"
                      : job.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {job.status}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                {job.scale}x · {job.creditsUsed} credits ·{" "}
                {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
            {job.outputUrl && (
              <a href={job.outputUrl} download>
                <button className="text-xs text-zinc-500 underline hover:text-zinc-700">
                  Download
                </button>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
