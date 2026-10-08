import { redirect } from 'next/navigation';
import { ownerSession } from '@/server/auth';
import { getData } from '@/server/data';
import { AppProvider } from '@/components/provider';
import { AppShell } from '@/components/shell';
import type { AppData } from '@/lib/types';
export const dynamic = 'force-dynamic';
export default async function PlannerLayout({ children }: { children: React.ReactNode }) {
  if (!(await ownerSession())) redirect('/login');
  const data = JSON.parse(JSON.stringify(await getData())) as AppData;
  return (
    <AppProvider initial={data} initialNow={new Date().toISOString()}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
