"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, fetchMe } from "@/lib/api";

export const sessionQueryKey = ["session"] as const;

/** The signed-in user, read from the API. A 401 here means there is no session. */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}

export function isSignedOut(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}
