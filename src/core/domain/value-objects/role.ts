/**
 * Platform roles. Stored in Firebase Auth custom claims so Security Rules can
 * authorize without an extra read. `founder` and `admin` are the full-access
 * tier; `verifier` reviews documents; `advisor` manages only their own profile;
 * `buyer` only their own data.
 */
export const ROLES = ["buyer", "advisor", "verifier", "founder", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** Staff = anyone who operates the platform (review, oversight, admin). */
export function isStaffRole(role: Role | undefined | null): boolean {
  return role === "verifier" || role === "founder" || role === "admin";
}

/** Full-access tier. */
export function isAdminRole(role: Role | undefined | null): boolean {
  return role === "founder" || role === "admin";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
