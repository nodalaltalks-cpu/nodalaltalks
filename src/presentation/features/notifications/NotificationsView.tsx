"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/presentation/providers/auth-provider";
import { useMarkNotificationRead, useNotifications } from "./hooks";

export function NotificationsView() {
  const { user, loading } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (loading) return <Center>Loading…</Center>;
  if (!user) {
    return (
      <Center>
        <h1 className="text-xl font-extrabold">Sign in to view notifications</h1>
        <Link href="/buyer/signup" className="mt-3 inline-block font-semibold text-amber">
          Create your buyer account →
        </Link>
      </Center>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-[4%] py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">Call receipts and account updates.</p>

      <div className="mt-6 rounded-2xl border-[1.5px] border-border bg-white p-2 shadow-sh">
        {isLoading && <div className="m-3 h-16 animate-pulse rounded-xl bg-surface-2" />}
        {!isLoading && (notifications?.length ?? 0) === 0 && (
          <div className="py-16 text-center text-[12.5px] text-soft">Nothing yet.</div>
        )}
        <div className="divide-y divide-border">
          {notifications?.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && markRead.mutate(n.id)}
              className={cn("w-full px-3 py-3 text-left transition-colors hover:bg-surface", !n.read && "bg-amber-pale/40")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold">{n.title}</div>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber" />}
              </div>
              <div className="mt-1 text-[10.5px] text-soft">{new Date(n.createdAt).toLocaleString("en-IN")}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-md px-[4%] py-24 text-center text-muted-foreground">{children}</div>;
}
