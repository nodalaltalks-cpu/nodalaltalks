/**
 * calls/{callId} — one consultation through its full lifecycle. Each transition
 * also emits an event (call_requested → accepted/declined → started → completed
 * /cancelled), so the call doc is a read-model and the log is the audit trail.
 */
export type CallStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "started"
  | "completed"
  | "cancelled";

export interface Call {
  id: string;
  buyerId: string;
  advisorId: string;
  projectId?: string;

  status: CallStatus;
  ratePerMinPaise: number;

  requestedAt: number;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;

  durationSec?: number;
  amountChargedPaise?: number;
  advisorPayoutPaise?: number;

  // Recording corpus (the long-term asset)
  recordingConsented?: boolean;
  recordingPath?: string;

  // Call quality — fields on the call (mirrors call_completed props)
  connectionDrops?: number;
  avgLatencyMs?: number;
  setupTimeSec?: number;
  endReason?: string;

  createdAt: number;
  updatedAt: number;
}
