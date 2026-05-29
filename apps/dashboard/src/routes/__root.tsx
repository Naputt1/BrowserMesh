import { Outlet, createRootRoute } from '@tanstack/react-router';
import { DashboardLayout } from '../components/dashboard-layout';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  component: () => (
    <>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
      <Toaster />
    </>
  ),
});
