import { DashboardLayout } from '@/widgets/dashboard-layout';
import { getServerSession } from '@/shared/lib';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const permissions = session?.permissions ?? [];

  return <DashboardLayout permissions={permissions}>{children}</DashboardLayout>;
}
