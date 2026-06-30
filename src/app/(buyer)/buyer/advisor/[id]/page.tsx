import { AdvisorProfileView } from "@/presentation/features/buyer/AdvisorProfileView";

export const metadata = { title: "Advisor · NoDalalTalks" };

/** Next 15: route params are async. */
export default async function AdvisorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-surface">
      <AdvisorProfileView advisorId={id} />
    </main>
  );
}
