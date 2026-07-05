import { Suspense } from "react";
import { StaffLoginForm } from "@/presentation/features/staff/StaffLoginForm";

export const metadata = { title: "Staff Sign In · NoDalalTalks" };

export default function StaffLoginPage() {
  return (
    <main className="min-h-screen bg-surface">
      {/* Suspense: StaffLoginForm reads useSearchParams (?next=), which Next
          requires to be wrapped for static prerender. */}
      <Suspense>
        <StaffLoginForm />
      </Suspense>
    </main>
  );
}
