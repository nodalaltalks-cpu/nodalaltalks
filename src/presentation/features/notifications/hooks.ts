"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildNotificationReader } from "@infra/composition";
import { useAuth } from "@/presentation/providers/auth-provider";

/** The signed-in user's notification inbox. */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.uid ?? "none"],
    enabled: !!user,
    queryFn: () => buildNotificationReader().listByUser(user!.uid),
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => buildNotificationReader().markRead(notificationId),
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: ["notifications", user.uid] });
    },
  });
}
