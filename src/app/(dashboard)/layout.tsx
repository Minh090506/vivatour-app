import { Header } from "@/components/layout/Header";
import { AIAssistant } from "@/components/layout/AIAssistant";
import { SessionProviderWrapper } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProviderWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
        <AIAssistant />
      </div>
    </SessionProviderWrapper>
  );
}
