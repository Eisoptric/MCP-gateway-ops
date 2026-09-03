"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useConnections } from "@/hooks/use-admin";
import { formatHeartbeat } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function tone(status: string): StatusTone {
  if (["connected", "healthy", "active"].includes(status)) return "active";
  if (status === "degraded") return "degraded";
  if (status === "none") return "paused";
  return "disconnected";
}

export default function ConnectionsPage() {
  const { t, locale } = useI18n();
  const connections = useConnections();

  return (
    <QueryGate
      isPending={connections.isPending && !connections.data}
      isError={connections.isError && !connections.data}
    >
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("connections.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("connections.subtitle")}</p>

        {(connections.data ?? []).length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("connections.empty")}</p>
        ) : (
          <div className="mt-10 space-y-10">
            {(connections.data ?? []).map((org) => (
              <section key={org.organization_id}>
                <Link href={`/orgs/${org.organization_id}`} className="text-[13px] font-medium hover:underline">
                  {org.organization_name}
                </Link>
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {org.channels.map((channel) => (
                    <li key={channel.id} className="grid grid-cols-[160px_1fr_180px] items-center gap-4 py-4">
                      <span className="text-[13px]">{channel.name}</span>
                      <StatusLabel tone={tone(channel.status)}>
                        {channel.status}
                        {channel.version ? ` · ${channel.version}` : ""}
                        {channel.detail ? ` · ${channel.detail}` : ""}
                      </StatusLabel>
                      <span className="justify-self-end text-[12px] text-muted-foreground">
                        {formatHeartbeat(channel.last_heartbeat_at, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </QueryGate>
  );
}
