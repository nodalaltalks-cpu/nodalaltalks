/**
 * Typed access to the public Firebase web config. Reads NEXT_PUBLIC_* vars.
 * Values may be absent until Firebase is provisioned — we only *require* them
 * when the live SDK is actually initialized (see client.ts), so local builds
 * and the emulator path work without real keys.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function readFirebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-nodalaltalks",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

/** Connect the client SDK to the Local Emulator Suite during development. */
export function useEmulators(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
}

/** Selected analytics backend — mirrors NDT.config.backend in analytics.js. */
export function eventBackend(): "local" | "firestore" {
  return process.env.NEXT_PUBLIC_EVENT_BACKEND === "firestore"
    ? "firestore"
    : "local";
}
