/**
 * Notification abstraction across channels. Push (FCM), email, and SMS each
 * have their own adapter in infrastructure behind these ports, so a use case
 * "notify the advisor of an incoming call" never knows the transport.
 */
export interface NotificationService {
  push(input: PushMessage): Promise<void>;
}

export interface EmailService {
  send(input: EmailMessage): Promise<void>;
}

export interface SmsService {
  send(input: SmsMessage): Promise<void>;
}

export interface PushMessage {
  /** FCM token(s) or a topic. */
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** Template id resolved by the adapter, or raw html. */
  template?: string;
  html?: string;
  vars?: Record<string, unknown>;
}

export interface SmsMessage {
  to: string;
  body: string;
}
