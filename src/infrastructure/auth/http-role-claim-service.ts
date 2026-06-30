"use client";

import type { RoleClaimService } from "@core/application/ports";
import type { Role } from "@core/domain/value-objects/role";
import { getFirebaseClient } from "../firebase/client";

/**
 * Client adapter for RoleClaimService. It cannot set claims itself (that needs
 * the Admin SDK); it forwards the request to the guarded /api/admin/set-role
 * route, attaching the caller's Firebase ID token so the server can verify the
 * caller is staff before granting any role.
 */
export class HttpRoleClaimService implements RoleClaimService {
  async setRole(uid: string, role: Role): Promise<void> {
    const { auth } = getFirebaseClient();
    const current = auth.currentUser;
    if (!current) throw new Error("Not authenticated.");
    const token = await current.getIdToken();

    const res = await fetch("/api/admin/set-role", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, role }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Failed to grant role (${res.status}). ${detail}`.trim());
    }
  }
}
