import type { Role } from "../../domain/value-objects/role";

/**
 * Sets a user's role custom claim. Implemented ONLY by a server-side adapter
 * backed by the Firebase Admin SDK (a privileged operation) and reached from the
 * client via a guarded API route. Role elevation can never happen purely
 * client-side — a verifier approving documents cannot grant themselves access.
 */
export interface RoleClaimService {
  setRole(uid: string, role: Role): Promise<void>;
}
