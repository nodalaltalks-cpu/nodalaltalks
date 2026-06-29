/**
 * Calling abstraction. The frontend and use cases depend ONLY on this port.
 * MVP ships a PlaceholderCallService; Agora or Twilio adapters drop in later
 * via CALL_PROVIDER with zero changes to UI or call-orchestration logic.
 */
export interface CallService {
  readonly provider: "placeholder" | "agora" | "twilio";

  /** Mint a short-lived token/credential for a participant to join a session. */
  createSession(input: CreateCallSessionInput): Promise<CallSession>;

  /** Tear down a session (hang up / cleanup). */
  endSession(sessionId: string): Promise<void>;
}

export interface CreateCallSessionInput {
  callId: string;
  advisorId: string;
  buyerId: string;
  /** Whether recording is consented for this call (drives RECORDING_CAPTURED). */
  recordingConsented: boolean;
}

export interface CallSession {
  sessionId: string;
  /** Provider channel/room identifier the clients join. */
  channel: string;
  /** Per-participant join token (empty for the placeholder provider). */
  token: string;
  provider: string;
}
