import { NotificationsView } from "@/presentation/features/notifications/NotificationsView";

export const metadata = { title: "Notifications · NoDalalTalks" };

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-surface">
      <NotificationsView />
    </main>
  );
}
