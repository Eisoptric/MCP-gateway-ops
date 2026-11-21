"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function QueryGate({
  isPending,
  isError,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();

  if (isPending) {
    return (
      <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-10">
        {t("common.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 py-6 text-[13px] text-muted-foreground md:px-10 md:py-10">
        {t("common.apiError")}
      </div>
    );
  }

  return children;
}
