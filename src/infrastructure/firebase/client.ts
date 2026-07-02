import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";
import {
  type FirebaseStorage,
  connectStorageEmulator,
  getStorage,
} from "firebase/storage";
import { readFirebaseWebConfig, shouldUseEmulators } from "./env";

/**
 * Lazily initializes the Firebase client SDK exactly once and wires the Local
 * Emulator Suite when NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true. This is the
 * browser/client entrypoint — call it only from client components or adapters
 * that run client-side. Server privileged access uses admin.ts instead.
 */
export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let cached: FirebaseClient | null = null;
let emulatorsConnected = false;

export function getFirebaseClient(): FirebaseClient {
  if (cached) return cached;

  const app = getApps().length ? getApp() : initializeApp(readFirebaseWebConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  if (shouldUseEmulators() && !emulatorsConnected) {
    // Guarded so HMR / repeated calls don't re-connect and throw.
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    // The emulator never validates reCAPTCHA server-side, but RecaptchaVerifier
    // still tries to load Google's real widget script by default — this is
    // Firebase's documented emulator-only escape hatch, only ever set when
    // already talking to the emulator, never in production.
    auth.settings.appVerificationDisabledForTesting = true;
    emulatorsConnected = true;
  }

  cached = { app, auth, db, storage };
  return cached;
}
