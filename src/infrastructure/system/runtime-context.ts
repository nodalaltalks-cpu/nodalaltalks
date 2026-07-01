import type { RuntimeContext } from "@core/application/ports";
import type { Environment, Platform } from "@core/domain/events";

function resolveEnvironment(): Environment {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (explicit === "staging" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/** Browser client — use cases invoked from client composition (composition.ts). */
class WebRuntimeContext implements RuntimeContext {
  source(): string {
    return "web-app";
  }
  platform(): Platform {
    return "web";
  }
  environment(): Environment {
    return resolveEnvironment();
  }
}

/** Next.js route handlers / future Cloud Functions — server-composition.ts. */
class ServerRuntimeContext implements RuntimeContext {
  source(): string {
    return "server-api";
  }
  platform(): Platform {
    return "server";
  }
  environment(): Environment {
    return resolveEnvironment();
  }
}

export const webRuntimeContext: RuntimeContext = new WebRuntimeContext();
export const serverRuntimeContext: RuntimeContext = new ServerRuntimeContext();
