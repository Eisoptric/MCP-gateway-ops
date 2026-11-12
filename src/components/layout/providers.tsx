"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { isSignedOut, sessionQueryKey } from "@/hooks/use-session";
import { useLocaleStore } from "@/stores/locale-store";

function createQueryClient() {
  // When any request finds the session gone, re-read it: the auth gate then sends the
  // operator to sign in.
  const recheck = () => void client.invalidateQueries({ queryKey: sessionQueryKey });
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isSignedOut(error) && query.queryKey[0] !== sessionQueryKey[0]) recheck();
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isSignedOut(error)) recheck();
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    // Earlier versions kept a bearer token here. Sessions are cookie-only now.
    try {
      window.localStorage.removeItem("saturn-admin-auth");
    } catch {
      // Storage can be unavailable; there is then nothing to remove.
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleDocument>{children}</LocaleDocument>
      <Toaster />
    </QueryClientProvider>
  );
}

function LocaleDocument({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
  }, [locale]);

  return children;
}
