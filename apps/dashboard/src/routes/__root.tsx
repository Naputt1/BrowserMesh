import { Outlet, createRootRoute } from '@tanstack/react-router';
import { DashboardLayout } from '../components/dashboard-layout';

export const Route = createRootRoute({
  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
});
