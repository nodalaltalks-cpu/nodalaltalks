/**
 * notifications/{notificationId} — an in-app notification for one user. Created
 * server-side (with optional push via FCM); the user may only flip `read`.
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  /** Deep-link / payload, e.g. { callId } or { advisorId }. */
  data?: Record<string, string>;
  createdAt: number;
}
