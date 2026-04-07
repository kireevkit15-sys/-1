import BottomNav from "@/components/layout/BottomNav";
import PageTransition from "@/components/layout/PageTransition";
import InstallBanner from "@/components/ui/InstallBanner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-md mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      <InstallBanner />
      <BottomNav />
    </div>
  );
}
