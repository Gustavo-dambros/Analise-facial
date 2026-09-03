import { Outlet } from 'react-router-dom';
import { PrivateNoindex } from '@/lib/PrivateNoindex';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import MobileNav from '@/components/MobileNav';
import { PageTransition } from '@/components/ui/page-transition';

export default function DashboardLayout() {
  return (
    <>
      <PrivateNoindex />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background font-noto-sans overflow-y-auto">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </SidebarInset>
        <MobileNav />
      </SidebarProvider>
    </>
  );
}
