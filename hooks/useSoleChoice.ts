"use client";

import { useEffect } from "react";
import type { AxiosResponse } from "axios";
import { useQuery } from "@tanstack/react-query";
import type { Option } from "@/components/dashboard/forms/InfiniteSelect";

/** An InfiniteSelect's source, as the location pickers build them (components/dashboard/locations/pickers.ts). */
export type Picker = {
  queryKey: (string | number | null)[];
  queryFn: (params: { page: number; search: string }) => Promise<AxiosResponse>;
  mapOption: (raw: never) => Option;
};

/**
 * When a level has only one choice (a branch manager's branch, an agent's one territory), choose
 * it, so nobody is asked a question with one answer (docs/dashboard-patterns.md §8). Call `choose`
 * without marking the form dirty: the person changed nothing.
 */
export function useSoleChoice(picker: Picker, enabled: boolean, current: Option | null | undefined, choose: (o: Option) => void) {
  const first = useQuery({
    enabled,
    queryKey: [...picker.queryKey, "sole"],
    queryFn: async () => (await picker.queryFn({ page: 1, search: "" })).data as { data: unknown[]; meta: { total: number } },
  });
  const sole = enabled && first.data?.meta.total === 1 ? first.data.data[0] : null;
  useEffect(() => {
    if (sole && !current) choose(picker.mapOption(sole as never));
  }, [sole, current, choose, picker]);
}
