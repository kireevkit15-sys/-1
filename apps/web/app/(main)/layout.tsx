import BottomNav from "@/components/layout/BottomNav";
import SideNav from "@/components/layout/SideNav";
import RightSidebar from "@/components/layout/RightSidebar";
import PageTransition from "@/components/layout/PageTransition";
import InstallBanner from "@/components/ui/InstallBanner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SideNav />
      <RightSidebar />

      {/* Main content: shifts right on md+ (SideNav), narrows on lg+ (RightSidebar) */}
      <main className="md:ml-[220px] lg:mr-[260px]">
        <div className="max-w-md md:max-w-3xl mx-auto pb-20 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      <InstallBanner />
      <BottomNav />
    </div>
  );
}
