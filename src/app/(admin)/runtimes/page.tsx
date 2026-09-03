"use client";

import Link from "next/link";
import { QueryGate } from "@/components/layout/query-gate";
import { StatusLabel } from "@/components/ui/status-dot";
import type { StatusTone } from "@/components/ui/status-dot";
import { useRuntimes } from "@/hooks/use-admin";
import { useI18n } from "@/lib/i18n";

function tone(status: string): StatusTone {
  return status === "healthy" ? "active" : "disconnected";
}

export default function RuntimesPage() {
  const { t } = useI18n();
  const runtimes = useRuntimes();

  return (
    <QueryGate isPending={runtimes.isPending && !runtimes.data} isError={runtimes.isError && !runtimes.data}>
      <div className="px-10 py-10">
        <h1 className="text-[22px] font-medium tracking-tight">{t("runtimes.title")}</h1>
        <p className="mt-2 max-w-xl text-[13px] text-muted-foreground">{t("runtimes.subtitle")}</p>

        {(runtimes.data ?? []).length === 0 ? (
          <p className="mt-10 text-[13px] text-muted-foreground">{t("runtimes.empty")}</p>
        ) : (
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {(runtimes.data ?? []).map((runtime) => (
              <li key={runtime.id}>
                <Link
                  href={`/runtimes/${runtime.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_140px_120px_100px] items-center gap-4 py-4 hover:bg-muted/40"
                >
                  <div>
                    <div className="text-[13px] font-medium">{runtime.id.replace("runtime_", "Runtime ")}</div>
                    <div className="mt-1 text-[13px] text-muted-foreground">{runtime.organization_name}</div>
                  </div>
                  <StatusLabel tone={tone(runtime.status)}>
                    {t(`runtimes.${runtime.status}`) === `runtimes.${runtime.status}`
                      ? runtime.status
                      : t(`runtimes.${runtime.status}`)}
                  </StatusLabel>
                  <span className="text-[12px] text-muted-foreground">{runtime.region}</span>
                  <span className="justify-self-end font-mono text-[12px] text-muted-foreground">
                    {runtime.version}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </QueryGate>
  );
}
