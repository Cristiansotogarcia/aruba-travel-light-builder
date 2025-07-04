// src/AppPrefetch.tsx
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProducts } from "@/lib/queries/products";

export const AppPrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["equipment-products"],
      queryFn: getProducts,
      staleTime: 5 * 60 * 1000, // 5 minuten vers
    });
  }, [queryClient]);

  return null;
};
