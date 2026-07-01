import { CallView } from "@/presentation/features/calls/CallView";

export const metadata = { title: "Call · NoDalalTalks" };

/** Next 15: route params are async. */
export default async function CallPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  return (
    <main className="min-h-screen bg-surface">
      <CallView callId={callId} />
    </main>
  );
}
