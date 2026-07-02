import type { NotificationService, PushMessage } from "@core/application/ports";

/**
 * Placeholder push — logs instead of calling FCM, same shortcut as
 * PlaceholderCallService/PlaceholderPaymentGateway. The in-app notification
 * (NotificationRepository.create, a real Firestore write) is the actual
 * delivery mechanism today; this is the seam Firebase Cloud Messaging drops
 * into later with zero change to any use case.
 */
export class ConsoleNotificationService implements NotificationService {
  async push(input: PushMessage): Promise<void> {
    console.info("[push:placeholder]", input.to, input.title, "—", input.body);
  }
}

export const notificationService = new ConsoleNotificationService();
