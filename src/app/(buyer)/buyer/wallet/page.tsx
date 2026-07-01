import { WalletView } from "@/presentation/features/wallet/WalletView";

export const metadata = { title: "Wallet · NoDalalTalks" };

export default function WalletPage() {
  return (
    <main className="min-h-screen bg-surface">
      <WalletView />
    </main>
  );
}
