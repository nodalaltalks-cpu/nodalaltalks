import type { CallService, CreateCallSessionInput, CallSession } from "@core/application/ports";

/**
 * Placeholder CallService — mints a fake channel/token and connects instantly,
 * same shortcut as PlaceholderPaymentGateway. Swap in an AgoraCallService or
 * TwilioCallService later behind CALL_PROVIDER with no change to calls.ts or
 * the calling UI, both of which depend only on the CallService port.
 */
export class PlaceholderCallService implements CallService {
  readonly provider = "placeholder" as const;

  async createSession(input: CreateCallSessionInput): Promise<CallSession> {
    return {
      sessionId: `sess_${input.callId}`,
      channel: `call_${input.callId}`,
      token: "",
      provider: "placeholder",
    };
  }

  async endSession(): Promise<void> {
    // No real transport to tear down.
  }
}
