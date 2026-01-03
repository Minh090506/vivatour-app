import { Header } from '@/components/layout/Header';
import { AIAssistant } from '@/components/layout/AIAssistant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
      <AIAssistant />
    </div>
  );
}
