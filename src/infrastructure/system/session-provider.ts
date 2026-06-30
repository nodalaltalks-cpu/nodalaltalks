import type { SessionProvider } from "@core/application/ports";

/**
 * Groups events into one visit. In the browser it persists a session id in
 * sessionStorage (mirrors analytics.js `sid()`); on the server it returns a
 * fresh per-instance id since there is no visit to group.
 */
export class BrowserSessionProvider implements SessionProvider {
  private serverId: string | null = null;
  private readonly key = "ndt_sid";

  sessionId(): string {
    if (typeof window === "undefined") {
      this.serverId ??= this.mint();
      return this.serverId;
    }
    let s = window.sessionStorage.getItem(this.key);
    if (!s) {
      s = this.mint();
      window.sessionStorage.setItem(this.key, s);
    }
    return s;
  }

  private mint(): string {
    return "s_" + Math.random().toString(36).slice(2, 10);
  }
}

export const sessionProvider = new BrowserSessionProvider();
