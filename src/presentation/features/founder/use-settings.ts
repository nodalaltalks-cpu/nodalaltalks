"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SystemSettings } from "@core/domain/entities";
import { buildSettingsRepo } from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

const QUERY_KEY = ["system-settings"];

/** system_settings/global — founder-configurable business rules. Falls back
 *  to DEFAULT_SYSTEM_SETTINGS (via the repository) before it's ever been set. */
export function useSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => buildSettingsRepo().get(),
  });
}

export function useUpdateSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<SystemSettings>) => {
      if (!user) throw new Error("Sign in as a founder to change settings.");
      return buildSettingsRepo().update(patch, user.uid);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
