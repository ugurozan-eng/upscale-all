"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface HeaderProps {
  user: {
    id?: string | null;
    name?: string | null;
    image?: string | null;
    email?: string | null;
  };
  credits?: number;
}

export function Header({ user, credits = 0 }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          UpscaleAll
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/history" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            History
          </Link>
          <Link href="/dashboard/billing" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Billing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1">
            <span className="text-xs">⚡</span>
            {credits} credits
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
