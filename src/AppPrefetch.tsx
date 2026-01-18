// src/AppPrefetch.tsx
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProducts } from "@/lib/queries/products";

export const AppPrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const runPrefetch = () => {
      queryClient.prefetchQuery({
        queryKey: ["equipment-products"],
        queryFn: getProducts,
        staleTime: 5 * 60 * 1000, // 5 minuten vers
      });
    };

    const hasIdleCallback = typeof window !== "undefined" && "requestIdleCallback" in window;
    const idleHandle = hasIdleCallback
      ? window.requestIdleCallback(runPrefetch, { timeout: 1500 })
      : window.setTimeout(runPrefetch, 800);

    return () => {
      if (hasIdleCallback) {
        window.cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [queryClient]);

  return null;
};
