/**
 * Firestore collection names — the single source of truth for paths.
 * Matches the MVP Execution Blueprint exactly. Never type a collection string
 * inline; import from here so a rename is one edit and rules stay in sync.
 */
export const COLLECTIONS = {
  USERS: "users",
  ADVISOR_PROFILES: "advisor_profiles",
  PROPERTIES: "properties",
  BUILDERS: "builders",
  PROJECTS: "projects",
  DOCUMENTS: "documents",
  CALLS: "calls",
  WALLETS: "wallets",
  TRANSACTIONS: "transactions",
  REVIEWS: "reviews",
  ANALYTICS_EVENTS: "analytics_events",
  ACTIVITY_LOGS: "activity_logs",
  NOTIFICATIONS: "notifications",
  SYSTEM_SETTINGS: "system_settings",
  FINANCE_SETTINGS: "finance_settings",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
