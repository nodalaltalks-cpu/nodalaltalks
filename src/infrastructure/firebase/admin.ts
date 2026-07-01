import "server-only";
import {
  type App,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK. Used for privileged operations that must NOT
 * be trusted to the client: setting role custom claims, writing wallets /
 * transactions / notifications, and (later) running the project() reducer in a
 * Cloud Function. Never import this from a client component.
 *
 * Credentials: in production set GOOGLE_APPLICATION_CREDENTIALS or
 * FIREBASE_SERVICE_ACCOUNT (JSON). Against the emulator, the SDK auto-detects
 * FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST and needs no key.
 */
export interface FirebaseAdmin {
  app: App;
  auth: Auth;
  db: Firestore;
}

let cached: FirebaseAdmin | null = null;

export function getFirebaseAdmin(): FirebaseAdmin {
  if (cached) return cached;

  const app = getApps().length
    ? getApp()
    : initializeApp(buildAdminOptions());

  const db = getFirestore(app);
  // Event props/entities carry optional fields; don't reject undefined on write.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() throws if the instance was already used — safe to ignore.
  }

  cached = { app, auth: getAuth(app), db };
  return cached;
}

function buildAdminOptions() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const svc = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return {
      credential: cert({
        projectId: svc.project_id,
        clientEmail: svc.client_email,
        privateKey: svc.private_key.replace(/\\n/g, "\n"),
      }),
    };
  }
  // Application Default Credentials / emulator auto-detection.
  return {};
}
